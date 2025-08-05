package com.usyd.catams.application.decision.dto;

import com.usyd.catams.enums.UserRole;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

/**
 * Permission Check Request DTO
 * 
 * This DTO represents a request to check if a user has permission to perform
 * a specific action on a resource. It's used by the DecisionService to
 * evaluate authorization rules.
 * 
 * Design Principles:
 * - Immutable data structure
 * - Clear permission context
 * - Future-ready for JSON serialization
 * - Contains all necessary authorization context
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class PermissionCheckRequest {
    
    private final String userId;
    private final UserRole userRole;
    private final String action;
    private final String resourceType;
    private final String resourceId;
    private final Map<String, Object> context;
    private final LocalDateTime timestamp;
    private final String sessionId;
    
    public PermissionCheckRequest(String userId, UserRole userRole, String action,
                                 String resourceType, String resourceId, Map<String, Object> context,
                                 LocalDateTime timestamp, String sessionId) {
        this.userId = userId;
        this.userRole = userRole;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.context = context != null ? Map.copyOf(context) : Map.of();
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
        this.sessionId = sessionId;
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
        private String action;
        private String resourceType;
        private String resourceId;
        private Map<String, Object> context = Map.of();
        private LocalDateTime timestamp;
        private String sessionId;
        
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder userRole(UserRole userRole) { this.userRole = userRole; return this; }
        public Builder action(String action) { this.action = action; return this; }
        public Builder resourceType(String resourceType) { this.resourceType = resourceType; return this; }
        public Builder resourceId(String resourceId) { this.resourceId = resourceId; return this; }
        public Builder context(Map<String, Object> context) { this.context = context; return this; }
        public Builder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }
        public Builder sessionId(String sessionId) { this.sessionId = sessionId; return this; }
        
        public PermissionCheckRequest build() {
            Objects.requireNonNull(userId, "User ID is required");
            Objects.requireNonNull(userRole, "User role is required");
            Objects.requireNonNull(action, "Action is required");
            Objects.requireNonNull(resourceType, "Resource type is required");
            
            return new PermissionCheckRequest(userId, userRole, action, resourceType, 
                                            resourceId, context, timestamp, sessionId);
        }
    }
    
    // Getters
    public String getUserId() { return userId; }
    public UserRole getUserRole() { return userRole; }
    public String getAction() { return action; }
    public String getResourceType() { return resourceType; }
    public String getResourceId() { return resourceId; }
    public Map<String, Object> getContext() { return context; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getSessionId() { return sessionId; }
    
    /**
     * Get context value with type casting
     */
    @SuppressWarnings("unchecked")
    public <T> T getContext(String key, Class<T> type) {
        Object value = context.get(key);
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new ClassCastException(
            String.format("Context '%s' cannot be cast to %s", key, type.getSimpleName()));
    }
    
    /**
     * Get context value with default
     */
    @SuppressWarnings("unchecked")
    public <T> T getContext(String key, T defaultValue) {
        Object value = context.get(key);
        return value != null ? (T) value : defaultValue;
    }
    
    /**
     * Check if context exists
     */
    public boolean hasContext(String key) {
        return context.containsKey(key);
    }
    
    /**
     * Check if this is an admin permission check
     */
    public boolean isAdminRequest() {
        return userRole == UserRole.ADMIN;
    }
    
    /**
     * Get resource identifier for logging
     */
    public String getResourceIdentifier() {
        return resourceId != null ? 
            String.format("%s:%s", resourceType, resourceId) : 
            resourceType;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PermissionCheckRequest that = (PermissionCheckRequest) o;
        return Objects.equals(userId, that.userId) &&
               userRole == that.userRole &&
               Objects.equals(action, that.action) &&
               Objects.equals(resourceType, that.resourceType) &&
               Objects.equals(resourceId, that.resourceId);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(userId, userRole, action, resourceType, resourceId);
    }
    
    @Override
    public String toString() {
        return String.format("PermissionCheckRequest{user='%s', role=%s, action='%s', resource='%s'}", 
            userId, userRole, action, getResourceIdentifier());
    }
}