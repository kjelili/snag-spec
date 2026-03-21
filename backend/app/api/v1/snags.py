"""
Snag API endpoints — with JWT auth, pagination, and user ownership.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import require_api_key
from app.core.auth import get_current_user
from app.schemas.snag import SnagCreate, SnagUpdate, SnagResponse, LocationCreate, LocationResponse
from app.models.snag import Snag, Location, DefectType
from app.models.contract import Contract
from app.models.project import Project
from app.models.user import User
from app.models.instruction import Instruction
from app.services.clause_service import ClauseService

router = APIRouter(prefix="/snags", tags=["snags"])
logger = logging.getLogger(__name__)

# FIX #22: Default and max page sizes
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


@router.get("/meta/options", response_model=dict)
async def get_snag_meta_options(
    db: Session = Depends(get_db),
):
    """Get form options needed for snag creation workflow."""
    try:
        projects = db.query(Project).order_by(Project.name.asc()).all()
        contracts = (
            db.query(Contract)
            .order_by(Contract.created_at.desc())
            .all()
        )
        defect_types = db.query(DefectType).order_by(DefectType.name.asc()).all()
        users = db.query(User).filter(User.is_active.is_(True)).order_by(User.name.asc()).all()
    except SQLAlchemyError:
        logger.exception("Failed to fetch snag metadata options")
        return {
            "projects": [],
            "contracts": [],
            "defect_types": [],
            "users": [],
        }

    return {
        "projects": [{"id": str(project.id), "name": project.name} for project in projects],
        "contracts": [
            {
                "id": str(contract.id),
                "project_id": str(contract.project_id),
                "label": contract.contract_reference or f"Contract {contract.id}",
            }
            for contract in contracts
        ],
        "defect_types": [{"id": str(defect_type.id), "name": defect_type.name} for defect_type in defect_types],
        "users": [{"id": str(user.id), "name": user.name} for user in users],
    }


@router.post("/", response_model=SnagResponse, status_code=status.HTTP_201_CREATED)
async def create_snag(
    snag_data: SnagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new snag. The authenticated user is set as creator."""
    create_payload = snag_data.dict()
    # Always use the authenticated user as creator
    create_payload["created_by"] = current_user.id

    snag = Snag(**create_payload)
    db.add(snag)
    db.commit()
    db.refresh(snag)
    return snag


@router.get("/{snag_id}", response_model=SnagResponse)
async def get_snag(
    snag_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a snag by ID"""
    snag = db.query(Snag).filter(Snag.id == snag_id).first()
    if not snag:
        raise HTTPException(status_code=404, detail="Snag not found")
    return snag


@router.get("/", response_model=List[SnagResponse])
async def list_snags(
    project_id: Optional[UUID] = None,
    status: Optional[str] = None,
    limit: int = Query(default=DEFAULT_PAGE_SIZE, le=MAX_PAGE_SIZE, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """List snags with optional filters and pagination."""
    query = db.query(Snag)
    if project_id:
        query = query.filter(Snag.project_id == project_id)
    if status:
        query = query.filter(Snag.status == status)

    try:
        rows = (
            query.order_by(Snag.discovered_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
    except SQLAlchemyError:
        logger.exception("Failed to query snags list")
        return []

    sanitized_rows = []
    for row in rows:
        try:
            sanitized_rows.append(SnagResponse.model_validate(row))
        except Exception:
            logger.exception("Skipping invalid snag row in list response")

    return sanitized_rows


@router.patch("/{snag_id}", response_model=SnagResponse)
async def update_snag(
    snag_id: UUID,
    snag_data: SnagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a snag"""
    snag = db.query(Snag).filter(Snag.id == snag_id).first()
    if not snag:
        raise HTTPException(status_code=404, detail="Snag not found")

    update_data = snag_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(snag, field, value)

    db.commit()
    db.refresh(snag)
    return snag


@router.delete("/{snag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_snag(
    snag_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a snag and unlink related instructions."""
    snag = db.query(Snag).filter(Snag.id == snag_id).first()
    if not snag:
        raise HTTPException(status_code=404, detail="Snag not found")

    try:
        db.query(Instruction).filter(Instruction.snag_id == snag_id).update(
            {Instruction.snag_id: None},
            synchronize_session=False,
        )
        db.delete(snag)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to delete snag")
        raise HTTPException(status_code=500, detail="Failed to delete snag")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new location"""
    location = Location(**location_data.dict())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.get("/{snag_id}/clauses", response_model=List[dict])
async def get_snag_clause_suggestions(
    snag_id: UUID,
    db: Session = Depends(get_db),
):
    """Get suggested clauses for a snag"""
    snag = db.query(Snag).filter(Snag.id == snag_id).first()
    if not snag:
        raise HTTPException(status_code=404, detail="Snag not found")

    if not snag.defect_type_id or not snag.contract_id:
        return []

    contract = db.query(Contract).filter(Contract.id == snag.contract_id).first()
    if not contract:
        return []

    clause_service = ClauseService(db)
    clauses = clause_service.map_defect_to_clauses(
        str(snag.defect_type_id),
        str(contract.contract_edition_id)
    )

    return [
        {
            "id": str(clause.id),
            "clause_number": clause.clause_number,
            "clause_title": clause.clause_title,
        }
        for clause in clauses
    ]
