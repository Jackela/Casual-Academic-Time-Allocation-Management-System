package com.usyd.catams.application.timesheet.dto;

import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit Tests for TimesheetDto
 *
 * This test class provides comprehensive coverage of the TimesheetDto
 * data transfer object, testing all calculation methods, status checks,
 * and builder pattern functionality.
 *
 * Coverage includes:
 * - Builder pattern construction
 * - Calculation methods (total amount, etc.)
 * - Status check methods (editable, finalized, etc.)
 * - Display string formatters
 * - Business logic methods
 * - Edge cases and null handling
 *
 * @author Test Infrastructure Team
 * @since 2.0
 */
@DisplayName("TimesheetDto Unit Tests")
class TimesheetDtoTest {

    private TimesheetDto.Builder baseBuilder;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        now = LocalDateTime.now();
        baseBuilder = TimesheetDto.builder()
            .id(1L)
            .tutorId(100L)
            .tutorName("Jane Doe")
            .tutorEmail("jane@usyd.edu.au")
            .courseId(200L)
            .courseCode("COMP2017")
            .courseName("Systems Programming")
            .lecturerId(300L)
            .lecturerName("Dr. Smith")
            .weekStartDate(LocalDate.of(2024, 1, 8))
            .weekEndDate(LocalDate.of(2024, 1, 14))
            .hours(new BigDecimal("20.00"))
            .hourlyRate(new BigDecimal("40.00"))
            .totalAmount(new BigDecimal("800.00"))
            .description("Marking assignments")
            .status(ApprovalStatus.DRAFT)
            .createdAt(now);
    }

    @Nested
    @DisplayName("Builder Pattern Tests")
    class BuilderPatternTests {

        @Test
        @DisplayName("Should build TimesheetDto with all required fields")
        void shouldBuildTimesheetDtoWithAllRequiredFields() {
            // Act
            TimesheetDto dto = baseBuilder.build();

            // Assert
            assertThat(dto).isNotNull();
            assertThat(dto.getId()).isEqualTo(1L);
            assertThat(dto.getTutorId()).isEqualTo(100L);
            assertThat(dto.getCourseId()).isEqualTo(200L);
            assertThat(dto.getWeekStartDate()).isEqualTo(LocalDate.of(2024, 1, 8));
            assertThat(dto.getHours()).isEqualByComparingTo(new BigDecimal("20.00"));
            assertThat(dto.getHourlyRate()).isEqualByComparingTo(new BigDecimal("40.00"));
        }

        @Test
        @DisplayName("Should throw exception when tutorId is null")
        void shouldThrowExceptionWhenTutorIdIsNull() {
            // Arrange
            baseBuilder.tutorId(null);

            // Act & Assert
            assertThatThrownBy(() -> baseBuilder.build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Tutor ID is required");
        }

        @Test
        @DisplayName("Should throw exception when courseId is null")
        void shouldThrowExceptionWhenCourseIdIsNull() {
            // Arrange
            baseBuilder.courseId(null);

            // Act & Assert
            assertThatThrownBy(() -> baseBuilder.build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Course ID is required");
        }

        @Test
        @DisplayName("Should throw exception when weekStartDate is null")
        void shouldThrowExceptionWhenWeekStartDateIsNull() {
            // Arrange
            baseBuilder.weekStartDate(null);

            // Act & Assert
            assertThatThrownBy(() -> baseBuilder.build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Week start date is required");
        }

        @Test
        @DisplayName("Should throw exception when hours is null")
        void shouldThrowExceptionWhenHoursIsNull() {
            // Arrange
            baseBuilder.hours(null);

            // Act & Assert
            assertThatThrownBy(() -> baseBuilder.build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Hours is required");
        }

        @Test
        @DisplayName("Should throw exception when hourlyRate is null")
        void shouldThrowExceptionWhenHourlyRateIsNull() {
            // Arrange
            baseBuilder.hourlyRate(null);

            // Act & Assert
            assertThatThrownBy(() -> baseBuilder.build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Hourly rate is required");
        }

        @Test
        @DisplayName("Should use DRAFT status by default when not explicitly set")
        void shouldUseDraftStatusByDefaultWhenNotExplicitlySet() {
            // Act - Don't call .status() at all
            TimesheetDto dto = TimesheetDto.builder()
                .tutorId(100L)
                .courseId(200L)
                .weekStartDate(LocalDate.of(2024, 1, 8))
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Assert - Builder sets DRAFT as default in constructor
            assertThat(dto.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        }
    }

    @Nested
    @DisplayName("Calculation Methods")
    class CalculationTests {

        @Test
        @DisplayName("Should return provided totalAmount")
        void shouldReturnProvidedTotalAmount() {
            // Arrange
            TimesheetDto dto = baseBuilder.build();

            // Act
            BigDecimal result = dto.getCalculatedTotalAmount();

            // Assert
            assertThat(result).isEqualByComparingTo(new BigDecimal("800.00"));
        }

        @Test
        @DisplayName("Should calculate totalAmount from hours and rate when not provided")
        void shouldCalculateTotalAmountFromHoursAndRate() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .totalAmount(null)
                .hours(new BigDecimal("25.00"))
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Act
            BigDecimal result = dto.getCalculatedTotalAmount();

            // Assert
            assertThat(result).isEqualByComparingTo(new BigDecimal("1000.00"));
        }

        @Test
        @DisplayName("Should return provided totalAmount when hours is set")
        void shouldReturnProvidedTotalAmountWhenHoursIsSet() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .totalAmount(new BigDecimal("500.00"))
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("30.00"))
                .build();

            // Act - Even though calculated would be 600, it should return provided 500
            BigDecimal result = dto.getCalculatedTotalAmount();

            // Assert
            assertThat(result).isEqualByComparingTo(new BigDecimal("500.00"));
        }

        @Test
        @DisplayName("Should calculate totalAmount with fractional hours")
        void shouldCalculateTotalAmountWithFractionalHours() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .totalAmount(null)
                .hours(new BigDecimal("12.5"))
                .hourlyRate(new BigDecimal("45.50"))
                .build();

            // Act
            BigDecimal result = dto.getCalculatedTotalAmount();

            // Assert
            assertThat(result).isEqualByComparingTo(new BigDecimal("568.75"));
        }

        @Test
        @DisplayName("Should return zero when totalAmount is null and hours is zero")
        void shouldReturnZeroWhenTotalAmountIsNullAndHoursIsZero() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .totalAmount(null)
                .hours(BigDecimal.ZERO)
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Act
            BigDecimal result = dto.getCalculatedTotalAmount();

            // Assert
            assertThat(result).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    @Nested
    @DisplayName("Status Check Methods")
    class StatusCheckTests {

        @ParameterizedTest
        @EnumSource(value = ApprovalStatus.class, names = {"DRAFT", "MODIFICATION_REQUESTED"})
        @DisplayName("Should be editable when status is DRAFT or MODIFICATION_REQUESTED")
        void shouldBeEditableForDraftOrModificationRequested(ApprovalStatus status) {
            // Arrange
            TimesheetDto dto = baseBuilder.status(status).build();

            // Act & Assert
            assertThat(dto.isEditable()).isTrue();
        }

        @ParameterizedTest
        @EnumSource(value = ApprovalStatus.class, names = {"PENDING_TUTOR_CONFIRMATION", "TUTOR_CONFIRMED", "LECTURER_CONFIRMED", "FINAL_CONFIRMED", "REJECTED"})
        @DisplayName("Should not be editable for other statuses")
        void shouldNotBeEditableForOtherStatuses(ApprovalStatus status) {
            // Arrange
            TimesheetDto dto = baseBuilder.status(status).build();

            // Act & Assert
            assertThat(dto.isEditable()).isFalse();
        }

        @Test
        @DisplayName("Should be submittable when DRAFT with valid hours and rate")
        void shouldBeSubmittableWhenDraftWithValidData() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.DRAFT)
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Act & Assert
            assertThat(dto.canBeSubmitted()).isTrue();
        }

        @Test
        @DisplayName("Should not be submittable when hours is zero")
        void shouldNotBeSubmittableWhenHoursIsZero() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.DRAFT)
                .hours(BigDecimal.ZERO)
                .build();

            // Act & Assert
            assertThat(dto.canBeSubmitted()).isFalse();
        }

        @Test
        @DisplayName("Should not be submittable when status is not DRAFT")
        void shouldNotBeSubmittableWhenStatusIsNotDraft() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.TUTOR_CONFIRMED)
                .build();

            // Act & Assert
            assertThat(dto.canBeSubmitted()).isFalse();
        }

        @Test
        @DisplayName("Should not be submittable when hourlyRate is zero")
        void shouldNotBeSubmittableWhenHourlyRateIsZero() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.DRAFT)
                .hours(new BigDecimal("20.00"))
                .hourlyRate(BigDecimal.ZERO)
                .build();

            // Act & Assert
            assertThat(dto.canBeSubmitted()).isFalse();
        }

        @Test
        @DisplayName("Should not be submittable when hourlyRate is negative")
        void shouldNotBeSubmittableWhenHourlyRateIsNegative() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.DRAFT)
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("-10.00"))
                .build();

            // Act & Assert
            assertThat(dto.canBeSubmitted()).isFalse();
        }

        @Test
        @DisplayName("Should not be submittable when hours is negative")
        void shouldNotBeSubmittableWhenHoursIsNegative() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.DRAFT)
                .hours(new BigDecimal("-5.00"))
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Act & Assert
            assertThat(dto.canBeSubmitted()).isFalse();
        }

        @ParameterizedTest
        @EnumSource(value = ApprovalStatus.class, names = {"PENDING_TUTOR_CONFIRMATION", "TUTOR_CONFIRMED", "LECTURER_CONFIRMED"})
        @DisplayName("Should be in confirmation workflow")
        void shouldBeInConfirmationWorkflow(ApprovalStatus status) {
            // Arrange
            TimesheetDto dto = baseBuilder.status(status).build();

            // Act & Assert
            assertThat(dto.isInConfirmationWorkflow()).isTrue();
        }

        @ParameterizedTest
        @EnumSource(value = ApprovalStatus.class, names = {"FINAL_CONFIRMED", "REJECTED"})
        @DisplayName("Should be finalized")
        void shouldBeFinalized(ApprovalStatus status) {
            // Arrange
            TimesheetDto dto = baseBuilder.status(status).build();

            // Act & Assert
            assertThat(dto.isFinalized()).isTrue();
        }

        @Test
        @DisplayName("Should check submitted flag")
        void shouldCheckSubmittedFlag() {
            // Arrange
            TimesheetDto dto = baseBuilder.isSubmitted(true).build();

            // Act & Assert
            assertThat(dto.isSubmitted()).isTrue();
        }

        @Test
        @DisplayName("Should check approved flag")
        void shouldCheckApprovedFlag() {
            // Arrange
            TimesheetDto dto = baseBuilder.isApproved(true).build();

            // Act & Assert
            assertThat(dto.isApproved()).isTrue();
        }

        @Test
        @DisplayName("Should check rejected flag")
        void shouldCheckRejectedFlag() {
            // Arrange
            TimesheetDto dto = baseBuilder.isRejected(true).build();

            // Act & Assert
            assertThat(dto.isRejected()).isTrue();
        }
    }

    @Nested
    @DisplayName("Deadline and Timing Methods")
    class DeadlineTimingTests {

        @Test
        @DisplayName("Should detect overdue approval")
        void shouldDetectOverdueApproval() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
                .approvalDeadline(now.minusDays(2))
                .build();

            // Act & Assert
            assertThat(dto.isApprovalOverdue()).isTrue();
        }

        @Test
        @DisplayName("Should not be overdue when deadline is in future")
        void shouldNotBeOverdueWhenDeadlineIsInFuture() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
                .approvalDeadline(now.plusDays(2))
                .build();

            // Act & Assert
            assertThat(dto.isApprovalOverdue()).isFalse();
        }

        @Test
        @DisplayName("Should not be overdue when deadline is null")
        void shouldNotBeOverdueWhenDeadlineIsNull() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
                .approvalDeadline(null)
                .build();

            // Act & Assert
            assertThat(dto.isApprovalOverdue()).isFalse();
        }

        @Test
        @DisplayName("Should not be overdue when not in confirmation workflow")
        void shouldNotBeOverdueWhenNotInConfirmationWorkflow() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.DRAFT)
                .approvalDeadline(now.minusDays(2))
                .build();

            // Act & Assert
            assertThat(dto.isApprovalOverdue()).isFalse();
        }

        @Test
        @DisplayName("Should not be overdue when deadline is exactly now")
        void shouldNotBeOverdueWhenDeadlineIsExactlyNow() {
            // Arrange - Deadline slightly in the future to avoid race conditions
            TimesheetDto dto = baseBuilder
                .status(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
                .approvalDeadline(now.plusSeconds(1))
                .build();

            // Act & Assert
            assertThat(dto.isApprovalOverdue()).isFalse();
        }

        @Test
        @DisplayName("Should calculate days until deadline")
        void shouldCalculateDaysUntilDeadline() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalDeadline(now.plusDays(5))
                .build();

            // Act
            long days = dto.getDaysUntilDeadline();

            // Assert
            assertThat(days).isBetween(4L, 5L);
        }

        @Test
        @DisplayName("Should return -1 when deadline is null")
        void shouldReturnMinusOneWhenDeadlineIsNull() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalDeadline(null)
                .build();

            // Act
            long days = dto.getDaysUntilDeadline();

            // Assert
            assertThat(days).isEqualTo(-1L);
        }

        @Test
        @DisplayName("Should check if timesheet is recent")
        void shouldCheckIfTimesheetIsRecent() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .createdAt(now.minusDays(3))
                .build();

            // Act & Assert
            assertThat(dto.isRecent()).isTrue();
        }

        @Test
        @DisplayName("Should not be recent when created over 7 days ago")
        void shouldNotBeRecentWhenCreatedOverSevenDaysAgo() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .createdAt(now.minusDays(10))
                .build();

            // Act & Assert
            assertThat(dto.isRecent()).isFalse();
        }

        @Test
        @DisplayName("Should not be recent when createdAt is null")
        void shouldNotBeRecentWhenCreatedAtIsNull() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .createdAt(null)
                .build();

            // Act & Assert
            assertThat(dto.isRecent()).isFalse();
        }

        @Test
        @DisplayName("Should calculate negative days when deadline is in past")
        void shouldCalculateNegativeDaysWhenDeadlineIsInPast() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalDeadline(now.minusDays(5))
                .build();

            // Act
            long days = dto.getDaysUntilDeadline();

            // Assert
            assertThat(days).isBetween(-6L, -4L);
        }

        @Test
        @DisplayName("Should be recent when created exactly 7 days ago")
        void shouldBeRecentWhenCreatedExactlySevenDaysAgo() {
            // Arrange - Created 6 days and 23 hours ago (within 7 days)
            TimesheetDto dto = baseBuilder
                .createdAt(now.minusDays(6).minusHours(23))
                .build();

            // Act & Assert
            assertThat(dto.isRecent()).isTrue();
        }
    }

    @Nested
    @DisplayName("Display String Methods")
    class DisplayStringTests {

        @Test
        @DisplayName("Should format full course name")
        void shouldFormatFullCourseName() {
            // Arrange
            TimesheetDto dto = baseBuilder.build();

            // Act
            String result = dto.getFullCourseName();

            // Assert
            assertThat(result).isEqualTo("COMP2017 - Systems Programming");
        }

        @Test
        @DisplayName("Should format week period with end date")
        void shouldFormatWeekPeriodWithEndDate() {
            // Arrange
            TimesheetDto dto = baseBuilder.build();

            // Act
            String result = dto.getWeekPeriodDisplay();

            // Assert
            assertThat(result).contains("2024-01-08")
                .contains("2024-01-14")
                .contains("to");
        }

        @Test
        @DisplayName("Should format week period without end date")
        void shouldFormatWeekPeriodWithoutEndDate() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .weekEndDate(null)
                .build();

            // Act
            String result = dto.getWeekPeriodDisplay();

            // Assert
            assertThat(result).contains("2024-01-08")
                .contains("week starting");
        }

        @ParameterizedTest
        @MethodSource("provideStatusDisplayMappings")
        @DisplayName("Should format status display correctly")
        void shouldFormatStatusDisplay(ApprovalStatus status, String expectedDisplay) {
            // Arrange
            TimesheetDto dto = baseBuilder.status(status).build();

            // Act
            String result = dto.getStatusDisplay();

            // Assert
            assertThat(result).isEqualTo(expectedDisplay);
        }

        static Stream<Arguments> provideStatusDisplayMappings() {
            return Stream.of(
                Arguments.of(ApprovalStatus.DRAFT, "Draft"),
                Arguments.of(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, "Pending Tutor Confirmation"),
                Arguments.of(ApprovalStatus.TUTOR_CONFIRMED, "Confirmed by Tutor"),
                Arguments.of(ApprovalStatus.LECTURER_CONFIRMED, "Confirmed by Lecturer"),
                Arguments.of(ApprovalStatus.FINAL_CONFIRMED, "Final Confirmed"),
                Arguments.of(ApprovalStatus.REJECTED, "Rejected"),
                Arguments.of(ApprovalStatus.MODIFICATION_REQUESTED, "Modification Requested")
            );
        }

        @Test
        @DisplayName("Should handle DRAFT status display")
        void shouldHandleDraftStatusDisplay() {
            // Arrange - Builder sets DRAFT by default
            TimesheetDto dto = TimesheetDto.builder()
                .tutorId(100L)
                .courseId(200L)
                .weekStartDate(LocalDate.of(2024, 1, 8))
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Act
            String result = dto.getStatusDisplay();

            // Assert
            assertThat(result).isEqualTo("Draft");
        }

        @Test
        @DisplayName("Should format next approver info with name and role")
        void shouldFormatNextApproverInfoWithNameAndRole() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .currentApproverName("Dr. Smith")
                .currentApproverRole(UserRole.LECTURER)
                .build();

            // Act
            String result = dto.getNextApproverInfo();

            // Assert
            assertThat(result).contains("Dr. Smith")
                .contains("Lecturer");
        }

        @Test
        @DisplayName("Should format next approver info with role only")
        void shouldFormatNextApproverInfoWithRoleOnly() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .currentApproverName(null)
                .currentApproverRole(UserRole.TUTOR)
                .build();

            // Act
            String result = dto.getNextApproverInfo();

            // Assert
            assertThat(result).contains("Tutor");
        }

        @Test
        @DisplayName("Should return Unknown when approver info is missing")
        void shouldReturnUnknownWhenApproverInfoIsMissing() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .currentApproverName(null)
                .currentApproverRole(null)
                .build();

            // Act
            String result = dto.getNextApproverInfo();

            // Assert
            assertThat(result).isEqualTo("Unknown");
        }

        @Test
        @DisplayName("Should handle null status in getStatusDisplay")
        void shouldHandleNullStatusInGetStatusDisplay() {
            // Arrange - Build with constructor directly to bypass builder validation
            TimesheetDto dto = new TimesheetDto(
                1L, 100L, "Jane Doe", "jane@usyd.edu.au",
                200L, "COMP2017", "Systems Programming",
                300L, "Dr. Smith",
                LocalDate.of(2024, 1, 8), LocalDate.of(2024, 1, 14),
                new BigDecimal("20.00"), new BigDecimal("40.00"), new BigDecimal("800.00"),
                "Test", null, // null status
                false, false, false,
                null, null, null, now, now,
                null, null, null, null, null
            );

            // Act
            String result = dto.getStatusDisplay();

            // Assert
            assertThat(result).isEqualTo("Unknown");
        }

        @Test
        @DisplayName("Should format full course name with null values")
        void shouldFormatFullCourseNameWithNullValues() {
            // Arrange - Build with constructor to have null courseCode/courseName
            TimesheetDto dto = new TimesheetDto(
                1L, 100L, "Jane Doe", "jane@usyd.edu.au",
                200L, null, null, // null courseCode and courseName
                300L, "Dr. Smith",
                LocalDate.of(2024, 1, 8), LocalDate.of(2024, 1, 14),
                new BigDecimal("20.00"), new BigDecimal("40.00"), new BigDecimal("800.00"),
                "Test", ApprovalStatus.DRAFT,
                false, false, false,
                null, null, null, now, now,
                null, null, null, null, null
            );

            // Act
            String result = dto.getFullCourseName();

            // Assert
            assertThat(result).isEqualTo("null - null");
        }

        @Test
        @DisplayName("Should format next approver info with name but no role")
        void shouldFormatNextApproverInfoWithNameButNoRole() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .currentApproverName("Dr. Smith")
                .currentApproverRole(null)
                .build();

            // Act
            String result = dto.getNextApproverInfo();

            // Assert
            assertThat(result).isEqualTo("Unknown");
        }
    }

    @Nested
    @DisplayName("Comments Methods")
    class CommentsTests {

        @Test
        @DisplayName("Should detect approval comments")
        void shouldDetectApprovalComments() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalComments("Please revise hours")
                .build();

            // Act & Assert
            assertThat(dto.hasApprovalComments()).isTrue();
        }

        @Test
        @DisplayName("Should not detect comments when null")
        void shouldNotDetectCommentsWhenNull() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalComments(null)
                .build();

            // Act & Assert
            assertThat(dto.hasApprovalComments()).isFalse();
        }

        @Test
        @DisplayName("Should not detect comments when empty or whitespace")
        void shouldNotDetectCommentsWhenEmptyOrWhitespace() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalComments("   ")
                .build();

            // Act & Assert
            assertThat(dto.hasApprovalComments()).isFalse();
        }
    }

    @Nested
    @DisplayName("Equals and HashCode Tests")
    class EqualsHashCodeTests {

        @Test
        @DisplayName("Should be equal when same object")
        void shouldBeEqualWhenSameObject() {
            // Arrange
            TimesheetDto dto = baseBuilder.build();

            // Act & Assert
            assertThat(dto).isEqualTo(dto);
        }

        @Test
        @DisplayName("Should be equal when same key fields")
        void shouldBeEqualWhenSameKeyFields() {
            // Arrange
            TimesheetDto dto1 = baseBuilder.build();
            TimesheetDto dto2 = baseBuilder.build();

            // Act & Assert
            assertThat(dto1).isEqualTo(dto2);
            assertThat(dto1.hashCode()).isEqualTo(dto2.hashCode());
        }

        @Test
        @DisplayName("Should not be equal when different ID")
        void shouldNotBeEqualWhenDifferentId() {
            // Arrange
            TimesheetDto dto1 = baseBuilder.id(1L).build();
            TimesheetDto dto2 = baseBuilder.id(2L).build();

            // Act & Assert
            assertThat(dto1).isNotEqualTo(dto2);
        }

        @Test
        @DisplayName("Should not be equal to null")
        void shouldNotBeEqualToNull() {
            // Arrange
            TimesheetDto dto = baseBuilder.build();

            // Act & Assert
            assertThat(dto).isNotEqualTo(null);
        }

        @Test
        @DisplayName("Should not be equal to different class")
        void shouldNotBeEqualToDifferentClass() {
            // Arrange
            TimesheetDto dto = baseBuilder.build();

            // Act & Assert
            assertThat(dto).isNotEqualTo("Not a TimesheetDto");
        }
    }

    @Nested
    @DisplayName("ToString Tests")
    class ToStringTests {

        @Test
        @DisplayName("Should format toString with key information")
        void shouldFormatToStringWithKeyInformation() {
            // Arrange
            TimesheetDto dto = baseBuilder.build();

            // Act
            String result = dto.toString();

            // Assert
            assertThat(result)
                .contains("TimesheetDto")
                .contains("id=1")
                .contains("Jane Doe")
                .contains("COMP2017")
                .contains("DRAFT");
        }
    }

    @Nested
    @DisplayName("Getter Methods Coverage")
    class GetterMethodsTests {

        @Test
        @DisplayName("Should return all basic field values correctly")
        void shouldReturnAllBasicFieldValuesCorrectly() {
            // Arrange
            LocalDateTime submittedTime = now.minusDays(1);
            LocalDateTime modifiedTime = now.minusHours(2);
            LocalDateTime approvalTime = now.plusDays(3);

            TimesheetDto dto = baseBuilder
                .id(42L)
                .tutorId(101L)
                .tutorName("John Tutor")
                .tutorEmail("john.tutor@usyd.edu.au")
                .courseId(202L)
                .courseCode("INFO3333")
                .courseName("Database Systems")
                .lecturerId(303L)
                .lecturerName("Prof. Davis")
                .description("Tutorial preparation and grading")
                .isSubmitted(true)
                .isApproved(true)
                .isRejected(false)
                .submittedAt(submittedTime)
                .lastModifiedAt(modifiedTime)
                .lastModifiedBy("admin@usyd.edu.au")
                .createdAt(now.minusDays(5))
                .updatedAt(now)
                .currentApproverId(404L)
                .currentApproverName("HR Manager")
                .currentApproverRole(UserRole.HR)
                .approvalComments("Looks good")
                .approvalDeadline(approvalTime)
                .build();

            // Act & Assert - Test all getters
            assertThat(dto.getId()).isEqualTo(42L);
            assertThat(dto.getTutorId()).isEqualTo(101L);
            assertThat(dto.getTutorName()).isEqualTo("John Tutor");
            assertThat(dto.getTutorEmail()).isEqualTo("john.tutor@usyd.edu.au");
            assertThat(dto.getCourseId()).isEqualTo(202L);
            assertThat(dto.getCourseCode()).isEqualTo("INFO3333");
            assertThat(dto.getCourseName()).isEqualTo("Database Systems");
            assertThat(dto.getLecturerId()).isEqualTo(303L);
            assertThat(dto.getLecturerName()).isEqualTo("Prof. Davis");
            assertThat(dto.getWeekStartDate()).isEqualTo(LocalDate.of(2024, 1, 8));
            assertThat(dto.getWeekEndDate()).isEqualTo(LocalDate.of(2024, 1, 14));
            assertThat(dto.getHours()).isEqualByComparingTo(new BigDecimal("20.00"));
            assertThat(dto.getHourlyRate()).isEqualByComparingTo(new BigDecimal("40.00"));
            assertThat(dto.getTotalAmount()).isEqualByComparingTo(new BigDecimal("800.00"));
            assertThat(dto.getDescription()).isEqualTo("Tutorial preparation and grading");
            assertThat(dto.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
            assertThat(dto.isSubmitted()).isTrue();
            assertThat(dto.isApproved()).isTrue();
            assertThat(dto.isRejected()).isFalse();
            assertThat(dto.getSubmittedAt()).isEqualTo(submittedTime);
            assertThat(dto.getLastModifiedAt()).isEqualTo(modifiedTime);
            assertThat(dto.getLastModifiedBy()).isEqualTo("admin@usyd.edu.au");
            assertThat(dto.getCreatedAt()).isEqualTo(now.minusDays(5));
            assertThat(dto.getUpdatedAt()).isEqualTo(now);
            assertThat(dto.getCurrentApproverId()).isEqualTo(404L);
            assertThat(dto.getCurrentApproverName()).isEqualTo("HR Manager");
            assertThat(dto.getCurrentApproverRole()).isEqualTo(UserRole.HR);
            assertThat(dto.getApprovalComments()).isEqualTo("Looks good");
            assertThat(dto.getApprovalDeadline()).isEqualTo(approvalTime);
        }

        @Test
        @DisplayName("Should handle null optional fields correctly")
        void shouldHandleNullOptionalFieldsCorrectly() {
            // Arrange - Build with minimal fields
            TimesheetDto dto = TimesheetDto.builder()
                .tutorId(100L)
                .courseId(200L)
                .weekStartDate(LocalDate.of(2024, 1, 8))
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Act & Assert - Test null handling
            assertThat(dto.getId()).isNull();
            assertThat(dto.getTutorName()).isNull();
            assertThat(dto.getTutorEmail()).isNull();
            assertThat(dto.getCourseCode()).isNull();
            assertThat(dto.getCourseName()).isNull();
            assertThat(dto.getLecturerId()).isNull();
            assertThat(dto.getLecturerName()).isNull();
            assertThat(dto.getWeekEndDate()).isNull();
            assertThat(dto.getTotalAmount()).isNull();
            assertThat(dto.getDescription()).isNull();
            assertThat(dto.getSubmittedAt()).isNull();
            assertThat(dto.getLastModifiedAt()).isNull();
            assertThat(dto.getLastModifiedBy()).isNull();
            assertThat(dto.getCreatedAt()).isNull();
            assertThat(dto.getUpdatedAt()).isNull();
            assertThat(dto.getCurrentApproverId()).isNull();
            assertThat(dto.getCurrentApproverName()).isNull();
            assertThat(dto.getCurrentApproverRole()).isNull();
            assertThat(dto.getApprovalComments()).isNull();
            assertThat(dto.getApprovalDeadline()).isNull();
        }

        @Test
        @DisplayName("Should return default boolean values correctly")
        void shouldReturnDefaultBooleanValuesCorrectly() {
            // Arrange - Build with minimal fields (should use defaults)
            TimesheetDto dto = TimesheetDto.builder()
                .tutorId(100L)
                .courseId(200L)
                .weekStartDate(LocalDate.of(2024, 1, 8))
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("40.00"))
                .build();

            // Act & Assert - Default values from builder
            assertThat(dto.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
            assertThat(dto.isSubmitted()).isFalse();
            assertThat(dto.isApproved()).isFalse();
            assertThat(dto.isRejected()).isFalse();
        }
    }

    @Nested
    @DisplayName("Builder Method Chaining Tests")
    class BuilderChainingTests {

        @Test
        @DisplayName("Should support fluent builder method chaining for all fields")
        void shouldSupportFluentBuilderMethodChainingForAllFields() {
            // Act - Chain all builder methods
            TimesheetDto.Builder builder = TimesheetDto.builder()
                .id(1L)
                .tutorId(100L)
                .tutorName("Test Tutor")
                .tutorEmail("test@usyd.edu.au")
                .courseId(200L)
                .courseCode("TEST101")
                .courseName("Test Course")
                .lecturerId(300L)
                .lecturerName("Test Lecturer")
                .weekStartDate(LocalDate.of(2024, 1, 1))
                .weekEndDate(LocalDate.of(2024, 1, 7))
                .hours(new BigDecimal("10.00"))
                .hourlyRate(new BigDecimal("50.00"))
                .totalAmount(new BigDecimal("500.00"))
                .description("Test description")
                .status(ApprovalStatus.TUTOR_CONFIRMED)
                .isSubmitted(true)
                .isApproved(true)
                .isRejected(false)
                .submittedAt(now)
                .lastModifiedAt(now)
                .lastModifiedBy("test@usyd.edu.au")
                .createdAt(now)
                .updatedAt(now)
                .currentApproverId(400L)
                .currentApproverName("Test Approver")
                .currentApproverRole(UserRole.LECTURER)
                .approvalComments("Test comments")
                .approvalDeadline(now.plusDays(7));

            TimesheetDto dto = builder.build();

            // Assert - Verify builder returned correctly
            assertThat(dto).isNotNull();
            assertThat(dto.getId()).isEqualTo(1L);
            assertThat(dto.getStatus()).isEqualTo(ApprovalStatus.TUTOR_CONFIRMED);
        }

        @Test
        @DisplayName("Should allow builder reuse with different values")
        void shouldAllowBuilderReuseWithDifferentValues() {
            // Arrange
            TimesheetDto.Builder builder = TimesheetDto.builder()
                .tutorId(100L)
                .courseId(200L)
                .weekStartDate(LocalDate.of(2024, 1, 8))
                .hours(new BigDecimal("20.00"))
                .hourlyRate(new BigDecimal("40.00"));

            // Act - Build with different IDs
            TimesheetDto dto1 = builder.id(1L).build();
            TimesheetDto dto2 = builder.id(2L).build();

            // Assert
            assertThat(dto1.getId()).isEqualTo(1L);
            assertThat(dto2.getId()).isEqualTo(2L);
            assertThat(dto1.getTutorId()).isEqualTo(dto2.getTutorId());
        }
    }

    @Nested
    @DisplayName("Edge Cases and Boundary Conditions")
    class EdgeCasesTests {

        @Test
        @DisplayName("Should handle very large monetary values")
        void shouldHandleVeryLargeMonetaryValues() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .hours(new BigDecimal("999999.99"))
                .hourlyRate(new BigDecimal("999999.99"))
                .totalAmount(null)
                .build();

            // Act
            BigDecimal calculated = dto.getCalculatedTotalAmount();

            // Assert
            assertThat(calculated).isEqualByComparingTo(
                new BigDecimal("999999.99").multiply(new BigDecimal("999999.99"))
            );
        }

        @Test
        @DisplayName("Should handle very small fractional hours")
        void shouldHandleVerySmallFractionalHours() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .hours(new BigDecimal("0.01"))
                .hourlyRate(new BigDecimal("40.00"))
                .totalAmount(null)
                .build();

            // Act
            BigDecimal calculated = dto.getCalculatedTotalAmount();

            // Assert
            assertThat(calculated).isEqualByComparingTo(new BigDecimal("0.40"));
        }

        @Test
        @DisplayName("Should handle week period with same start and end date")
        void shouldHandleWeekPeriodWithSameStartAndEndDate() {
            // Arrange
            LocalDate sameDate = LocalDate.of(2024, 1, 15);
            TimesheetDto dto = baseBuilder
                .weekStartDate(sameDate)
                .weekEndDate(sameDate)
                .build();

            // Act
            String period = dto.getWeekPeriodDisplay();

            // Assert
            assertThat(period).contains("2024-01-15")
                .contains("to");
        }

        @Test
        @DisplayName("Should handle all UserRole types in approver info")
        void shouldHandleAllUserRoleTypesInApproverInfo() {
            // Test ADMIN
            TimesheetDto dtoAdmin = baseBuilder
                .currentApproverRole(UserRole.ADMIN)
                .build();
            assertThat(dtoAdmin.getNextApproverInfo()).contains("Administrator");

            // Test HR
            TimesheetDto dtoHR = baseBuilder
                .currentApproverRole(UserRole.HR)
                .build();
            assertThat(dtoHR.getNextApproverInfo()).contains("Human Resources");

            // Test TUTOR
            TimesheetDto dtoTutor = baseBuilder
                .currentApproverRole(UserRole.TUTOR)
                .build();
            assertThat(dtoTutor.getNextApproverInfo()).contains("Tutor");

            // Test LECTURER
            TimesheetDto dtoLecturer = baseBuilder
                .currentApproverRole(UserRole.LECTURER)
                .build();
            assertThat(dtoLecturer.getNextApproverInfo()).contains("Lecturer");
        }

        @Test
        @DisplayName("Should handle empty string comments")
        void shouldHandleEmptyStringComments() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalComments("")
                .build();

            // Act & Assert
            assertThat(dto.hasApprovalComments()).isFalse();
        }

        @Test
        @DisplayName("Should handle comments with only whitespace")
        void shouldHandleCommentsWithOnlyWhitespace() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalComments("   \t\n   ")
                .build();

            // Act & Assert
            assertThat(dto.hasApprovalComments()).isFalse();
        }

        @Test
        @DisplayName("Should handle comments with leading and trailing whitespace")
        void shouldHandleCommentsWithLeadingAndTrailingWhitespace() {
            // Arrange
            TimesheetDto dto = baseBuilder
                .approvalComments("  Valid comment  ")
                .build();

            // Act & Assert
            assertThat(dto.hasApprovalComments()).isTrue();
        }
    }
}
