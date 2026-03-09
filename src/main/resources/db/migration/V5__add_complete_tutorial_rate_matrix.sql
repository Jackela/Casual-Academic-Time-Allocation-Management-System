-- V5: Ensure complete tutorial rate matrix (TU1/TU2/TU3/TU4) exists with active 2025-2026 amounts
-- Ref: University of Sydney Enterprise Agreement 2023-2026, Schedule 1

-- ===========================================================================
-- Tutorial rate codes (idempotent)
-- ===========================================================================

INSERT INTO rate_code (code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
SELECT code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference
FROM ( VALUES
    ('TU1', 'TUTORIAL', 'Tutorial rate – PhD holder or unit coordinator', 2.00, 1.00, TRUE, FALSE, 'Schedule 1 – Tutoring'),
    ('TU2', 'TUTORIAL', 'Tutorial rate – standard eligibility', 2.00, 1.00, FALSE, FALSE, 'Schedule 1 – Tutoring'),
    ('TU3', 'TUTORIAL', 'Repeat tutorial – PhD holder or unit coordinator', 1.00, 1.00, TRUE, TRUE, 'Schedule 1 – Tutoring'),
    ('TU4', 'TUTORIAL', 'Repeat tutorial – standard eligibility', 1.00, 1.00, FALSE, TRUE, 'Schedule 1 – Tutoring')
) AS seed(code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
WHERE NOT EXISTS (
    SELECT 1 FROM rate_code rc WHERE rc.code = seed.code
);

-- ===========================================================================
-- Tutorial rate amounts for 2025-2026 window (idempotent)
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
    'EA 2023-2026 Schedule 1 tutorial rates (1 July 2025)'
FROM (
    VALUES
        ('TU1', 'PHD',          218.07, 2.00, 3.00),
        ('TU1', 'COORDINATOR',  218.07, 2.00, 3.00),
        ('TU2', 'STANDARD',     182.54, 2.00, 3.00),
        ('TU3', 'PHD',          145.38, 1.00, 2.00),
        ('TU3', 'COORDINATOR',  145.38, 1.00, 2.00),
        ('TU4', 'STANDARD',     121.69, 1.00, 2.00)
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
