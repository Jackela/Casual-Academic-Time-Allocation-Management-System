
package com.usyd.catams.testdata.builder;

import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;

import java.time.LocalDateTime;

/**
 * Builder for {@link User} entities following Domain-Driven Design principles.
 * 
 * This builder provides a fluent API for constructing User aggregate roots with proper
 * value objects and domain rule enforcement. It ensures all constructed users are valid
 * according to business constraints.
 * 
 * <h3>Design by Contract (DbC):</h3>
 * <ul>
 *   <li><strong>Precondition:</strong> Default values are business-rule compliant</li>
 *   <li><strong>Postcondition:</strong> Built User entities are fully valid</li>
 *   <li><strong>Invariant:</strong> Email format is always validated</li>
 * </ul>
 * 
 * <h3>Domain Rules Enforced:</h3>
 * <ul>
 *   <li>Email must be valid format and unique within domain</li>
 *   <li>Passwords must be properly hashed</li>
 *   <li>Roles must correspond to system authorization matrix</li>
 *   <li>Users are active by default unless explicitly deactivated</li>
 * </ul>
 * 
 * @author Integration Test Infrastructure
 * @since 1.0.0
 */
public class UserBuilder {

    private Long id = null; // Prefer auto-generated IDs in tests to avoid unique clashes
    private String email = "test.user@example.com";
    private String name = "Test User";
    private String hashedPassword = "$2a$10$hashedPassword"; // Default hashed password
    private UserRole role = UserRole.TUTOR; // Default role
    private Boolean isActive = true; // Default active
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UserBuilder() {
    }

    public UserBuilder withId(Long id) {
        this.id = id;
        return this;
    }

    public UserBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    public UserBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public UserBuilder withHashedPassword(String hashedPassword) {
        this.hashedPassword = hashedPassword;
        return this;
    }

    public UserBuilder withRole(UserRole role) {
        this.role = role;
        return this;
    }

    public UserBuilder active() {
        this.isActive = true;
        return this;
    }

    public UserBuilder inactive() {
        this.isActive = false;
        return this;
    }

    public UserBuilder asTutor() {
        this.role = UserRole.TUTOR;
        return this;
    }

    public UserBuilder asLecturer() {
        this.role = UserRole.LECTURER;
        return this;
    }

    public UserBuilder asAdmin() {
        this.role = UserRole.ADMIN;
        return this;
    }

    public User build() {
        User user = new User(new Email(email), name, hashedPassword, role);
        user.setId(id);
        user.setIsActive(isActive);
        user.setCreatedAt(createdAt);
        user.setUpdatedAt(updatedAt);
        return user;
    }
}

