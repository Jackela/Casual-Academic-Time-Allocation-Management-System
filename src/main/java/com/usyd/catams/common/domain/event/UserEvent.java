package com.usyd.catams.common.domain.event;

import com.usyd.catams.enums.UserRole;

import java.util.Map;

/**
 * User domain events for the CATAMS system
 * 
 * These events represent significant user-related business occurrences that other
 * services or components need to be aware of. When extracted to microservices, these
 * events will be published to message queues for cross-service communication.
 * 
 * Event Types:
 * - UserCreatedEvent: New user account created
 * - UserUpdatedEvent: User profile modified
 * - UserActivatedEvent: User account activated
 * - UserDeactivatedEvent: User account deactivated
 * - UserRoleChangedEvent: User role modified
 * - UserLoginEvent: User successfully logged in
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public abstract class UserEvent extends AbstractDomainEvent {
    
    private static final String AGGREGATE_TYPE = "USER";
    
    protected final String email;
    protected final String name;
    protected final UserRole role;
    
    protected UserEvent(String userId, String email, String name, UserRole role,
                       String triggeredBy, String correlationId) {
        super(userId, AGGREGATE_TYPE, triggeredBy, correlationId, null);
        this.email = email;
        this.name = name;
        this.role = role;
    }
    
    public String getEmail() { return email; }
    public String getName() { return name; }
    public UserRole getRole() { return role; }
    
    /**
     * Event fired when a new user account is created
     */
    public static class UserCreatedEvent extends UserEvent {
        
        private final boolean isActive;
        
        public UserCreatedEvent(String userId, String email, String name, UserRole role,
                               boolean isActive, String triggeredBy, String correlationId) {
            super(userId, email, name, role, triggeredBy, correlationId);
            this.isActive = isActive;
        }
        
        @Override
        public String getEventType() {
            return "USER_CREATED";
        }
        
        public boolean isActive() { return isActive; }
        
        @Override
        public Map<String, Object> getMetadata() {
            Map<String, Object> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("welcomeEmailRequired", true);
            metadata.put("accountSetupRequired", true);
            return metadata;
        }
    }
    
    /**
     * Event fired when user profile information is updated
     */
    public static class UserUpdatedEvent extends UserEvent {
        
        private final String previousName;
        private final String previousEmail;
        
        public UserUpdatedEvent(String userId, String previousEmail, String previousName,
                               String newEmail, String newName, UserRole role,
                               String triggeredBy, String correlationId) {
            super(userId, newEmail, newName, role, triggeredBy, correlationId);
            this.previousEmail = previousEmail;
            this.previousName = previousName;
        }
        
        @Override
        public String getEventType() {
            return "USER_UPDATED";
        }
        
        public String getPreviousEmail() { return previousEmail; }
        public String getPreviousName() { return previousName; }
        
        public boolean hasEmailChanged() {
            return !java.util.Objects.equals(previousEmail, email);
        }
        
        public boolean hasNameChanged() {
            return !java.util.Objects.equals(previousName, name);
        }
        
        @Override
        public Map<String, Object> getMetadata() {
            Map<String, Object> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("emailChanged", hasEmailChanged());
            metadata.put("nameChanged", hasNameChanged());
            if (hasEmailChanged()) {
                metadata.put("emailVerificationRequired", true);
            }
            return metadata;
        }
    }
    
    /**
     * Event fired when a user account is activated
     */
    public static class UserActivatedEvent extends UserEvent {
        
        private final String activationReason;
        
        public UserActivatedEvent(String userId, String email, String name, UserRole role,
                                 String activationReason, String triggeredBy, String correlationId) {
            super(userId, email, name, role, triggeredBy, correlationId);
            this.activationReason = activationReason;
        }
        
        @Override
        public String getEventType() {
            return "USER_ACTIVATED";
        }
        
        public String getActivationReason() { return activationReason; }
        
        @Override
        public Map<String, Object> getMetadata() {
            Map<String, Object> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("activationReason", activationReason);
            metadata.put("welcomeBackEmailRequired", true);
            return metadata;
        }
    }
    
    /**
     * Event fired when a user account is deactivated
     */
    public static class UserDeactivatedEvent extends UserEvent {
        
        private final String deactivationReason;
        private final boolean isTemporary;
        
        public UserDeactivatedEvent(String userId, String email, String name, UserRole role,
                                   String deactivationReason, boolean isTemporary,
                                   String triggeredBy, String correlationId) {
            super(userId, email, name, role, triggeredBy, correlationId);
            this.deactivationReason = deactivationReason;
            this.isTemporary = isTemporary;
        }
        
        @Override
        public String getEventType() {
            return "USER_DEACTIVATED";
        }
        
        public String getDeactivationReason() { return deactivationReason; }
        public boolean isTemporary() { return isTemporary; }
        
        @Override
        public Map<String, Object> getMetadata() {
            Map<String, Object> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("deactivationReason", deactivationReason);
            metadata.put("isTemporary", isTemporary);
            metadata.put("cleanupRequired", true);
            return metadata;
        }
    }
    
    /**
     * Event fired when a user's role is changed
     */
    public static class UserRoleChangedEvent extends UserEvent {
        
        private final UserRole previousRole;
        private final String changeReason;
        
        public UserRoleChangedEvent(String userId, String email, String name,
                                   UserRole previousRole, UserRole newRole, String changeReason,
                                   String triggeredBy, String correlationId) {
            super(userId, email, name, newRole, triggeredBy, correlationId);
            this.previousRole = previousRole;
            this.changeReason = changeReason;
        }
        
        @Override
        public String getEventType() {
            return "USER_ROLE_CHANGED";
        }
        
        public UserRole getPreviousRole() { return previousRole; }
        public UserRole getNewRole() { return role; }
        public String getChangeReason() { return changeReason; }
        
        public boolean isPromotion() {
            return isHigherRole(role, previousRole);
        }
        
        public boolean isDemotion() {
            return isHigherRole(previousRole, role);
        }
        
        private boolean isHigherRole(UserRole role1, UserRole role2) {
            int hierarchy1 = getRoleHierarchy(role1);
            int hierarchy2 = getRoleHierarchy(role2);
            return hierarchy1 > hierarchy2;
        }
        
        private int getRoleHierarchy(UserRole role) {
            return switch (role) {
                case TUTOR -> 1;
                case LECTURER -> 2;
                case HR -> 3;
                case ADMIN -> 4;
            };
        }
        
        @Override
        public Map<String, Object> getMetadata() {
            Map<String, Object> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("previousRole", previousRole.toString());
            metadata.put("newRole", role.toString());
            metadata.put("changeReason", changeReason);
            metadata.put("isPromotion", isPromotion());
            metadata.put("isDemotion", isDemotion());
            metadata.put("permissionUpdateRequired", true);
            return metadata;
        }
    }
    
    /**
     * Event fired when a user successfully logs in
     */
    public static class UserLoginEvent extends UserEvent {
        
        private final java.time.LocalDateTime loginTime;
        private final String ipAddress;
        private final String userAgent;
        
        public UserLoginEvent(String userId, String email, String name, UserRole role,
                             java.time.LocalDateTime loginTime, String ipAddress, String userAgent,
                             String correlationId) {
            super(userId, email, name, role, userId, correlationId);
            this.loginTime = loginTime;
            this.ipAddress = ipAddress;
            this.userAgent = userAgent;
        }
        
        @Override
        public String getEventType() {
            return "USER_LOGIN";
        }
        
        public java.time.LocalDateTime getLoginTime() { return loginTime; }
        public String getIpAddress() { return ipAddress; }
        public String getUserAgent() { return userAgent; }
        
        @Override
        public Map<String, Object> getMetadata() {
            Map<String, Object> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("loginTime", loginTime);
            metadata.put("ipAddress", ipAddress);
            metadata.put("userAgent", userAgent);
            metadata.put("securityCheck", shouldPerformSecurityCheck());
            return metadata;
        }
        
        private boolean shouldPerformSecurityCheck() {
            // Could include logic for suspicious login patterns
            return false;
        }
        
        @Override
        public boolean isPublishable() {
            // Login events might be used for analytics but not always published externally
            return false;
        }
    }
    
    /**
     * Event fired when a user's password is changed
     */
    public static class UserPasswordChangedEvent extends UserEvent {
        
        private final boolean wasReset;
        private final String changeReason;
        
        public UserPasswordChangedEvent(String userId, String email, String name, UserRole role,
                                       boolean wasReset, String changeReason,
                                       String triggeredBy, String correlationId) {
            super(userId, email, name, role, triggeredBy, correlationId);
            this.wasReset = wasReset;
            this.changeReason = changeReason;
        }
        
        @Override
        public String getEventType() {
            return "USER_PASSWORD_CHANGED";
        }
        
        public boolean wasReset() { return wasReset; }
        public String getChangeReason() { return changeReason; }
        
        @Override
        public Map<String, Object> getMetadata() {
            Map<String, Object> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("wasReset", wasReset);
            metadata.put("changeReason", changeReason);
            metadata.put("securityNotificationRequired", true);
            return metadata;
        }
    }
}