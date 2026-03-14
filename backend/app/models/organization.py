"""
Organization model
"""

from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class OrganizationType(str, enum.Enum):
    ARCHITECT_PRACTICE = "architect_practice"
    CONTRACTOR = "contractor"
    CLIENT = "client"
    CONSULTANT = "consultant"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(Enum(OrganizationType), nullable=False)
    address_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
