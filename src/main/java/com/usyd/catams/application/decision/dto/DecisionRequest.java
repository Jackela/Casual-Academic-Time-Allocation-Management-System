package com.usyd.catams.application.decision.dto;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Decision Request DTO
 * 
 * This DTO represents a request for business rule evaluation. It contains
 * all the facts and context needed for the decision service to evaluate
 * business rules and return decisions.
 * 
 * Design Principles:
 * - Immutable data structure
 * - Flexible fact-based approach
 * - Future-ready for JSON serialization
 * - Contains execution context for auditing
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class DecisionRequest {
    
    private final String ruleSetId;
    private final String requestId;
    private final Map<String, Object> facts;
    private final Map<String, String> context;
    private final LocalDateTime timestamp;
    private final String userId;
    private final String sessionId;
    private final Integer priority;
    
    public DecisionRequest(String ruleSetId, String requestId, Map<String, Object> facts,
                          Map<String, String> context, LocalDateTime timestamp, String userId,
                          String sessionId, Integer priority) {
        this.ruleSetId = ruleSetId;
        this.requestId = requestId;
        this.facts = facts != null ? Map.copyOf(facts) : Map.of();
        this.context = context != null ? Map.copyOf(context) : Map.of();
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
        this.userId = userId;
        this.sessionId = sessionId;
        this.priority = priority != null ? priority : 5; // Default priority
    }
    
    /**
     * Builder pattern for easy construction
     */
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String ruleSetId;
        private String requestId;
        private Map<String, Object> facts = new HashMap<>();
        private Map<String, String> context = new HashMap<>();
        private LocalDateTime timestamp;
        private String userId;
        private String sessionId;
        private Integer priority;
        
        public Builder ruleSetId(String ruleSetId) { 
            this.ruleSetId = ruleSetId; 
            return this; 
        }
        
        public Builder requestId(String requestId) { 
            this.requestId = requestId; 
            return this; 
        }
        
        public Builder fact(String key, Object value) {
            this.facts.put(key, value);
            return this;
        }
        
        public Builder facts(Map<String, Object> facts) {
            this.facts.putAll(facts);
            return this;
        }
        
        public Builder context(String key, String value) {
            this.context.put(key, value);
            return this;
        }
        
        public Builder contextMap(Map<String, String> context) {
            this.context.putAll(context);
            return this;
        }
        
        public Builder timestamp(LocalDateTime timestamp) { 
            this.timestamp = timestamp; 
            return this; 
        }
        
        public Builder userId(String userId) { 
            this.userId = userId; 
            return this; 
        }
        
        public Builder sessionId(String sessionId) { 
            this.sessionId = sessionId; 
            return this; 
        }
        
        public Builder priority(Integer priority) { 
            this.priority = priority; 
            return this; 
        }
        
        public DecisionRequest build() {
            Objects.requireNonNull(ruleSetId, "Rule set ID is required");
            
            return new DecisionRequest(ruleSetId, requestId, facts, context, 
                                     timestamp, userId, sessionId, priority);
        }
    }
    
    // Getters
    public String getRuleSetId() { return ruleSetId; }
    public String getRequestId() { return requestId; }
    public Map<String, Object> getFacts() { return facts; }
    public Map<String, String> getContext() { return context; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getUserId() { return userId; }
    public String getSessionId() { return sessionId; }
    public Integer getPriority() { return priority; }
    
    /**
     * Get a fact value with type casting
     */
    @SuppressWarnings("unchecked")
    public <T> T getFact(String key, Class<T> type) {
        Object value = facts.get(key);
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new ClassCastException(
            String.format("Fact '%s' cannot be cast to %s, actual type: %s", 
                         key, type.getSimpleName(), value.getClass().getSimpleName()));
    }
    
    /**
     * Get a fact value with default
     */
    @SuppressWarnings("unchecked")
    public <T> T getFact(String key, T defaultValue) {
        Object value = facts.get(key);
        return value != null ? (T) value : defaultValue;
    }
    
    /**
     * Check if a fact exists
     */
    public boolean hasFact(String key) {
        return facts.containsKey(key);
    }
    
    /**
     * Get context value with default
     */
    public String getContext(String key, String defaultValue) {
        return context.getOrDefault(key, defaultValue);
    }
    
    /**
     * Check if context exists
     */
    public boolean hasContext(String key) {
        return context.containsKey(key);
    }
    
    /**
     * Create a copy with additional facts
     */
    public DecisionRequest withAdditionalFacts(Map<String, Object> additionalFacts) {
        Map<String, Object> newFacts = new HashMap<>(this.facts);
        newFacts.putAll(additionalFacts);
        
        return new DecisionRequest(ruleSetId, requestId, newFacts, context, 
                                 timestamp, userId, sessionId, priority);
    }
    
    /**
     * Create a copy with different rule set
     */
    public DecisionRequest withRuleSet(String newRuleSetId) {
        return new DecisionRequest(newRuleSetId, requestId, facts, context, 
                                 timestamp, userId, sessionId, priority);
    }
    
    /**
     * Create a copy with additional context
     */
    public DecisionRequest withAdditionalContext(Map<String, String> additionalContext) {
        Map<String, String> newContext = new HashMap<>(this.context);
        newContext.putAll(additionalContext);
        
        return new DecisionRequest(ruleSetId, requestId, facts, newContext, 
                                 timestamp, userId, sessionId, priority);
    }
    
    /**
     * Get a summary of facts for logging
     */
    public String getFactsSummary() {
        return facts.entrySet().stream()
            .map(entry -> String.format("%s=%s", entry.getKey(), 
                                       entry.getValue() != null ? entry.getValue().toString() : "null"))
            .reduce((a, b) -> a + ", " + b)
            .orElse("No facts");
    }
    
    /**
     * Check if request has high priority
     */
    public boolean isHighPriority() {
        return priority != null && priority >= 8;
    }
    
    /**
     * Check if request has low priority
     */
    public boolean isLowPriority() {
        return priority != null && priority <= 3;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DecisionRequest that = (DecisionRequest) o;
        return Objects.equals(ruleSetId, that.ruleSetId) &&
               Objects.equals(requestId, that.requestId) &&
               Objects.equals(facts, that.facts) &&
               Objects.equals(userId, that.userId);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(ruleSetId, requestId, facts, userId);
    }
    
    @Override
    public String toString() {
        return String.format("DecisionRequest{ruleSet='%s', requestId='%s', facts=%d, user='%s', priority=%d}", 
            ruleSetId, requestId, facts.size(), userId, priority);
    }
}