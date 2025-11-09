package com.usyd.catams.common.domain.event;

import com.usyd.catams.common.domain.event.UserEvent.*;
import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit Tests for UserEvent and its subclasses
 *
 * This test class provides comprehensive coverage of all user domain events,
 * testing event creation, business logic methods, and metadata management.
 *
 * Coverage includes:
 * - All 7 user event types
 * - Event type identification
 * - Business logic methods in each event
 * - Calculated fields and derived data
 * - Metadata handling
 * - Edge cases and boundary conditions
 *
 * @author Test Infrastructure Team
 * @since 2.0
 */
@DisplayName("UserEvent Unit Tests")
class UserEventTest {

    private String testUserId;
    private String testEmail;
    private String testName;
    private String testTriggeredBy;
    private String testCorrelationId;

    @BeforeEach
    void setUp() {
        testUserId = "user-123";
        testEmail = "john.doe@university.edu";
        testName = "John Doe";
        testTriggeredBy = "admin-001";
        testCorrelationId = "corr-abc-123";
    }

    @Nested
    @DisplayName("UserCreatedEvent Tests")
    class UserCreatedEventTests {

        @Test
        @DisplayName("Should create UserCreatedEvent with all fields")
        void shouldCreateUserCreatedEventWithAllFields() {
            // Arrange & Act
            UserCreatedEvent event = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("USER_CREATED");
            assertThat(event.getEmail()).isEqualTo(testEmail);
            assertThat(event.getName()).isEqualTo(testName);
            assertThat(event.getRole()).isEqualTo(UserRole.TUTOR);
            assertThat(event.isActive()).isTrue();
        }

        @Test
        @DisplayName("Should create inactive user event")
        void shouldCreateInactiveUserEvent() {
            // Arrange & Act
            UserCreatedEvent event = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.isActive()).isFalse();
        }

        @Test
        @DisplayName("Should include welcome email flag in metadata")
        void shouldIncludeWelcomeEmailFlagInMetadata() {
            // Arrange
            UserCreatedEvent event = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("welcomeEmailRequired");
            assertThat(metadata.get("welcomeEmailRequired")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should include account setup flag in metadata")
        void shouldIncludeAccountSetupFlagInMetadata() {
            // Arrange
            UserCreatedEvent event = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.HR,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("accountSetupRequired");
            assertThat(metadata.get("accountSetupRequired")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("UserUpdatedEvent Tests")
    class UserUpdatedEventTests {

        @Test
        @DisplayName("Should create UserUpdatedEvent with all fields")
        void shouldCreateUserUpdatedEventWithAllFields() {
            // Arrange & Act
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                "old.email@university.edu",
                "Old Name",
                testEmail,
                testName,
                UserRole.LECTURER,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("USER_UPDATED");
            assertThat(event.getPreviousEmail()).isEqualTo("old.email@university.edu");
            assertThat(event.getPreviousName()).isEqualTo("Old Name");
            assertThat(event.getEmail()).isEqualTo(testEmail);
            assertThat(event.getName()).isEqualTo(testName);
        }

        @Test
        @DisplayName("Should detect email change")
        void shouldDetectEmailChange() {
            // Arrange
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                "old.email@university.edu",
                testName,
                testEmail,
                testName,
                UserRole.LECTURER,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasEmailChanged()).isTrue();
            assertThat(event.hasNameChanged()).isFalse();
        }

        @Test
        @DisplayName("Should detect name change")
        void shouldDetectNameChange() {
            // Arrange
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                testEmail,
                "Old Name",
                testEmail,
                testName,
                UserRole.TUTOR,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasEmailChanged()).isFalse();
            assertThat(event.hasNameChanged()).isTrue();
        }

        @Test
        @DisplayName("Should detect both email and name changes")
        void shouldDetectBothEmailAndNameChanges() {
            // Arrange
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                "old.email@university.edu",
                "Old Name",
                testEmail,
                testName,
                UserRole.LECTURER,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasEmailChanged()).isTrue();
            assertThat(event.hasNameChanged()).isTrue();
        }

        @Test
        @DisplayName("Should not detect changes when nothing changed")
        void shouldNotDetectChangesWhenNothingChanged() {
            // Arrange
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                testEmail,
                testName,
                testEmail,
                testName,
                UserRole.HR,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasEmailChanged()).isFalse();
            assertThat(event.hasNameChanged()).isFalse();
        }

        @Test
        @DisplayName("Should include email verification flag when email changed")
        void shouldIncludeEmailVerificationFlagWhenEmailChanged() {
            // Arrange
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                "old.email@university.edu",
                testName,
                testEmail,
                testName,
                UserRole.TUTOR,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("emailVerificationRequired");
            assertThat(metadata.get("emailVerificationRequired")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should not include email verification flag when email unchanged")
        void shouldNotIncludeEmailVerificationFlagWhenEmailUnchanged() {
            // Arrange
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                testEmail,
                "Old Name",
                testEmail,
                testName,
                UserRole.LECTURER,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).doesNotContainKey("emailVerificationRequired");
        }

        @Test
        @DisplayName("Should include change flags in metadata")
        void shouldIncludeChangeFlagsInMetadata() {
            // Arrange
            UserUpdatedEvent event = new UserUpdatedEvent(
                testUserId,
                "old.email@university.edu",
                "Old Name",
                testEmail,
                testName,
                UserRole.ADMIN,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("emailChanged");
            assertThat(metadata).containsKey("nameChanged");
            assertThat(metadata.get("emailChanged")).isEqualTo(true);
            assertThat(metadata.get("nameChanged")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("UserActivatedEvent Tests")
    class UserActivatedEventTests {

        @Test
        @DisplayName("Should create UserActivatedEvent with all fields")
        void shouldCreateUserActivatedEventWithAllFields() {
            // Arrange & Act
            UserActivatedEvent event = new UserActivatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                "Account reactivation after suspension",
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("USER_ACTIVATED");
            assertThat(event.getActivationReason()).isEqualTo("Account reactivation after suspension");
        }

        @Test
        @DisplayName("Should include activation reason in metadata")
        void shouldIncludeActivationReasonInMetadata() {
            // Arrange
            String reason = "Returning after sabbatical";
            UserActivatedEvent event = new UserActivatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                reason,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("activationReason");
            assertThat(metadata.get("activationReason")).isEqualTo(reason);
        }

        @Test
        @DisplayName("Should include welcome back email flag in metadata")
        void shouldIncludeWelcomeBackEmailFlagInMetadata() {
            // Arrange
            UserActivatedEvent event = new UserActivatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.HR,
                "Account reactivation",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("welcomeBackEmailRequired");
            assertThat(metadata.get("welcomeBackEmailRequired")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("UserDeactivatedEvent Tests")
    class UserDeactivatedEventTests {

        @Test
        @DisplayName("Should create UserDeactivatedEvent with all fields")
        void shouldCreateUserDeactivatedEventWithAllFields() {
            // Arrange & Act
            UserDeactivatedEvent event = new UserDeactivatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                "Contract ended",
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("USER_DEACTIVATED");
            assertThat(event.getDeactivationReason()).isEqualTo("Contract ended");
            assertThat(event.isTemporary()).isFalse();
        }

        @Test
        @DisplayName("Should create temporary deactivation event")
        void shouldCreateTemporaryDeactivationEvent() {
            // Arrange & Act
            UserDeactivatedEvent event = new UserDeactivatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                "Sabbatical leave",
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.isTemporary()).isTrue();
        }

        @Test
        @DisplayName("Should include deactivation details in metadata")
        void shouldIncludeDeactivationDetailsInMetadata() {
            // Arrange
            String reason = "Policy violation";
            UserDeactivatedEvent event = new UserDeactivatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                reason,
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("deactivationReason");
            assertThat(metadata).containsKey("isTemporary");
            assertThat(metadata.get("deactivationReason")).isEqualTo(reason);
            assertThat(metadata.get("isTemporary")).isEqualTo(false);
        }

        @Test
        @DisplayName("Should include cleanup flag in metadata")
        void shouldIncludeCleanupFlagInMetadata() {
            // Arrange
            UserDeactivatedEvent event = new UserDeactivatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.HR,
                "Termination",
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("cleanupRequired");
            assertThat(metadata.get("cleanupRequired")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("UserRoleChangedEvent Tests")
    class UserRoleChangedEventTests {

        @Test
        @DisplayName("Should create UserRoleChangedEvent with all fields")
        void shouldCreateUserRoleChangedEventWithAllFields() {
            // Arrange & Act
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                UserRole.LECTURER,
                "Promotion to lecturer position",
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("USER_ROLE_CHANGED");
            assertThat(event.getPreviousRole()).isEqualTo(UserRole.TUTOR);
            assertThat(event.getNewRole()).isEqualTo(UserRole.LECTURER);
            assertThat(event.getChangeReason()).isEqualTo("Promotion to lecturer position");
        }

        @Test
        @DisplayName("Should detect promotion from TUTOR to LECTURER")
        void shouldDetectPromotionFromTutorToLecturer() {
            // Arrange
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                UserRole.LECTURER,
                "Career advancement",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isPromotion()).isTrue();
            assertThat(event.isDemotion()).isFalse();
        }

        @Test
        @DisplayName("Should detect promotion from LECTURER to HR")
        void shouldDetectPromotionFromLecturerToHR() {
            // Arrange
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                UserRole.HR,
                "Administrative role",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isPromotion()).isTrue();
            assertThat(event.isDemotion()).isFalse();
        }

        @Test
        @DisplayName("Should detect promotion from HR to ADMIN")
        void shouldDetectPromotionFromHRToAdmin() {
            // Arrange
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.HR,
                UserRole.ADMIN,
                "System administrator role",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isPromotion()).isTrue();
            assertThat(event.isDemotion()).isFalse();
        }

        @Test
        @DisplayName("Should detect demotion from LECTURER to TUTOR")
        void shouldDetectDemotionFromLecturerToTutor() {
            // Arrange
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                UserRole.TUTOR,
                "Role adjustment",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isPromotion()).isFalse();
            assertThat(event.isDemotion()).isTrue();
        }

        @Test
        @DisplayName("Should detect demotion from ADMIN to HR")
        void shouldDetectDemotionFromAdminToHR() {
            // Arrange
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.ADMIN,
                UserRole.HR,
                "Role change",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isPromotion()).isFalse();
            assertThat(event.isDemotion()).isTrue();
        }

        @Test
        @DisplayName("Should detect lateral move")
        void shouldDetectLateralMove() {
            // Arrange
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                UserRole.TUTOR,
                "Role refresh",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isPromotion()).isFalse();
            assertThat(event.isDemotion()).isFalse();
        }

        @Test
        @DisplayName("Should include role change metadata")
        void shouldIncludeRoleChangeMetadata() {
            // Arrange
            UserRoleChangedEvent event = new UserRoleChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                UserRole.LECTURER,
                "Promotion",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("previousRole");
            assertThat(metadata).containsKey("newRole");
            assertThat(metadata).containsKey("changeReason");
            assertThat(metadata).containsKey("isPromotion");
            assertThat(metadata).containsKey("isDemotion");
            assertThat(metadata).containsKey("permissionUpdateRequired");
            assertThat(metadata.get("previousRole")).isEqualTo("TUTOR");
            assertThat(metadata.get("newRole")).isEqualTo("LECTURER");
            assertThat(metadata.get("isPromotion")).isEqualTo(true);
            assertThat(metadata.get("isDemotion")).isEqualTo(false);
            assertThat(metadata.get("permissionUpdateRequired")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("UserLoginEvent Tests")
    class UserLoginEventTests {

        @Test
        @DisplayName("Should create UserLoginEvent with all fields")
        void shouldCreateUserLoginEventWithAllFields() {
            // Arrange
            LocalDateTime loginTime = LocalDateTime.of(2024, 1, 15, 10, 30);
            String ipAddress = "192.168.1.100";
            String userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

            // Act
            UserLoginEvent event = new UserLoginEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                loginTime,
                ipAddress,
                userAgent,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("USER_LOGIN");
            assertThat(event.getLoginTime()).isEqualTo(loginTime);
            assertThat(event.getIpAddress()).isEqualTo(ipAddress);
            assertThat(event.getUserAgent()).isEqualTo(userAgent);
        }

        @Test
        @DisplayName("Should include login details in metadata")
        void shouldIncludeLoginDetailsInMetadata() {
            // Arrange
            LocalDateTime loginTime = LocalDateTime.of(2024, 1, 15, 14, 45);
            String ipAddress = "10.0.0.50";
            String userAgent = "Chrome/120.0.0.0";

            UserLoginEvent event = new UserLoginEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.ADMIN,
                loginTime,
                ipAddress,
                userAgent,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("loginTime");
            assertThat(metadata).containsKey("ipAddress");
            assertThat(metadata).containsKey("userAgent");
            assertThat(metadata).containsKey("securityCheck");
            assertThat(metadata.get("loginTime")).isEqualTo(loginTime);
            assertThat(metadata.get("ipAddress")).isEqualTo(ipAddress);
            assertThat(metadata.get("userAgent")).isEqualTo(userAgent);
        }

        @Test
        @DisplayName("Should not be publishable by default")
        void shouldNotBePublishableByDefault() {
            // Arrange
            UserLoginEvent event = new UserLoginEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                LocalDateTime.now(),
                "127.0.0.1",
                "Safari/17.0",
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isPublishable()).isFalse();
        }
    }

    @Nested
    @DisplayName("UserPasswordChangedEvent Tests")
    class UserPasswordChangedEventTests {

        @Test
        @DisplayName("Should create UserPasswordChangedEvent with reset flag")
        void shouldCreateUserPasswordChangedEventWithResetFlag() {
            // Arrange & Act
            UserPasswordChangedEvent event = new UserPasswordChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                true,
                "Admin reset",
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("USER_PASSWORD_CHANGED");
            assertThat(event.wasReset()).isTrue();
            assertThat(event.getChangeReason()).isEqualTo("Admin reset");
        }

        @Test
        @DisplayName("Should create UserPasswordChangedEvent for voluntary change")
        void shouldCreateUserPasswordChangedEventForVoluntaryChange() {
            // Arrange & Act
            UserPasswordChangedEvent event = new UserPasswordChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                false,
                "User initiated password change",
                testUserId,
                testCorrelationId
            );

            // Assert
            assertThat(event.wasReset()).isFalse();
            assertThat(event.getChangeReason()).isEqualTo("User initiated password change");
        }

        @Test
        @DisplayName("Should include password change metadata")
        void shouldIncludePasswordChangeMetadata() {
            // Arrange
            UserPasswordChangedEvent event = new UserPasswordChangedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.HR,
                true,
                "Security policy enforcement",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("wasReset");
            assertThat(metadata).containsKey("changeReason");
            assertThat(metadata).containsKey("securityNotificationRequired");
            assertThat(metadata.get("wasReset")).isEqualTo(true);
            assertThat(metadata.get("changeReason")).isEqualTo("Security policy enforcement");
            assertThat(metadata.get("securityNotificationRequired")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("Base Event Properties Tests")
    class BaseEventPropertiesTests {

        @Test
        @DisplayName("Should verify base properties are accessible")
        void shouldVerifyBasePropertiesAreAccessible() {
            // Arrange
            UserCreatedEvent event = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.ADMIN,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.getEmail()).isEqualTo(testEmail);
            assertThat(event.getName()).isEqualTo(testName);
            assertThat(event.getRole()).isEqualTo(UserRole.ADMIN);
            assertThat(event.getAggregateId()).isEqualTo(testUserId);
            assertThat(event.getTriggeredBy()).isEqualTo(testTriggeredBy);
            assertThat(event.getCorrelationId()).isEqualTo(testCorrelationId);
        }

        @Test
        @DisplayName("Should generate unique event IDs")
        void shouldGenerateUniqueEventIds() {
            // Arrange & Act
            UserCreatedEvent event1 = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            UserCreatedEvent event2 = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.TUTOR,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event1.getEventId()).isNotNull();
            assertThat(event2.getEventId()).isNotNull();
            assertThat(event1.getEventId()).isNotEqualTo(event2.getEventId());
        }

        @Test
        @DisplayName("Should set occurrence timestamp")
        void shouldSetOccurrenceTimestamp() {
            // Arrange
            LocalDateTime before = LocalDateTime.now().minusSeconds(1);

            // Act
            UserCreatedEvent event = new UserCreatedEvent(
                testUserId,
                testEmail,
                testName,
                UserRole.LECTURER,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            LocalDateTime after = LocalDateTime.now().plusSeconds(1);

            // Assert
            assertThat(event.getOccurredAt()).isNotNull();
            assertThat(event.getOccurredAt()).isAfter(before);
            assertThat(event.getOccurredAt()).isBefore(after);
        }
    }
}
