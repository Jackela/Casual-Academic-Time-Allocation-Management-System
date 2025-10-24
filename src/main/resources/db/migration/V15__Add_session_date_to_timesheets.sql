-- Add session_date column to timesheets to persist individual teaching dates
ALTER TABLE timesheets
    ADD COLUMN session_date DATE;

-- Backfill existing records to preserve historical consistency
UPDATE timesheets
SET session_date = week_start_date
WHERE session_date IS NULL;

-- Enforce non-null constraint now that data is populated
ALTER TABLE timesheets
    ALTER COLUMN session_date SET NOT NULL;

-- Provide an index to support session-based filtering/reporting
CREATE INDEX IF NOT EXISTS idx_timesheet_session_date ON timesheets(session_date);
