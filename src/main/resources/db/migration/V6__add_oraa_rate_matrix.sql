-- V6: Add ORAA rate codes and 2025-07 amounts required by strict Schedule 1 policy lookup.
-- Ref: University of Sydney Enterprise Agreement 2023-2026, Schedule 1 Clause 3.1(a)

-- ===========================================================================
-- ORAA rate codes (idempotent)
-- ===========================================================================

INSERT INTO rate_code (
    code,
    task_type,
    description,
    default_associated_hours,
    default_delivery_hours,
    requires_phd,
    is_repeatable,
    ea_clause_reference
)
SELECT
    seed.code,
    seed.task_type,
    seed.description,
    seed.default_associated_hours,
    seed.default_delivery_hours,
    seed.requires_phd,
    seed.is_repeatable,
    seed.ea_clause_reference
FROM (
    VALUES
        ('AO1_DE1', 'ORAA', 'ORAA – PhD holder or unit coordinator', 0.00, 1.00, TRUE, FALSE, 'Schedule 1 Clause 3.1(a)'),
        ('AO2_DE2', 'ORAA', 'ORAA – standard eligibility', 0.00, 1.00, FALSE, FALSE, 'Schedule 1 Clause 3.1(a)')
) AS seed(code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
WHERE NOT EXISTS (
    SELECT 1
    FROM rate_code rc
    WHERE rc.code = seed.code
);

-- ===========================================================================
-- ORAA rate amounts for 2025-07 window (idempotent)
-- ===========================================================================

INSERT INTO rate_amount (
    rate_code_id,
    policy_version_id,
    year_label,
    effective_from,
    effective_to,
    hourly_amount_aud,
    max_associated_hours,
    max_payable_hours,
    qualification,
    notes
)
SELECT
    rc.id,
    pv.id,
    '2025-07',
    DATE '2025-07-01',
    DATE '2026-05-31',
    seed.hourly_amount_aud,
    seed.max_associated_hours,
    seed.max_payable_hours,
    seed.qualification,
    'EA 2023-2026 Schedule 1 ORAA rates (1 July 2025)'
FROM (
    VALUES
        ('AO1_DE1', 'PHD',         69.72, 0.00, 1.00),
        ('AO1_DE1', 'COORDINATOR', 69.72, 0.00, 1.00),
        ('AO2_DE2', 'STANDARD',    58.32, 0.00, 1.00)
) AS seed(code, qualification, hourly_amount_aud, max_associated_hours, max_payable_hours)
JOIN rate_code rc
    ON rc.code = seed.code
JOIN policy_version pv
    ON pv.ea_reference = 'EA-2023-2026-Schedule-1'
   AND pv.major_version = 2023
   AND pv.minor_version = 0
WHERE NOT EXISTS (
    SELECT 1
    FROM rate_amount ra
    WHERE ra.rate_code_id = rc.id
      AND ra.policy_version_id = pv.id
      AND ra.year_label = '2025-07'
      AND ra.qualification = seed.qualification
);
