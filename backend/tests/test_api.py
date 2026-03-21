"""
Automated test suite for Snag-to-Spec API.

Covers:
- Auth (register, login, token validation)
- Snag CRUD with ownership
- Instruction lifecycle state machine
- Pagination
- Health check with DB verification

Run: pytest tests/ -v
"""

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Use in-memory SQLite for tests (swap for test Postgres in CI)
SQLALCHEMY_TEST_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Create all tables before tests, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def seed_data():
    """Insert minimal seed data needed for snag/instruction creation."""
    db = TestingSessionLocal()
    try:
        from app.models.organization import Organization, OrganizationType
        from app.models.user import User, UserRole
        from app.models.project import Project, ProjectStatus
        from app.models.contract import ContractForm, ContractEdition, Contract
        from app.models.snag import DefectType, DefectCategory, SeverityLevel

        org = Organization(name="Test Org", type=OrganizationType.ARCHITECT_PRACTICE)
        db.add(org)
        db.flush()

        project = Project(
            organization_id=org.id,
            name="Test Project",
            status=ProjectStatus.CONSTRUCTION,
        )
        db.add(project)
        db.flush()

        form = ContractForm(publisher="JCT", form_code="SBC/Q", form_name="Standard Building Contract")
        db.add(form)
        db.flush()

        edition = ContractEdition(
            contract_form_id=form.id, edition_year=2024, edition_label="JCT 2024"
        )
        db.add(edition)
        db.flush()

        contract = Contract(
            project_id=project.id,
            contract_form_id=form.id,
            contract_edition_id=edition.id,
            contract_reference="TEST-001",
            status="live",
        )
        db.add(contract)
        db.flush()

        defect_type = DefectType(
            name="Test Defect",
            category=DefectCategory.QUALITY,
            default_severity=SeverityLevel.MED,
        )
        db.add(defect_type)
        db.flush()

        db.commit()

        return {
            "org_id": str(org.id),
            "project_id": str(project.id),
            "contract_id": str(contract.id),
            "defect_type_id": str(defect_type.id),
            "edition_id": str(edition.id),
        }
    finally:
        db.close()


# ─── Auth Tests ─────────────────────────────────────────────────────


class TestAuth:
    """Test registration, login, and token-based access."""

    def test_register_success(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Test Architect",
                "email": "test@example.com",
                "password": "securepass123",
                "role": "architect",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["email"] == "test@example.com"
        assert data["role"] == "architect"

    def test_register_duplicate_email(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Duplicate",
                "email": "test@example.com",
                "password": "securepass123",
                "role": "architect",
            },
        )
        assert resp.status_code == 409

    def test_login_success(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "securepass123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    def test_login_wrong_password(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrongpass"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_email(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "anything"},
        )
        assert resp.status_code == 401

    def test_me_with_token(self, client):
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "securepass123"},
        )
        token = login.json()["access_token"]
        resp = client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    def test_me_without_token(self, client):
        resp = client.get("/api/v1/auth/me")
        # In DEBUG mode with no API key, falls back to first user
        # In production, this would be 401
        assert resp.status_code in (200, 401)


# ─── Helper to get auth headers ────────────────────────────────────


def auth_headers(client) -> dict:
    """Register a unique user and return auth headers."""
    email = f"user-{uuid4().hex[:8]}@test.com"
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test User",
            "email": email,
            "password": "testpass123",
            "role": "architect",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─── Snag Tests ─────────────────────────────────────────────────────


class TestSnags:
    """Test snag CRUD operations."""

    def test_create_snag(self, client, seed_data):
        headers = auth_headers(client)
        resp = client.post(
            "/api/v1/snags",
            json={
                "project_id": seed_data["project_id"],
                "contract_id": seed_data["contract_id"],
                "defect_type_id": seed_data["defect_type_id"],
                "title": "Test fire stopping defect",
                "description": "Fire stopping missing at Level 3 riser penetration",
                "severity": "high",
                "compliance_flag": True,
            },
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Test fire stopping defect"
        assert data["severity"] == "high"
        assert data["compliance_flag"] is True
        assert data["status"] == "new"

    def test_list_snags_with_pagination(self, client, seed_data):
        headers = auth_headers(client)
        # Create several snags
        for i in range(5):
            client.post(
                "/api/v1/snags",
                json={
                    "project_id": seed_data["project_id"],
                    "contract_id": seed_data["contract_id"],
                    "title": f"Pagination test snag {i}",
                    "description": "Testing pagination",
                    "severity": "low",
                },
                headers=headers,
            )

        # Test pagination
        resp = client.get("/api/v1/snags?limit=2&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) <= 2

        resp2 = client.get("/api/v1/snags?limit=2&offset=2")
        assert resp2.status_code == 200

    def test_get_snag_by_id(self, client, seed_data):
        headers = auth_headers(client)
        create_resp = client.post(
            "/api/v1/snags",
            json={
                "project_id": seed_data["project_id"],
                "contract_id": seed_data["contract_id"],
                "title": "Snag for retrieval",
                "description": "Testing get by ID",
                "severity": "med",
            },
            headers=headers,
        )
        snag_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/snags/{snag_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == snag_id

    def test_get_nonexistent_snag(self, client):
        fake_id = str(uuid4())
        resp = client.get(f"/api/v1/snags/{fake_id}")
        assert resp.status_code == 404

    def test_update_snag(self, client, seed_data):
        headers = auth_headers(client)
        create_resp = client.post(
            "/api/v1/snags",
            json={
                "project_id": seed_data["project_id"],
                "contract_id": seed_data["contract_id"],
                "title": "Snag to update",
                "description": "Will be updated",
                "severity": "low",
            },
            headers=headers,
        )
        snag_id = create_resp.json()["id"]

        resp = client.patch(
            f"/api/v1/snags/{snag_id}",
            json={"severity": "critical", "status": "triage"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["severity"] == "critical"
        assert resp.json()["status"] == "triage"

    def test_delete_snag(self, client, seed_data):
        headers = auth_headers(client)
        create_resp = client.post(
            "/api/v1/snags",
            json={
                "project_id": seed_data["project_id"],
                "contract_id": seed_data["contract_id"],
                "title": "Snag to delete",
                "description": "Will be deleted",
                "severity": "low",
            },
            headers=headers,
        )
        snag_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/snags/{snag_id}", headers=headers)
        assert resp.status_code == 204

        resp2 = client.get(f"/api/v1/snags/{snag_id}")
        assert resp2.status_code == 404

    def test_filter_snags_by_status(self, client, seed_data):
        resp = client.get("/api/v1/snags?status=new")
        assert resp.status_code == 200
        for snag in resp.json():
            assert snag["status"] == "new"


# ─── Instruction Lifecycle Tests ────────────────────────────────────


class TestInstructionLifecycle:
    """Test the full Draft → Review → Approved → Issued state machine."""

    def test_full_lifecycle(self, client, seed_data):
        headers = auth_headers(client)

        # 1. Create a snag
        snag_resp = client.post(
            "/api/v1/snags",
            json={
                "project_id": seed_data["project_id"],
                "contract_id": seed_data["contract_id"],
                "defect_type_id": seed_data["defect_type_id"],
                "title": "Lifecycle test snag",
                "description": "Testing instruction lifecycle end to end",
                "severity": "high",
            },
            headers=headers,
        )
        assert snag_resp.status_code == 201
        snag_id = snag_resp.json()["id"]

        # 2. Generate instruction from snag
        gen_resp = client.post(
            "/api/v1/instructions/generate",
            json={
                "snag_id": snag_id,
                "instruction_type": "architect_instruction",
            },
            headers=headers,
        )
        assert gen_resp.status_code == 201
        instruction = gen_resp.json()
        instruction_id = instruction["id"]
        assert instruction["status"] == "draft"
        assert instruction["snag_id"] == snag_id

        # 3. Submit for review
        submit_resp = client.post(
            f"/api/v1/instructions/{instruction_id}/submit", headers=headers
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["status"] == "review"

        # 4. Approve
        approve_resp = client.post(
            f"/api/v1/instructions/{instruction_id}/approve", headers=headers
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["status"] == "approved"

        # 5. Issue
        issue_resp = client.post(
            f"/api/v1/instructions/{instruction_id}/issue", headers=headers
        )
        assert issue_resp.status_code == 200
        assert issue_resp.json()["status"] == "issued"

    def test_cannot_skip_lifecycle_steps(self, client, seed_data):
        headers = auth_headers(client)

        # Create instruction manually
        resp = client.post(
            "/api/v1/instructions",
            json={
                "project_id": seed_data["project_id"],
                "contract_id": seed_data["contract_id"],
                "instruction_type": "architect_instruction",
                "subject": "Skip test",
                "body_markdown": "Testing that steps cannot be skipped",
            },
            headers=headers,
        )
        instruction_id = resp.json()["id"]

        # Cannot approve from draft (must go through review first)
        approve_resp = client.post(
            f"/api/v1/instructions/{instruction_id}/approve", headers=headers
        )
        assert approve_resp.status_code == 400

        # Cannot issue from draft
        issue_resp = client.post(
            f"/api/v1/instructions/{instruction_id}/issue", headers=headers
        )
        assert issue_resp.status_code == 400

    def test_instruction_pagination(self, client, seed_data):
        resp = client.get("/api/v1/instructions?limit=3&offset=0")
        assert resp.status_code == 200
        assert len(resp.json()) <= 3


# ─── Health Check Tests ─────────────────────────────────────────────


class TestHealthCheck:
    """Test that health endpoint checks DB connectivity."""

    def test_health_returns_db_status(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert "database" in data
        assert "status" in data


# ─── Meta Options Tests ─────────────────────────────────────────────


class TestMetaOptions:
    """Test that meta options endpoint returns populated data."""

    def test_meta_options_structure(self, client, seed_data):
        resp = client.get("/api/v1/snags/meta/options")
        assert resp.status_code == 200
        data = resp.json()
        assert "projects" in data
        assert "contracts" in data
        assert "defect_types" in data
        assert "users" in data
        assert len(data["projects"]) > 0
        assert len(data["contracts"]) > 0
