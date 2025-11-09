package com.usyd.catams.common.domain.event;

import com.usyd.catams.common.domain.event.CourseEvent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit Tests for CourseEvent and its subclasses
 *
 * This test class provides comprehensive coverage of all course domain events,
 * testing event creation, business logic methods, and metadata management.
 *
 * Coverage includes:
 * - All 7 course event types
 * - Event type identification
 * - Business logic methods in each event
 * - Calculated fields and derived data
 * - Metadata handling
 * - Edge cases and boundary conditions
 *
 * @author Test Infrastructure Team
 * @since 2.0
 */
@DisplayName("CourseEvent Unit Tests")
class CourseEventTest {

    private String testCourseId;
    private String testCourseCode;
    private String testCourseName;
    private Long testLecturerId;
    private String testSemester;
    private String testTriggeredBy;
    private String testCorrelationId;

    @BeforeEach
    void setUp() {
        testCourseId = "course-001";
        testCourseCode = "COMP5216";
        testCourseName = "Mobile Computing";
        testLecturerId = 100L;
        testSemester = "2024-S1";
        testTriggeredBy = "admin-001";
        testCorrelationId = "corr-abc-123";
    }

    @Nested
    @DisplayName("CourseCreatedEvent Tests")
    class CourseCreatedEventTests {

        @Test
        @DisplayName("Should create CourseCreatedEvent with all fields")
        void shouldCreateCourseCreatedEventWithAllFields() {
            // Arrange & Act
            CourseCreatedEvent event = new CourseCreatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("COURSE_CREATED");
            assertThat(event.getCourseCode()).isEqualTo(testCourseCode);
            assertThat(event.getCourseName()).isEqualTo(testCourseName);
            assertThat(event.getLecturerId()).isEqualTo(testLecturerId);
            assertThat(event.getSemester()).isEqualTo(testSemester);
            assertThat(event.getBudgetAllocated()).isEqualByComparingTo(new BigDecimal("50000.00"));
            assertThat(event.isActive()).isTrue();
        }

        @Test
        @DisplayName("Should create inactive course event")
        void shouldCreateInactiveCourseEvent() {
            // Arrange & Act
            CourseCreatedEvent event = new CourseCreatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("30000.00"),
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.isActive()).isFalse();
        }

        @Test
        @DisplayName("Should include budget and status in metadata")
        void shouldIncludeBudgetAndStatusInMetadata() {
            // Arrange
            BigDecimal budget = new BigDecimal("75000.00");
            CourseCreatedEvent event = new CourseCreatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                budget,
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("budgetAllocated");
            assertThat(metadata).containsKey("isActive");
            assertThat(metadata).containsKey("setupRequired");
            assertThat(metadata.get("budgetAllocated")).isEqualTo(budget);
            assertThat(metadata.get("isActive")).isEqualTo(true);
            assertThat(metadata.get("setupRequired")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("CourseUpdatedEvent Tests")
    class CourseUpdatedEventTests {

        @Test
        @DisplayName("Should create CourseUpdatedEvent with all fields")
        void shouldCreateCourseUpdatedEventWithAllFields() {
            // Arrange & Act
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                "Old Course Name",
                testCourseName,
                "2023-S2",
                testSemester,
                200L,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("COURSE_UPDATED");
            assertThat(event.getPreviousCourseName()).isEqualTo("Old Course Name");
            assertThat(event.getCourseName()).isEqualTo(testCourseName);
            assertThat(event.getPreviousSemester()).isEqualTo("2023-S2");
            assertThat(event.getSemester()).isEqualTo(testSemester);
            assertThat(event.getPreviousLecturerId()).isEqualTo(200L);
            assertThat(event.getLecturerId()).isEqualTo(testLecturerId);
        }

        @Test
        @DisplayName("Should detect course name change")
        void shouldDetectCourseNameChange() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                "Old Course Name",
                testCourseName,
                testSemester,
                testSemester,
                testLecturerId,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasNameChanged()).isTrue();
            assertThat(event.hasSemesterChanged()).isFalse();
            assertThat(event.hasLecturerChanged()).isFalse();
        }

        @Test
        @DisplayName("Should detect semester change")
        void shouldDetectSemesterChange() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testCourseName,
                "2023-S2",
                testSemester,
                testLecturerId,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasNameChanged()).isFalse();
            assertThat(event.hasSemesterChanged()).isTrue();
            assertThat(event.hasLecturerChanged()).isFalse();
        }

        @Test
        @DisplayName("Should detect lecturer change")
        void shouldDetectLecturerChange() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testCourseName,
                testSemester,
                testSemester,
                200L,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasNameChanged()).isFalse();
            assertThat(event.hasSemesterChanged()).isFalse();
            assertThat(event.hasLecturerChanged()).isTrue();
        }

        @Test
        @DisplayName("Should detect multiple changes")
        void shouldDetectMultipleChanges() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                "Old Course Name",
                testCourseName,
                "2023-S2",
                testSemester,
                200L,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasNameChanged()).isTrue();
            assertThat(event.hasSemesterChanged()).isTrue();
            assertThat(event.hasLecturerChanged()).isTrue();
        }

        @Test
        @DisplayName("Should not detect changes when nothing changed")
        void shouldNotDetectChangesWhenNothingChanged() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testCourseName,
                testSemester,
                testSemester,
                testLecturerId,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.hasNameChanged()).isFalse();
            assertThat(event.hasSemesterChanged()).isFalse();
            assertThat(event.hasLecturerChanged()).isFalse();
        }

        @Test
        @DisplayName("Should include access control update flag when lecturer changed")
        void shouldIncludeAccessControlUpdateFlagWhenLecturerChanged() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testCourseName,
                testSemester,
                testSemester,
                200L,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("accessControlUpdateRequired");
            assertThat(metadata.get("accessControlUpdateRequired")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should not include access control flag when lecturer unchanged")
        void shouldNotIncludeAccessControlFlagWhenLecturerUnchanged() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                "Old Name",
                testCourseName,
                testSemester,
                testSemester,
                testLecturerId,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).doesNotContainKey("accessControlUpdateRequired");
        }

        @Test
        @DisplayName("Should include change flags in metadata")
        void shouldIncludeChangeFlagsInMetadata() {
            // Arrange
            CourseUpdatedEvent event = new CourseUpdatedEvent(
                testCourseId,
                testCourseCode,
                "Old Course Name",
                testCourseName,
                "2023-S2",
                testSemester,
                200L,
                testLecturerId,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("nameChanged");
            assertThat(metadata).containsKey("semesterChanged");
            assertThat(metadata).containsKey("lecturerChanged");
            assertThat(metadata.get("nameChanged")).isEqualTo(true);
            assertThat(metadata.get("semesterChanged")).isEqualTo(true);
            assertThat(metadata.get("lecturerChanged")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("CourseActivatedEvent Tests")
    class CourseActivatedEventTests {

        @Test
        @DisplayName("Should create CourseActivatedEvent with all fields")
        void shouldCreateCourseActivatedEventWithAllFields() {
            // Arrange & Act
            CourseActivatedEvent event = new CourseActivatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                "Semester started",
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("COURSE_ACTIVATED");
            assertThat(event.getActivationReason()).isEqualTo("Semester started");
        }

        @Test
        @DisplayName("Should include activation details in metadata")
        void shouldIncludeActivationDetailsInMetadata() {
            // Arrange
            String reason = "Budget approved";
            CourseActivatedEvent event = new CourseActivatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                reason,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("activationReason");
            assertThat(metadata).containsKey("timesheetCreationEnabled");
            assertThat(metadata.get("activationReason")).isEqualTo(reason);
            assertThat(metadata.get("timesheetCreationEnabled")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("CourseDeactivatedEvent Tests")
    class CourseDeactivatedEventTests {

        @Test
        @DisplayName("Should create CourseDeactivatedEvent with all fields")
        void shouldCreateCourseDeactivatedEventWithAllFields() {
            // Arrange & Act
            CourseDeactivatedEvent event = new CourseDeactivatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                "Semester ended",
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("COURSE_DEACTIVATED");
            assertThat(event.getDeactivationReason()).isEqualTo("Semester ended");
            assertThat(event.hasPendingTimesheets()).isTrue();
        }

        @Test
        @DisplayName("Should create deactivation event without pending timesheets")
        void shouldCreateDeactivationEventWithoutPendingTimesheets() {
            // Arrange & Act
            CourseDeactivatedEvent event = new CourseDeactivatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                "Course cancelled",
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.hasPendingTimesheets()).isFalse();
        }

        @Test
        @DisplayName("Should include deactivation details in metadata")
        void shouldIncludeDeactivationDetailsInMetadata() {
            // Arrange
            String reason = "Budget exhausted";
            CourseDeactivatedEvent event = new CourseDeactivatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                reason,
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("deactivationReason");
            assertThat(metadata).containsKey("hasPendingTimesheets");
            assertThat(metadata.get("deactivationReason")).isEqualTo(reason);
            assertThat(metadata.get("hasPendingTimesheets")).isEqualTo(false);
        }

        @Test
        @DisplayName("Should include cleanup flag when has pending timesheets")
        void shouldIncludeCleanupFlagWhenHasPendingTimesheets() {
            // Arrange
            CourseDeactivatedEvent event = new CourseDeactivatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                "Deactivation",
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("timesheetCleanupRequired");
            assertThat(metadata.get("timesheetCleanupRequired")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should not include cleanup flag when no pending timesheets")
        void shouldNotIncludeCleanupFlagWhenNoPendingTimesheets() {
            // Arrange
            CourseDeactivatedEvent event = new CourseDeactivatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                "Deactivation",
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).doesNotContainKey("timesheetCleanupRequired");
        }
    }

    @Nested
    @DisplayName("CourseBudgetUpdatedEvent Tests")
    class CourseBudgetUpdatedEventTests {

        @Test
        @DisplayName("Should create CourseBudgetUpdatedEvent with all fields")
        void shouldCreateCourseBudgetUpdatedEventWithAllFields() {
            // Arrange & Act
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("60000.00"),
                new BigDecimal("30000.00"),
                new BigDecimal("30000.00"),
                "Additional funding approved",
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("COURSE_BUDGET_UPDATED");
            assertThat(event.getPreviousBudgetAllocated()).isEqualByComparingTo(new BigDecimal("50000.00"));
            assertThat(event.getNewBudgetAllocated()).isEqualByComparingTo(new BigDecimal("60000.00"));
            assertThat(event.getPreviousBudgetUsed()).isEqualByComparingTo(new BigDecimal("30000.00"));
            assertThat(event.getCurrentBudgetUsed()).isEqualByComparingTo(new BigDecimal("30000.00"));
            assertThat(event.getBudgetChangeReason()).isEqualTo("Additional funding approved");
        }

        @Test
        @DisplayName("Should calculate budget change")
        void shouldCalculateBudgetChange() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("65000.00"),
                new BigDecimal("20000.00"),
                new BigDecimal("25000.00"),
                "Budget increase",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            BigDecimal change = event.getBudgetChange();

            // Assert
            assertThat(change).isEqualByComparingTo(new BigDecimal("15000.00"));
        }

        @Test
        @DisplayName("Should detect budget increase")
        void shouldDetectBudgetIncrease() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("40000.00"),
                new BigDecimal("50000.00"),
                new BigDecimal("15000.00"),
                new BigDecimal("15000.00"),
                "Budget increase",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isBudgetIncrease()).isTrue();
            assertThat(event.isBudgetDecrease()).isFalse();
        }

        @Test
        @DisplayName("Should detect budget decrease")
        void shouldDetectBudgetDecrease() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("60000.00"),
                new BigDecimal("45000.00"),
                new BigDecimal("20000.00"),
                new BigDecimal("20000.00"),
                "Budget cut",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isBudgetIncrease()).isFalse();
            assertThat(event.isBudgetDecrease()).isTrue();
        }

        @Test
        @DisplayName("Should calculate budget change for decrease")
        void shouldCalculateBudgetChangeForDecrease() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("60000.00"),
                new BigDecimal("45000.00"),
                new BigDecimal("20000.00"),
                new BigDecimal("20000.00"),
                "Budget reduction",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            BigDecimal change = event.getBudgetChange();

            // Assert
            assertThat(change).isEqualByComparingTo(new BigDecimal("-15000.00"));
        }

        @Test
        @DisplayName("Should calculate new budget remaining")
        void shouldCalculateNewBudgetRemaining() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("60000.00"),
                new BigDecimal("30000.00"),
                new BigDecimal("35000.00"),
                "Budget adjustment",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            BigDecimal remaining = event.getNewBudgetRemaining();

            // Assert
            assertThat(remaining).isEqualByComparingTo(new BigDecimal("25000.00"));
        }

        @Test
        @DisplayName("Should detect when new budget is exceeded")
        void shouldDetectWhenNewBudgetIsExceeded() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("40000.00"),
                new BigDecimal("30000.00"),
                new BigDecimal("45000.00"),
                "Budget reduction",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isNewBudgetExceeded()).isTrue();
        }

        @Test
        @DisplayName("Should detect when new budget is not exceeded")
        void shouldDetectWhenNewBudgetIsNotExceeded() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("60000.00"),
                new BigDecimal("30000.00"),
                new BigDecimal("35000.00"),
                "Budget increase",
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.isNewBudgetExceeded()).isFalse();
        }

        @Test
        @DisplayName("Should include comprehensive budget metadata")
        void shouldIncludeComprehensiveBudgetMetadata() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("65000.00"),
                new BigDecimal("25000.00"),
                new BigDecimal("28000.00"),
                "Annual budget increase",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("previousBudgetAllocated");
            assertThat(metadata).containsKey("newBudgetAllocated");
            assertThat(metadata).containsKey("budgetChange");
            assertThat(metadata).containsKey("isBudgetIncrease");
            assertThat(metadata).containsKey("isBudgetDecrease");
            assertThat(metadata).containsKey("budgetChangeReason");
            assertThat(metadata).containsKey("isNewBudgetExceeded");
            assertThat(metadata.get("previousBudgetAllocated")).isEqualTo(new BigDecimal("50000.00"));
            assertThat(metadata.get("newBudgetAllocated")).isEqualTo(new BigDecimal("65000.00"));
            assertThat(metadata.get("budgetChange")).isEqualTo(new BigDecimal("15000.00"));
            assertThat(metadata.get("isBudgetIncrease")).isEqualTo(true);
            assertThat(metadata.get("isBudgetDecrease")).isEqualTo(false);
            assertThat(metadata.get("budgetChangeReason")).isEqualTo("Annual budget increase");
            assertThat(metadata.get("isNewBudgetExceeded")).isEqualTo(false);
        }

        @Test
        @DisplayName("Should include budget alert flag when budget exceeded")
        void shouldIncludeBudgetAlertFlagWhenBudgetExceeded() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("40000.00"),
                new BigDecimal("30000.00"),
                new BigDecimal("45000.00"),
                "Budget cut",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("budgetAlertRequired");
            assertThat(metadata.get("budgetAlertRequired")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should not include budget alert flag when budget not exceeded")
        void shouldNotIncludeBudgetAlertFlagWhenBudgetNotExceeded() {
            // Arrange
            CourseBudgetUpdatedEvent event = new CourseBudgetUpdatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                new BigDecimal("60000.00"),
                new BigDecimal("30000.00"),
                new BigDecimal("35000.00"),
                "Budget increase",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).doesNotContainKey("budgetAlertRequired");
        }
    }

    @Nested
    @DisplayName("CourseTutorAssignedEvent Tests")
    class CourseTutorAssignedEventTests {

        @Test
        @DisplayName("Should create CourseTutorAssignedEvent with all fields")
        void shouldCreateCourseTutorAssignedEventWithAllFields() {
            // Arrange & Act
            CourseTutorAssignedEvent event = new CourseTutorAssignedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                300L,
                "Jane Smith",
                "New tutor assignment",
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("COURSE_TUTOR_ASSIGNED");
            assertThat(event.getTutorId()).isEqualTo(300L);
            assertThat(event.getTutorName()).isEqualTo("Jane Smith");
            assertThat(event.getAssignmentReason()).isEqualTo("New tutor assignment");
        }

        @Test
        @DisplayName("Should include tutor assignment metadata")
        void shouldIncludeTutorAssignmentMetadata() {
            // Arrange
            CourseTutorAssignedEvent event = new CourseTutorAssignedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                400L,
                "Bob Johnson",
                "Replacement tutor",
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("tutorId");
            assertThat(metadata).containsKey("tutorName");
            assertThat(metadata).containsKey("assignmentReason");
            assertThat(metadata).containsKey("accessGrantRequired");
            assertThat(metadata).containsKey("welcomeNotificationRequired");
            assertThat(metadata.get("tutorId")).isEqualTo(400L);
            assertThat(metadata.get("tutorName")).isEqualTo("Bob Johnson");
            assertThat(metadata.get("assignmentReason")).isEqualTo("Replacement tutor");
            assertThat(metadata.get("accessGrantRequired")).isEqualTo(true);
            assertThat(metadata.get("welcomeNotificationRequired")).isEqualTo(true);
        }
    }

    @Nested
    @DisplayName("CourseTutorUnassignedEvent Tests")
    class CourseTutorUnassignedEventTests {

        @Test
        @DisplayName("Should create CourseTutorUnassignedEvent with all fields")
        void shouldCreateCourseTutorUnassignedEventWithAllFields() {
            // Arrange & Act
            CourseTutorUnassignedEvent event = new CourseTutorUnassignedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                300L,
                "Jane Smith",
                "Contract ended",
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.getEventType()).isEqualTo("COURSE_TUTOR_UNASSIGNED");
            assertThat(event.getTutorId()).isEqualTo(300L);
            assertThat(event.getTutorName()).isEqualTo("Jane Smith");
            assertThat(event.getUnassignmentReason()).isEqualTo("Contract ended");
            assertThat(event.hasPendingTimesheets()).isTrue();
        }

        @Test
        @DisplayName("Should create unassignment event without pending timesheets")
        void shouldCreateUnassignmentEventWithoutPendingTimesheets() {
            // Arrange & Act
            CourseTutorUnassignedEvent event = new CourseTutorUnassignedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                400L,
                "Bob Johnson",
                "Reassignment",
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event.hasPendingTimesheets()).isFalse();
        }

        @Test
        @DisplayName("Should include tutor unassignment metadata")
        void shouldIncludeTutorUnassignmentMetadata() {
            // Arrange
            CourseTutorUnassignedEvent event = new CourseTutorUnassignedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                500L,
                "Alice Brown",
                "Performance issue",
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("tutorId");
            assertThat(metadata).containsKey("tutorName");
            assertThat(metadata).containsKey("unassignmentReason");
            assertThat(metadata).containsKey("hasPendingTimesheets");
            assertThat(metadata).containsKey("accessRevocationRequired");
            assertThat(metadata.get("tutorId")).isEqualTo(500L);
            assertThat(metadata.get("tutorName")).isEqualTo("Alice Brown");
            assertThat(metadata.get("unassignmentReason")).isEqualTo("Performance issue");
            assertThat(metadata.get("hasPendingTimesheets")).isEqualTo(false);
            assertThat(metadata.get("accessRevocationRequired")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should include timesheet handling flag when has pending timesheets")
        void shouldIncludeTimesheetHandlingFlagWhenHasPendingTimesheets() {
            // Arrange
            CourseTutorUnassignedEvent event = new CourseTutorUnassignedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                600L,
                "Charlie Davis",
                "Moved to another course",
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).containsKey("timesheetHandlingRequired");
            assertThat(metadata.get("timesheetHandlingRequired")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should not include timesheet handling flag when no pending timesheets")
        void shouldNotIncludeTimesheetHandlingFlagWhenNoPendingTimesheets() {
            // Arrange
            CourseTutorUnassignedEvent event = new CourseTutorUnassignedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                700L,
                "Eve Williams",
                "Resigned",
                false,
                testTriggeredBy,
                testCorrelationId
            );

            // Act
            Map<String, java.io.Serializable> metadata = event.getMetadata();

            // Assert
            assertThat(metadata).doesNotContainKey("timesheetHandlingRequired");
        }
    }

    @Nested
    @DisplayName("Base Event Properties Tests")
    class BaseEventPropertiesTests {

        @Test
        @DisplayName("Should verify base properties are accessible")
        void shouldVerifyBasePropertiesAreAccessible() {
            // Arrange
            CourseCreatedEvent event = new CourseCreatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Act & Assert
            assertThat(event.getCourseCode()).isEqualTo(testCourseCode);
            assertThat(event.getCourseName()).isEqualTo(testCourseName);
            assertThat(event.getLecturerId()).isEqualTo(testLecturerId);
            assertThat(event.getSemester()).isEqualTo(testSemester);
            assertThat(event.getAggregateId()).isEqualTo(testCourseId);
            assertThat(event.getTriggeredBy()).isEqualTo(testTriggeredBy);
            assertThat(event.getCorrelationId()).isEqualTo(testCorrelationId);
        }

        @Test
        @DisplayName("Should generate unique event IDs")
        void shouldGenerateUniqueEventIds() {
            // Arrange & Act
            CourseCreatedEvent event1 = new CourseCreatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                true,
                testTriggeredBy,
                testCorrelationId
            );

            CourseCreatedEvent event2 = new CourseCreatedEvent(
                testCourseId,
                testCourseCode,
                testCourseName,
                testLecturerId,
                testSemester,
                new BigDecimal("50000.00"),
                true,
                testTriggeredBy,
                testCorrelationId
            );

            // Assert
            assertThat(event1.getEventId()).isNotNull();
            assertThat(event2.getEventId()).isNotNull();
            assertThat(event1.getEventId()).isNotEqualTo(event2.getEventId());
        }
    }
}
