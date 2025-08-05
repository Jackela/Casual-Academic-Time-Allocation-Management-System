package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class UserTest {

    private User user;
    private Email email;
    private String name;
    private String hashedPassword;
    private UserRole role;

    @BeforeEach
    void setUp() {
        email = new Email("test@usyd.edu.au");
        name = "Test User";
        hashedPassword = "hashedPassword123";
        role = UserRole.TUTOR;
        
        user = new User(email, name, hashedPassword, role);
    }

    @Test
    void testDefaultConstructor() {
        // When
        User emptyUser = new User();

        // Then
        assertThat(emptyUser.getId()).isNull();
        assertThat(emptyUser.getEmail()).isNull();
        assertThat(emptyUser.getName()).isNull();
        assertThat(emptyUser.getHashedPassword()).isNull();
        assertThat(emptyUser.getRole()).isNull();
        assertThat(emptyUser.getIsActive()).isNull();
        assertThat(emptyUser.getCreatedAt()).isNull();
        assertThat(emptyUser.getUpdatedAt()).isNull();
        assertThat(emptyUser.getLastLoginAt()).isNull();
    }

    @Test
    void testConstructorWithEmailObject() {
        // When
        User user = new User(email, name, hashedPassword, role);

        // Then
        assertThat(user.getEmailObject()).isEqualTo(email);
        assertThat(user.getEmail()).isEqualTo(email.getValue());
        assertThat(user.getName()).isEqualTo(name);
        assertThat(user.getHashedPassword()).isEqualTo(hashedPassword);
        assertThat(user.getRole()).isEqualTo(role);
        assertThat(user.getIsActive()).isTrue(); // Default is active
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();
        assertThat(user.getLastLoginAt()).isNull();
    }

    @Test
    void testConstructorWithStringEmail() {
        // Given
        String emailString = "string@usyd.edu.au";

        // When
        User user = new User(emailString, name, hashedPassword, role);

        // Then
        assertThat(user.getEmail()).isEqualTo(emailString);
        assertThat(user.getEmailValue()).isEqualTo(emailString);
        assertThat(user.getName()).isEqualTo(name);
        assertThat(user.getHashedPassword()).isEqualTo(hashedPassword);
        assertThat(user.getRole()).isEqualTo(role);
        assertThat(user.getIsActive()).isTrue();
    }

    @Test
    void testGettersAndSetters() {
        // Given
        Long id = 123L;
        Email newEmail = new Email("new@usyd.edu.au");
        String newName = "New Name";
        String newPassword = "newHashedPassword";
        UserRole newRole = UserRole.LECTURER;
        Boolean isActive = false;
        LocalDateTime now = LocalDateTime.now();

        // When
        user.setId(id);
        user.setEmail(newEmail);
        user.setName(newName);
        user.setHashedPassword(newPassword);
        user.setRole(newRole);
        user.setIsActive(isActive);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(now);

        // Then
        assertThat(user.getId()).isEqualTo(id);
        assertThat(user.getEmailObject()).isEqualTo(newEmail);
        assertThat(user.getEmail()).isEqualTo(newEmail.getValue());
        assertThat(user.getName()).isEqualTo(newName);
        assertThat(user.getHashedPassword()).isEqualTo(newPassword);
        assertThat(user.getRole()).isEqualTo(newRole);
        assertThat(user.getIsActive()).isEqualTo(isActive);
        assertThat(user.getCreatedAt()).isEqualTo(now);
        assertThat(user.getUpdatedAt()).isEqualTo(now);
        assertThat(user.getLastLoginAt()).isEqualTo(now);
    }

    @Test
    void testEmailMethods() {
        // Test setting email with string
        String newEmailString = "newemail@usyd.edu.au";
        user.setEmail(newEmailString);
        
        assertThat(user.getEmail()).isEqualTo(newEmailString);
        assertThat(user.getEmailValue()).isEqualTo(newEmailString);
        assertThat(user.getEmailObject().getValue()).isEqualTo(newEmailString);

        // Test setting email with Email object
        Email emailObject = new Email("object@usyd.edu.au");
        user.setEmail(emailObject);
        
        assertThat(user.getEmailObject()).isEqualTo(emailObject);
        assertThat(user.getEmail()).isEqualTo(emailObject.getValue());
        assertThat(user.getEmailValue()).isEqualTo(emailObject.getValue());
    }

    @Test
    void testActiveMethods() {
        // Test setActive method (alternative to setIsActive)
        user.setActive(false);
        assertThat(user.getIsActive()).isFalse();
        assertThat(user.isActive()).isFalse();
        assertThat(user.isAccountActive()).isFalse();

        user.setActive(true);
        assertThat(user.getIsActive()).isTrue();
        assertThat(user.isActive()).isTrue();
        assertThat(user.isAccountActive()).isTrue();
    }

    @Test
    void testUpdateLastLogin() {
        // Given
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        assertThat(user.getLastLoginAt()).isNull();

        // When
        user.updateLastLogin();

        // Then
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);
        assertThat(user.getLastLoginAt()).isBetween(before, after);
        assertThat(user.getUpdatedAt()).isBetween(before, after);
    }

    @Test
    void testIsAccountActive() {
        // Test with null (should be false)
        user.setIsActive(null);
        assertThat(user.isAccountActive()).isFalse();

        // Test with true
        user.setIsActive(true);
        assertThat(user.isAccountActive()).isTrue();

        // Test with false
        user.setIsActive(false);
        assertThat(user.isAccountActive()).isFalse();
    }

    @Test
    void testIsActive() {
        // Test with null (should be false)
        user.setIsActive(null);
        assertThat(user.isActive()).isFalse();

        // Test with true
        user.setIsActive(true);
        assertThat(user.isActive()).isTrue();

        // Test with false
        user.setIsActive(false);
        assertThat(user.isActive()).isFalse();
    }

    @Test
    void testDeactivate() {
        // Given
        user.setIsActive(true);
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);

        // When
        user.deactivate();

        // Then
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);
        assertThat(user.getIsActive()).isFalse();
        assertThat(user.isActive()).isFalse();
        assertThat(user.getUpdatedAt()).isBetween(before, after);
    }

    @Test
    void testActivate() {
        // Given
        user.setIsActive(false);
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);

        // When
        user.activate();

        // Then
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);
        assertThat(user.getIsActive()).isTrue();
        assertThat(user.isActive()).isTrue();
        assertThat(user.getUpdatedAt()).isBetween(before, after);
    }

    @Test
    void testEquals() {
        // Given
        User user1 = new User(new Email("user1@usyd.edu.au"), "User 1", "pass1", UserRole.TUTOR);
        User user2 = new User(new Email("user2@usyd.edu.au"), "User 2", "pass2", UserRole.LECTURER);
        User user3 = new User(new Email("user1@usyd.edu.au"), "User 1 Different Name", "pass3", UserRole.ADMIN);
        
        user1.setId(1L);
        user2.setId(2L);
        user3.setId(1L); // Same ID as user1

        // When & Then
        // Same object
        assertThat(user1).isEqualTo(user1);

        // Different objects with same ID and email
        assertThat(user1).isEqualTo(user3);

        // Different objects with different ID or email
        assertThat(user1).isNotEqualTo(user2);

        // Null comparison
        assertThat(user1).isNotEqualTo(null);

        // Different class comparison
        assertThat(user1).isNotEqualTo("string");
    }

    @Test
    void testHashCode() {
        // Given
        User user1 = new User(new Email("user1@usyd.edu.au"), "User 1", "pass1", UserRole.TUTOR);
        User user2 = new User(new Email("user1@usyd.edu.au"), "User 2", "pass2", UserRole.LECTURER);
        
        user1.setId(1L);
        user2.setId(1L);

        // When & Then
        // Users with same ID and email should have same hash code
        assertThat(user1.hashCode()).isEqualTo(user2.hashCode());

        // Change email and verify hash code changes
        user2.setEmail("different@usyd.edu.au");
        assertThat(user1.hashCode()).isNotEqualTo(user2.hashCode());
    }

    @Test
    void testToString() {
        // Given
        user.setId(123L);

        // When
        String toString = user.toString();

        // Then
        assertThat(toString).contains("User{");
        assertThat(toString).contains("id=123");
        assertThat(toString).contains("email='" + email + "'");
        assertThat(toString).contains("name='" + name + "'");
        assertThat(toString).contains("role=" + role);
        assertThat(toString).contains("isActive=true");
        assertThat(toString).contains("createdAt=");
        assertThat(toString).contains("updatedAt=");
    }

    @Test
    void testDifferentUserRoles() {
        // Test TUTOR role
        User tutor = new User("tutor@usyd.edu.au", "Tutor", "pass", UserRole.TUTOR);
        assertThat(tutor.getRole()).isEqualTo(UserRole.TUTOR);

        // Test LECTURER role
        User lecturer = new User("lecturer@usyd.edu.au", "Lecturer", "pass", UserRole.LECTURER);
        assertThat(lecturer.getRole()).isEqualTo(UserRole.LECTURER);

        // Test ADMIN role
        User admin = new User("admin@usyd.edu.au", "Admin", "pass", UserRole.ADMIN);
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void testUserLifecycleManagement() {
        // Test creation with default active status
        User newUser = new User("lifecycle@usyd.edu.au", "Lifecycle User", "pass", UserRole.TUTOR);
        assertThat(newUser.isActive()).isTrue();
        assertThat(newUser.getCreatedAt()).isNotNull();
        assertThat(newUser.getUpdatedAt()).isNotNull();

        // Test deactivation
        LocalDateTime beforeDeactivate = newUser.getUpdatedAt();
        try { Thread.sleep(10); } catch (InterruptedException e) { }
        newUser.deactivate();
        assertThat(newUser.isActive()).isFalse();
        assertThat(newUser.getUpdatedAt()).isAfter(beforeDeactivate);

        // Test reactivation
        LocalDateTime beforeReactivate = newUser.getUpdatedAt();
        try { Thread.sleep(10); } catch (InterruptedException e) { }
        newUser.activate();
        assertThat(newUser.isActive()).isTrue();
        assertThat(newUser.getUpdatedAt()).isAfter(beforeReactivate);
    }

    @Test
    void testLoginTracking() {
        // Initially no login
        assertThat(user.getLastLoginAt()).isNull();

        // First login
        LocalDateTime beforeLogin = LocalDateTime.now().minusSeconds(1);
        user.updateLastLogin();
        LocalDateTime afterLogin = LocalDateTime.now().plusSeconds(1);
        
        assertThat(user.getLastLoginAt()).isBetween(beforeLogin, afterLogin);
        LocalDateTime firstLogin = user.getLastLoginAt();

        // Second login after some time
        try { Thread.sleep(10); } catch (InterruptedException e) { }
        user.updateLastLogin();
        
        assertThat(user.getLastLoginAt()).isAfter(firstLogin);
    }

    @Test
    void testEmailNullHandling() {
        // Test with null email object
        user.setEmail((Email) null);
        assertThat(user.getEmail()).isNull();
        assertThat(user.getEmailValue()).isNull();
        assertThat(user.getEmailObject()).isNull();
    }

    @Test
    void testActiveStatusConsistency() {
        // Test all methods return consistent results
        user.setIsActive(true);
        assertThat(user.getIsActive()).isTrue();
        assertThat(user.isActive()).isTrue();
        assertThat(user.isAccountActive()).isTrue();

        user.setIsActive(false);
        assertThat(user.getIsActive()).isFalse();
        assertThat(user.isActive()).isFalse();
        assertThat(user.isAccountActive()).isFalse();

        user.setActive(true);
        assertThat(user.getIsActive()).isTrue();
        assertThat(user.isActive()).isTrue();
        assertThat(user.isAccountActive()).isTrue();
    }

    @Test
    void testTimestampBehavior() {
        // Test that timestamps are set during construction
        User newUser = new User("timestamp@usyd.edu.au", "Timestamp User", "pass", UserRole.TUTOR);
        assertThat(newUser.getCreatedAt()).isNotNull();
        assertThat(newUser.getUpdatedAt()).isNotNull();
        assertThat(newUser.getCreatedAt()).isEqualTo(newUser.getUpdatedAt());

        // Test that methods update the timestamp appropriately
        LocalDateTime originalUpdated = newUser.getUpdatedAt();
        
        try { Thread.sleep(10); } catch (InterruptedException e) { }
        newUser.updateLastLogin();
        assertThat(newUser.getUpdatedAt()).isAfter(originalUpdated);
        
        try { Thread.sleep(10); } catch (InterruptedException e) { }
        newUser.activate();
        assertThat(newUser.getUpdatedAt()).isAfter(originalUpdated);
        
        try { Thread.sleep(10); } catch (InterruptedException e) { }
        newUser.deactivate();
        assertThat(newUser.getUpdatedAt()).isAfter(originalUpdated);
    }
}
