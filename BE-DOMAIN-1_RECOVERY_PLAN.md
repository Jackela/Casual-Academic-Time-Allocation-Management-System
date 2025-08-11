# BE-DOMAIN-1: Business Logic Test Recovery Plan

## Current Assessment

### ✅ Functional Components (WORKING)
1. **TimesheetApplicationService** - Core business logic layer working
2. **ApprovalApplicationService** - Approval workflow service working
3. **ApprovalDomainService** - Domain business rules working
4. **ApprovalStateMachine** - State transition logic working
5. **WorkflowRulesRegistry** - SSOT business rules working
6. **Timesheet Entity** - Aggregate root with approval methods working
7. **Approval Entity** - Approval tracking working
8. **TimesheetValidationService** - Validation rules working
9. **TimesheetDomainService** - Domain calculations working

### ⚠️ Issues Identified (NEEDS FIX)

#### 1. Test Compilation Issues
- **Missing imports** in test classes (Optional, BigDecimal methods)
- **AssertJ methods** not available (isTrue(), isNotEmpty(), etc.)
- **Entity method calls** incorrect (getBudgetAllocated().getAmount())

#### 2. Missing Business Logic Tests
- **ApprovalSubmissionIntegrationTest** - needs compilation fixes
- **TutorApprovalWorkflowIntegrationTest** - needs compilation fixes  
- **TimesheetWorkflowIntegrationTest** - needs compilation fixes
- **TimesheetUpdateDeleteIntegrationTest** - may be missing

## Recovery Strategy

### Phase 1: Fix Test Infrastructure (Priority 1)
1. Fix compilation issues in existing integration tests
2. Ensure TestDataBuilder works correctly
3. Fix AssertJ and import issues

### Phase 2: Business Logic Validation (Priority 2)
1. Validate approval workflow state machine
2. Test timesheet validation rules
3. Verify domain service functionality
4. Test role-based access control

### Phase 3: Integration Test Recovery (Priority 3)
1. Run and fix ApprovalSubmissionIntegrationTest
2. Run and fix TutorApprovalWorkflowIntegrationTest
3. Run and fix TimesheetWorkflowIntegrationTest
4. Create missing TimesheetUpdateDeleteIntegrationTest if needed

## Key Business Rules to Validate

### Approval Workflow State Machine
- ✅ DRAFT → PENDING_TUTOR_REVIEW (via SUBMIT_FOR_APPROVAL)
- ✅ PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR (via APPROVE)
- ✅ APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR (via FINAL_APPROVAL)
- ✅ APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED (via HR_APPROVE)
- ✅ Rejection paths and invalid transition handling

### Timesheet Business Rules
- ✅ Hours/rate range validations (0.1-40.0 hours, $10-$200/hr)
- ✅ Monday week start constraint
- ✅ Timesheet uniqueness (tutor + course + week)
- ✅ Status transition validations
- ✅ Role-based modification permissions

### Domain Service Testing
- ✅ TimesheetApplicationService functionality
- ✅ Approval workflow orchestration
- ✅ Business rule enforcement
- ✅ Domain validation service integration

## Success Criteria
- [ ] All integration tests compile successfully
- [ ] Approval workflow state machine working correctly
- [ ] Timesheet validation rules enforced
- [ ] Domain services functioning properly
- [ ] Business logic integration tests passing
- [ ] Role-based access control validated

## Files Requiring Attention
- `src/test/java/com/usyd/catams/integration/ApprovalSubmissionIntegrationTest.java`
- `src/test/java/com/usyd/catams/integration/TutorApprovalWorkflowIntegrationTest.java`
- `src/test/java/com/usyd/catams/integration/TimesheetWorkflowIntegrationTest.java`
- `src/test/java/com/usyd/catams/integration/TimesheetUpdateDeleteIntegrationTest.java`
- Various test compilation issues