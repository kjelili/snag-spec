-- Idempotent development bootstrap data for immediate app usage.
-- Creates one organization, one user, one project, one contract form/edition, and one contract.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_project_id UUID;
    v_form_id UUID;
    v_edition_id UUID;
    v_contract_id UUID;
BEGIN
    -- Organization (lowercase enum values to match Python models)
    SELECT id INTO v_org_id
    FROM organizations
    WHERE name = 'Demo Architect Practice'
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO organizations (id, name, type)
        VALUES (gen_random_uuid(), 'Demo Architect Practice', 'architect_practice')
        RETURNING id INTO v_org_id;
    END IF;

    -- User (lowercase enum values)
    SELECT id INTO v_user_id
    FROM users
    WHERE email = 'architect@demo.local'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        INSERT INTO users (id, organization_id, name, email, role, is_active, password_hash)
        VALUES (
            gen_random_uuid(),
            v_org_id,
            'Lead Architect',
            'architect@demo.local',
            'architect',
            true,
            -- bcrypt hash of 'demo123' for development convenience
            '$2b$12$LJ3m4ys4Fp.VWxQLOAaZxuKxGRS5F/untjGnuaUiDen1fvwLSAqGy'
        )
        RETURNING id INTO v_user_id;
    END IF;

    -- Project (lowercase enum values)
    SELECT id INTO v_project_id
    FROM projects
    WHERE name = 'Demo Tower Refurbishment'
    LIMIT 1;

    IF v_project_id IS NULL THEN
        INSERT INTO projects (id, organization_id, name, timezone, status)
        VALUES (
            gen_random_uuid(),
            v_org_id,
            'Demo Tower Refurbishment',
            'Europe/London',
            'construction'
        )
        RETURNING id INTO v_project_id;
    END IF;

    -- Contract form
    SELECT id INTO v_form_id
    FROM contract_forms
    WHERE form_code = 'SBC/Q'
    LIMIT 1;

    IF v_form_id IS NULL THEN
        INSERT INTO contract_forms (id, publisher, form_code, form_name, notes)
        VALUES (
            gen_random_uuid(),
            'JCT',
            'SBC/Q',
            'Standard Building Contract With Quantities',
            'Development bootstrap form'
        )
        RETURNING id INTO v_form_id;
    END IF;

    -- Contract edition
    SELECT id INTO v_edition_id
    FROM contract_editions
    WHERE contract_form_id = v_form_id
      AND edition_year = 2024
    LIMIT 1;

    IF v_edition_id IS NULL THEN
        INSERT INTO contract_editions (id, contract_form_id, edition_year, edition_label)
        VALUES (
            gen_random_uuid(),
            v_form_id,
            2024,
            'JCT 2024 Edition'
        )
        RETURNING id INTO v_edition_id;
    END IF;

    -- Contract
    SELECT id INTO v_contract_id
    FROM contracts
    WHERE project_id = v_project_id
      AND contract_reference = 'DEMO-CONTRACT-001'
    LIMIT 1;

    IF v_contract_id IS NULL THEN
        INSERT INTO contracts (
            id,
            project_id,
            contract_form_id,
            contract_edition_id,
            contract_reference,
            status
        )
        VALUES (
            gen_random_uuid(),
            v_project_id,
            v_form_id,
            v_edition_id,
            'DEMO-CONTRACT-001',
            'live'
        )
        RETURNING id INTO v_contract_id;
    END IF;
END $$;
