-- Add EA Schedule 1 alignment columns to timesheets table

ALTER TABLE timesheets
    ADD COLUMN task_type VARCHAR(20) NOT NULL DEFAULT 'OTHER',
    ADD COLUMN is_repeat BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN qualification VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN delivery_hours DECIMAL(3,1) NOT NULL DEFAULT 0,
    ADD COLUMN associated_hours DECIMAL(3,1) NOT NULL DEFAULT 0;

-- Backfill delivery hours to match existing total hours and ensure associated remains zero
UPDATE timesheets
SET
    delivery_hours = COALESCE(hours, 0),
    associated_hours = 0;

-- Optional future-proofing: remove defaults when data fully managed by services
