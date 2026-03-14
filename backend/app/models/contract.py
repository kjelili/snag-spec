"""
Contract and clause library models
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer, Text, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class ContractForm(Base):
    __tablename__ = "contract_forms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    publisher = Column(String(50), default="JCT", nullable=False)
    form_code = Column(String(50), nullable=False)  # e.g. SBC/Q, SBC/XQ, DB
    form_name = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContractEdition(Base):
    __tablename__ = "contract_editions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_form_id = Column(UUID(as_uuid=True), ForeignKey("contract_forms.id"), nullable=False)
    edition_year = Column(Integer, nullable=False)  # e.g. 2016, 2024
    edition_label = Column(String(255), nullable=False)  # e.g. "JCT 2016 Edition"
    effective_date = Column(Date, nullable=True)
    source_reference = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract_form = relationship("ContractForm", backref="editions")


class ClauseNode(Base):
    """Stable identity of a clause across versions"""
    __tablename__ = "clause_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_edition_id = Column(UUID(as_uuid=True), ForeignKey("contract_editions.id"), nullable=False)
    clause_number = Column(String(50), nullable=False)  # e.g. 2.1, 3.18, 2.38
    clause_title = Column(String(255), nullable=False)
    canonical_path = Column(String(255), nullable=True)  # e.g. section=3 quality/defects
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract_edition = relationship("ContractEdition", backref="clause_nodes")


class ClauseVersion(Base):
    """The text can change across editions"""
    __tablename__ = "clause_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clause_node_id = Column(UUID(as_uuid=True), ForeignKey("clause_nodes.id"), nullable=False)
    version_label = Column(String(100), default="published", nullable=False)  # e.g. "published", "errata-1"
    clause_text = Column(Text, nullable=False)  # Full text
    plain_english_summary = Column(Text, nullable=True)
    obligations_json = Column(JSONB, nullable=True)  # Structured extraction: who/what/when
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    clause_node = relationship("ClauseNode", backref="versions")


class ClauseTag(Base):
    __tablename__ = "clause_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)  # e.g. defective_work, workmanship, materials


class ClauseNodeTag(Base):
    """Many-to-many relationship between clause nodes and tags"""
    __tablename__ = "clause_node_tags"

    clause_node_id = Column(UUID(as_uuid=True), ForeignKey("clause_nodes.id"), primary_key=True)
    clause_tag_id = Column(UUID(as_uuid=True), ForeignKey("clause_tags.id"), primary_key=True)

    clause_node = relationship("ClauseNode", backref="tag_links")
    clause_tag = relationship("ClauseTag", backref="node_links")


class Contract(Base):
    """A project's contract instance"""
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    contract_form_id = Column(UUID(as_uuid=True), ForeignKey("contract_forms.id"), nullable=False)
    contract_edition_id = Column(UUID(as_uuid=True), ForeignKey("contract_editions.id"), nullable=False)
    contract_reference = Column(String(100), nullable=True)  # e.g. job no.
    date_of_contract = Column(Date, nullable=True)
    rectification_period_end = Column(Date, nullable=True)
    contract_documents_index_json = Column(JSONB, nullable=True)  # ER/spec/drawings list
    status = Column(String(50), default="live", nullable=False)  # live, terminated, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="contracts")
    contract_form = relationship("ContractForm", backref="contract_instances")
    contract_edition = relationship("ContractEdition", backref="contract_instances")


class ContractAmendment(Base):
    __tablename__ = "contract_amendments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    amendment_name = Column(String(255), nullable=False)  # e.g. "Schedule of Amendments Rev C"
    amendment_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    effective_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", backref="amendments")


class ContractClauseOverride(Base):
    """Project-specific clause modifications"""
    __tablename__ = "contract_clause_overrides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    clause_node_id = Column(UUID(as_uuid=True), ForeignKey("clause_nodes.id"), nullable=False)
    override_type = Column(String(50), nullable=False)  # replace_text, append_text, delete_text, re_number, supplementary_provision
    override_text = Column(Text, nullable=True)
    human_summary = Column(Text, nullable=True)
    precedence_order = Column(Integer, default=0, nullable=False)  # Resolves multiple amendments
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", backref="clause_overrides")
    clause_node = relationship("ClauseNode", backref="overrides")
    creator = relationship("User", backref="clause_overrides_created")
