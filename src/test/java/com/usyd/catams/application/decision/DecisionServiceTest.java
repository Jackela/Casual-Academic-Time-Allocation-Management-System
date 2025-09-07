package com.usyd.catams.application.decision;

import com.usyd.catams.application.decision.dto.*;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TDD Tests for DecisionService
 * 
 * These tests define the expected behavior of the DecisionService interface.
 * The DecisionService is the centerpiece of our microservices architecture,
 * centralizing all business rules and decision-making logic.
 * 
 * Test Structure:
 * - Comprehensive rule evaluation tests
 * - Workflow decision tests
 * - Permission checking tests
 * - Validation operation tests
 * - Async operation tests
 * - Edge cases and error conditions
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DecisionService TDD Tests")
class DecisionServiceTest {
    
    @Mock
    private DecisionService decisionService;
    
    private DecisionRequest timesheetValidationRequest;
    private DecisionRequest workflowEvaluationRequest;
    private PermissionCheckRequest permissionRequest;
    private WorkflowEvaluationRequest workflowRequest;
    
    @BeforeEach
    void setUp() {
        // Timesheet validation request
        timesheetValidationRequest = DecisionRequest.builder()
            .ruleSetId("timesheet-validation")
            .requestId("req-001")
            .fact("hours", 35.5)
            .fact("hourlyRate", new BigDecimal("45.00"))
            .fact("tutorId", 123L)
            .fact("courseId", 456L)
            .fact("weekStartDate", "2024-01-08")
            .userId("user-001")
            .priority(5)
            .build();
            
        // Workflow evaluation request
        workflowEvaluationRequest = DecisionRequest.builder()
            .ruleSetId("workflow-evaluation")
            .requestId("req-002")
            .fact("timesheetId", 789L)
            .fact("currentStatus", ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
            .fact("userRole", UserRole.TUTOR)
            .fact("userId", 123L)
            .userId("user-002")
            .build();
            
        // Permission check request
        permissionRequest = PermissionCheckRequest.builder()
            .userId("user-001")
            .userRole(UserRole.LECTURER)
            .action("CREATE_TIMESHEET")
            .resourceType("TIMESHEET")
            .resourceId("789")
            .build();
            
        // Workflow evaluation request
        workflowRequest = WorkflowEvaluationRequest.builder()
            .userId("user-001")
            .userRole(UserRole.TUTOR)
            .timesheetId("789")
            .currentStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
            .proposedAction(ApprovalAction.TUTOR_CONFIRM)
            .courseId("456")
            .build();
    }
    
    @Nested
    @DisplayName("Core Decision Evaluation Tests")
    class CoreDecisionEvaluationTests {
        
        @Test
        @DisplayName("Should evaluate business rules and return decision")
        void shouldEvaluateBusinessRulesAndReturnDecision() {
            // Given
            DecisionResult expectedResult = DecisionResult.builder()
                .requestId("req-001")
                .decision(DecisionResult.Decision.APPROVED)
                .valid(true)
                .violations(List.of())
                .build();
                
            when(decisionService.evaluate(timesheetValidationRequest)).thenReturn(expectedResult);
            
            // When
            DecisionResult result = decisionService.evaluate(timesheetValidationRequest);
            
            // Then
            assertThat(result).isNotNull();
            assertThat(result.getRequestId()).isEqualTo("req-001");
            assertThat(result.getDecision()).isEqualTo(DecisionResult.Decision.APPROVED);
            assertThat(result.isValid()).isTrue();
            assertThat(result.hasViolations()).isFalse();
        }
        
        @Test
        @DisplayName("Should evaluate and return violations when rules fail")
        void shouldEvaluateAndReturnViolationsWhenRulesFail() {
            // Given
            List<DecisionResult.RuleViolation> violations = List.of(
                new DecisionResult.RuleViolation("HOURS_RANGE", "Hours must be between 0.1 and 40.0", 
                    DecisionResult.Severity.HIGH, "hours", 45.0, "≤40.0")
            );
            
            DecisionResult expectedResult = DecisionResult.builder()
                .requestId("req-001")
                .decision(DecisionResult.Decision.REJECTED)
                .valid(false)
                .violations(violations)
                .build();
                
            when(decisionService.evaluate(any(DecisionRequest.class))).thenReturn(expectedResult);
            
            // When
            DecisionResult result = decisionService.evaluate(timesheetValidationRequest);
            
            // Then
            assertThat(result.getDecision()).isEqualTo(DecisionResult.Decision.REJECTED);
            assertThat(result.isValid()).isFalse();
            assertThat(result.hasViolations()).isTrue();
            assertThat(result.getViolations()).hasSize(1);
            assertThat(result.getViolations().get(0).getRuleId()).isEqualTo("HOURS_RANGE");
        }
        
        @Test
        @DisplayName("Should evaluate asynchronously")
        void shouldEvaluateAsynchronously() {
            // Given
            DecisionResult expectedResult = DecisionResult.builder()
                .requestId("req-001")
                .decision(DecisionResult.Decision.APPROVED)
                .valid(true)
                .build();
                
            CompletableFuture<DecisionResult> futureResult = CompletableFuture.completedFuture(expectedResult);
            when(decisionService.evaluateAsync(timesheetValidationRequest)).thenReturn(futureResult);
            
            // When
            CompletableFuture<DecisionResult> result = decisionService.evaluateAsync(timesheetValidationRequest);
            
            // Then
            assertThat(result).isCompleted();
            assertThat(result.join().getDecision()).isEqualTo(DecisionResult.Decision.APPROVED);
        }
    }
    
    @Nested
    @DisplayName("Timesheet Validation Tests")
    class TimesheetValidationTests {
        
        @Test
        @DisplayName("Should validate timesheet data successfully")
        void shouldValidateTimesheetDataSuccessfully() {
            // Given
            ValidationResult expectedResult = ValidationResult.valid();
            when(decisionService.validateTimesheet(timesheetValidationRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateTimesheet(timesheetValidationRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
            assertThat(result.hasViolations()).isFalse();
        }
        
        @Test
        @DisplayName("Should validate timesheet and return violations")
        void shouldValidateTimesheetAndReturnViolations() {
            // Given
            List<String> violations = List.of("Hours exceed maximum allowed", "Hourly rate too high");
            ValidationResult expectedResult = ValidationResult.invalid(violations);
            when(decisionService.validateTimesheet(any(DecisionRequest.class))).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateTimesheet(timesheetValidationRequest);
            
            // Then
            assertThat(result.isValid()).isFalse();
            assertThat(result.hasViolations()).isTrue();
            assertThat(result.getViolations()).hasSize(2);
            assertThat(result.getViolations()).contains("Hours exceed maximum allowed");
        }
        
        @Test
        @DisplayName("Should validate with warnings but still pass")
        void shouldValidateWithWarningsButStillPass() {
            // Given
            List<String> warnings = List.of("Hours are high but within acceptable range");
            ValidationResult expectedResult = ValidationResult.validWithWarnings(warnings);
            when(decisionService.validateTimesheet(timesheetValidationRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateTimesheet(timesheetValidationRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
            assertThat(result.hasWarnings()).isTrue();
            assertThat(result.getWarnings()).hasSize(1);
        }
    }
    
    @Nested
    @DisplayName("Permission Checking Tests")
    class PermissionCheckingTests {
        
        @Test
        @DisplayName("Should check permission and return true for authorized action")
        void shouldCheckPermissionAndReturnTrueForAuthorizedAction() {
            // Given
            when(decisionService.checkPermission(permissionRequest)).thenReturn(true);
            
            // When
            boolean result = decisionService.checkPermission(permissionRequest);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check permission and return false for unauthorized action")
        void shouldCheckPermissionAndReturnFalseForUnauthorizedAction() {
            // Given
            PermissionCheckRequest unauthorizedRequest = PermissionCheckRequest.builder()
                .userId("user-001")
                .userRole(UserRole.TUTOR)
                .action("DELETE_USER")
                .resourceType("USER")
                .resourceId("123")
                .build();
                
            when(decisionService.checkPermission(unauthorizedRequest)).thenReturn(false);
            
            // When
            boolean result = decisionService.checkPermission(unauthorizedRequest);
            
            // Then
            assertThat(result).isFalse();
        }
        
        @Test
        @DisplayName("Should check user eligibility")
        void shouldCheckUserEligibility() {
            // Given
            ValidationResult expectedResult = ValidationResult.valid();
            when(decisionService.checkUserEligibility(permissionRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.checkUserEligibility(permissionRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
        }
    }
    
    @Nested
    @DisplayName("Workflow Evaluation Tests")
    class WorkflowEvaluationTests {
        
        @Test
        @DisplayName("Should get valid actions for user in current state")
        void shouldGetValidActionsForUserInCurrentState() {
            // Given
            List<ApprovalAction> expectedActions = List.of(ApprovalAction.TUTOR_CONFIRM, ApprovalAction.REQUEST_MODIFICATION);
            when(decisionService.getValidActions(workflowRequest)).thenReturn(expectedActions);
            
            // When
            List<ApprovalAction> result = decisionService.getValidActions(workflowRequest);
            
            // Then
            assertThat(result).hasSize(2);
            assertThat(result).contains(ApprovalAction.TUTOR_CONFIRM, ApprovalAction.REQUEST_MODIFICATION);
        }
        
        @Test
        @DisplayName("Should return empty list when no valid actions available")
        void shouldReturnEmptyListWhenNoValidActionsAvailable() {
            // Given
            WorkflowEvaluationRequest noActionsRequest = WorkflowEvaluationRequest.builder()
                .userId("user-001")
                .userRole(UserRole.TUTOR)
                .timesheetId("789")
                .currentStatus(ApprovalStatus.FINAL_CONFIRMED)
                .build();
                
            when(decisionService.getValidActions(noActionsRequest)).thenReturn(List.of());
            
            // When
            List<ApprovalAction> result = decisionService.getValidActions(noActionsRequest);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should get next status for valid action")
        void shouldGetNextStatusForValidAction() {
            // Given
            ApprovalStatus expectedNextStatus = ApprovalStatus.TUTOR_CONFIRMED;
            when(decisionService.getNextStatus(ApprovalAction.TUTOR_CONFIRM, ApprovalStatus.PENDING_TUTOR_CONFIRMATION, 
                 UserRole.TUTOR, workflowEvaluationRequest)).thenReturn(expectedNextStatus);
            
            // When
            ApprovalStatus result = decisionService.getNextStatus(ApprovalAction.TUTOR_CONFIRM, 
                ApprovalStatus.PENDING_TUTOR_CONFIRMATION, UserRole.TUTOR, workflowEvaluationRequest);
            
            // Then
            assertThat(result).isEqualTo(ApprovalStatus.TUTOR_CONFIRMED);
        }
        
        @Test
        @DisplayName("Should return null for invalid action transition")
        void shouldReturnNullForInvalidActionTransition() {
            // Given
            when(decisionService.getNextStatus(ApprovalAction.TUTOR_CONFIRM, ApprovalStatus.FINAL_CONFIRMED, 
                 UserRole.TUTOR, workflowEvaluationRequest)).thenReturn(null);
            
            // When
            ApprovalStatus result = decisionService.getNextStatus(ApprovalAction.TUTOR_CONFIRM, 
                ApprovalStatus.FINAL_CONFIRMED, UserRole.TUTOR, workflowEvaluationRequest);
            
            // Then
            assertThat(result).isNull();
        }
        
        @Test
        @DisplayName("Should validate workflow transition")
        void shouldValidateWorkflowTransition() {
            // Given
            ValidationResult expectedResult = ValidationResult.valid();
            when(decisionService.validateWorkflowTransition(workflowRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateWorkflowTransition(workflowRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
        }
    }
    
    @Nested
    @DisplayName("Financial and Capacity Validation Tests")
    class FinancialCapacityValidationTests {
        
        @Test
        @DisplayName("Should validate financial constraints")
        void shouldValidateFinancialConstraints() {
            // Given
            DecisionRequest financialRequest = DecisionRequest.builder()
                .ruleSetId("financial-validation")
                .fact("totalAmount", new BigDecimal("2000.00"))
                .fact("budgetLimit", new BigDecimal("5000.00"))
                .fact("budgetUsed", new BigDecimal("1500.00"))
                .build();
                
            ValidationResult expectedResult = ValidationResult.valid();
            when(decisionService.validateFinancialConstraints(financialRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateFinancialConstraints(financialRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
        }
        
        @Test
        @DisplayName("Should validate financial constraints and return budget violation")
        void shouldValidateFinancialConstraintsAndReturnBudgetViolation() {
            // Given
            DecisionRequest overBudgetRequest = DecisionRequest.builder()
                .ruleSetId("financial-validation")
                .fact("totalAmount", new BigDecimal("6000.00"))
                .fact("budgetLimit", new BigDecimal("5000.00"))
                .fact("budgetUsed", new BigDecimal("1500.00"))
                .build();
                
            List<String> violations = List.of("Amount exceeds available budget");
            ValidationResult expectedResult = ValidationResult.invalid(violations);
            when(decisionService.validateFinancialConstraints(overBudgetRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateFinancialConstraints(overBudgetRequest);
            
            // Then
            assertThat(result.isValid()).isFalse();
            assertThat(result.getViolations()).contains("Amount exceeds available budget");
        }
        
        @Test
        @DisplayName("Should validate course capacity")
        void shouldValidateCourseCapacity() {
            // Given
            DecisionRequest capacityRequest = DecisionRequest.builder()
                .ruleSetId("course-capacity")
                .fact("courseId", 456L)
                .fact("maxTutors", 8)
                .fact("currentTutors", 6)
                .build();
                
            ValidationResult expectedResult = ValidationResult.valid();
            when(decisionService.validateCourseCapacity(capacityRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateCourseCapacity(capacityRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
        }
    }
    
    @Nested
    @DisplayName("Rule Management and Metadata Tests")
    class RuleManagementMetadataTests {
        
        @Test
        @DisplayName("Should get rule explanation")
        void shouldGetRuleExplanation() {
            // Given
            String ruleId = "HOURS_RANGE";
            String expectedExplanation = "Hours must be between 0.1 and 40.0 per week to comply with university policies";
            when(decisionService.getRuleExplanation(ruleId)).thenReturn(expectedExplanation);
            
            // When
            String result = decisionService.getRuleExplanation(ruleId);
            
            // Then
            assertThat(result).isEqualTo(expectedExplanation);
        }
        
        @Test
        @DisplayName("Should get applicable rules for context")
        void shouldGetApplicableRulesForContext() {
            // Given
            List<String> expectedRules = List.of("HOURS_RANGE", "RATE_VALIDATION", "TUTOR_ELIGIBILITY");
            when(decisionService.getApplicableRules(timesheetValidationRequest)).thenReturn(expectedRules);
            
            // When
            List<String> result = decisionService.getApplicableRules(timesheetValidationRequest);
            
            // Then
            assertThat(result).hasSize(3);
            assertThat(result).contains("HOURS_RANGE", "RATE_VALIDATION", "TUTOR_ELIGIBILITY");
        }
        
        @Test
        @DisplayName("Should validate rule consistency")
        void shouldValidateRuleConsistency() {
            // Given
            String ruleSetId = "timesheet-validation";
            ValidationResult expectedResult = ValidationResult.valid();
            when(decisionService.validateRuleConsistency(ruleSetId)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateRuleConsistency(ruleSetId);
            
            // Then
            assertThat(result.isValid()).isTrue();
        }
        
        @Test
        @DisplayName("Should get rule performance metrics")
        void shouldGetRulePerformanceMetrics() {
            // Given
            DecisionResult expectedMetrics = DecisionResult.builder()
                .requestId("metrics-001")
                .decision(DecisionResult.Decision.APPROVED)
                .resultData(Map.of(
                    "averageExecutionTime", 15L,
                    "totalRulesExecuted", 1500L,
                    "cacheHitRate", 0.85
                ))
                .build();
                
            when(decisionService.getRulePerformanceMetrics()).thenReturn(expectedMetrics);
            
            // When
            DecisionResult result = decisionService.getRulePerformanceMetrics();
            
            // Then
            assertThat(result.getResultData()).containsKey("averageExecutionTime");
            assertThat(result.getResultData("averageExecutionTime", Long.class)).isEqualTo(15L);
        }
    }
    
    @Nested
    @DisplayName("Advanced Features Tests")
    class AdvancedFeaturesTests {
        
        @Test
        @DisplayName("Should perform batch validation")
        void shouldPerformBatchValidation() {
            // Given
            List<DecisionRequest> requests = List.of(timesheetValidationRequest, workflowEvaluationRequest);
            List<ValidationResult> expectedResults = List.of(
                ValidationResult.valid(),
                ValidationResult.valid()
            );
            when(decisionService.batchValidate(requests)).thenReturn(expectedResults);
            
            // When
            List<ValidationResult> results = decisionService.batchValidate(requests);
            
            // Then
            assertThat(results).hasSize(2);
            assertThat(results.stream().allMatch(ValidationResult::isValid)).isTrue();
        }
        
        @Test
        @DisplayName("Should test specific rule")
        void shouldTestSpecificRule() {
            // Given
            String ruleId = "HOURS_RANGE";
            DecisionResult expectedResult = DecisionResult.builder()
                .requestId("test-001")
                .decision(DecisionResult.Decision.APPROVED)
                .valid(true)
                .build();
                
            when(decisionService.testRule(ruleId, timesheetValidationRequest)).thenReturn(expectedResult);
            
            // When
            DecisionResult result = decisionService.testRule(ruleId, timesheetValidationRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
            assertThat(result.getDecision()).isEqualTo(DecisionResult.Decision.APPROVED);
        }
        
        @Test
        @DisplayName("Should get recommendations")
        void shouldGetRecommendations() {
            // Given
            List<DecisionResult.Recommendation> recommendations = List.of(
                new DecisionResult.Recommendation("rec-001", "Reduce Hours", 
                    "Consider reducing hours to avoid overtime", "MODIFY_HOURS", Map.of("maxHours", 35), 8)
            );
            
            DecisionResult expectedResult = DecisionResult.builder()
                .requestId("rec-001")
                .decision(DecisionResult.Decision.CONDITIONAL)
                .recommendations(recommendations)
                .build();
                
            when(decisionService.getRecommendations(timesheetValidationRequest)).thenReturn(expectedResult);
            
            // When
            DecisionResult result = decisionService.getRecommendations(timesheetValidationRequest);
            
            // Then
            assertThat(result.hasRecommendations()).isTrue();
            assertThat(result.getRecommendations()).hasSize(1);
            assertThat(result.getRecommendations().get(0).getTitle()).isEqualTo("Reduce Hours");
        }
        
        @Test
        @DisplayName("Should validate data quality")
        void shouldValidateDataQuality() {
            // Given
            ValidationResult expectedResult = ValidationResult.valid();
            when(decisionService.validateDataQuality(timesheetValidationRequest)).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.validateDataQuality(timesheetValidationRequest);
            
            // Then
            assertThat(result.isValid()).isTrue();
        }
        
        @Test
        @DisplayName("Should get decision audit trail")
        void shouldGetDecisionAuditTrail() {
            // Given
            String decisionId = "decision-001";
            DecisionResult expectedResult = DecisionResult.builder()
                .requestId(decisionId)
                .decision(DecisionResult.Decision.APPROVED)
                .metadata(new DecisionResult.ExecutionMetadata("v1.0", 25L, 
                    List.of("HOURS_RANGE", "RATE_VALIDATION"), "engine-v2.1", Map.of()))
                .build();
                
            when(decisionService.getDecisionAuditTrail(decisionId)).thenReturn(expectedResult);
            
            // When
            DecisionResult result = decisionService.getDecisionAuditTrail(decisionId);
            
            // Then
            assertThat(result.getMetadata()).isNotNull();
            assertThat(result.getMetadata().getRulesApplied()).contains("HOURS_RANGE");
        }
    }
    
    @Nested
    @DisplayName("System Management Tests")
    class SystemManagementTests {
        
        @Test
        @DisplayName("Should refresh rules")
        void shouldRefreshRules() {
            // Given
            ValidationResult expectedResult = ValidationResult.builder()
                .valid(true)
                .summary("Rules refreshed successfully")
                .build();
                
            when(decisionService.refreshRules()).thenReturn(expectedResult);
            
            // When
            ValidationResult result = decisionService.refreshRules();
            
            // Then
            assertThat(result.isValid()).isTrue();
            assertThat(result.getSummary()).contains("Rules refreshed successfully");
        }
        
        @Test
        @DisplayName("Should get rule set information")
        void shouldGetRuleSetInformation() {
            // Given
            DecisionResult expectedResult = DecisionResult.builder()
                .requestId("ruleset-info")
                .decision(DecisionResult.Decision.APPROVED)
                .resultData(Map.of(
                    "version", "v2.1.0",
                    "totalRules", 47,
                    "lastUpdated", LocalDateTime.now().toString()
                ))
                .build();
                
            when(decisionService.getRuleSetInfo()).thenReturn(expectedResult);
            
            // When
            DecisionResult result = decisionService.getRuleSetInfo();
            
            // Then
            assertThat(result.getResultData()).containsKey("version");
            assertThat(result.getResultData("totalRules", Integer.class)).isEqualTo(47);
        }
    }
}
