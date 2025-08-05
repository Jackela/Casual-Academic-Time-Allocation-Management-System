package com.usyd.catams.application.decision;

import com.usyd.catams.application.decision.dto.DecisionRequest;
import com.usyd.catams.application.decision.dto.DecisionResult;
import com.usyd.catams.application.decision.dto.ValidationResult;
import com.usyd.catams.application.decision.dto.PermissionCheckRequest;
import com.usyd.catams.application.decision.dto.WorkflowEvaluationRequest;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Decision Service Interface
 * 
 * This interface defines the contract for business rules and decision-making operations
 * that will become a dedicated microservice. It centralizes all business logic to solve
 * the problem of scattered rules across multiple files.
 * 
 * Design Principles:
 * - Single Source of Truth for all business decisions
 * - Stateless and idempotent operations
 * - Comprehensive rule evaluation capabilities
 * - Future-ready for external microservice extraction
 * - Supports both synchronous and asynchronous operations
 * 
 * Business Rules Covered:
 * - Timesheet validation rules
 * - Approval workflow rules
 * - Permission and authorization rules
 * - Financial validation rules
 * - Course capacity and assignment rules
 * 
 * Future Migration:
 * - These methods will become REST endpoints
 * - DTOs will become JSON request/response bodies
 * - Service calls will become HTTP client calls
 * - Async methods will use message queues
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public interface DecisionService {
    
    /**
     * Evaluate a comprehensive business rule decision.
     * This is the main entry point for rule evaluation.
     * Future: POST /api/decisions/evaluate
     * 
     * @param request The decision request with facts and context
     * @return Decision result with violations and recommendations
     */
    DecisionResult evaluate(DecisionRequest request);
    
    /**
     * Asynchronous rule evaluation for non-blocking operations.
     * Future: POST /api/decisions/evaluate-async
     * 
     * @param request The decision request
     * @return CompletableFuture containing the decision result
     */
    CompletableFuture<DecisionResult> evaluateAsync(DecisionRequest request);
    
    /**
     * Validate timesheet data against business rules.
     * Future: POST /api/decisions/validate-timesheet
     * 
     * @param request The validation request with timesheet data
     * @return Validation result with any violations found
     */
    ValidationResult validateTimesheet(DecisionRequest request);
    
    /**
     * Check if a user has permission to perform a specific action.
     * Future: POST /api/decisions/check-permission
     * 
     * @param request The permission check request
     * @return true if user has permission, false otherwise
     */
    boolean checkPermission(PermissionCheckRequest request);
    
    /**
     * Get all valid actions a user can perform in a given context.
     * Future: POST /api/decisions/valid-actions
     * 
     * @param request The workflow evaluation request
     * @return List of valid approval actions
     */
    List<ApprovalAction> getValidActions(WorkflowEvaluationRequest request);
    
    /**
     * Determine the next status for a successful action.
     * Future: POST /api/decisions/next-status
     * 
     * @param action The action being performed
     * @param currentStatus The current approval status
     * @param userRole The user's role
     * @param context Additional context for the decision
     * @return The next status or null if action not allowed
     */
    ApprovalStatus getNextStatus(ApprovalAction action, ApprovalStatus currentStatus, 
                                UserRole userRole, DecisionRequest context);
    
    /**
     * Validate workflow transition for a specific action.
     * Future: POST /api/decisions/validate-workflow
     * 
     * @param request The workflow evaluation request
     * @return Validation result indicating if transition is allowed
     */
    ValidationResult validateWorkflowTransition(WorkflowEvaluationRequest request);
    
    /**
     * Evaluate financial constraints and budget rules.
     * Future: POST /api/decisions/validate-financial
     * 
     * @param request The decision request with financial facts
     * @return Validation result for financial constraints
     */
    ValidationResult validateFinancialConstraints(DecisionRequest request);
    
    /**
     * Check course capacity and assignment rules.
     * Future: POST /api/decisions/validate-course-capacity
     * 
     * @param request The decision request with course facts
     * @return Validation result for course capacity
     */
    ValidationResult validateCourseCapacity(DecisionRequest request);
    
    /**
     * Evaluate user eligibility for specific roles or actions.
     * Future: POST /api/decisions/check-eligibility
     * 
     * @param request The permission check request
     * @return Validation result for user eligibility
     */
    ValidationResult checkUserEligibility(PermissionCheckRequest request);
    
    /**
     * Get business rule explanations for transparency.
     * Future: GET /api/decisions/rule-explanations/{ruleId}
     * 
     * @param ruleId The ID of the rule to explain
     * @return Human-readable explanation of the rule
     */
    String getRuleExplanation(String ruleId);
    
    /**
     * Get all rules that apply to a specific context.
     * Future: POST /api/decisions/applicable-rules
     * 
     * @param request The decision request defining the context
     * @return List of rule IDs that apply to this context
     */
    List<String> getApplicableRules(DecisionRequest request);
    
    /**
     * Perform batch validation for multiple items.
     * Future: POST /api/decisions/batch-validate
     * 
     * @param requests List of decision requests to validate
     * @return List of validation results in corresponding order
     */
    List<ValidationResult> batchValidate(List<DecisionRequest> requests);
    
    /**
     * Check if a rule set is consistent and has no conflicts.
     * Future: POST /api/decisions/validate-rule-consistency
     * 
     * @param ruleSetId The ID of the rule set to validate
     * @return Validation result indicating consistency status
     */
    ValidationResult validateRuleConsistency(String ruleSetId);
    
    /**
     * Get performance metrics for rule evaluation.
     * Future: GET /api/decisions/metrics
     * 
     * @return Performance metrics for rule evaluation
     */
    DecisionResult getRulePerformanceMetrics();
    
    /**
     * Test a rule with specific facts (for rule development/testing).
     * Future: POST /api/decisions/test-rule
     * 
     * @param ruleId The ID of the rule to test
     * @param request The test request with facts
     * @return Test result showing rule behavior
     */
    DecisionResult testRule(String ruleId, DecisionRequest request);
    
    /**
     * Get recommended actions based on current state.
     * This provides AI-like suggestions for users.
     * Future: POST /api/decisions/recommendations
     * 
     * @param request The decision request with current context
     * @return List of recommended actions with explanations
     */
    DecisionResult getRecommendations(DecisionRequest request);
    
    /**
     * Validate data quality and completeness before rule evaluation.
     * Future: POST /api/decisions/validate-data-quality
     * 
     * @param request The decision request to validate
     * @return Data quality validation result
     */
    ValidationResult validateDataQuality(DecisionRequest request);
    
    /**
     * Get audit trail for a specific decision.
     * Future: GET /api/decisions/audit-trail/{decisionId}
     * 
     * @param decisionId The ID of the decision to audit
     * @return Detailed audit trail of the decision process
     */
    DecisionResult getDecisionAuditTrail(String decisionId);
    
    /**
     * Refresh rules from external configuration.
     * Future: POST /api/decisions/refresh-rules
     * 
     * @return Status of the refresh operation
     */
    ValidationResult refreshRules();
    
    /**
     * Get current rule set version information.
     * Future: GET /api/decisions/rule-version
     * 
     * @return Information about current rule set version
     */
    DecisionResult getRuleSetInfo();
}