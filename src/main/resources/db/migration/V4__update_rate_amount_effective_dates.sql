-- V4: Update effective dates for DEMO, MARKING, and LECTURE rate amounts to cover 2025-2026 academic year
-- Ref: University of Sydney Enterprise Agreement 2023-2026, Schedule 1

-- Update effective dates from 2024-07-01 to 2025-06-30 → 2025-07-01 to 2026-05-31
UPDATE rate_amount
SET year_label = '2025-07',
    effective_from = '2025-07-01',
    effective_to = '2026-05-31'
WHERE rate_code_id IN (
    SELECT id FROM rate_code WHERE code IN ('DE1', 'DE2', 'M04', 'M05', 'P02', 'P03', 'P04')
)
  AND year_label = '2024-07';
