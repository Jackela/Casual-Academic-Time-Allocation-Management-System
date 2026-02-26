-- V3: Add missing Schedule 1 rate codes for DEMO, MARKING, and LECTURE task types
-- Ref: University of Sydney Enterprise Agreement 2023-2026, Schedule 1

-- ===========================================================================
-- DEMONSTRATION (DEMO) Rate Codes
-- ===========================================================================

INSERT INTO rate_code (code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
SELECT code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference
FROM ( VALUES
    ('DE1', 'DEMO', 'Demonstration – PhD holder or unit coordinator', 0.00, 1.00, TRUE, FALSE, 'Schedule 1 – Demonstrations'),
    ('DE2', 'DEMO', 'Demonstration – standard eligibility', 0.00, 1.00, FALSE, FALSE, 'Schedule 1 – Demonstrations')
) AS seed(code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
WHERE NOT EXISTS (
    SELECT 1 FROM rate_code rc WHERE rc.code = seed.code
);

-- ===========================================================================
-- MARKING Rate Codes
-- ===========================================================================

INSERT INTO rate_code (code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
SELECT code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference
FROM ( VALUES
    ('M04', 'MARKING', 'Marking – Supervising Examiner (PhD/coordinator)', 0.00, 1.00, TRUE, FALSE, 'Schedule 1 – Marking'),
    ('M05', 'MARKING', 'Routine (Standard) Marking', 0.00, 1.00, FALSE, FALSE, 'Schedule 1 – Marking')
) AS seed(code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
WHERE NOT EXISTS (
    SELECT 1 FROM rate_code rc WHERE rc.code = seed.code
);

-- ===========================================================================
-- LECTURE Rate Codes
-- ===========================================================================

INSERT INTO rate_code (code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
SELECT code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference
FROM ( VALUES
    ('P02', 'LECTURE', 'Developed Lecture Rate – with course unit coordination responsibility', 3.00, 1.00, FALSE, FALSE, 'Schedule 1 – Lecturing'),
    ('P03', 'LECTURE', 'Lecture Rate – standard delivery', 1.50, 1.00, FALSE, FALSE, 'Schedule 1 – Lecturing'),
    ('P04', 'LECTURE', 'Repeat Lecture Rate', 0.00, 1.00, FALSE, TRUE, 'Schedule 1 – Lecturing')
) AS seed(code, task_type, description, default_associated_hours, default_delivery_hours, requires_phd, is_repeatable, ea_clause_reference)
WHERE NOT EXISTS (
    SELECT 1 FROM rate_code rc WHERE rc.code = seed.code
);

-- ===========================================================================
-- Rate Amounts for 2024-2025 Academic Year
-- ===========================================================================

-- Add rate amounts for DEMONSTRATION codes
INSERT INTO rate_amount (rate_code_id, policy_version_id, year_label, effective_from, effective_to,
                         hourly_amount_aud, max_associated_hours, max_payable_hours,
                         qualification, notes)
SELECT rc.id, pv.id, '2024-07', '2024-07-01', '2025-06-30',
       CASE
           WHEN rc.code = 'DE1' THEN 68.50
           WHEN rc.code = 'DE2' THEN 54.50
       END,
       0.00, 1.00,
       CASE WHEN rc.code = 'DE1' THEN 'PHD' ELSE 'STANDARD' END,
       'EA 2023-2026 Schedule 1 rates'
FROM rate_code rc
CROSS JOIN policy_version pv
WHERE rc.code IN ('DE1', 'DE2')
  AND pv.major_version = 2023
  AND pv.minor_version = 0
  AND NOT EXISTS (
      SELECT 1 FROM rate_amount ra
      WHERE ra.rate_code_id = rc.id
        AND ra.policy_version_id = pv.id
        AND ra.year_label = '2024-07'
  );

-- Add rate amounts for MARKING codes
INSERT INTO rate_amount (rate_code_id, policy_version_id, year_label, effective_from, effective_to,
                         hourly_amount_aud, max_associated_hours, max_payable_hours,
                         qualification, notes)
SELECT rc.id, pv.id, '2024-07', '2024-07-01', '2025-06-30',
       CASE
           WHEN rc.code = 'M04' THEN 68.50
           WHEN rc.code = 'M05' THEN 54.50
       END,
       0.00, 1.00,
       CASE WHEN rc.code = 'M04' THEN 'PHD' ELSE 'STANDARD' END,
       'EA 2023-2026 Schedule 1 rates'
FROM rate_code rc
CROSS JOIN policy_version pv
WHERE rc.code IN ('M04', 'M05')
  AND pv.major_version = 2023
  AND pv.minor_version = 0
  AND NOT EXISTS (
      SELECT 1 FROM rate_amount ra
      WHERE ra.rate_code_id = rc.id
        AND ra.policy_version_id = pv.id
        AND ra.year_label = '2024-07'
  );

-- Add rate amounts for LECTURE codes
INSERT INTO rate_amount (rate_code_id, policy_version_id, year_label, effective_from, effective_to,
                         hourly_amount_aud, max_associated_hours, max_payable_hours,
                         qualification, notes)
SELECT rc.id, pv.id, '2024-07', '2024-07-01', '2025-06-30',
       CASE
           WHEN rc.code = 'P02' THEN 175.00
           WHEN rc.code = 'P03' THEN 136.00
           WHEN rc.code = 'P04' THEN 136.00
       END,
       CASE
           WHEN rc.code = 'P02' THEN 3.00
           WHEN rc.code = 'P03' THEN 1.50
           WHEN rc.code = 'P04' THEN 0.00
       END,
       CASE
           WHEN rc.code = 'P02' THEN 4.00
           WHEN rc.code = 'P03' THEN 2.50
           WHEN rc.code = 'P04' THEN 1.00
       END,
       'STANDARD',
       'EA 2023-2026 Schedule 1 rates'
FROM rate_code rc
CROSS JOIN policy_version pv
WHERE rc.code IN ('P02', 'P03', 'P04')
  AND pv.major_version = 2023
  AND pv.minor_version = 0
  AND NOT EXISTS (
      SELECT 1 FROM rate_amount ra
      WHERE ra.rate_code_id = rc.id
        AND ra.policy_version_id = pv.id
        AND ra.year_label = '2024-07'
  );
