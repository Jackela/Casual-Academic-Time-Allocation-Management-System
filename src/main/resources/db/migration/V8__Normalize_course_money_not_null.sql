-- V8: Normalize Money columns to NOT NULL and backfill nulls
-- Ensures domain invariants at the database level for DDD purity

-- Backfill nulls to zero to satisfy NOT NULL constraints
UPDATE courses SET budget_allocated = 0.00 WHERE budget_allocated IS NULL;
UPDATE courses SET budget_used = 0.00 WHERE budget_used IS NULL;

-- Enforce NOT NULL at the schema level
ALTER TABLE courses ALTER COLUMN budget_allocated SET NOT NULL;
ALTER TABLE courses ALTER COLUMN budget_used SET NOT NULL;

-- Ensure check constraints are in place (idempotent creation depends on dialect; assume present from V3)
-- Optionally, re-add to be safe (commented if already exists)
-- ALTER TABLE courses ADD CONSTRAINT chk_courses_budget_usage CHECK (budget_used <= budget_allocated);


