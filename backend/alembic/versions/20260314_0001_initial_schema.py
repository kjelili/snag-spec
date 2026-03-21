"""initial schema

Revision ID: 20260314_0001
Revises:
Create Date: 2026-03-14 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

revision: str = "20260314_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables with proper DDL."""

    # --- Enums ---
    op.execute("CREATE TYPE organizationtype AS ENUM ('architect_practice', 'contractor', 'client', 'consultant')")
    op.execute("CREATE TYPE userrole AS ENUM ('architect', 'contract_admin', 'employers_agent', 'pm', 'site_manager', 'qs', 'viewer')")
    op.execute("CREATE TYPE projectstatus AS ENUM ('precon', 'construction', 'defects_period', 'closed')")
    op.execute("CREATE TYPE partytype AS ENUM ('employer', 'contractor', 'architect', 'ca', 'employers_agent', 'pd', 'pc')")
    op.execute("CREATE TYPE defectcategory AS ENUM ('quality', 'safety', 'compliance', 'incomplete', 'damage')")
    op.execute("CREATE TYPE severitylevel AS ENUM ('low', 'med', 'high', 'critical')")
    op.execute("CREATE TYPE variationrisklevel AS ENUM ('low', 'med', 'high')")
    op.execute("CREATE TYPE snagstatus AS ENUM ('new', 'triage', 'needs_info', 'ready_to_instruct', 'instructed', 'in_progress', 'fixed_pending_verify', 'closed')")
    op.execute("CREATE TYPE mediatype AS ENUM ('photo', 'video', 'pdf', 'other')")
    op.execute("CREATE TYPE instructiontype AS ENUM ('architect_instruction', 'ca_instruction', 'ea_instruction', 'site_notice')")
    op.execute("CREATE TYPE instructionstatus AS ENUM ('draft', 'review', 'approved', 'issued', 'withdrawn', 'superseded')")
    op.execute("CREATE TYPE deliverymethod AS ENUM ('email', 'cde', 'printed', 'other')")
    op.execute("CREATE TYPE approvalstatus AS ENUM ('pending', 'approved', 'rejected')")
    op.execute("CREATE TYPE approvalobjecttype AS ENUM ('instruction', 'snag_clause_mapping')")
    op.execute("CREATE TYPE auditlogaction AS ENUM ('SNAG_CREATED', 'CLAUSE_LINKED', 'INSTRUCTION_ISSUED', 'INSTRUCTION_APPROVED', 'INSTRUCTION_WITHDRAWN', 'PROJECT_CREATED', 'CONTRACT_UPDATED')")

    # --- Tables ---
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.Enum("architect_practice", "contractor", "client", "consultant", name="organizationtype", create_type=False), nullable=False),
        sa.Column("address_json", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("role", sa.Enum("architect", "contract_admin", "employers_agent", "pm", "site_manager", "qs", "viewer", name="userrole", create_type=False), nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("site_address_json", JSONB, nullable=True),
        sa.Column("timezone", sa.String(50), default="Europe/London", nullable=False),
        sa.Column("status", sa.Enum("precon", "construction", "defects_period", "closed", name="projectstatus", create_type=False), default="construction", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "parties",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("party_type", sa.Enum("employer", "contractor", "architect", "ca", "employers_agent", "pd", "pc", name="partytype", create_type=False), nullable=False),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("contact_name", sa.String(255), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "contract_forms",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("publisher", sa.String(50), default="JCT", nullable=False),
        sa.Column("form_code", sa.String(50), nullable=False),
        sa.Column("form_name", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "contract_editions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contract_form_id", UUID(as_uuid=True), sa.ForeignKey("contract_forms.id"), nullable=False),
        sa.Column("edition_year", sa.Integer, nullable=False),
        sa.Column("edition_label", sa.String(255), nullable=False),
        sa.Column("effective_date", sa.Date, nullable=True),
        sa.Column("source_reference", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "clause_nodes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contract_edition_id", UUID(as_uuid=True), sa.ForeignKey("contract_editions.id"), nullable=False),
        sa.Column("clause_number", sa.String(50), nullable=False),
        sa.Column("clause_title", sa.String(255), nullable=False),
        sa.Column("canonical_path", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "clause_versions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("clause_node_id", UUID(as_uuid=True), sa.ForeignKey("clause_nodes.id"), nullable=False),
        sa.Column("version_label", sa.String(100), default="published", nullable=False),
        sa.Column("clause_text", sa.Text, nullable=False),
        sa.Column("plain_english_summary", sa.Text, nullable=True),
        sa.Column("obligations_json", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "clause_tags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
    )

    op.create_table(
        "clause_node_tags",
        sa.Column("clause_node_id", UUID(as_uuid=True), sa.ForeignKey("clause_nodes.id"), primary_key=True),
        sa.Column("clause_tag_id", UUID(as_uuid=True), sa.ForeignKey("clause_tags.id"), primary_key=True),
    )

    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("storage_uri", sa.String(500), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("uploaded_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "contracts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("contract_form_id", UUID(as_uuid=True), sa.ForeignKey("contract_forms.id"), nullable=False),
        sa.Column("contract_edition_id", UUID(as_uuid=True), sa.ForeignKey("contract_editions.id"), nullable=False),
        sa.Column("contract_reference", sa.String(100), nullable=True),
        sa.Column("date_of_contract", sa.Date, nullable=True),
        sa.Column("rectification_period_end", sa.Date, nullable=True),
        sa.Column("contract_documents_index_json", JSONB, nullable=True),
        sa.Column("status", sa.String(50), default="live", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "contract_amendments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contract_id", UUID(as_uuid=True), sa.ForeignKey("contracts.id"), nullable=False),
        sa.Column("amendment_name", sa.String(255), nullable=False),
        sa.Column("amendment_document_id", UUID(as_uuid=True), sa.ForeignKey("documents.id"), nullable=True),
        sa.Column("effective_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "contract_clause_overrides",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contract_id", UUID(as_uuid=True), sa.ForeignKey("contracts.id"), nullable=False),
        sa.Column("clause_node_id", UUID(as_uuid=True), sa.ForeignKey("clause_nodes.id"), nullable=False),
        sa.Column("override_type", sa.String(50), nullable=False),
        sa.Column("override_text", sa.Text, nullable=True),
        sa.Column("human_summary", sa.Text, nullable=True),
        sa.Column("precedence_order", sa.Integer, default=0, nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "defect_types",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.Enum("quality", "safety", "compliance", "incomplete", "damage", name="defectcategory", create_type=False), nullable=False),
        sa.Column("default_severity", sa.Enum("low", "med", "high", "critical", name="severitylevel", create_type=False), nullable=False),
        sa.Column("typical_keywords", ARRAY(sa.String), nullable=True),
    )

    op.create_table(
        "locations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("building", sa.String(100), nullable=True),
        sa.Column("level", sa.String(50), nullable=True),
        sa.Column("zone", sa.String(100), nullable=True),
        sa.Column("room", sa.String(100), nullable=True),
        sa.Column("grid_ref", sa.String(50), nullable=True),
        sa.Column("drawing_ref", sa.String(100), nullable=True),
        sa.Column("bim_guid", sa.String(255), nullable=True),
        sa.Column("gps_lat", sa.String(50), nullable=True),
        sa.Column("gps_lng", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "snags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("contract_id", UUID(as_uuid=True), sa.ForeignKey("contracts.id"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("defect_type_id", UUID(as_uuid=True), sa.ForeignKey("defect_types.id"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("location_id", UUID(as_uuid=True), sa.ForeignKey("locations.id"), nullable=True),
        sa.Column("status", sa.Enum("new", "triage", "needs_info", "ready_to_instruct", "instructed", "in_progress", "fixed_pending_verify", "closed", name="snagstatus", create_type=False), default="new", nullable=False),
        sa.Column("severity", sa.Enum("low", "med", "high", "critical", name="severitylevel", create_type=False), default="med", nullable=False),
        sa.Column("compliance_flag", sa.Boolean, default=False, nullable=False),
        sa.Column("variation_risk", sa.Enum("low", "med", "high", name="variationrisklevel", create_type=False), nullable=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("due_by", sa.Date, nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "snag_media",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("snag_id", UUID(as_uuid=True), sa.ForeignKey("snags.id"), nullable=False),
        sa.Column("document_id", UUID(as_uuid=True), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("media_type", sa.Enum("photo", "video", "pdf", "other", name="mediatype", create_type=False), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("caption", sa.String(500), nullable=True),
    )

    op.create_table(
        "snag_comments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("snag_id", UUID(as_uuid=True), sa.ForeignKey("snags.id"), nullable=False),
        sa.Column("author_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "instructions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("contract_id", UUID(as_uuid=True), sa.ForeignKey("contracts.id"), nullable=False),
        sa.Column("snag_id", UUID(as_uuid=True), sa.ForeignKey("snags.id"), nullable=True),
        sa.Column("instruction_type", sa.Enum("architect_instruction", "ca_instruction", "ea_instruction", "site_notice", name="instructiontype", create_type=False), nullable=False),
        sa.Column("ai_reference", sa.String(50), unique=True, nullable=True),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("body_markdown", sa.Text, nullable=False),
        sa.Column("status", sa.Enum("draft", "review", "approved", "issued", "withdrawn", "superseded", name="instructionstatus", create_type=False), default="draft", nullable=False),
        sa.Column("issued_to_party_id", UUID(as_uuid=True), sa.ForeignKey("parties.id"), nullable=True),
        sa.Column("issued_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response_required_by", sa.Date, nullable=True),
        sa.Column("delivery_method", sa.Enum("email", "cde", "printed", "other", name="deliverymethod", create_type=False), nullable=True),
        sa.Column("pdf_document_id", UUID(as_uuid=True), sa.ForeignKey("documents.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "instruction_clause_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("instruction_id", UUID(as_uuid=True), sa.ForeignKey("instructions.id"), nullable=False),
        sa.Column("clause_node_id", UUID(as_uuid=True), sa.ForeignKey("clause_nodes.id"), nullable=False),
        sa.Column("clause_version_id", UUID(as_uuid=True), sa.ForeignKey("clause_versions.id"), nullable=False),
        sa.Column("project_clause_text_snapshot", sa.Text, nullable=True),
        sa.Column("relevance_score", sa.Numeric(5, 4), nullable=True),
        sa.Column("link_reason", sa.Text, nullable=True),
    )

    op.create_table(
        "approvals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("object_type", sa.Enum("instruction", "snag_clause_mapping", name="approvalobjecttype", create_type=False), nullable=False),
        sa.Column("object_id", UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approver_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", name="approvalstatus", create_type=False), default="pending", nullable=False),
        sa.Column("decision_note", sa.Text, nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.Enum("SNAG_CREATED", "CLAUSE_LINKED", "INSTRUCTION_ISSUED", "INSTRUCTION_APPROVED", "INSTRUCTION_WITHDRAWN", "PROJECT_CREATED", "CONTRACT_UPDATED", name="auditlogaction", create_type=False), nullable=False),
        sa.Column("object_type", sa.String(100), nullable=True),
        sa.Column("object_id", UUID(as_uuid=True), nullable=True),
        sa.Column("before_json", JSONB, nullable=True),
        sa.Column("after_json", JSONB, nullable=True),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "integration_targets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("config_json", sa.String(2000), nullable=True),
        sa.Column("enabled", sa.String(10), default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # FIX #26 LOW: Add indexes on frequently queried columns
    op.create_index("ix_snags_project_id", "snags", ["project_id"])
    op.create_index("ix_snags_status", "snags", ["status"])
    op.create_index("ix_snags_severity", "snags", ["severity"])
    op.create_index("ix_snags_contract_id", "snags", ["contract_id"])
    op.create_index("ix_snags_created_by", "snags", ["created_by"])
    op.create_index("ix_instructions_project_id", "instructions", ["project_id"])
    op.create_index("ix_instructions_status", "instructions", ["status"])
    op.create_index("ix_instructions_snag_id", "instructions", ["snag_id"])
    op.create_index("ix_contracts_project_id", "contracts", ["project_id"])
    op.create_index("ix_clause_nodes_contract_edition_id", "clause_nodes", ["contract_edition_id"])


def downgrade() -> None:
    """Drop all tables and enums in reverse order."""
    tables = [
        "integration_targets", "audit_log", "approvals",
        "instruction_clause_links", "instructions",
        "snag_comments", "snag_media", "snags", "locations", "defect_types",
        "contract_clause_overrides", "contract_amendments", "contracts",
        "clause_node_tags", "clause_tags", "clause_versions", "clause_nodes",
        "contract_editions", "contract_forms",
        "documents", "parties", "projects", "users", "organizations",
    ]
    for table in tables:
        op.drop_table(table)

    enums = [
        "auditlogaction", "approvalobjecttype", "approvalstatus",
        "deliverymethod", "instructionstatus", "instructiontype",
        "mediatype", "snagstatus", "variationrisklevel",
        "severitylevel", "defectcategory", "partytype",
        "projectstatus", "userrole", "organizationtype",
    ]
    for enum_name in enums:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
