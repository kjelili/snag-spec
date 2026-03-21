"""
Instruction API endpoints — with JWT auth and pagination.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.instruction import (
    InstructionCreate,
    InstructionUpdate,
    InstructionResponse,
    InstructionGenerate,
)
from app.models.instruction import Instruction, InstructionStatus
from app.models.snag import Snag
from app.models.project import Project
from app.models.contract import Contract, ContractForm
from app.models.user import User
from app.services.ai_service import AIService
from app.services.clause_service import ClauseService

router = APIRouter(prefix="/instructions", tags=["instructions"])
logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


@router.post("/generate", response_model=InstructionResponse, status_code=status.HTTP_201_CREATED)
async def generate_instruction(
    instruction_data: InstructionGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an Architect's Instruction from a snag"""
    snag = db.query(Snag).filter(Snag.id == instruction_data.snag_id).first()
    if not snag:
        raise HTTPException(status_code=404, detail="Snag not found")

    # Get relevant clauses
    clause_service = ClauseService(db)
    contract = db.query(Contract).filter(Contract.id == snag.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    clauses = []
    if snag.defect_type_id and contract.contract_edition_id:
        clauses = clause_service.map_defect_to_clauses(
            str(snag.defect_type_id),
            str(contract.contract_edition_id)
        )

    # Generate instruction with AI
    ai_service = AIService(db)
    project = db.query(Project).filter(Project.id == snag.project_id).first()
    contract_form = None
    if contract:
        contract_form = db.query(ContractForm).filter(ContractForm.id == contract.contract_form_id).first()

    instruction_body = ai_service.generate_instruction_draft(
        snag,
        clauses,
        project.name if project else "Unknown Project",
        contract_form.form_code if contract_form else "JCT SBC/Q"
    )

    # Create instruction
    instruction = Instruction(
        project_id=snag.project_id,
        contract_id=snag.contract_id,
        snag_id=snag.id,
        instruction_type=instruction_data.instruction_type,
        subject=f"Remedy {snag.title}",
        body_markdown=instruction_body,
        status=InstructionStatus.DRAFT,
        issued_by_user_id=current_user.id,
    )

    db.add(instruction)
    db.commit()
    db.refresh(instruction)

    return instruction


@router.post("/", response_model=InstructionResponse, status_code=status.HTTP_201_CREATED)
async def create_instruction(
    instruction_data: InstructionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an instruction manually"""
    instruction = Instruction(**instruction_data.dict())
    instruction.status = InstructionStatus.DRAFT
    instruction.issued_by_user_id = current_user.id
    db.add(instruction)
    db.commit()
    db.refresh(instruction)
    return instruction


@router.get("/{instruction_id}", response_model=InstructionResponse)
async def get_instruction(
    instruction_id: UUID,
    db: Session = Depends(get_db),
):
    """Get an instruction by ID"""
    instruction = db.query(Instruction).filter(Instruction.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")
    return instruction


@router.get("/", response_model=List[InstructionResponse])
async def list_instructions(
    project_id: Optional[UUID] = None,
    status: Optional[InstructionStatus] = None,
    limit: int = Query(default=DEFAULT_PAGE_SIZE, le=MAX_PAGE_SIZE, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """List instructions with optional filters and pagination."""
    query = db.query(Instruction)
    if project_id:
        query = query.filter(Instruction.project_id == project_id)
    if status:
        query = query.filter(Instruction.status == status)

    try:
        rows = (
            query.order_by(Instruction.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
    except SQLAlchemyError:
        logger.exception("Failed to query instructions list")
        return []

    sanitized_rows = []
    for row in rows:
        try:
            sanitized_rows.append(InstructionResponse.model_validate(row))
        except Exception:
            logger.exception("Skipping invalid instruction row in list response")

    return sanitized_rows


@router.patch("/{instruction_id}", response_model=InstructionResponse)
async def update_instruction(
    instruction_id: UUID,
    instruction_data: InstructionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an instruction"""
    instruction = db.query(Instruction).filter(Instruction.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")

    update_data = instruction_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(instruction, field, value)

    db.commit()
    db.refresh(instruction)
    return instruction


@router.post("/{instruction_id}/submit", response_model=InstructionResponse)
async def submit_instruction_for_review(
    instruction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit an instruction for review (moves from draft to review)."""
    instruction = db.query(Instruction).filter(Instruction.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")

    if instruction.status != InstructionStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft instructions can be submitted for review")

    instruction.status = InstructionStatus.REVIEW
    db.commit()
    db.refresh(instruction)
    return instruction


@router.post("/{instruction_id}/approve", response_model=InstructionResponse)
async def approve_instruction(
    instruction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve an instruction (moves to approved status)"""
    instruction = db.query(Instruction).filter(Instruction.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")

    if instruction.status != InstructionStatus.REVIEW:
        raise HTTPException(status_code=400, detail="Instruction must be in review status to approve")

    instruction.status = InstructionStatus.APPROVED
    db.commit()
    db.refresh(instruction)
    return instruction


@router.post("/{instruction_id}/issue", response_model=InstructionResponse)
async def issue_instruction(
    instruction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Issue an instruction (moves to issued status)"""
    instruction = db.query(Instruction).filter(Instruction.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")

    if instruction.status != InstructionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Instruction must be approved before issuing")

    instruction.status = InstructionStatus.ISSUED
    instruction.issued_by_user_id = current_user.id
    db.commit()
    db.refresh(instruction)
    return instruction
