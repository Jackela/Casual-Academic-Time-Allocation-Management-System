-- Add Schedule 1 calculation metadata to timesheets so backend remains SSOT for EA compliance.

ALTER TABLE timesheets
    ADD COLUMN rate_code VARCHAR(20),
    ADD COLUMN calculation_formula VARCHAR(255),
    ADD COLUMN clause_reference VARCHAR(64),
    ADD COLUMN calculated_amount DECIMAL(9,2) NOT NULL DEFAULT 0;

UPDATE timesheets
SET calculated_amount = COALESCE(hours, 0) * COALESCE(hourly_rate, 0);

ALTER TABLE timesheets
    ALTER COLUMN calculated_amount DROP DEFAULT;
