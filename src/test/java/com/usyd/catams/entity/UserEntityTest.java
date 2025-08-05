package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class UserEntityTest {

    private User user;
    private static final String EMAIL_STRING = "test@example.com";
    private static final Email EMAIL = new Email(EMAIL_STRING);
    private static final String NAME = "John Doe";
    private static final String HASHED_PASSWORD = "$2a$10$hashedPasswordExample";
    private static final UserRole ROLE = UserRole.TUTOR;

    @BeforeEach
    void setUp() {
        user = new User(EMAIL, NAME, HASHED_PASSWORD, ROLE);
    }

    @Nested
    @DisplayName("Constructor Tests")
    class ConstructorTests {

        @Test
        void constructor_ShouldInitializeAllFields() {
            assertThat(user.getEmailObject()).isEqualTo(EMAIL);
            assertThat(user.getEmail()).isEqualTo(EMAIL_STRING);
            assertThat(user.getName()).isEqualTo(NAME);
            assertThat(user.getHashedPassword()).isEqualTo(HASHED_PASSWORD);
            assertThat(user.getRole()).isEqualTo(ROLE);
            assertThat(user.getIsActive()).isTrue();
            assertThat(user.getCreatedAt()).isNotNull();
            assertThat(user.getUpdatedAt()).isNotNull();
            assertThat(user.getLastLoginAt()).isNull();
        }

        @Test
        void constructorWithStringEmail_ShouldConvertToEmailObject() {
            User stringEmailUser = new User(EMAIL_STRING, NAME, HASHED_PASSWORD, ROLE);

            assertThat(stringEmailUser.getEmailObject()).isNotNull();
            assertThat(stringEmailUser.getEmail()).isEqualTo(EMAIL_STRING);
            assertThat(stringEmailUser.getEmailValue()).isEqualTo(EMAIL_STRING);
        }

        @Test
        void defaultConstructor_ShouldCreateEmptyUser() {
            User emptyUser = new User();

            assertThat(emptyUser.getId()).isNull();
            assertThat(emptyUser.getEmail()).isNull();
            assertThat(emptyUser.getName()).isNull();
            assertThat(emptyUser.getRole()).isNull();
            assertThat(emptyUser.getIsActive()).isNull();
        }
    }

    @Nested
    @DisplayName("Account Status Management Tests")
    class AccountStatusTests {

        @Test
        void isAccountActive_ShouldReturnTrueForActiveUser() {
            user.setIsActive(true);

            assertThat(user.isAccountActive()).isTrue();
        }

        @Test
        void isAccountActive_ShouldReturnFalseForInactiveUser() {
            user.setIsActive(false);

            assertThat(user.isAccountActive()).isFalse();
        }

        @Test
        void isAccountActive_ShouldReturnFalseForNullStatus() {
            user.setIsActive(null);

            assertThat(user.isAccountActive()).isFalse();
        }

        @Test
        void isActive_ShouldReturnTrueForActiveUser() {
            user.setIsActive(true);

            assertThat(user.isActive()).isTrue();
        }

        @Test
        void isActive_ShouldReturnFalseForInactiveUser() {
            user.setIsActive(false);

            assertThat(user.isActive()).isFalse();
        }

        @Test
        void isActive_ShouldReturnFalseForNullStatus() {
            user.setIsActive(null);

            assertThat(user.isActive()).isFalse();
        }

        @Test
        void deactivate_ShouldSetActiveToFalseAndUpdateTimestamp() {
            LocalDateTime beforeDeactivation = user.getUpdatedAt();
            
            // Wait a bit to ensure timestamp difference
            try { Thread.sleep(10); } catch (InterruptedException e) {}
            
            user.deactivate();

            assertThat(user.getIsActive()).isFalse();
            assertThat(user.isAccountActive()).isFalse();
            assertThat(user.isActive()).isFalse();
            assertThat(user.getUpdatedAt()).isAfter(beforeDeactivation);
        }

        @Test
        void activate_ShouldSetActiveToTrueAndUpdateTimestamp() {
            user.setIsActive(false);
            LocalDateTime beforeActivation = user.getUpdatedAt();
            
            // Wait a bit to ensure timestamp difference
            try { Thread.sleep(10); } catch (InterruptedException e) {}
            
            user.activate();

            assertThat(user.getIsActive()).isTrue();
            assertThat(user.isAccountActive()).isTrue();
            assertThat(user.isActive()).isTrue();
            assertThat(user.getUpdatedAt()).isAfter(beforeActivation);
        }

        @Test
        void setActive_ShouldSetIsActiveStatus() {
            user.setActive(false);
            assertThat(user.getIsActive()).isFalse();

            user.setActive(true);
            assertThat(user.getIsActive()).isTrue();
        }
    }

    @Nested
    @DisplayName("Login Management Tests")
    class LoginManagementTests {

        @Test
        void updateLastLogin_ShouldSetLastLoginTimeAndUpdateTimestamp() {
            assertThat(user.getLastLoginAt()).isNull();
            LocalDateTime beforeUpdate = user.getUpdatedAt();
            
            // Wait a bit to ensure timestamp difference
            try { Thread.sleep(10); } catch (InterruptedException e) {}
            
            user.updateLastLogin();

            assertThat(user.getLastLoginAt()).isNotNull();
            assertThat(user.getLastLoginAt()).isAfter(beforeUpdate);
            assertThat(user.getUpdatedAt()).isAfter(beforeUpdate);
        }

        @Test
        void updateLastLogin_ShouldUpdateBothTimestampsToSameValue() {
            user.updateLastLogin();

            // Both timestamps should be very close (within a few milliseconds)
            long timeDifference = Math.abs(
                user.getLastLoginAt().getNano() - user.getUpdatedAt().getNano()
            );
            assertThat(timeDifference).isLessThan(1_000_000); // Less than 1ms difference
        }

        @Test
        void multipleLoginUpdates_ShouldKeepUpdatingTimestamp() {
            user.updateLastLogin();
            LocalDateTime firstLogin = user.getLastLoginAt();
            
            try { Thread.sleep(10); } catch (InterruptedException e) {}
            
            user.updateLastLogin();
            LocalDateTime secondLogin = user.getLastLoginAt();

            assertThat(secondLogin).isAfter(firstLogin);
        }
    }

    @Nested
    @DisplayName("Email Management Tests")
    class EmailManagementTests {

        @Test
        void getEmailObject_ShouldReturnEmailValueObject() {
            Email emailObject = user.getEmailObject();

            assertThat(emailObject).isNotNull();
            assertThat(emailObject.getValue()).isEqualTo(EMAIL_STRING);
        }

        @Test
        void getEmail_ShouldReturnStringValue() {
            String email = user.getEmail();

            assertThat(email).isEqualTo(EMAIL_STRING);
        }

        @Test
        void getEmailValue_ShouldReturnStringValue() {
            String emailValue = user.getEmailValue();

            assertThat(emailValue).isEqualTo(EMAIL_STRING);
        }

        @Test
        void setEmailWithString_ShouldCreateEmailObject() {
            String newEmail = "newemail@example.com";

            user.setEmail(newEmail);

            assertThat(user.getEmail()).isEqualTo(newEmail);
            assertThat(user.getEmailObject()).isNotNull();
            assertThat(user.getEmailObject().getValue()).isEqualTo(newEmail);
        }

        @Test
        void setEmailWithEmailObject_ShouldSetDirectly() {
            Email newEmail = new Email("another@example.com");

            user.setEmail(newEmail);

            assertThat(user.getEmailObject()).isSameAs(newEmail);
            assertThat(user.getEmail()).isEqualTo("another@example.com");
        }

        @Test
        void getEmail_ShouldReturnNullWhenEmailIsNull() {
            user.setEmail((Email) null);

            assertThat(user.getEmail()).isNull();
            assertThat(user.getEmailValue()).isNull();
        }
    }

    @Nested
    @DisplayName("Role Management Tests")
    class RoleManagementTests {

        @Test
        void setRole_ShouldUpdateUserRole() {
            user.setRole(UserRole.LECTURER);

            assertThat(user.getRole()).isEqualTo(UserRole.LECTURER);
        }

        @Test
        void getRole_ShouldReturnCurrentRole() {
            assertThat(user.getRole()).isEqualTo(ROLE);
        }

        @Test
        void roleChanges_ShouldSupportAllRoles() {
            UserRole[] allRoles = {
                UserRole.TUTOR,
                UserRole.LECTURER,
                UserRole.ADMIN,
                UserRole.HR
            };

            for (UserRole role : allRoles) {
                user.setRole(role);
                assertThat(user.getRole()).isEqualTo(role);
            }
        }
    }

    @Nested
    @DisplayName("Lifecycle and Timestamp Tests")
    class LifecycleTests {

        @Test
        void onCreate_ShouldSetTimestamps() {
            User newUser = new User();
            
            // Simulate @PrePersist
            newUser.onCreate();

            assertThat(newUser.getCreatedAt()).isNotNull();
            assertThat(newUser.getUpdatedAt()).isNotNull();
            assertThat(newUser.getIsActive()).isTrue(); // Default value
        }

        @Test
        void onCreate_ShouldNotOverwriteExistingCreatedAt() {
            LocalDateTime existingCreatedAt = LocalDateTime.of(2023, 1, 1, 10, 0);
            user.setCreatedAt(existingCreatedAt);
            
            user.onCreate();

            assertThat(user.getCreatedAt()).isEqualTo(existingCreatedAt);
            assertThat(user.getUpdatedAt()).isAfter(existingCreatedAt);
        }

        @Test
        void onUpdate_ShouldUpdateTimestamp() {
            LocalDateTime originalUpdatedAt = user.getUpdatedAt();
            
            try { Thread.sleep(10); } catch (InterruptedException e) {}
            
            user.onUpdate();

            assertThat(user.getUpdatedAt()).isAfter(originalUpdatedAt);
        }

        @Test
        void onCreate_ShouldSetDefaultActiveStatus() {
            User newUser = new User();
            newUser.setIsActive(null);
            
            newUser.onCreate();

            assertThat(newUser.getIsActive()).isTrue();
        }

        @Test
        void onCreate_ShouldNotOverwriteExistingActiveStatus() {
            User newUser = new User();
            newUser.setIsActive(false);
            
            newUser.onCreate();

            assertThat(newUser.getIsActive()).isFalse();
        }
    }

    @Nested
    @DisplayName("Equality and Hash Code Tests")
    class EqualityTests {

        @Test
        void equals_ShouldReturnTrueForSameObject() {
            assertThat(user).isEqualTo(user);
        }

        @Test
        void equals_ShouldReturnFalseForNull() {
            assertThat(user).isNotEqualTo(null);
        }

        @Test
        void equals_ShouldReturnFalseForDifferentClass() {
            assertThat(user).isNotEqualTo("not a user");
        }

        @Test
        void equals_ShouldReturnTrueForSameIdAndEmail() {
            User otherUser = new User(EMAIL, "Different Name", "different password", UserRole.ADMIN);
            otherUser.setId(1L);
            user.setId(1L);

            assertThat(user).isEqualTo(otherUser);
        }

        @Test
        void equals_ShouldReturnFalseForDifferentEmail() {
            User otherUser = new User(new Email("different@example.com"), NAME, HASHED_PASSWORD, ROLE);
            otherUser.setId(1L);
            user.setId(1L);

            assertThat(user).isNotEqualTo(otherUser);
        }

        @Test
        void equals_ShouldReturnFalseForDifferentId() {
            User otherUser = new User(EMAIL, NAME, HASHED_PASSWORD, ROLE);
            otherUser.setId(2L);
            user.setId(1L);

            assertThat(user).isNotEqualTo(otherUser);
        }

        @Test
        void hashCode_ShouldBeConsistentWithEquals() {
            User otherUser = new User(EMAIL, "Different Name", "different password", UserRole.ADMIN);
            otherUser.setId(1L);
            user.setId(1L);

            assertThat(user.hashCode()).isEqualTo(otherUser.hashCode());
        }

        @Test
        void hashCode_ShouldBeDifferentForDifferentUsers() {
            User otherUser = new User(new Email("different@example.com"), NAME, HASHED_PASSWORD, ROLE);

            assertThat(user.hashCode()).isNotEqualTo(otherUser.hashCode());
        }
    }

    @Nested
    @DisplayName("Business Logic Integration Tests")
    class BusinessLogicIntegrationTests {

        @Test
        void userLifecycle_ShouldWorkCorrectly() {
            // New user creation
            User newUser = new User("newuser@example.com", "New User", "hashedpass", UserRole.TUTOR);
            assertThat(newUser.isActive()).isTrue();
            assertThat(newUser.getLastLoginAt()).isNull();

            // First login
            newUser.updateLastLogin();
            assertThat(newUser.getLastLoginAt()).isNotNull();
            LocalDateTime firstLogin = newUser.getLastLoginAt();

            // Subsequent login
            try { Thread.sleep(10); } catch (InterruptedException e) {}
            newUser.updateLastLogin();
            assertThat(newUser.getLastLoginAt()).isAfter(firstLogin);

            // Account deactivation
            newUser.deactivate();
            assertThat(newUser.isActive()).isFalse();
            assertThat(newUser.isAccountActive()).isFalse();

            // Account reactivation
            newUser.activate();
            assertThat(newUser.isActive()).isTrue();
            assertThat(newUser.isAccountActive()).isTrue();
        }

        @Test
        void userRoleTransition_ShouldSupportAllTransitions() {
            // Start as TUTOR
            assertThat(user.getRole()).isEqualTo(UserRole.TUTOR);

            // Promote to LECTURER
            user.setRole(UserRole.LECTURER);
            assertThat(user.getRole()).isEqualTo(UserRole.LECTURER);

            // Promote to ADMIN
            user.setRole(UserRole.ADMIN);
            assertThat(user.getRole()).isEqualTo(UserRole.ADMIN);

            // Move to HR
            user.setRole(UserRole.HR);
            assertThat(user.getRole()).isEqualTo(UserRole.HR);

            // Demote back to TUTOR
            user.setRole(UserRole.TUTOR);
            assertThat(user.getRole()).isEqualTo(UserRole.TUTOR);
        }

        @Test
        void accountManagement_ShouldMaintainConsistentState() {
            // Active user should pass all active checks
            user.setIsActive(true);
            assertThat(user.isActive()).isTrue();
            assertThat(user.isAccountActive()).isTrue();
            assertThat(user.getIsActive()).isTrue();

            // Inactive user should fail all active checks
            user.setIsActive(false);
            assertThat(user.isActive()).isFalse();
            assertThat(user.isAccountActive()).isFalse();
            assertThat(user.getIsActive()).isFalse();

            // Null status should be treated as inactive
            user.setIsActive(null);
            assertThat(user.isActive()).isFalse();
            assertThat(user.isAccountActive()).isFalse();
            assertThat(user.getIsActive()).isNull();
        }

        @Test
        void emailManagement_ShouldMaintainConsistency() {
            String originalEmail = user.getEmail();
            Email originalEmailObject = user.getEmailObject();

            // All email getters should return consistent values
            assertThat(user.getEmail()).isEqualTo(originalEmail);
            assertThat(user.getEmailValue()).isEqualTo(originalEmail);
            assertThat(user.getEmailObject().getValue()).isEqualTo(originalEmail);

            // Update with string should maintain consistency
            String newEmail = "updated@example.com";
            user.setEmail(newEmail);
            assertThat(user.getEmail()).isEqualTo(newEmail);
            assertThat(user.getEmailValue()).isEqualTo(newEmail);
            assertThat(user.getEmailObject().getValue()).isEqualTo(newEmail);

            // Update with Email object should maintain consistency
            Email newerEmail = new Email("newest@example.com");
            user.setEmail(newerEmail);
            assertThat(user.getEmail()).isEqualTo("newest@example.com");
            assertThat(user.getEmailValue()).isEqualTo("newest@example.com");
            assertThat(user.getEmailObject()).isSameAs(newerEmail);
        }
    }
}