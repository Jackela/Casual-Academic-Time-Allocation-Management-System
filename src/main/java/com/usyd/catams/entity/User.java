package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.enums.UserRole;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * User entity representing users in the CATAMS system
 * 
 * Contains user authentication and profile information including
 * email, password, role, and account status
 * 
 * @author Development Team
 * @since 1.0
 */
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email_value", unique = true),
    @Index(name = "idx_user_role", columnList = "role"),
    @Index(name = "idx_user_active", columnList = "is_active")
})
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "email_value", nullable = false, unique = true, length = 254))
    @NotNull(message = "Email cannot be null")
    private Email email;
    
    @Column(name = "name", nullable = false, length = 100)
    @NotBlank(message = "Name cannot be empty")
    @Size(max = 100, message = "Name length cannot exceed 100 characters")
    private String name;
    
    @Column(name = "hashed_password", nullable = false, length = 255)
    @NotBlank(message = "Password cannot be empty")
    @Size(max = 255, message = "Hashed password length cannot exceed 255 characters")
    private String hashedPassword;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    @NotNull(message = "User role cannot be null")
    private UserRole role;
    
    @Column(name = "is_active", nullable = false)
    @NotNull(message = "Active status cannot be null")
    private Boolean isActive;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
    /**
     * Default constructor for JPA
     */
    public User() {
    }
    
    /**
     * Constructor for creating a new user
     * 
     * @param email User email address
     * @param name User full name
     * @param hashedPassword BCrypt hashed password
     * @param role User role in the system
     * @throws IllegalArgumentException if name is null or empty (fail fast)
     */
    public User(Email email, String name, String hashedPassword, UserRole role) {
        // Validate domain invariants (fail fast)
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("User name cannot be null or empty");
        }
        if (email == null) {
            throw new IllegalArgumentException("User email cannot be null");
        }
        if (hashedPassword == null || hashedPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("User password cannot be null or empty");
        }
        if (role == null) {
            throw new IllegalArgumentException("User role cannot be null");
        }
        this.email = email;
        this.name = name.trim(); // Normalize the name
        this.hashedPassword = hashedPassword;
        this.role = role;
        this.isActive = true;
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    
    /**
     * Convenience constructor for creating a new user from a raw email string.
     *
     * @param emailString User email address as string
     * @param name User full name
     * @param hashedPassword BCrypt hashed password
     * @param role User role in the system
     */
    public User(String emailString, String name, String hashedPassword, UserRole role) {
        this(new Email(emailString), name, hashedPassword, role);
    }
    
    /**
     * Pre-persist callback to set creation timestamp
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (isActive == null) {
            isActive = true;
        }
    }
    
    /**
     * Pre-update callback to update modification timestamp
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /**
     * Update last login timestamp
     */
    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Check if user account is active
     * 
     * @return true if user is active, false otherwise
     */
    public boolean isAccountActive() {
        return Boolean.TRUE.equals(isActive);
    }
    
    /**
     * Check if user is active (shorthand method used by tests and views)
     *
     * @return true if user is active, false otherwise
     */
    public boolean isActive() {
        return Boolean.TRUE.equals(isActive);
    }
    
    /**
     * Deactivate user account
     */
    public void deactivate() {
        this.isActive = false;
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Activate user account
     */
    public void activate() {
        this.isActive = true;
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Email getEmailObject() {
        return email;
    }
    
    /**
     * Expose the email value object as a raw string when required by downstream consumers.
     */
    public String getEmail() {
        return email != null ? email.getValue() : null;
    }
    
    public void setEmail(Email email) {
        this.email = email;
    }
    
    public void setEmail(String emailString) {
        this.email = new Email(emailString);
    }
    
    public String getEmailValue() {
        return email != null ? email.getValue() : null;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        // Enforce domain invariant
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("User name cannot be null or empty");
        }
        this.name = name.trim(); // Normalize the name
    }
    
    /**
     * Extract first name from full name following domain logic.
     * If name is null or empty, throws exception (fail fast).
     * If name has no spaces, entire name is considered first name.
     * 
     * @return the first name portion
     * @throws IllegalStateException if name is not properly set
     */
    public String getFirstName() {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalStateException("User name is not set or empty for user ID: " + id);
        }
        
        String trimmedName = name.trim();
        int lastSpaceIndex = trimmedName.lastIndexOf(' ');
        
        if (lastSpaceIndex == -1) {
            // No space found, entire name is first name
            return trimmedName;
        }
        
        return trimmedName.substring(0, lastSpaceIndex);
    }
    
    /**
     * Extract last name from full name following domain logic.
     * If name is null or empty, throws exception (fail fast).
     * If name has no spaces, returns empty string (person may have only first name).
     * 
     * @return the last name portion or empty string if no last name
     * @throws IllegalStateException if name is not properly set
     */
    public String getLastName() {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalStateException("User name is not set or empty for user ID: " + id);
        }
        
        String trimmedName = name.trim();
        int lastSpaceIndex = trimmedName.lastIndexOf(' ');
        
        if (lastSpaceIndex == -1) {
            // No space found, no last name
            return "";
        }
        
        return trimmedName.substring(lastSpaceIndex + 1);
    }
    
    /**
     * Validate that user has a properly formatted name.
     * This is a domain invariant - users must have valid names.
     * 
     * @return true if name is valid
     */
    public boolean hasValidName() {
        return name != null && !name.trim().isEmpty();
    }
    
    public String getHashedPassword() {
        return hashedPassword;
    }
    
    public void setHashedPassword(String hashedPassword) {
        this.hashedPassword = hashedPassword;
    }
    
    public UserRole getRole() {
        return role;
    }
    
    public void setRole(UserRole role) {
        this.role = role;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    /**
     * Set user active status (simplified method name for test compatibility)
     * 
     * @param active the active status to set
     */
    public void setActive(Boolean active) {
        this.isActive = active;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }
    
    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id) && 
               Objects.equals(email, user.email);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, email);
    }
    
    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", email='" + email + '\'' +
                ", name='" + name + '\'' +
                ", role=" + role +
                ", isActive=" + isActive +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
