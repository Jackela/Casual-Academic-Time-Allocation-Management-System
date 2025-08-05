package com.usyd.catams.application.user.dto;

import com.usyd.catams.enums.UserRole;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * User Data Transfer Object
 * 
 * This DTO represents user data that will be transferred across service boundaries.
 * When extracted to a microservice, this will become the JSON format for user data
 * in REST API requests and responses.
 * 
 * Design Principles:
 * - Immutable data structure
 * - No domain logic, pure data holder
 * - Serializable for future JSON conversion
 * - Contains only data needed across service boundaries
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class UserDto {
    
    private final Long id;
    private final String email;
    private final String firstName;
    private final String lastName;
    private final UserRole role;
    private final boolean active;
    private final LocalDateTime createdAt;
    private final LocalDateTime lastLoginAt;
    
    public UserDto(Long id, String email, String firstName, String lastName, 
                   UserRole role, boolean active, LocalDateTime createdAt, 
                   LocalDateTime lastLoginAt) {
        this.id = id;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
        this.active = active;
        this.createdAt = createdAt;
        this.lastLoginAt = lastLoginAt;
    }
    
    /**
     * Builder pattern for easy construction in tests and services
     */
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private UserRole role;
        private boolean active = true;
        private LocalDateTime createdAt;
        private LocalDateTime lastLoginAt;
        
        public Builder id(Long id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder firstName(String firstName) { this.firstName = firstName; return this; }
        public Builder lastName(String lastName) { this.lastName = lastName; return this; }
        public Builder role(UserRole role) { this.role = role; return this; }
        public Builder active(boolean active) { this.active = active; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder lastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; return this; }
        
        public UserDto build() {
            Objects.requireNonNull(id, "User ID is required");
            Objects.requireNonNull(email, "Email is required");
            Objects.requireNonNull(role, "Role is required");
            
            return new UserDto(id, email, firstName, lastName, role, active, createdAt, lastLoginAt);
        }
    }
    
    // Getters
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public UserRole getRole() { return role; }
    public boolean isActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    
    /**
     * Get full name for display purposes
     */
    public String getFullName() {
        if (firstName == null && lastName == null) {
            return email; // Fallback to email if names not available
        }
        return String.format("%s %s", 
            firstName != null ? firstName : "", 
            lastName != null ? lastName : "").trim();
    }
    
    /**
     * Check if user has a specific role
     */
    public boolean hasRole(UserRole role) {
        return this.role == role;
    }
    
    /**
     * Check if user is admin
     */
    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }
    
    /**
     * Check if user is HR
     */
    public boolean isHR() {
        return role == UserRole.HR;
    }
    
    /**
     * Check if user is lecturer
     */
    public boolean isLecturer() {
        return role == UserRole.LECTURER;
    }
    
    /**
     * Check if user is tutor
     */
    public boolean isTutor() {
        return role == UserRole.TUTOR;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDto userDto = (UserDto) o;
        return Objects.equals(id, userDto.id) && Objects.equals(email, userDto.email);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, email);
    }
    
    @Override
    public String toString() {
        return String.format("UserDto{id=%d, email='%s', role=%s, active=%s}", 
            id, email, role, active);
    }
}