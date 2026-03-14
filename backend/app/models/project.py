"""
Project model
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    PRECON = "precon"
    CONSTRUCTION = "construction"
    DEFECTS_PERIOD = "defects_period"
    CLOSED = "closed"


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    site_address_json = Column(JSONB, nullable=True)
    timezone = Column(String(50), default="Europe/London", nullable=False)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.CONSTRUCTION, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", backref="projects")


class PartyType(str, enum.Enum):
    EMPLOYER = "employer"
    CONTRACTOR = "contractor"
    ARCHITECT = "architect"
    CA = "ca"
    EMPLOYERS_AGENT = "employers_agent"
    PD = "pd"
    PC = "pc"


class Party(Base):
    __tablename__ = "parties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    party_type = Column(Enum(PartyType), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="parties")
    organization = relationship("Organization", backref="party_links")
