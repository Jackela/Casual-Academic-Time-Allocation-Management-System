# 🔄 Emergency Rollback Strategy - Dual Workflow Migration

## Executive Summary

This document outlines the comprehensive rollback strategy for the dual approval workflow migration. The migration is designed to be **zero-risk** with multiple safety nets and rollback options.

## 🚨 Rollback Triggers

### Immediate Rollback Required
- **Error Rate**: >2% sustained for >5 minutes
- **Performance Degradation**: >20% response time increase sustained for >10 minutes
- **Data Corruption**: Any evidence of data integrity issues
- **Critical Business Function**: Complete failure of approval process

### Caution Level (Monitoring Required)
- **Error Rate**: 1-2% for >10 minutes
- **Performance Degradation**: 10-20% response time increase
- **User Complaints**: >5 support tickets within 1 hour
- **Unexpected Workflow Behavior**: States not transitioning as expected

## 🎯 Rollback Options (Risk Level: Low → High)

### Option 1: Feature Flag Disable (Risk: **Minimal**)
**Duration**: 30 seconds  
**Impact**: Disables new workflow, maintains legacy workflow

```bash
# Disable enhanced workflow via feature flag
curl -X POST /api/admin/feature-flags \
  -H "Authorization: Bearer {admin-token}" \
  -d '{"enhanced_workflow": false}'

# Result: All new timesheets use legacy workflow only
# Existing timesheets continue with their current workflow
```

**Rollback Validation**:
```bash
# Verify feature flag disabled
curl -X GET /api/admin/feature-flags/enhanced_workflow
# Expected: {"enabled": false}

# Test new timesheet creation uses legacy workflow
curl -X POST /api/timesheets/{id}/approve \
  -d '{"action": "APPROVE"}' 
# Expected: TUTOR_APPROVED status (legacy)
```

### Option 2: Application Rollback (Risk: **Low**)
**Duration**: 2-5 minutes  
**Impact**: Complete revert to previous application version

```bash
# Git rollback to previous stable version
git checkout {previous-stable-tag}

# Deploy previous version
./deploy.sh --environment staging --version {previous-tag}

# Restart application services
kubectl rollout restart deployment/catams-api
```

**Rollback Validation**:
```bash
# Verify application version
curl -X GET /api/health
# Expected: {"version": "{previous-version}"}

# Test core workflows still functional
./test-scripts/validate-core-workflows.sh
```

### Option 3: Database State Reset (Risk: **Medium**)
**Duration**: 5-15 minutes  
**Impact**: Reset in-progress enhanced workflows to stable states

```sql
-- Reset enhanced workflow timesheets to safe states
UPDATE timesheets 
SET status = 'PENDING_TUTOR_REVIEW', 
    updated_at = CURRENT_TIMESTAMP
WHERE status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR');

-- Log the reset action
INSERT INTO rollback_log (action, affected_rows, timestamp, reason)
VALUES ('enhanced_workflow_reset', ROW_COUNT(), CURRENT_TIMESTAMP, 'Emergency rollback');
```

**Data Integrity Verification**:
```sql
-- Verify no orphaned states remain
SELECT status, COUNT(*) 
FROM timesheets 
WHERE status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR')
GROUP BY status;
-- Expected: 0 rows

-- Verify approvals history integrity  
SELECT t.id, t.status, a.new_status 
FROM timesheets t 
JOIN approvals a ON t.id = a.timesheet_id
WHERE t.status != a.new_status;
-- Expected: 0 rows (status consistency)
```

### Option 4: Full System Restore (Risk: **High**)
**Duration**: 30-60 minutes  
**Impact**: Complete system restore from pre-migration backup

```bash
# Restore database from backup
pg_restore --host {db-host} --username {db-user} \
          --dbname catams_staging \
          --clean --if-exists \
          {backup-file-pre-migration}

# Restore application from backup image
docker pull catams:pre-migration-backup
docker service update --image catams:pre-migration-backup catams-api

# Restart all services
./restart-all-services.sh
```

## 🛡️ Safety Mechanisms

### 1. **Automated Monitoring & Alerts**

```yaml
# Prometheus Alert Rules
groups:
  - name: catams_workflow_rollback
    rules:
      - alert: WorkflowErrorRateHigh
        expr: increase(approval_workflow_errors_total[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High workflow error rate detected"
          
      - alert: WorkflowPerformanceDegraded
        expr: histogram_quantile(0.95, approval_workflow_completion_time_seconds) > 300
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Workflow completion time degraded"
          
      - alert: InvalidStateTransitions
        expr: increase(approval_transition_invalid_total[5m]) > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Multiple invalid state transitions detected"
```

### 2. **Circuit Breaker Pattern**

```java
// Automatic fallback to legacy workflow on errors
@Component
public class WorkflowCircuitBreaker {
    
    @CircuitBreaker(name = "enhanced-workflow", fallbackMethod = "fallbackToLegacy")
    @TimeLimiter(name = "enhanced-workflow")
    @Retry(name = "enhanced-workflow")
    public ApprovalStatus processEnhancedWorkflow(Long timesheetId, ApprovalAction action) {
        // Enhanced workflow logic
        return enhancedWorkflowService.process(timesheetId, action);
    }
    
    public ApprovalStatus fallbackToLegacy(Long timesheetId, ApprovalAction action, Exception ex) {
        log.warn("Enhanced workflow failed, falling back to legacy: {}", ex.getMessage());
        workflowMetricsService.recordWorkflowError("enhanced_workflow_fallback");
        
        // Automatically use legacy workflow as fallback
        return legacyWorkflowService.process(timesheetId, action);
    }
}
```

### 3. **Data Integrity Checks**

```java
@Scheduled(fixedRate = 60000) // Every minute during migration period
public void validateDataIntegrity() {
    List<DataIntegrityIssue> issues = dataIntegrityService.checkWorkflowConsistency();
    
    if (!issues.isEmpty()) {
        log.error("Data integrity issues detected: {}", issues);
        alertService.sendCriticalAlert("workflow_data_integrity", issues);
        
        // Auto-trigger rollback if critical issues found
        if (issues.stream().anyMatch(issue -> issue.getSeverity() == CRITICAL)) {
            emergencyRollbackService.triggerRollback("data_integrity_failure");
        }
    }
}
```

## 📋 Rollback Decision Matrix

| Symptom | Severity | Recommended Action | Time to Execute |
|---------|----------|-------------------|-----------------|
| Error rate 1-2% | Medium | Monitor + Feature Flag Disable | 30 seconds |
| Error rate >2% | High | Application Rollback | 2-5 minutes |
| Performance degradation >20% | High | Application Rollback | 2-5 minutes |
| Data inconsistency detected | Critical | Database State Reset + App Rollback | 5-15 minutes |
| Complete system failure | Critical | Full System Restore | 30-60 minutes |

## 🧪 Rollback Testing & Validation

### Pre-Deployment Rollback Tests

```bash
# Test 1: Feature flag rollback
./test-scripts/test-feature-flag-rollback.sh

# Test 2: Application version rollback  
./test-scripts/test-app-rollback.sh

# Test 3: Database state reset
./test-scripts/test-db-rollback.sh

# Test 4: Full system restore
./test-scripts/test-full-restore.sh
```

### Post-Rollback Validation Checklist

#### ✅ **Functional Validation**
- [ ] Legacy workflow functions correctly
- [ ] User authentication working
- [ ] Database queries return expected results
- [ ] API endpoints respond correctly
- [ ] UI displays proper approval statuses

#### ✅ **Performance Validation**  
- [ ] Response times return to baseline
- [ ] Database query performance stable
- [ ] Memory usage within normal limits
- [ ] No error spikes in logs

#### ✅ **Data Integrity Validation**
- [ ] No orphaned approval records
- [ ] Timesheet statuses consistent
- [ ] Approval history preserved
- [ ] No data corruption detected

## 📞 Communication Plan

### Internal Team Notification
```bash
# Automated team notification
./scripts/notify-rollback.sh \
  --severity {critical/high/medium} \
  --reason "{rollback reason}" \
  --eta "{estimated resolution time}"
```

### Stakeholder Communication Template
```markdown
**Subject**: CATAMS System Update - Temporary Rollback Notification

**Status**: System temporarily reverted to previous version
**Impact**: Minimal - All core functionality maintained
**Timeline**: Resolution expected within {duration}
**Action Required**: None - system operating normally

**Details**: 
We temporarily reverted the approval workflow enhancement to ensure optimal system performance. All timesheet approval functionality continues to work as normal using the established workflow process.

**Next Steps**:
We are analyzing the situation and will redeploy the enhancement once any issues are resolved. We will notify you when the enhanced workflow is available again.
```

## 🔍 Post-Rollback Analysis

### Required Analysis Steps
1. **Root Cause Analysis**: Identify what triggered the rollback
2. **Impact Assessment**: Measure business and technical impact  
3. **Process Review**: Evaluate rollback procedure effectiveness
4. **Prevention Planning**: Develop measures to prevent recurrence

### Success Metrics for Rollback
- **Recovery Time**: <5 minutes for application rollback
- **Data Integrity**: 100% preservation during rollback
- **User Impact**: <1% of users experience any disruption
- **Business Continuity**: 0% downtime for critical approval workflows

## ✅ Rollback Readiness Checklist

### Pre-Deployment Preparation
- [ ] All rollback scripts tested and validated
- [ ] Database backups verified and accessible
- [ ] Monitoring alerts configured and tested
- [ ] Team trained on rollback procedures
- [ ] Communication templates prepared
- [ ] Stakeholder contact list updated

### During Deployment
- [ ] Monitoring dashboard active
- [ ] Rollback team on standby
- [ ] Key metrics baseline established
- [ ] Escalation procedures ready

### Post-Deployment  
- [ ] Success metrics monitored for 24 hours
- [ ] Rollback procedures documented
- [ ] Lessons learned captured
- [ ] Next deployment improvements identified

---

**This comprehensive rollback strategy ensures system reliability and business continuity throughout the migration process with multiple layers of protection and rapid recovery options.**