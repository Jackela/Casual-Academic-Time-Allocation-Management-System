-- Phase 1.1 follow-up: seed Schedule 1 rates for key casual academic activities.
-- Source: University of Sydney Enterprise Agreement 2023-2026 (Schedule 1 – Casual rates, pp. 99-103).

INSERT INTO policy_version (
    ea_reference,
    major_version,
    minor_version,
    effective_from,
    effective_to,
    source_document_url,
    notes
)
VALUES (
    'EA-2023-2026-Schedule-1',
    2023,
    0,
    DATE '2022-07-01',
    NULL,
    'docs/requirements/University-of-Sydney-Enterprise-Agreement-2023-2026.pdf',
    'Schedule 1 casual academic rates (lecturing, tutoring, marking) – nominal expiry 1 June 2026.'
)
ON CONFLICT (ea_reference, major_version, minor_version) DO NOTHING;

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
VALUES
    ('P01', 'LECTURE', 'Distinguished visiting scholar lecture (1h delivery + up to 4h associated)', 4.00, 1.00, FALSE, FALSE, 'Schedule 1 – Lecturing'),
    ('P02', 'LECTURE', 'Significant responsibility / developed lecture (1h delivery + up to 3h associated)', 3.00, 1.00, FALSE, FALSE, 'Schedule 1 – Lecturing'),
    ('P03', 'LECTURE', 'Standard lecture (1h delivery + up to 2h associated)', 2.00, 1.00, FALSE, FALSE, 'Schedule 1 – Lecturing'),
    ('P04', 'LECTURE', 'Repeat lecture (1h delivery + up to 1h associated)', 1.00, 1.00, FALSE, TRUE, 'Schedule 1 – Lecturing'),
    ('TU1', 'TUTORIAL', 'Tutorial rate – PhD holder or unit coordinator (1h delivery + up to 2h associated)', 2.00, 1.00, TRUE, FALSE, 'Schedule 1 – Tutoring'),
    ('TU2', 'TUTORIAL', 'Tutorial rate – standard eligibility (1h delivery + up to 2h associated)', 2.00, 1.00, FALSE, FALSE, 'Schedule 1 – Tutoring'),
    ('TU3', 'TUTORIAL', 'Repeat tutorial – PhD holder or unit coordinator (1h delivery + up to 1h associated)', 1.00, 1.00, TRUE, TRUE, 'Schedule 1 – Tutoring'),
    ('TU4', 'TUTORIAL', 'Repeat tutorial – standard eligibility (1h delivery + up to 1h associated)', 1.00, 1.00, FALSE, TRUE, 'Schedule 1 – Tutoring'),
    ('AO1_DE1', 'ORAA', 'Other required academic activity – PhD holder or unit coordinator (hourly)', 0.00, 1.00, TRUE, FALSE, 'Schedule 1 Clause 3.1(a) – ORAA'),
    ('AO2_DE2', 'ORAA', 'Other required academic activity – standard eligibility (hourly)', 0.00, 1.00, FALSE, FALSE, 'Schedule 1 Clause 3.1(a) – ORAA'),
    ('DE1', 'DEMO', 'Demonstration session – PhD holder or unit coordinator (hourly)', 0.00, 1.00, TRUE, FALSE, 'Schedule 1 Clause 3.1(a) – Demonstrations'),
    ('DE2', 'DEMO', 'Demonstration session – standard eligibility (hourly)', 0.00, 1.00, FALSE, FALSE, 'Schedule 1 Clause 3.1(a) – Demonstrations'),
    ('M03', 'MARKING', 'Supervising examiner / significant academic judgement marking (hourly)', 0.00, 1.00, FALSE, FALSE, 'Schedule 1 – Marking'),
    ('M04', 'MARKING', 'Routine marking – PhD holder or unit coordinator (hourly)', 0.00, 1.00, TRUE, FALSE, 'Schedule 1 – Marking'),
    ('M05', 'MARKING', 'Routine marking – standard eligibility (hourly)', 0.00, 1.00, FALSE, FALSE, 'Schedule 1 – Marking')
ON CONFLICT (code) DO NOTHING;

WITH policy AS (
    SELECT id
    FROM policy_version
    WHERE ea_reference = 'EA-2023-2026-Schedule-1'
      AND major_version = 2023
      AND minor_version = 0
),
rate_codes AS (
    SELECT code, id
    FROM rate_code
    WHERE code IN ('P01','P02','P03','P04','TU1','TU2','TU3','TU4','AO1_DE1','AO2_DE2','DE1','DE2','M03','M04','M05')
),
data(code, qualification, year_label, effective_from, effective_to, session_amount, max_associated_hours, max_payable_hours, note) AS (
    VALUES
        -- Lecturing (Schedule 1 Table 1)
        ('P01', NULL, '2022-07', DATE '2022-07-01', DATE '2023-08-16', 376.39, 4.00, 5.00, 'Schedule 1 – Lecturing (Jul-22 baseline)'),
        ('P01', NULL, '2023-08', DATE '2023-08-17', DATE '2024-06-30', 393.70, 4.00, 5.00, 'Schedule 1 – Lecturing (first pay period after commencement)'),
        ('P01', NULL, '2024-07', DATE '2024-07-01', DATE '2025-06-30', 408.46, 4.00, 5.00, 'Schedule 1 – Lecturing (1 July 2024)'),
        ('P01', NULL, '2025-07', DATE '2025-07-01', DATE '2026-05-31', 423.78, 4.00, 5.00, 'Schedule 1 – Lecturing (1 July 2025)'),
        ('P01', NULL, '2026-06', DATE '2026-06-01', NULL,               440.73, 4.00, 5.00, 'Schedule 1 – Lecturing (1 June 2026)'),

        ('P02', NULL, '2022-07', DATE '2022-07-01', DATE '2023-08-16', 301.12, 3.00, 4.00, 'Schedule 1 – Lecturing (Jul-22 baseline)'),
        ('P02', NULL, '2023-08', DATE '2023-08-17', DATE '2024-06-30', 314.97, 3.00, 4.00, 'Schedule 1 – Lecturing (first pay period after commencement)'),
        ('P02', NULL, '2024-07', DATE '2024-07-01', DATE '2025-06-30', 326.78, 3.00, 4.00, 'Schedule 1 – Lecturing (1 July 2024)'),
        ('P02', NULL, '2025-07', DATE '2025-07-01', DATE '2026-05-31', 339.03, 3.00, 4.00, 'Schedule 1 – Lecturing (1 July 2025)'),
        ('P02', NULL, '2026-06', DATE '2026-06-01', NULL,               352.59, 3.00, 4.00, 'Schedule 1 – Lecturing (1 June 2026)'),

        ('P03', NULL, '2022-07', DATE '2022-07-01', DATE '2023-08-16', 225.83, 2.00, 3.00, 'Schedule 1 – Lecturing (Jul-22 baseline)'),
        ('P03', NULL, '2023-08', DATE '2023-08-17', DATE '2024-06-30', 236.22, 2.00, 3.00, 'Schedule 1 – Lecturing (first pay period after commencement)'),
        ('P03', NULL, '2024-07', DATE '2024-07-01', DATE '2025-06-30', 245.08, 2.00, 3.00, 'Schedule 1 – Lecturing (1 July 2024)'),
        ('P03', NULL, '2025-07', DATE '2025-07-01', DATE '2026-05-31', 254.27, 2.00, 3.00, 'Schedule 1 – Lecturing (1 July 2025)'),
        ('P03', NULL, '2026-06', DATE '2026-06-01', NULL,               264.44, 2.00, 3.00, 'Schedule 1 – Lecturing (1 June 2026)'),

        ('P04', NULL, '2022-07', DATE '2022-07-01', DATE '2023-08-16', 150.57, 1.00, 2.00, 'Schedule 1 – Lecturing (Jul-22 baseline)'),
        ('P04', NULL, '2023-08', DATE '2023-08-17', DATE '2024-06-30', 157.50, 1.00, 2.00, 'Schedule 1 – Lecturing (first pay period after commencement)'),
        ('P04', NULL, '2024-07', DATE '2024-07-01', DATE '2025-06-30', 163.41, 1.00, 2.00, 'Schedule 1 – Lecturing (1 July 2024)'),
        ('P04', NULL, '2025-07', DATE '2025-07-01', DATE '2026-05-31', 169.54, 1.00, 2.00, 'Schedule 1 – Lecturing (1 July 2025)'),
        ('P04', NULL, '2026-06', DATE '2026-06-01', NULL,               176.32, 1.00, 2.00, 'Schedule 1 – Lecturing (1 June 2026)'),

        -- Tutoring (Schedule 1 Table 2)
        ('TU1', 'PHD',         '2022-07', DATE '2022-07-01', DATE '2023-08-16', 193.68, 2.00, 3.00, 'Schedule 1 – Tutoring (Jul-22 baseline)'),
        ('TU1', 'COORDINATOR', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 193.68, 2.00, 3.00, 'Schedule 1 – Tutoring (Jul-22 baseline)'),
        ('TU1', 'PHD',         '2023-08', DATE '2023-08-17', DATE '2024-06-30', 202.59, 2.00, 3.00, 'Schedule 1 – Tutoring (first pay period after commencement)'),
        ('TU1', 'COORDINATOR', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 202.59, 2.00, 3.00, 'Schedule 1 – Tutoring (first pay period after commencement)'),
        ('TU1', 'PHD',         '2024-07', DATE '2024-07-01', DATE '2025-06-30', 210.19, 2.00, 3.00, 'Schedule 1 – Tutoring (1 July 2024)'),
        ('TU1', 'COORDINATOR', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 210.19, 2.00, 3.00, 'Schedule 1 – Tutoring (1 July 2024)'),
        ('TU1', 'PHD',         '2025-07', DATE '2025-07-01', DATE '2026-05-31', 218.07, 2.00, 3.00, 'Schedule 1 – Tutoring (1 July 2025)'),
        ('TU1', 'COORDINATOR', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 218.07, 2.00, 3.00, 'Schedule 1 – Tutoring (1 July 2025)'),
        ('TU1', 'PHD',         '2026-06', DATE '2026-06-01', NULL,               226.79, 2.00, 3.00, 'Schedule 1 – Tutoring (1 June 2026)'),
        ('TU1', 'COORDINATOR', '2026-06', DATE '2026-06-01', NULL,               226.79, 2.00, 3.00, 'Schedule 1 – Tutoring (1 June 2026)'),

        ('TU2', 'STANDARD', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 162.12, 2.00, 3.00, 'Schedule 1 – Tutoring (Jul-22 baseline)'),
        ('TU2', 'STANDARD', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 169.58, 2.00, 3.00, 'Schedule 1 – Tutoring (first pay period after commencement)'),
        ('TU2', 'STANDARD', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 175.94, 2.00, 3.00, 'Schedule 1 – Tutoring (1 July 2024)'),
        ('TU2', 'STANDARD', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 182.54, 2.00, 3.00, 'Schedule 1 – Tutoring (1 July 2025)'),
        ('TU2', 'STANDARD', '2026-06', DATE '2026-06-01', NULL,               189.84, 2.00, 3.00, 'Schedule 1 – Tutoring (1 June 2026)'),

        ('TU3', 'PHD',         '2022-07', DATE '2022-07-01', DATE '2023-08-16', 129.13, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (Jul-22 baseline)'),
        ('TU3', 'COORDINATOR', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 129.13, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (Jul-22 baseline)'),
        ('TU3', 'PHD',         '2023-08', DATE '2023-08-17', DATE '2024-06-30', 135.07, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (first pay period after commencement)'),
        ('TU3', 'COORDINATOR', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 135.07, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (first pay period after commencement)'),
        ('TU3', 'PHD',         '2024-07', DATE '2024-07-01', DATE '2025-06-30', 140.14, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 July 2024)'),
        ('TU3', 'COORDINATOR', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 140.14, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 July 2024)'),
        ('TU3', 'PHD',         '2025-07', DATE '2025-07-01', DATE '2026-05-31', 145.40, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 July 2025)'),
        ('TU3', 'COORDINATOR', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 145.40, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 July 2025)'),
        ('TU3', 'PHD',         '2026-06', DATE '2026-06-01', NULL,               151.22, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 June 2026)'),
        ('TU3', 'COORDINATOR', '2026-06', DATE '2026-06-01', NULL,               151.22, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 June 2026)'),

        ('TU4', 'STANDARD', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 108.08, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (Jul-22 baseline)'),
        ('TU4', 'STANDARD', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 113.05, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (first pay period after commencement)'),
        ('TU4', 'STANDARD', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 117.29, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 July 2024)'),
        ('TU4', 'STANDARD', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 121.69, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 July 2025)'),
        ('TU4', 'STANDARD', '2026-06', DATE '2026-06-01', NULL,               126.56, 1.00, 2.00, 'Schedule 1 – Repeat tutoring (1 June 2026)'),

        -- Other required academic activity (Schedule 1 Table 3, Source: EA 2023–2026 Schedule 1 p. 217 Clause 3.1(a))
        ('AO1_DE1', 'PHD',         '2022-07', DATE '2022-07-01', DATE '2023-08-16', 64.24, 0.00, 1.00, 'Schedule 1 – ORAA (Jul-22 baseline)'),
        ('AO1_DE1', 'COORDINATOR', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 64.24, 0.00, 1.00, 'Schedule 1 – ORAA (Jul-22 baseline)'),
        ('AO1_DE1', 'PHD',         '2023-08', DATE '2023-08-17', DATE '2024-06-30', 67.20, 0.00, 1.00, 'Schedule 1 – ORAA (first pay period after commencement)'),
        ('AO1_DE1', 'COORDINATOR', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 67.20, 0.00, 1.00, 'Schedule 1 – ORAA (first pay period after commencement)'),
        ('AO1_DE1', 'PHD',         '2024-07', DATE '2024-07-01', DATE '2025-06-30', 69.72, 0.00, 1.00, 'Schedule 1 – ORAA (1 July 2024)'),
        ('AO1_DE1', 'COORDINATOR', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 69.72, 0.00, 1.00, 'Schedule 1 – ORAA (1 July 2024)'),
        ('AO1_DE1', 'PHD',         '2025-07', DATE '2025-07-01', DATE '2026-05-31', 72.33, 0.00, 1.00, 'Schedule 1 – ORAA (1 July 2025)'),
        ('AO1_DE1', 'COORDINATOR', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 72.33, 0.00, 1.00, 'Schedule 1 – ORAA (1 July 2025)'),
        ('AO1_DE1', 'PHD',         '2026-06', DATE '2026-06-01', NULL,               75.22, 0.00, 1.00, 'Schedule 1 – ORAA (1 June 2026)'),
        ('AO1_DE1', 'COORDINATOR', '2026-06', DATE '2026-06-01', NULL,               75.22, 0.00, 1.00, 'Schedule 1 – ORAA (1 June 2026)'),
        ('AO2_DE2', 'STANDARD',    '2022-07', DATE '2022-07-01', DATE '2023-08-16', 53.74, 0.00, 1.00, 'Schedule 1 – ORAA (Jul-22 baseline)'),
        ('AO2_DE2', 'STANDARD',    '2023-08', DATE '2023-08-17', DATE '2024-06-30', 56.21, 0.00, 1.00, 'Schedule 1 – ORAA (first pay period after commencement)'),
        ('AO2_DE2', 'STANDARD',    '2024-07', DATE '2024-07-01', DATE '2025-06-30', 58.32, 0.00, 1.00, 'Schedule 1 – ORAA (1 July 2024)'),
        ('AO2_DE2', 'STANDARD',    '2025-07', DATE '2025-07-01', DATE '2026-05-31', 60.51, 0.00, 1.00, 'Schedule 1 – ORAA (1 July 2025)'),
        ('AO2_DE2', 'STANDARD',    '2026-06', DATE '2026-06-01', NULL,               62.93, 0.00, 1.00, 'Schedule 1 – ORAA (1 June 2026)'),

        -- Demonstrations (Schedule 1 Table 3, Source: EA 2023–2026 Schedule 1 p. 217 Clause 3.1(a))
        ('DE1', 'PHD',         '2022-07', DATE '2022-07-01', DATE '2023-08-16', 64.24, 0.00, 1.00, 'Schedule 1 – Demonstrations (Jul-22 baseline)'),
        ('DE1', 'COORDINATOR', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 64.24, 0.00, 1.00, 'Schedule 1 – Demonstrations (Jul-22 baseline)'),
        ('DE1', 'PHD',         '2023-08', DATE '2023-08-17', DATE '2024-06-30', 67.20, 0.00, 1.00, 'Schedule 1 – Demonstrations (first pay period after commencement)'),
        ('DE1', 'COORDINATOR', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 67.20, 0.00, 1.00, 'Schedule 1 – Demonstrations (first pay period after commencement)'),
        ('DE1', 'PHD',         '2024-07', DATE '2024-07-01', DATE '2025-06-30', 69.72, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 July 2024)'),
        ('DE1', 'COORDINATOR', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 69.72, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 July 2024)'),
        ('DE1', 'PHD',         '2025-07', DATE '2025-07-01', DATE '2026-05-31', 72.33, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 July 2025)'),
        ('DE1', 'COORDINATOR', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 72.33, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 July 2025)'),
        ('DE1', 'PHD',         '2026-06', DATE '2026-06-01', NULL,               75.22, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 June 2026)'),
        ('DE1', 'COORDINATOR', '2026-06', DATE '2026-06-01', NULL,               75.22, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 June 2026)'),
        ('DE2', 'STANDARD',    '2022-07', DATE '2022-07-01', DATE '2023-08-16', 53.74, 0.00, 1.00, 'Schedule 1 – Demonstrations (Jul-22 baseline)'),
        ('DE2', 'STANDARD',    '2023-08', DATE '2023-08-17', DATE '2024-06-30', 56.21, 0.00, 1.00, 'Schedule 1 – Demonstrations (first pay period after commencement)'),
        ('DE2', 'STANDARD',    '2024-07', DATE '2024-07-01', DATE '2025-06-30', 58.32, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 July 2024)'),
        ('DE2', 'STANDARD',    '2025-07', DATE '2025-07-01', DATE '2026-05-31', 60.51, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 July 2025)'),
        ('DE2', 'STANDARD',    '2026-06', DATE '2026-06-01', NULL,               62.93, 0.00, 1.00, 'Schedule 1 – Demonstrations (1 June 2026)'),

        -- Marking (Schedule 1 Table 4)
        ('M03', NULL,         '2022-07', DATE '2022-07-01', DATE '2023-08-16', 75.31, 0.00, 1.00, 'Schedule 1 – Marking (Jul-22 baseline)'),
        ('M03', NULL,         '2023-08', DATE '2023-08-17', DATE '2024-06-30', 78.78, 0.00, 1.00, 'Schedule 1 – Marking (first pay period after commencement)'),
        ('M03', NULL,         '2024-07', DATE '2024-07-01', DATE '2025-06-30', 81.73, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2024)'),
        ('M03', NULL,         '2025-07', DATE '2025-07-01', DATE '2026-05-31', 84.79, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2025)'),
        ('M03', NULL,         '2026-06', DATE '2026-06-01', NULL,               88.18, 0.00, 1.00, 'Schedule 1 – Marking (1 June 2026)'),

        ('M04', 'PHD',         '2022-07', DATE '2022-07-01', DATE '2023-08-16', 64.24, 0.00, 1.00, 'Schedule 1 – Marking (Jul-22 baseline)'),
        ('M04', 'COORDINATOR', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 64.24, 0.00, 1.00, 'Schedule 1 – Marking (Jul-22 baseline)'),
        ('M04', 'PHD',         '2023-08', DATE '2023-08-17', DATE '2024-06-30', 67.20, 0.00, 1.00, 'Schedule 1 – Marking (first pay period after commencement)'),
        ('M04', 'COORDINATOR', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 67.20, 0.00, 1.00, 'Schedule 1 – Marking (first pay period after commencement)'),
        ('M04', 'PHD',         '2024-07', DATE '2024-07-01', DATE '2025-06-30', 69.72, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2024)'),
        ('M04', 'COORDINATOR', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 69.72, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2024)'),
        ('M04', 'PHD',         '2025-07', DATE '2025-07-01', DATE '2026-05-31', 72.33, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2025)'),
        ('M04', 'COORDINATOR', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 72.33, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2025)'),
        ('M04', 'PHD',         '2026-06', DATE '2026-06-01', NULL,               75.22, 0.00, 1.00, 'Schedule 1 – Marking (1 June 2026)'),
        ('M04', 'COORDINATOR', '2026-06', DATE '2026-06-01', NULL,               75.22, 0.00, 1.00, 'Schedule 1 – Marking (1 June 2026)'),

        ('M05', 'STANDARD', '2022-07', DATE '2022-07-01', DATE '2023-08-16', 53.74, 0.00, 1.00, 'Schedule 1 – Marking (Jul-22 baseline)'),
        ('M05', 'STANDARD', '2023-08', DATE '2023-08-17', DATE '2024-06-30', 56.21, 0.00, 1.00, 'Schedule 1 – Marking (first pay period after commencement)'),
        ('M05', 'STANDARD', '2024-07', DATE '2024-07-01', DATE '2025-06-30', 58.32, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2024)'),
        ('M05', 'STANDARD', '2025-07', DATE '2025-07-01', DATE '2026-05-31', 60.51, 0.00, 1.00, 'Schedule 1 – Marking (1 July 2025)'),
        ('M05', 'STANDARD', '2026-06', DATE '2026-06-01', NULL,               62.93, 0.00, 1.00, 'Schedule 1 – Marking (1 June 2026)')
)
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
    policy.id,
    d.year_label,
    d.effective_from,
    d.effective_to,
    d.session_amount,
    d.max_associated_hours,
    d.max_payable_hours,
    d.qualification,
    d.note
FROM data AS d
JOIN rate_codes rc ON rc.code = d.code
CROSS JOIN policy;
