# 📋 Phase 3B Staging Deployment Checklist

## 🎯 Deployment Overview
**Phase**: 3B - Repository Layer Migration  
**Risk Level**: Medium (Mitigated through staging validation)  
**Deployment Strategy**: Staged rollout with canary deployment  
**Rollback Time**: <5 minutes  

---

## 📅 Week 1: Enhanced Staging Validation

### Day 1-2: Pre-Deployment Preparation

#### Database Preparation
- [ ] **Backup staging database**
  ```bash
  pg_dump -h staging-db.catams.edu.au -U catams_user -d catams_staging > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Verify current migration status**
  ```bash
  ./gradlew flywayInfo -Dflyway.url=jdbc:postgresql://staging-db:5432/catams_staging
  ```
- [ ] **Validate rollback script accessibility**
  ```bash
  ls -la src/main/resources/db/migration/V7_ROLLBACK__Restore_original_constraints.sql
  ```

#### Code Deployment
- [ ] **Deploy application artifacts to staging**
  ```bash
  git checkout phase3b-implementation
  ./gradlew clean build
  scp build/libs/catams-1.0.0.jar staging-server:/opt/catams/
  ```
- [ ] **Verify environment variables**
  ```bash
  ssh staging-server 'cat /opt/catams/.env | grep -E "(SPRING_PROFILES|DB_|FLYWAY_)"'
  ```

### Day 2-3: Migration Execution & Validation

#### Database Migration
- [ ] **Execute V7 migration**
  ```bash
  ./gradlew flywayMigrate -Dflyway.target=7 -Dflyway.url=jdbc:postgresql://staging-db:5432/catams_staging
  ```
- [ ] **Verify migration success**
  ```sql
  -- Connect to staging database
  SELECT version, description, success, executed_on 
  FROM flyway_schema_history 
  WHERE version = '7';
  ```
- [ ] **Validate constraints applied**
  ```sql
  -- Check constraint definitions
  SELECT conname, contype, consrc 
  FROM pg_constraint 
  WHERE conrelid = 'approvals'::regclass 
  AND conname LIKE '%status_check%';
  ```

#### Application Deployment
- [ ] **Stop existing staging application**
  ```bash
  ssh staging-server 'sudo systemctl stop catams-api'
  ```
- [ ] **Deploy new version**
  ```bash
  ssh staging-server 'sudo cp /opt/catams/catams-1.0.0.jar /opt/catams/catams.jar'
  ```
- [ ] **Start application with monitoring**
  ```bash
  ssh staging-server 'sudo systemctl start catams-api && tail -f /var/log/catams/application.log'
  ```
- [ ] **Verify application health**
  ```bash
  curl -f http://staging-api.catams.edu.au/actuator/health || echo "FAILED"
  ```

### Day 3: Functional Validation

#### Dual Workflow Testing
- [ ] **Test legacy workflow path**
  ```bash
  ./scripts/test-legacy-workflow.sh staging
  ```
- [ ] **Test enhanced workflow path**
  ```bash
  ./scripts/test-enhanced-workflow.sh staging
  ```
- [ ] **Test mixed workflow scenarios**
  ```bash
  ./scripts/test-mixed-workflow.sh staging
  ```

#### Query Performance Validation
- [ ] **Validate repository query performance**
  ```bash
  ./scripts/validate-query-performance.sh staging
  # Expected: All queries <100ms
  ```
- [ ] **Check database query plans**
  ```sql
  EXPLAIN ANALYZE 
  SELECT t.* FROM timesheets t 
  WHERE t.status IN ('PENDING_TUTOR_REVIEW', 'PENDING_HR_REVIEW', 
                     'APPROVED_BY_LECTURER_AND_TUTOR', 'TUTOR_APPROVED', 
                     'APPROVED_BY_TUTOR');
  ```

#### Metrics Service Validation
- [ ] **Verify metrics collection**
  ```bash
  curl http://staging-api.catams.edu.au/actuator/metrics/approval.workflow.legacy.usage
  curl http://staging-api.catams.edu.au/actuator/metrics/approval.workflow.enhanced.usage
  ```
- [ ] **Test workflow classification**
  ```bash
  ./scripts/test-workflow-classification.sh staging
  ```

---

## 📅 Week 2: Canary Production Deployment

### Day 4: Canary Setup (10% Traffic)

#### Pre-Production Checks
- [ ] **Production database backup**
  ```bash
  pg_dump -h prod-db.catams.edu.au -U catams_prod -d catams > prod_backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Verify staging metrics**
  - Error rate: <0.1% ✅
  - Query performance: <100ms ✅
  - Memory usage: Stable ✅
  - CPU usage: <20% increase ✅

#### Canary Deployment
- [ ] **Configure load balancer for 10% traffic**
  ```yaml
  # nginx/haproxy configuration
  upstream catams_api {
    server prod-v1.catams.edu.au weight=9;  # 90% traffic
    server prod-v2.catams.edu.au weight=1;  # 10% traffic (new version)
  }
  ```
- [ ] **Deploy to canary instance**
  ```bash
  ./deploy-canary.sh --version phase3b --traffic-percentage 10
  ```
- [ ] **Enable enhanced monitoring**
  ```bash
  ./scripts/enable-canary-monitoring.sh
  ```

### Day 5: Canary Validation

#### Performance Metrics
- [ ] **Error rate monitoring**
  ```bash
  # Check every hour for 24 hours
  watch -n 3600 './scripts/check-error-rate.sh canary'
  # Target: <0.1% errors
  ```
- [ ] **Response time comparison**
  ```bash
  ./scripts/compare-response-times.sh baseline canary
  # Target: <5% degradation
  ```
- [ ] **Database query analysis**
  ```sql
  -- Check slow query log
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  WHERE query LIKE '%timesheet%' 
  ORDER BY mean_time DESC 
  LIMIT 10;
  ```

#### Business Metrics
- [ ] **Workflow adoption tracking**
  ```bash
  ./scripts/track-workflow-adoption.sh canary
  ```
- [ ] **User experience validation**
  - Support tickets: 0 related issues ✅
  - User complaints: None ✅
  - Approval completion rate: Maintained ✅

### Day 6-7: Full Production Rollout

#### Progressive Rollout
- [ ] **Increase to 25% traffic**
  ```bash
  ./deploy-canary.sh --version phase3b --traffic-percentage 25
  # Monitor for 4 hours
  ```
- [ ] **Increase to 50% traffic**
  ```bash
  ./deploy-canary.sh --version phase3b --traffic-percentage 50
  # Monitor for 4 hours
  ```
- [ ] **Full deployment (100%)**
  ```bash
  ./deploy-production.sh --version phase3b --strategy blue-green
  ```

#### Post-Deployment Validation
- [ ] **Comprehensive health check**
  ```bash
  ./scripts/production-health-check.sh --comprehensive
  ```
- [ ] **Performance baseline comparison**
  ```bash
  ./scripts/compare-performance.sh pre-deployment post-deployment
  ```
- [ ] **Business continuity verification**
  - All workflows operational ✅
  - No data inconsistencies ✅
  - Audit trail intact ✅

---

## 🔄 Rollback Procedures

### Immediate Rollback Triggers
- [ ] Error rate >2% for >5 minutes
- [ ] Response time degradation >20%
- [ ] Database constraint violations
- [ ] Memory leak detected
- [ ] Critical business function failure

### Rollback Execution
```bash
# 1. Revert application
./rollback-deployment.sh --version previous-stable

# 2. Rollback database migration (if needed)
psql -h prod-db.catams.edu.au -U catams_prod -d catams \
  -f src/main/resources/db/migration/V7_ROLLBACK__Restore_original_constraints.sql

# 3. Verify rollback success
./scripts/validate-rollback.sh

# 4. Notify stakeholders
./scripts/send-rollback-notification.sh
```

---

## 📊 Success Criteria

### Technical Metrics
- [ ] **Error Rate**: <0.1% sustained
- [ ] **Response Time**: <100ms p95
- [ ] **Query Performance**: All queries <100ms
- [ ] **Memory Usage**: <10% increase from baseline
- [ ] **CPU Usage**: <20% increase from baseline

### Business Metrics
- [ ] **Approval Completion Rate**: Maintained or improved
- [ ] **Workflow Adoption**: Metrics collecting successfully
- [ ] **User Experience**: No degradation in satisfaction
- [ ] **Data Integrity**: 100% consistency maintained

### Monitoring & Alerting
- [ ] **Grafana dashboards operational**
- [ ] **Prometheus metrics collecting**
- [ ] **PagerDuty alerts configured**
- [ ] **Slack notifications active**

---

## 📝 Sign-off Requirements

### Staging Validation
- [ ] **Engineering Lead**: Technical validation complete
- [ ] **QA Lead**: Functional testing passed
- [ ] **DevOps Lead**: Infrastructure ready

### Production Deployment
- [ ] **Product Owner**: Business validation complete
- [ ] **Engineering Manager**: Risk assessment approved
- [ ] **CTO/VP Engineering**: Final deployment approval

---

## 📞 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | TBD | +61-XXX-XXX | oncall@catams.edu.au |
| Database Admin | TBD | +61-XXX-XXX | dba@catams.edu.au |
| Product Owner | TBD | +61-XXX-XXX | po@catams.edu.au |
| Escalation Manager | TBD | +61-XXX-XXX | escalation@catams.edu.au |

---

**Last Updated**: 2024-01-08  
**Version**: 1.0.0  
**Status**: READY FOR EXECUTION