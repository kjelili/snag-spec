-- Seed data for Snag-to-Spec application
-- Enum values use lowercase to match Python model definitions exactly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Contract Forms
INSERT INTO contract_forms (id, publisher, form_code, form_name, notes)
SELECT gen_random_uuid(), v.publisher, v.form_code, v.form_name, v.notes
FROM (
    VALUES
        ('JCT', 'SBC/Q', 'Standard Building Contract With Quantities', 'Most common JCT form'),
        ('JCT', 'SBC/XQ', 'Standard Building Contract Without Quantities', 'For smaller projects'),
        ('JCT', 'DB', 'Design and Build Contract', 'Contractor-led design'),
        ('JCT', 'MP', 'Major Project Construction Contract', 'For large projects'),
        ('JCT', 'IC', 'Intermediate Building Contract', 'Medium-sized projects')
) AS v(publisher, form_code, form_name, notes)
WHERE NOT EXISTS (
    SELECT 1
    FROM contract_forms cf
    WHERE cf.form_code = v.form_code
);

-- Clause Tags (for clause categorization)
INSERT INTO clause_tags (id, name) VALUES
    (gen_random_uuid(), 'defective_work'),
    (gen_random_uuid(), 'workmanship'),
    (gen_random_uuid(), 'materials'),
    (gen_random_uuid(), 'rectification_period'),
    (gen_random_uuid(), 'schedule_of_defects'),
    (gen_random_uuid(), 'making_good'),
    (gen_random_uuid(), 'statutory_compliance'),
    (gen_random_uuid(), 'quality'),
    (gen_random_uuid(), 'inspection_testing'),
    (gen_random_uuid(), 'completion'),
    (gen_random_uuid(), 'practical_completion_support'),
    (gen_random_uuid(), 'protection_of_works'),
    (gen_random_uuid(), 'make_good_damage'),
    (gen_random_uuid(), 'contract_documents_priority'),
    (gen_random_uuid(), 'instructions'),
    (gen_random_uuid(), 'variation_risk'),
    (gen_random_uuid(), 'non_conformance'),
    (gen_random_uuid(), 'removal_replacement')
ON CONFLICT (name) DO NOTHING;

-- Defect Types (lowercase enum values: defectcategory and severitylevel)
INSERT INTO defect_types (id, name, category, default_severity, typical_keywords)
SELECT gen_random_uuid(), v.name, v.category::defectcategory, v.default_severity::severitylevel, v.typical_keywords
FROM (
    VALUES
        ('Fire stopping non-compliance', 'compliance', 'critical', ARRAY['fire stopping', 'fire seal', 'compartmentation', 'penetration']),
        ('Compartmentation/doors/fire rating non-compliance', 'compliance', 'critical', ARRAY['fire door', 'fire rating', 'compartment', 'FD30', 'FD60']),
        ('Waterproofing/water ingress', 'quality', 'high', ARRAY['water ingress', 'leak', 'damp', 'waterproofing', 'moisture']),
        ('Structural cracking/movement', 'safety', 'high', ARRAY['crack', 'structural', 'movement', 'settlement', 'deflection']),
        ('MEP functional failure', 'quality', 'high', ARRAY['MEP', 'mechanical', 'electrical', 'plumbing', 'not working', 'failure']),
        ('Spec/drawing non-conformance', 'quality', 'med', ARRAY['not to spec', 'wrong', 'incorrect', 'not per drawing']),
        ('Workmanship finish defects', 'quality', 'med', ARRAY['finish', 'finishing', 'cosmetic', 'appearance', 'quality of finish']),
        ('Incomplete works', 'incomplete', 'med', ARRAY['incomplete', 'missing', 'not finished', 'outstanding']),
        ('Damage to completed work', 'damage', 'med', ARRAY['damaged', 'damage', 'scratched', 'dent', 'broken']),
        ('Access/maintenance non-compliance', 'compliance', 'med', ARRAY['access', 'maintenance', 'clearance', 'space'])
) AS v(name, category, default_severity, typical_keywords)
WHERE NOT EXISTS (
    SELECT 1
    FROM defect_types dt
    WHERE dt.name = v.name
);
