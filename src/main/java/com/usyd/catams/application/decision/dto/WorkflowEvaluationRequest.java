package com.usyd.catams.application.decision.dto;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

/**
 * Workflow Evaluation Request DTO
 * 
 * This DTO represents a request to evaluate workflow rules, such as determining
 * valid actions for a user in a specific approval state, or validating workflow
 * transitions.
 * 
 * Design Principles:
 * - Immutable data structure
 * - Comprehensive workflow context
 * - Future-ready for JSON serialization
 * - Contains all workflow evaluation parameters
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class WorkflowEvaluationRequest {
    
    private final String userId;
    private final UserRole userRole;
    private final String timesheetId;
    private final ApprovalStatus currentStatus;
    private final ApprovalAction proposedAction;
    private final String courseId;
    private final Map<String, Object> workflowContext;
    private final LocalDateTime timestamp;
    private final String comment;
    
    public WorkflowEvaluationRequest(String userId, UserRole userRole, String timesheetId,
                                   ApprovalStatus currentStatus, ApprovalAction proposedAction,
                                   String courseId, Map<String, Object> workflowContext,
                                   LocalDateTime timestamp, String comment) {
        this.userId = userId;
        this.userRole = userRole;
        this.timesheetId = timesheetId;
        this.currentStatus = currentStatus;
        this.proposedAction = proposedAction;
        this.courseId = courseId;
        this.workflowContext = workflowContext != null ? Map.copyOf(workflowContext) : Map.of();
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
        this.comment = comment;
    }
    
    /**
     * Builder pattern for easy construction
     */
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String userId;
        private UserRole userRole;
        private String timesheetId;
        private ApprovalStatus currentStatus;
        private ApprovalAction proposedAction;
        private String courseId;
        private Map<String, Object> workflowContext = Map.of();
        private LocalDateTime timestamp;
        private String comment;
        
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder userRole(UserRole userRole) { this.userRole = userRole; return this; }
        public Builder timesheetId(String timesheetId) { this.timesheetId = timesheetId; return this; }
        public Builder currentStatus(ApprovalStatus currentStatus) { this.currentStatus = currentStatus; return this; }
        public Builder proposedAction(ApprovalAction proposedAction) { this.proposedAction = proposedAction; return this; }
        public Builder courseId(String courseId) { this.courseId = courseId; return this; }
        public Builder workflowContext(Map<String, Object> workflowContext) { this.workflowContext = workflowContext; return this; }
        public Builder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }
        public Builder comment(String comment) { this.comment = comment; return this; }
        
        public WorkflowEvaluationRequest build() {
            Objects.requireNonNull(userId, "User ID is required");
            Objects.requireNonNull(userRole, "User role is required");
            Objects.requireNonNull(timesheetId, "Timesheet ID is required");
            Objects.requireNonNull(currentStatus, "Current status is required");
            
            return new WorkflowEvaluationRequest(userId, userRole, timesheetId, currentStatus,
                                               proposedAction, courseId, workflowContext, timestamp, comment);
        }
    }
    
    // Getters
    public String getUserId() { return userId; }
    public UserRole getUserRole() { return userRole; }
    public String getTimesheetId() { return timesheetId; }
    public ApprovalStatus getCurrentStatus() { return currentStatus; }
    public ApprovalAction getProposedAction() { return proposedAction; }
    public String getCourseId() { return courseId; }
    public Map<String, Object> getWorkflowContext() { return workflowContext; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getComment() { return comment; }
    
    /**
     * Get workflow context value with type casting
     */
    @SuppressWarnings("unchecked")
    public <T> T getWorkflowContext(String key, Class<T> type) {
        Object value = workflowContext.get(key);
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new ClassCastException(
            String.format("Workflow context '%s' cannot be cast to %s", key, type.getSimpleName()));
    }
    
    /**
     * Get workflow context value with default
     */
    @SuppressWarnings("unchecked")
    public <T> T getWorkflowContext(String key, T defaultValue) {
        Object value = workflowContext.get(key);
        return value != null ? (T) value : defaultValue;
    }
    
    /**
     * Check if workflow context exists
     */
    public boolean hasWorkflowContext(String key) {
        return workflowContext.containsKey(key);
    }
    
    /**
     * Check if this is a transition evaluation (has proposed action)
     */
    public boolean isTransitionEvaluation() {
        return proposedAction != null;
    }
    
    /**
     * Check if this is a valid actions query (no proposed action)
     */
    public boolean isValidActionsQuery() {
        return proposedAction == null;
    }
    
    /**
     * Check if comment is provided (required for some actions)
     */
    public boolean hasComment() {
        return comment != null && !comment.trim().isEmpty();
    }
    
    /**
     * Check if this is an admin workflow request
     */
    public boolean isAdminRequest() {
        return userRole == UserRole.ADMIN;
    }
    
    /**
     * Get workflow identifier for logging
     */
    public String getWorkflowIdentifier() {
        return String.format("Timesheet:%s", timesheetId);
    }
    
    /**
     * Create a copy with different proposed action
     */
    public WorkflowEvaluationRequest withProposedAction(ApprovalAction newProposedAction) {
        return new WorkflowEvaluationRequest(userId, userRole, timesheetId, currentStatus,
                                           newProposedAction, courseId, workflowContext, timestamp, comment);
    }
    
    /**
     * Create a copy with additional workflow context
     */
    public WorkflowEvaluationRequest withAdditionalContext(Map<String, Object> additionalContext) {
        Map<String, Object> newContext = Map.copyOf(workflowContext);
        ((Map<String, Object>) newContext).putAll(additionalContext);
        
        return new WorkflowEvaluationRequest(userId, userRole, timesheetId, currentStatus,
                                           proposedAction, courseId, newContext, timestamp, comment);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkflowEvaluationRequest that = (WorkflowEvaluationRequest) o;
        return Objects.equals(userId, that.userId) &&
               userRole == that.userRole &&
               Objects.equals(timesheetId, that.timesheetId) &&
               currentStatus == that.currentStatus &&
               proposedAction == that.proposedAction;
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(userId, userRole, timesheetId, currentStatus, proposedAction);
    }
    
    @Override
    public String toString() {
        return String.format("WorkflowEvaluationRequest{user='%s', role=%s, timesheet='%s', status=%s, action=%s}", 
            userId, userRole, timesheetId, currentStatus, proposedAction);
    }
}