"""
Snag schemas for API validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from app.models.snag import SeverityLevel, SnagStatus, VariationRiskLevel


class SnagCreate(BaseModel):
    """Schema for creating a snag"""
    project_id: UUID
    contract_id: UUID
    created_by: Optional[UUID] = None
    defect_type_id: Optional[UUID] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    location_id: Optional[UUID] = None
    severity: SeverityLevel = SeverityLevel.MED
    compliance_flag: bool = False
    variation_risk: Optional[VariationRiskLevel] = None
    due_by: Optional[date] = None


class SnagUpdate(BaseModel):
    """Schema for updating a snag"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[SnagStatus] = None
    severity: Optional[SeverityLevel] = None
    compliance_flag: Optional[bool] = None
    variation_risk: Optional[VariationRiskLevel] = None
    due_by: Optional[date] = None
    location_id: Optional[UUID] = None


class SnagResponse(BaseModel):
    """Schema for snag response"""
    id: UUID
    project_id: UUID
    contract_id: UUID
    created_by: UUID
    defect_type_id: Optional[UUID]
    title: str
    description: str
    location_id: Optional[UUID]
    status: SnagStatus
    severity: SeverityLevel
    compliance_flag: bool
    variation_risk: Optional[VariationRiskLevel]
    discovered_at: datetime
    due_by: Optional[date]
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


class LocationCreate(BaseModel):
    """Schema for creating a location"""
    project_id: UUID
    building: Optional[str] = None
    level: Optional[str] = None
    zone: Optional[str] = None
    room: Optional[str] = None
    grid_ref: Optional[str] = None
    drawing_ref: Optional[str] = None
    bim_guid: Optional[str] = None
    gps_lat: Optional[str] = None
    gps_lng: Optional[str] = None


class LocationResponse(BaseModel):
    """Schema for location response"""
    id: UUID
    project_id: UUID
    building: Optional[str]
    level: Optional[str]
    zone: Optional[str]
    room: Optional[str]
    grid_ref: Optional[str]
    drawing_ref: Optional[str]
    bim_guid: Optional[str]
    gps_lat: Optional[str]
    gps_lng: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
