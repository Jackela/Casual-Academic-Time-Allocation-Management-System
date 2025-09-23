-- Initial users table aligned to JPA entity (fail-fast friendly, idempotent)
-- This migration both creates the desired shape for fresh DBs and gently
-- adapts older dev DBs by adding/renaming columns when needed.

-- Create table with final columns when not present
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email_value VARCHAR(254) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP NULL
);

-- If legacy column `email` exists, rename it to `email_value`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_value'
  ) THEN
    ALTER TABLE users RENAME COLUMN email TO email_value;
  END IF;
END $$;

-- Add missing columns for legacy tables (no-op on fresh DB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT 'Unknown';
ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255) NOT NULL DEFAULT 'CHANGE_ME';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'TUTOR';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;

-- Indexes expected by the JPA mapping
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON users (email_value);
CREATE INDEX IF NOT EXISTS idx_user_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_user_active ON users (is_active);
