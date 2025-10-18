-- Phase 1.1: Database schema for EA compliance policy tables
-- Creates policy_version, rate_code, and rate_amount tables with constraints and indexes

-- Ensure the btree_gist extension is available for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE policy_version (
    id BIGSERIAL PRIMARY KEY,
    ea_reference VARCHAR(150) NOT NULL,
    major_version INTEGER NOT NULL CHECK (major_version >= 0),
    minor_version INTEGER NOT NULL CHECK (minor_version >= 0),
    effective_from DATE NOT NULL,
    effective_to DATE,
    source_document_url TEXT NOT NULL,
    notes TEXT,
    CONSTRAINT chk_policy_version_effective_range CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX uk_policy_version_reference_version
    ON policy_version (ea_reference, major_version, minor_version);

ALTER TABLE policy_version
    ADD CONSTRAINT policy_version_effective_date_excl
    EXCLUDE USING gist (
        ea_reference WITH =,
        daterange(
            effective_from,
            COALESCE(effective_to, 'infinity'::date),
            '[)'
        ) WITH &&
    );

CREATE TABLE rate_code (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(16) NOT NULL,
    task_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    default_associated_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (default_associated_hours >= 0),
    default_delivery_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (default_delivery_hours >= 0),
    requires_phd BOOLEAN NOT NULL DEFAULT FALSE,
    is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,
    ea_clause_reference VARCHAR(64),
    CONSTRAINT uq_rate_code_code UNIQUE (code),
    CONSTRAINT chk_rate_code_task_type CHECK (task_type IN ('LECTURE', 'TUTORIAL', 'ORAA', 'DEMO', 'MARKING'))
);

CREATE TABLE rate_amount (
    id BIGSERIAL PRIMARY KEY,
    rate_code_id BIGINT NOT NULL,
    policy_version_id BIGINT NOT NULL,
    year_label VARCHAR(16) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    hourly_amount_aud NUMERIC(10,2) NOT NULL CHECK (hourly_amount_aud > 0),
    max_associated_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (max_associated_hours >= 0),
    max_payable_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (max_payable_hours >= 0),
    qualification VARCHAR(20),
    notes TEXT,
    CONSTRAINT fk_rate_amount_rate_code FOREIGN KEY (rate_code_id) REFERENCES rate_code(id),
    CONSTRAINT fk_rate_amount_policy_version FOREIGN KEY (policy_version_id) REFERENCES policy_version(id),
    CONSTRAINT chk_rate_amount_qualification CHECK (
        qualification IS NULL OR qualification IN ('PHD', 'COORDINATOR', 'STANDARD')
    ),
    CONSTRAINT chk_rate_amount_effective_range CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX idx_rate_amount_rate_code_effective_from
    ON rate_amount (rate_code_id, effective_from);

CREATE INDEX idx_rate_amount_policy_version
    ON rate_amount (policy_version_id);

CREATE INDEX idx_rate_amount_rate_code_qualification
    ON rate_amount (rate_code_id, qualification)
    WHERE qualification IS NOT NULL;
