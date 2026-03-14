"""
User model
"""

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    ARCHITECT = "architect"
    CONTRACT_ADMIN = "contract_admin"
    EMPLOYERS_AGENT = "employers_agent"
    PM = "pm"
    SITE_MANAGER = "site_manager"
    QS = "qs"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # For authentication
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", backref="users")
