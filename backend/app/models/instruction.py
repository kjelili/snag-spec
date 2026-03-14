"""
Instruction drafting and issuing models
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Date, Enum, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class InstructionType(str, enum.Enum):
    ARCHITECT_INSTRUCTION = "architect_instruction"
    CA_INSTRUCTION = "ca_instruction"
    EA_INSTRUCTION = "ea_instruction"
    SITE_NOTICE = "site_notice"


class InstructionStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    ISSUED = "issued"
    WITHDRAWN = "withdrawn"
    SUPERSEDED = "superseded"


class DeliveryMethod(str, enum.Enum):
    EMAIL = "email"
    CDE = "cde"
    PRINTED = "printed"
    OTHER = "other"


class Instruction(Base):
    __tablename__ = "instructions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    snag_id = Column(UUID(as_uuid=True), ForeignKey("snags.id"), nullable=True)  # Allow multi-snag via join table
    instruction_type = Column(Enum(InstructionType), nullable=False)
    ai_reference = Column(String(50), unique=True, nullable=True)  # e.g. AI-2026-0012
    subject = Column(String(255), nullable=False)
    body_markdown = Column(Text, nullable=False)
    status = Column(Enum(InstructionStatus), default=InstructionStatus.DRAFT, nullable=False)
    issued_to_party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id"), nullable=True)  # Usually contractor
    issued_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    issued_at = Column(DateTime(timezone=True), nullable=True)
    response_required_by = Column(Date, nullable=True)
    delivery_method = Column(Enum(DeliveryMethod), nullable=True)
    pdf_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="instructions")
    contract = relationship("Contract", backref="instructions")
    snag = relationship("Snag", backref="instructions")
    issued_to_party = relationship("Party", foreign_keys=[issued_to_party_id], backref="instructions_received")
    issuer = relationship("User", foreign_keys=[issued_by_user_id], backref="instructions_issued")


class InstructionClauseLink(Base):
    __tablename__ = "instruction_clause_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instruction_id = Column(UUID(as_uuid=True), ForeignKey("instructions.id"), nullable=False)
    clause_node_id = Column(UUID(as_uuid=True), ForeignKey("clause_nodes.id"), nullable=False)
    clause_version_id = Column(UUID(as_uuid=True), ForeignKey("clause_versions.id"), nullable=False)
    project_clause_text_snapshot = Column(Text, nullable=True)  # Snapshot used at issue time
    relevance_score = Column(Numeric(5, 4), nullable=True)  # Retrieval score
    link_reason = Column(Text, nullable=True)  # Why it links

    instruction = relationship("Instruction", backref="clause_links")
    clause_node = relationship("ClauseNode", backref="instruction_links")
    clause_version = relationship("ClauseVersion", backref="instruction_links")


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApprovalObjectType(str, enum.Enum):
    INSTRUCTION = "instruction"
    SNAG_CLAUSE_MAPPING = "snag_clause_mapping"


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    object_type = Column(Enum(ApprovalObjectType), nullable=False)
    object_id = Column(UUID(as_uuid=True), nullable=False)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False)
    decision_note = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    requester = relationship("User", foreign_keys=[requested_by], backref="approvals_requested")
    approver = relationship("User", foreign_keys=[approver_id], backref="approvals_given")


class AuditLogAction(str, enum.Enum):
    SNAG_CREATED = "SNAG_CREATED"
    CLAUSE_LINKED = "CLAUSE_LINKED"
    INSTRUCTION_ISSUED = "INSTRUCTION_ISSUED"
    INSTRUCTION_APPROVED = "INSTRUCTION_APPROVED"
    INSTRUCTION_WITHDRAWN = "INSTRUCTION_WITHDRAWN"
    PROJECT_CREATED = "PROJECT_CREATED"
    CONTRACT_UPDATED = "CONTRACT_UPDATED"


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(Enum(AuditLogAction), nullable=False)
    object_type = Column(String(100), nullable=True)
    object_id = Column(UUID(as_uuid=True), nullable=True)
    before_json = Column(JSONB, nullable=True)
    after_json = Column(JSONB, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="audit_logs")
    actor = relationship("User", backref="audit_log_entries")
