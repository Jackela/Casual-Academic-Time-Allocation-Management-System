package com.usyd.catams.application.decision.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Validation Result DTO
 * 
 * This DTO represents the result of a validation operation. It's a simplified
 * version of DecisionResult focused specifically on validation outcomes.
 * 
 * Design Principles:
 * - Immutable data structure
 * - Clear validation status
 * - Future-ready for JSON serialization
 * - Focused on validation concerns
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class ValidationResult {
    
    private final boolean valid;
    private final List<String> violations;
    private final List<String> warnings;
    private final Map<String, Object> validationData;
    private final String summary;
    private final LocalDateTime timestamp;
    
    public ValidationResult(boolean valid, List<String> violations, List<String> warnings,
                           Map<String, Object> validationData, String summary, LocalDateTime timestamp) {
        this.valid = valid;
        this.violations = violations != null ? List.copyOf(violations) : List.of();
        this.warnings = warnings != null ? List.copyOf(warnings) : List.of();
        this.validationData = validationData != null ? Map.copyOf(validationData) : Map.of();
        this.summary = summary;
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
    }
    
    /**
     * Create a successful validation result
     */
    public static ValidationResult valid() {
        return new ValidationResult(true, List.of(), List.of(), Map.of(), "Validation passed", LocalDateTime.now());
    }
    
    /**
     * Create a failed validation result with violations
     */
    public static ValidationResult invalid(List<String> violations) {
        return new ValidationResult(false, violations, List.of(), Map.of(), "Validation failed", LocalDateTime.now());
    }
    
    /**
     * Create a validation result with warnings but still valid
     */
    public static ValidationResult validWithWarnings(List<String> warnings) {
        return new ValidationResult(true, List.of(), warnings, Map.of(), "Validation passed with warnings", LocalDateTime.now());
    }
    
    /**
     * Builder pattern for complex validation results
     */
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private boolean valid = true;
        private List<String> violations = List.of();
        private List<String> warnings = List.of();
        private Map<String, Object> validationData = Map.of();
        private String summary;
        private LocalDateTime timestamp;
        
        public Builder valid(boolean valid) { this.valid = valid; return this; }
        public Builder violations(List<String> violations) { this.violations = violations; return this; }
        public Builder warnings(List<String> warnings) { this.warnings = warnings; return this; }
        public Builder validationData(Map<String, Object> validationData) { this.validationData = validationData; return this; }
        public Builder summary(String summary) { this.summary = summary; return this; }
        public Builder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }
        
        public ValidationResult build() {
            return new ValidationResult(valid, violations, warnings, validationData, summary, timestamp);
        }
    }
    
    // Getters
    public boolean isValid() { return valid; }
    public List<String> getViolations() { return violations; }
    public List<String> getWarnings() { return warnings; }
    public Map<String, Object> getValidationData() { return validationData; }
    public String getSummary() { return summary; }
    public LocalDateTime getTimestamp() { return timestamp; }
    
    /**
     * Check if result has violations
     */
    public boolean hasViolations() {
        return !violations.isEmpty();
    }
    
    /**
     * Check if result has warnings
     */
    public boolean hasWarnings() {
        return !warnings.isEmpty();
    }
    
    /**
     * Get total issue count (violations + warnings)
     */
    public int getIssueCount() {
        return violations.size() + warnings.size();
    }
    
    /**
     * Get validation data value with type casting
     */
    @SuppressWarnings("unchecked")
    public <T> T getValidationData(String key, Class<T> type) {
        Object value = validationData.get(key);
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new ClassCastException(
            String.format("Validation data '%s' cannot be cast to %s", key, type.getSimpleName()));
    }
    
    /**
     * Get validation data with default value
     */
    @SuppressWarnings("unchecked")
    public <T> T getValidationData(String key, T defaultValue) {
        Object value = validationData.get(key);
        return value != null ? (T) value : defaultValue;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ValidationResult that = (ValidationResult) o;
        return valid == that.valid &&
               Objects.equals(violations, that.violations) &&
               Objects.equals(warnings, that.warnings);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(valid, violations, warnings);
    }
    
    @Override
    public String toString() {
        return String.format("ValidationResult{valid=%s, violations=%d, warnings=%d, summary='%s'}", 
            valid, violations.size(), warnings.size(), summary);
    }
}