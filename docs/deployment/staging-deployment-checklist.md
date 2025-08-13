# 🚀 Staging Deployment Validation Checklist

## Pre-Deployment Requirements

### ✅ Code Quality Gates
- [ ] All unit tests passing (>95% success rate)
- [ ] Integration tests stable (authentication issues resolved)
- [ ] Code coverage maintained (>90%)
- [ ] No critical deprecation warnings in main code
- [ ] Clean compilation with zero errors

### ✅ Database Compatibility
- [ ] JPQL queries support both legacy and new enum states
- [ ] Auto-transition logic preserves backward compatibility
- [ ] No database schema changes required
- [ ] Enum string mappings validated

## Deployment Validation Steps

### 1. **Legacy Workflow Validation** (Critical - P0)

**Test Scenario**: Classic Tutor Approval Flow
```
DRAFT → PENDING_TUTOR_REVIEW → TUTOR_APPROVED → PENDING_HR_REVIEW → HR_APPROVED
```

**Validation Commands**:
```bash
# Test legacy state transitions
curl -X POST /api/timesheets/{id}/approve \
  -H "Authorization: Bearer {tutor-token}" \
  -d '{"action": "APPROVE", "comment": "Legacy workflow test"}'

# Expected: Status transitions through TUTOR_APPROVED → PENDING_HR_REVIEW
```

**Success Criteria**:
- [ ] Auto-transition from TUTOR_APPROVED to PENDING_HR_REVIEW works
- [ ] Legacy enum values persist in database correctly
- [ ] No breaking changes to existing approval logic

### 2. **New Workflow Validation** (Critical - P0)

**Test Scenario**: Enhanced Lecturer+Tutor Approval Flow
```
DRAFT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED
```

**Validation Commands**:
```bash
# Test new state transitions
curl -X POST /api/timesheets/{id}/approve \
  -H "Authorization: Bearer {tutor-token}" \
  -d '{"action": "APPROVE", "comment": "New workflow test"}'

# Expected: Status = APPROVED_BY_TUTOR (manual lecturer approval required)
```

**Success Criteria**:
- [ ] New workflow paths function correctly
- [ ] Explicit lecturer approval step works
- [ ] HR final approval completes workflow
- [ ] State machine handles both paths seamlessly

### 3. **Database Integrity Validation** (High - P1)

**Repository Query Tests**:
```sql
-- Validate JPQL query compatibility
SELECT t FROM Timesheet t WHERE 
  t.status = 'PENDING_HR_REVIEW' OR 
  t.status = 'APPROVED_BY_LECTURER_AND_TUTOR'

-- Expected: Both legacy and new pending states returned
```

**Success Criteria**:
- [ ] Repository queries return correct results for both enum types
- [ ] Dashboard aggregation includes new workflow states
- [ ] Pending item counts accurate across all workflows

### 4. **Performance Baseline Validation** (Medium - P2)

**Metrics to Monitor**:
```
- API response time: <200ms (95th percentile)
- Database query performance: <50ms average
- Memory usage: <10% increase from baseline
- CPU utilization: <5% increase from baseline
```

**Load Test Commands**:
```bash
# Run staging load tests
artillery run load-tests/approval-workflow.yml
```

**Success Criteria**:
- [ ] No performance regression >5%
- [ ] Database query performance maintained
- [ ] Memory usage within acceptable bounds

## Post-Deployment Monitoring

### 1. **Workflow Usage Analytics**

**Metrics to Track**:
```java
@Metric("approval.workflow.legacy.usage")
@Metric("approval.workflow.new.usage") 
@Metric("approval.transition.success_rate")
@Metric("approval.workflow.completion_time")
```

**Dashboard Queries**:
```sql
-- Legacy workflow usage
SELECT COUNT(*) FROM timesheets 
WHERE status IN ('TUTOR_APPROVED', 'PENDING_HR_REVIEW');

-- New workflow usage  
SELECT COUNT(*) FROM timesheets 
WHERE status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR');
```

### 2. **Error Rate Monitoring**

**Alert Conditions**:
- [ ] Approval workflow failure rate >1%
- [ ] Database transaction timeouts >100ms
- [ ] HTTP 500 errors >0.1% of requests
- [ ] State transition exceptions >0.5%

### 3. **Business Impact Metrics**

**KPIs to Monitor**:
- [ ] Average approval completion time
- [ ] User satisfaction with approval process
- [ ] Support ticket volume for approval issues
- [ ] Admin user adoption of timesheet creation

## Rollback Plan

### Immediate Rollback Triggers
- [ ] Error rate >2% sustained for >5 minutes
- [ ] Performance degradation >20% sustained for >10 minutes  
- [ ] Data corruption or inconsistency detected
- [ ] Critical business process failure

### Rollback Procedure
```bash
# 1. Revert to previous deployment
git checkout {previous-stable-tag}

# 2. Deploy rollback
./deploy-staging.sh --rollback

# 3. Validate rollback success
./validate-core-workflows.sh

# 4. Notify stakeholders
./notify-rollback-complete.sh
```

## Sign-off Requirements

### Technical Validation
- [ ] **Lead Developer**: All technical criteria met
- [ ] **QA Engineer**: All test scenarios pass
- [ ] **DevOps Engineer**: Deployment and monitoring ready
- [ ] **Database Admin**: Data integrity confirmed

### Business Approval  
- [ ] **Product Owner**: Business workflows validated
- [ ] **Stakeholder Representative**: User acceptance confirmed

## Success Declaration

**Deployment considered successful when**:
- [ ] All validation steps pass
- [ ] No critical issues detected in first 2 hours
- [ ] Business workflows functioning as expected
- [ ] Monitoring shows stable metrics
- [ ] Rollback plan verified and ready

**Date**: ___________  
**Deployed by**: ___________  
**Validated by**: ___________

---

*This checklist ensures zero-risk deployment with comprehensive validation of both legacy and new approval workflows.*