package com.usyd.catams.application.decision.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Decision Result DTO
 * 
 * This DTO represents the result of a business rule evaluation. It contains
 * the decision outcome, any violations found, recommendations, and metadata
 * about the evaluation process.
 * 
 * Design Principles:
 * - Immutable data structure
 * - Comprehensive result information
 * - Future-ready for JSON serialization
 * - Contains execution metadata for monitoring
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class DecisionResult {
    
    public enum Decision {
        APPROVED,
        REJECTED,
        CONDITIONAL,
        PENDING_REVIEW,
        INSUFFICIENT_DATA,
        ERROR
    }
    
    public enum Severity {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW,
        INFO
    }
    
    private final String requestId;
    private final Decision decision;
    private final boolean valid;
    private final List<RuleViolation> violations;
    private final List<Recommendation> recommendations;
    private final Map<String, Object> resultData;
    private final ExecutionMetadata metadata;
    private final LocalDateTime timestamp;
    
    public DecisionResult(String requestId, Decision decision, boolean valid,
                         List<RuleViolation> violations, List<Recommendation> recommendations,
                         Map<String, Object> resultData, ExecutionMetadata metadata,
                         LocalDateTime timestamp) {
        this.requestId = requestId;
        this.decision = decision;
        this.valid = valid;
        this.violations = violations != null ? List.copyOf(violations) : List.of();
        this.recommendations = recommendations != null ? List.copyOf(recommendations) : List.of();
        this.resultData = resultData != null ? Map.copyOf(resultData) : Map.of();
        this.metadata = metadata;
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
    }
    
    /**
     * Builder pattern for easy construction
     */
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String requestId;
        private Decision decision;
        private boolean valid = true;
        private List<RuleViolation> violations = List.of();
        private List<Recommendation> recommendations = List.of();
        private Map<String, Object> resultData = Map.of();
        private ExecutionMetadata metadata;
        private LocalDateTime timestamp;
        
        public Builder requestId(String requestId) { this.requestId = requestId; return this; }
        public Builder decision(Decision decision) { this.decision = decision; return this; }
        public Builder valid(boolean valid) { this.valid = valid; return this; }
        public Builder violations(List<RuleViolation> violations) { this.violations = violations; return this; }
        public Builder recommendations(List<Recommendation> recommendations) { this.recommendations = recommendations; return this; }
        public Builder resultData(Map<String, Object> resultData) { this.resultData = resultData; return this; }
        public Builder metadata(ExecutionMetadata metadata) { this.metadata = metadata; return this; }
        public Builder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }
        
        public DecisionResult build() {
            return new DecisionResult(requestId, decision, valid, violations, 
                                    recommendations, resultData, metadata, timestamp);
        }
    }
    
    // Getters
    public String getRequestId() { return requestId; }
    public Decision getDecision() { return decision; }
    public boolean isValid() { return valid; }
    public List<RuleViolation> getViolations() { return violations; }
    public List<Recommendation> getRecommendations() { return recommendations; }
    public Map<String, Object> getResultData() { return resultData; }
    public ExecutionMetadata getMetadata() { return metadata; }
    public LocalDateTime getTimestamp() { return timestamp; }
    
    /**
     * Check if result has any violations
     */
    public boolean hasViolations() {
        return !violations.isEmpty();
    }
    
    /**
     * Check if result has critical violations
     */
    public boolean hasCriticalViolations() {
        return violations.stream().anyMatch(v -> v.getSeverity() == Severity.CRITICAL);
    }
    
    /**
     * Get violations by severity
     */
    public List<RuleViolation> getViolationsBySeverity(Severity severity) {
        return violations.stream()
            .filter(v -> v.getSeverity() == severity)
            .toList();
    }
    
    /**
     * Check if result has recommendations
     */
    public boolean hasRecommendations() {
        return !recommendations.isEmpty();
    }
    
    /**
     * Get result data value with type casting
     */
    @SuppressWarnings("unchecked")
    public <T> T getResultData(String key, Class<T> type) {
        Object value = resultData.get(key);
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new ClassCastException(
            String.format("Result data '%s' cannot be cast to %s", key, type.getSimpleName()));
    }
    
    /**
     * Get result data value with default
     */
    @SuppressWarnings("unchecked")
    public <T> T getResultData(String key, T defaultValue) {
        Object value = resultData.get(key);
        return value != null ? (T) value : defaultValue;
    }
    
    /**
     * Check if result is approved
     */
    public boolean isApproved() {
        return decision == Decision.APPROVED;
    }
    
    /**
     * Check if result is rejected
     */
    public boolean isRejected() {
        return decision == Decision.REJECTED;
    }
    
    /**
     * Check if result needs review
     */
    public boolean needsReview() {
        return decision == Decision.PENDING_REVIEW || decision == Decision.CONDITIONAL;
    }
    
    /**
     * Get summary of the decision
     */
    public String getSummary() {
        StringBuilder summary = new StringBuilder();
        summary.append("Decision: ").append(decision);
        
        if (hasViolations()) {
            summary.append(", Violations: ").append(violations.size());
        }
        
        if (hasRecommendations()) {
            summary.append(", Recommendations: ").append(recommendations.size());
        }
        
        return summary.toString();
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DecisionResult that = (DecisionResult) o;
        return Objects.equals(requestId, that.requestId) &&
               decision == that.decision &&
               valid == that.valid;
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(requestId, decision, valid);
    }
    
    @Override
    public String toString() {
        return String.format("DecisionResult{requestId='%s', decision=%s, valid=%s, violations=%d, recommendations=%d}", 
            requestId, decision, valid, violations.size(), recommendations.size());
    }
    
    /**
     * Rule Violation nested class
     */
    public static class RuleViolation {
        private final String ruleId;
        private final String message;
        private final Severity severity;
        private final String field;
        private final Object actualValue;
        private final Object expectedValue;
        
        public RuleViolation(String ruleId, String message, Severity severity, 
                           String field, Object actualValue, Object expectedValue) {
            this.ruleId = ruleId;
            this.message = message;
            this.severity = severity;
            this.field = field;
            this.actualValue = actualValue;
            this.expectedValue = expectedValue;
        }
        
        // Getters
        public String getRuleId() { return ruleId; }
        public String getMessage() { return message; }
        public Severity getSeverity() { return severity; }
        public String getField() { return field; }
        public Object getActualValue() { return actualValue; }
        public Object getExpectedValue() { return expectedValue; }
        
        @Override
        public String toString() {
            return String.format("RuleViolation{rule='%s', severity=%s, message='%s'}", 
                ruleId, severity, message);
        }
    }
    
    /**
     * Recommendation nested class
     */
    public static class Recommendation {
        private final String id;
        private final String title;
        private final String description;
        private final String action;
        private final Map<String, Object> parameters;
        private final Integer priority;
        
        public Recommendation(String id, String title, String description, 
                            String action, Map<String, Object> parameters, Integer priority) {
            this.id = id;
            this.title = title;
            this.description = description;
            this.action = action;
            this.parameters = parameters != null ? Map.copyOf(parameters) : Map.of();
            this.priority = priority != null ? priority : 5;
        }
        
        // Getters
        public String getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public String getAction() { return action; }
        public Map<String, Object> getParameters() { return parameters; }
        public Integer getPriority() { return priority; }
        
        @Override
        public String toString() {
            return String.format("Recommendation{id='%s', title='%s', priority=%d}", 
                id, title, priority);
        }
    }
    
    /**
     * Execution Metadata nested class
     */
    public static class ExecutionMetadata {
        private final String ruleSetVersion;
        private final long executionTimeMs;
        private final List<String> rulesApplied;
        private final String engineVersion;
        private final Map<String, Object> debugInfo;
        
        public ExecutionMetadata(String ruleSetVersion, long executionTimeMs,
                               List<String> rulesApplied, String engineVersion,
                               Map<String, Object> debugInfo) {
            this.ruleSetVersion = ruleSetVersion;
            this.executionTimeMs = executionTimeMs;
            this.rulesApplied = rulesApplied != null ? List.copyOf(rulesApplied) : List.of();
            this.engineVersion = engineVersion;
            this.debugInfo = debugInfo != null ? Map.copyOf(debugInfo) : Map.of();
        }
        
        // Getters
        public String getRuleSetVersion() { return ruleSetVersion; }
        public long getExecutionTimeMs() { return executionTimeMs; }
        public List<String> getRulesApplied() { return rulesApplied; }
        public String getEngineVersion() { return engineVersion; }
        public Map<String, Object> getDebugInfo() { return debugInfo; }
        
        @Override
        public String toString() {
            return String.format("ExecutionMetadata{version='%s', time=%dms, rules=%d}", 
                ruleSetVersion, executionTimeMs, rulesApplied.size());
        }
    }
}