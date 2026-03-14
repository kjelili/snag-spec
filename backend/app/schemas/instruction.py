"""
Instruction schemas for API validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from app.models.instruction import InstructionType, InstructionStatus, DeliveryMethod


class InstructionCreate(BaseModel):
    """Schema for creating an instruction"""
    project_id: UUID
    contract_id: UUID
    snag_id: Optional[UUID] = None
    instruction_type: InstructionType
    subject: str = Field(..., min_length=1, max_length=255)
    body_markdown: str = Field(..., min_length=1)
    issued_to_party_id: Optional[UUID] = None
    response_required_by: Optional[date] = None
    delivery_method: Optional[DeliveryMethod] = None


class InstructionUpdate(BaseModel):
    """Schema for updating an instruction"""
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    body_markdown: Optional[str] = Field(None, min_length=1)
    status: Optional[InstructionStatus] = None
    response_required_by: Optional[date] = None
    delivery_method: Optional[DeliveryMethod] = None


class InstructionGenerate(BaseModel):
    """Schema for generating an instruction from a snag"""
    snag_id: UUID
    instruction_type: InstructionType = InstructionType.ARCHITECT_INSTRUCTION
    include_clauses: List[UUID] = Field(default_factory=list)  # Specific clause IDs to include


class InstructionResponse(BaseModel):
    """Schema for instruction response"""
    id: UUID
    project_id: UUID
    contract_id: UUID
    snag_id: Optional[UUID]
    instruction_type: InstructionType
    ai_reference: Optional[str]
    subject: str
    body_markdown: str
    status: InstructionStatus
    issued_to_party_id: Optional[UUID]
    issued_by_user_id: Optional[UUID]
    issued_at: Optional[datetime]
    response_required_by: Optional[date]
    delivery_method: Optional[DeliveryMethod]
    pdf_document_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class ClauseLinkResponse(BaseModel):
    """Schema for clause link response"""
    clause_node_id: UUID
    clause_number: str
    clause_title: str
    relevance_score: Optional[float]
    link_reason: Optional[str]
