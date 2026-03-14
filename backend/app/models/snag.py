"""
Snagging domain models
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Date, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class DefectCategory(str, enum.Enum):
    QUALITY = "quality"
    SAFETY = "safety"
    COMPLIANCE = "compliance"
    INCOMPLETE = "incomplete"
    DAMAGE = "damage"


class SeverityLevel(str, enum.Enum):
    LOW = "low"
    MED = "med"
    HIGH = "high"
    CRITICAL = "critical"


class VariationRiskLevel(str, enum.Enum):
    LOW = "low"
    MED = "med"
    HIGH = "high"


class DefectType(Base):
    __tablename__ = "defect_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)  # e.g. "Fire stopping non-compliance"
    category = Column(Enum(DefectCategory), nullable=False)
    default_severity = Column(Enum(SeverityLevel), nullable=False)
    typical_keywords = Column(ARRAY(String), nullable=True)


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    building = Column(String(100), nullable=True)
    level = Column(String(50), nullable=True)
    zone = Column(String(100), nullable=True)
    room = Column(String(100), nullable=True)
    grid_ref = Column(String(50), nullable=True)
    drawing_ref = Column(String(100), nullable=True)
    bim_guid = Column(String(255), nullable=True)
    gps_lat = Column(String(50), nullable=True)
    gps_lng = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="locations")


class SnagStatus(str, enum.Enum):
    NEW = "new"
    TRIAGE = "triage"
    NEEDS_INFO = "needs_info"
    READY_TO_INSTRUCT = "ready_to_instruct"
    INSTRUCTED = "instructed"
    IN_PROGRESS = "in_progress"
    FIXED_PENDING_VERIFY = "fixed_pending_verify"
    CLOSED = "closed"


class Snag(Base):
    __tablename__ = "snags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    defect_type_id = Column(UUID(as_uuid=True), ForeignKey("defect_types.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True)
    status = Column(Enum(SnagStatus), default=SnagStatus.NEW, nullable=False)
    severity = Column(Enum(SeverityLevel), default=SeverityLevel.MED, nullable=False)
    compliance_flag = Column(Boolean, default=False, nullable=False)
    variation_risk = Column(Enum(VariationRiskLevel), nullable=True)
    discovered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    due_by = Column(Date, nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", backref="snags")
    contract = relationship("Contract", backref="snags")
    creator = relationship("User", backref="snags_created")
    defect_type = relationship("DefectType", backref="snags")
    location = relationship("Location", backref="snags")


class MediaType(str, enum.Enum):
    PHOTO = "photo"
    VIDEO = "video"
    PDF = "pdf"
    OTHER = "other"


class SnagMedia(Base):
    __tablename__ = "snag_media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snag_id = Column(UUID(as_uuid=True), ForeignKey("snags.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    media_type = Column(Enum(MediaType), nullable=False)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    caption = Column(String(500), nullable=True)

    snag = relationship("Snag", backref="media")
    # document relationship defined in document.py to avoid circular import


class SnagComment(Base):
    __tablename__ = "snag_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snag_id = Column(UUID(as_uuid=True), ForeignKey("snags.id"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    snag = relationship("Snag", backref="comments")
    author = relationship("User", backref="snag_comments")
