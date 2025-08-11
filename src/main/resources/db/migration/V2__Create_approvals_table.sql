CREATE TABLE IF NOT EXISTS approvals (
  id BIGSERIAL PRIMARY KEY,
  timesheet_id BIGINT NOT NULL,
  approver_id BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL,
  decided_at TIMESTAMP NULL
);


