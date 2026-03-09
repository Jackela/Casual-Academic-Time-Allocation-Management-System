## ADDED Requirements

### Requirement: Approval Transition Single Source
The system SHALL use `ApprovalStateMachine` as the only transition definition for approval status changes.

#### Scenario: Illegal transition rejected
- **WHEN** an action is requested for a status not mapped by the state machine
- **THEN** the operation is rejected with a stable business-validation error
- **AND** no alternative static or enum fallback transition is applied

#### Scenario: Legal transition accepted
- **WHEN** an action/status pair exists in the state machine transition map
- **THEN** the resulting status SHALL match the mapped target exactly

### Requirement: Validation Rule Single Source
The system SHALL validate hours/rate/monday constraints through `TimesheetValidationService` backed by `TimesheetValidationProperties`.

#### Scenario: Same invalid input across entry points
- **WHEN** the same invalid value is submitted via quote/create/update paths
- **THEN** each path SHALL produce semantically consistent validation failures

### Requirement: Layer Boundary Purity
Controllers SHALL act as protocol adapters only and SHALL NOT perform repository-driven business decisions.

#### Scenario: Controller dependency guard
- **WHEN** architecture rules are evaluated
- **THEN** controller packages SHALL NOT depend directly on repository packages for business logic decisions

### Requirement: Test-Data Route Default Security
`/api/test-data/**` SHALL be accessible only under test/e2e profiles and require a valid reset token.

#### Scenario: Non-test profile denied
- **WHEN** the application runs outside test/e2e profiles
- **THEN** `/api/test-data/**` requests SHALL be denied

#### Scenario: Missing token denied
- **WHEN** a request targets `/api/test-data/**` in test/e2e profile without valid token
- **THEN** the request SHALL be rejected

### Requirement: Strict Schedule1 Policy Resolution
Schedule1 policy resolution SHALL fail fast when mandatory configuration/repository data is missing.

#### Scenario: Missing rate configuration
- **WHEN** required rate policy data is unavailable
- **THEN** policy resolution SHALL fail explicitly and SHALL NOT fallback to built-in runtime defaults
