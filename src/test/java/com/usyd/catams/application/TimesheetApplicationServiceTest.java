package com.usyd.catams.application;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.domain.service.TimesheetValidationService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.AuthorizationException;
import com.usyd.catams.exception.BusinessRuleException;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.policy.TimesheetPermissionPolicy;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.Schedule1CalculationResult;
import com.usyd.catams.service.Schedule1PolicyProvider;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit Tests for TimesheetApplicationService
 *
 * This test class provides comprehensive coverage of the TimesheetApplicationService
 * implementation, testing CRUD operations, permission enforcement, and validation.
 *
 * Coverage includes:
 * - Timesheet creation with authorization and validation
 * - Timesheet retrieval by ID and filters
 * - Timesheet update with status-aware permissions
 * - Timesheet deletion with authorization
 * - Permission checking methods
 * - Error scenarios (unauthorized access, validation failures)
 *
 * @author Test Infrastructure Team
 * @since 2.0
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TimesheetApplicationService Unit Tests")
class TimesheetApplicationServiceTest {

    @Mock
    private TimesheetRepository timesheetRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private TimesheetDomainService timesheetDomainService;

    @Mock
    private TimesheetValidationService timesheetValidationService;

    @Mock
    private TimesheetMapper timesheetMapper;

    @Mock
    private TimesheetPermissionPolicy permissionPolicy;

    @Mock
    private TutorAssignmentRepository tutorAssignmentRepository;

    @Mock
    private Schedule1PolicyProvider policyProvider;

    @InjectMocks
    private TimesheetApplicationService service;

    private User testTutor;
    private User testLecturer;
    private User testAdmin;
    private Course testCourse;
    private Timesheet testTimesheet;
    private Schedule1CalculationResult testCalculation;

    @BeforeEach
    void setUp() {
        testTutor = TestDataBuilder.aTutor().withId(1L).build();
        testLecturer = TestDataBuilder.aLecturer().withId(2L).build();
        testAdmin = TestDataBuilder.anAdmin().withId(3L).build();

        testCourse = TestDataBuilder.aCourse()
            .withId(100L)
            .withLecturerId(testLecturer.getId())
            .build();

        testTimesheet = TestDataBuilder.aDraftTimesheet()
            .withId(10L)
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .build();

        testCalculation = createDefaultCalculation();
    }

    private Schedule1CalculationResult createDefaultCalculation() {
        return new Schedule1CalculationResult(
            LocalDate.now(),                    // sessionDate
            "Standard Rate",                    // rateCode
            TutorQualification.STANDARD,        // qualification
            false,                              // isRepeat
            BigDecimal.valueOf(10.0),           // deliveryHours
            BigDecimal.valueOf(0.0),            // associatedHours
            BigDecimal.valueOf(10.0),           // payableHours
            BigDecimal.valueOf(45.0),           // hourlyRate
            BigDecimal.valueOf(450.0),          // amount
            "hours * rate",                     // formula
            "Clause 1.1"                        // clauseReference
        );
    }

    @Nested
    @DisplayName("createTimesheet() - Timesheet Creation")
    class CreateTimesheetTests {

        @Test
        @DisplayName("Should create timesheet successfully for admin")
        void shouldCreateTimesheetSuccessfullyForAdmin() {
            // Arrange
            LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canCreateTimesheetFor(testAdmin, testTutor, testCourse)).thenReturn(true);
            // First call (uniqueness check) returns false, second call (postcondition check) returns true
            when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(1L, 100L, weekStart))
                .thenReturn(false, true);
            doNothing().when(timesheetValidationService).validateInputs(any(), any());
            when(timesheetDomainService.validateTimesheetCreation(any(), any(), any(), any(), any(), any(), any())).thenReturn("Test description");
            when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Timesheet result = service.createTimesheet(
                1L, 100L, weekStart, testCalculation,
                TimesheetTaskType.TUTORIAL, "Test description", 3L);

            // Assert
            assertThat(result).isNotNull();
            verify(timesheetRepository).save(any(Timesheet.class));
        }

        @Test
        @DisplayName("Should create timesheet successfully for lecturer with course authority")
        void shouldCreateTimesheetSuccessfullyForLecturer() {
            // Arrange
            LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canCreateTimesheetFor(testLecturer, testTutor, testCourse)).thenReturn(true);
            when(tutorAssignmentRepository.existsByTutorIdAndCourseId(1L, 100L)).thenReturn(true);
            // First call (uniqueness check) returns false, second call (postcondition check) returns true
            when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(1L, 100L, weekStart))
                .thenReturn(false, true);
            doNothing().when(timesheetValidationService).validateInputs(any(), any());
            when(timesheetDomainService.validateTimesheetCreation(any(), any(), any(), any(), any(), any(), any())).thenReturn("Test description");
            when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Timesheet result = service.createTimesheet(
                1L, 100L, weekStart, testCalculation,
                TimesheetTaskType.TUTORIAL, "Test description", 2L);

            // Assert
            assertThat(result).isNotNull();
            verify(timesheetRepository).save(any(Timesheet.class));
        }

        @Test
        @DisplayName("Should throw AuthorizationException when user lacks permission")
        void shouldThrowAuthorizationExceptionWhenUserLacksPermission() {
            // Arrange
            LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canCreateTimesheetFor(testLecturer, testTutor, testCourse)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() ->
                service.createTimesheet(1L, 100L, weekStart, testCalculation,
                    TimesheetTaskType.TUTORIAL, "Test description", 2L))
                .isInstanceOf(AuthorizationException.class);

            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when tutor has wrong role")
        void shouldThrowIllegalArgumentExceptionWhenTutorHasWrongRole() {
            // Arrange
            User wrongRoleUser = TestDataBuilder.aLecturer().withId(1L).build();
            LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(userRepository.findById(1L)).thenReturn(Optional.of(wrongRoleUser));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canCreateTimesheetFor(testLecturer, wrongRoleUser, testCourse)).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() ->
                service.createTimesheet(1L, 100L, weekStart, testCalculation,
                    TimesheetTaskType.TUTORIAL, "Test description", 2L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("TUTOR role");

            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when week start is not Monday")
        void shouldThrowIllegalArgumentExceptionWhenWeekStartNotMonday() {
            // Arrange
            LocalDate notMonday = LocalDate.now().with(java.time.DayOfWeek.TUESDAY);
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canCreateTimesheetFor(testLecturer, testTutor, testCourse)).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() ->
                service.createTimesheet(1L, 100L, notMonday, testCalculation,
                    TimesheetTaskType.TUTORIAL, "Test description", 2L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Monday");

            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when creator not found")
        void shouldThrowIllegalArgumentExceptionWhenCreatorNotFound() {
            // Arrange
            LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() ->
                service.createTimesheet(1L, 100L, weekStart, testCalculation,
                    TimesheetTaskType.TUTORIAL, "Test description", 999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Creator user not found");
        }
    }

    @Nested
    @DisplayName("getTimesheetById() - Timesheet Retrieval")
    class GetTimesheetByIdTests {

        @Test
        @DisplayName("Should retrieve timesheet by ID for authorized user")
        void shouldRetrieveTimesheetByIdForAuthorizedUser() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(timesheetRepository.findByIdWithApprovals(10L)).thenReturn(Optional.of(testTimesheet));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canViewTimesheet(testTutor, testTimesheet, testCourse)).thenReturn(true);

            // Act
            Optional<Timesheet> result = service.getTimesheetById(10L, 1L);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(10L);
            verify(timesheetRepository).findByIdWithApprovals(10L);
        }

        @Test
        @DisplayName("Should return empty when timesheet not found")
        void shouldReturnEmptyWhenTimesheetNotFound() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(timesheetRepository.findByIdWithApprovals(999L)).thenReturn(Optional.empty());

            // Act
            Optional<Timesheet> result = service.getTimesheetById(999L, 1L);

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should throw AuthorizationException when user cannot view timesheet")
        void shouldThrowAuthorizationExceptionWhenUserCannotViewTimesheet() {
            // Arrange
            User otherTutor = TestDataBuilder.aTutor().withId(99L).build();
            when(userRepository.findById(99L)).thenReturn(Optional.of(otherTutor));
            when(timesheetRepository.findByIdWithApprovals(10L)).thenReturn(Optional.of(testTimesheet));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canViewTimesheet(otherTutor, testTimesheet, testCourse)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> service.getTimesheetById(10L, 99L))
                .isInstanceOf(AuthorizationException.class);
        }
    }

    @Nested
    @DisplayName("getTimesheets() - Timesheet Listing")
    class GetTimesheetsTests {

        @Test
        @DisplayName("Should get timesheets for admin with all filters")
        void shouldGetTimesheetsForAdminWithAllFilters() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<Timesheet> expectedPage = new PageImpl<>(List.of(testTimesheet));
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));
            when(permissionPolicy.canViewTimesheetsByFilters(testAdmin, 1L, 100L, ApprovalStatus.DRAFT)).thenReturn(true);
            when(timesheetRepository.findWithFilters(1L, 100L, ApprovalStatus.DRAFT, pageable)).thenReturn(expectedPage);

            // Act
            Page<Timesheet> result = service.getTimesheets(1L, 100L, ApprovalStatus.DRAFT, 3L, pageable);

            // Assert
            assertThat(result).hasSize(1);
            verify(timesheetRepository).findWithFilters(1L, 100L, ApprovalStatus.DRAFT, pageable);
        }

        @Test
        @DisplayName("Should get timesheets for tutor (own timesheets only)")
        void shouldGetTimesheetsForTutorOwnOnly() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<Timesheet> expectedPage = new PageImpl<>(List.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(permissionPolicy.canViewTimesheetsByFilters(testTutor, null, null, null)).thenReturn(true);
            when(timesheetRepository.findWithFilters(1L, null, null, pageable)).thenReturn(expectedPage);

            // Act
            Page<Timesheet> result = service.getTimesheets(null, null, null, 1L, pageable);

            // Assert
            assertThat(result).hasSize(1);
            // Tutor should only see their own timesheets (ID forced to 1L)
            verify(timesheetRepository).findWithFilters(1L, null, null, pageable);
        }

        @Test
        @DisplayName("Should throw AuthorizationException when user lacks permission")
        void shouldThrowAuthorizationExceptionWhenUserLacksPermission() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(permissionPolicy.canViewTimesheetsByFilters(testTutor, 999L, null, null)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> service.getTimesheets(999L, null, null, 1L, pageable))
                .isInstanceOf(AuthorizationException.class);
        }
    }

    @Nested
    @DisplayName("updateTimesheet() - Timesheet Update")
    class UpdateTimesheetTests {

        @Test
        @DisplayName("Should update timesheet successfully for owner tutor in REJECTED status")
        void shouldUpdateTimesheetSuccessfullyForOwnerTutor() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.REJECTED);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(timesheetDomainService.canRoleEditTimesheetWithStatus(UserRole.TUTOR, ApprovalStatus.REJECTED)).thenReturn(true);
            when(permissionPolicy.canModifyTimesheet(testTutor, testTimesheet, testCourse)).thenReturn(true);
            doNothing().when(timesheetDomainService).validateUpdateData(any(), any(), any());
            when(timesheetDomainService.getStatusAfterTutorUpdate(ApprovalStatus.REJECTED)).thenReturn(ApprovalStatus.DRAFT);
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(testTimesheet);

            // Act
            Timesheet result = service.updateTimesheet(10L, testCalculation, TimesheetTaskType.TUTORIAL, "Updated description", 1L);

            // Assert
            assertThat(result).isNotNull();
            verify(timesheetRepository).save(any(Timesheet.class));
        }

        @Test
        @DisplayName("Should throw AuthorizationException when tutor tries to update non-REJECTED status")
        void shouldThrowAuthorizationExceptionWhenTutorUpdatesNonRejectedStatus() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(timesheetDomainService.canRoleEditTimesheetWithStatus(UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_CONFIRMATION)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() ->
                service.updateTimesheet(10L, testCalculation, TimesheetTaskType.TUTORIAL, "Updated", 1L))
                .isInstanceOf(AuthorizationException.class)
                .hasMessageContaining("REJECTED");

            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when timesheet not found")
        void shouldThrowResourceNotFoundExceptionWhenTimesheetNotFound() {
            // Arrange
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() ->
                service.updateTimesheet(999L, testCalculation, TimesheetTaskType.TUTORIAL, "Updated", 1L))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Should throw AuthorizationException when user lacks modify permission")
        void shouldThrowAuthorizationExceptionWhenUserLacksModifyPermission() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.DRAFT);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(timesheetDomainService.canRoleEditTimesheetWithStatus(UserRole.TUTOR, ApprovalStatus.DRAFT)).thenReturn(true);
            when(permissionPolicy.canModifyTimesheet(testTutor, testTimesheet, testCourse)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() ->
                service.updateTimesheet(10L, testCalculation, TimesheetTaskType.TUTORIAL, "Updated", 1L))
                .isInstanceOf(AuthorizationException.class);

            verify(timesheetRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("deleteTimesheet() - Timesheet Deletion")
    class DeleteTimesheetTests {

        @Test
        @DisplayName("Should delete timesheet successfully for authorized user")
        void shouldDeleteTimesheetSuccessfullyForAuthorizedUser() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.DRAFT);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canModifyTimesheet(testAdmin, testTimesheet, testCourse)).thenReturn(true);
            when(timesheetDomainService.canRoleDeleteTimesheetWithStatus(UserRole.ADMIN, ApprovalStatus.DRAFT)).thenReturn(true);

            // Act
            service.deleteTimesheet(10L, 3L);

            // Assert
            verify(timesheetRepository).delete(testTimesheet);
        }

        @Test
        @DisplayName("Should throw AuthorizationException when tutor tries to delete non-REJECTED status")
        void shouldThrowAuthorizationExceptionWhenTutorDeletesNonRejectedStatus() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.DRAFT);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canModifyTimesheet(testTutor, testTimesheet, testCourse)).thenReturn(true);
            when(timesheetDomainService.canRoleDeleteTimesheetWithStatus(UserRole.TUTOR, ApprovalStatus.DRAFT)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> service.deleteTimesheet(10L, 1L))
                .isInstanceOf(AuthorizationException.class)
                .hasMessageContaining("REJECTED");

            verify(timesheetRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when timesheet not found")
        void shouldThrowResourceNotFoundExceptionWhenTimesheetNotFound() {
            // Arrange
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.deleteTimesheet(999L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("canUserModifyTimesheet() - Permission Checking")
    class CanUserModifyTimesheetTests {

        @Test
        @DisplayName("Should return true when user can modify timesheet")
        void shouldReturnTrueWhenUserCanModifyTimesheet() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canModifyTimesheet(testTutor, testTimesheet, testCourse)).thenReturn(true);

            // Act
            boolean result = service.canUserModifyTimesheet(testTimesheet, 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when user cannot modify timesheet")
        void shouldReturnFalseWhenUserCannotModifyTimesheet() {
            // Arrange
            User otherTutor = TestDataBuilder.aTutor().withId(99L).build();
            when(userRepository.findById(99L)).thenReturn(Optional.of(otherTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canModifyTimesheet(otherTutor, testTimesheet, testCourse)).thenReturn(false);

            // Act
            boolean result = service.canUserModifyTimesheet(testTimesheet, 99L);

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("getTotalHoursByTutorAndCourse() - Total Hours Query")
    class GetTotalHoursTests {

        @Test
        @DisplayName("Should get total hours for authorized user")
        void shouldGetTotalHoursForAuthorizedUser() {
            // Arrange
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));
            when(permissionPolicy.canViewTotalHours(testAdmin, 1L, 100L)).thenReturn(true);
            when(timesheetRepository.getTotalHoursByTutorAndCourse(1L, 100L)).thenReturn(BigDecimal.valueOf(50.0));

            // Act
            BigDecimal result = service.getTotalHoursByTutorAndCourse(1L, 100L, 3L);

            // Assert
            assertThat(result).isEqualByComparingTo(BigDecimal.valueOf(50.0));
        }

        @Test
        @DisplayName("Should throw AuthorizationException when user lacks permission")
        void shouldThrowAuthorizationExceptionWhenUserLacksPermission() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(permissionPolicy.canViewTotalHours(testTutor, 999L, 100L)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> service.getTotalHoursByTutorAndCourse(999L, 100L, 1L))
                .isInstanceOf(AuthorizationException.class);
        }
    }

    @Nested
    @DisplayName("timesheetExists() - Timesheet Existence Check")
    class TimesheetExistsTests {

        @Test
        @DisplayName("Should return true when timesheet exists")
        void shouldReturnTrueWhenTimesheetExists() {
            // Arrange
            LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
            when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(1L, 100L, weekStart)).thenReturn(true);

            // Act
            boolean result = service.timesheetExists(1L, 100L, weekStart);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when timesheet does not exist")
        void shouldReturnFalseWhenTimesheetDoesNotExist() {
            // Arrange
            LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
            when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(1L, 100L, weekStart)).thenReturn(false);

            // Act
            boolean result = service.timesheetExists(1L, 100L, weekStart);

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("getPendingTimesheetsForApprover() - Pending Approvals")
    class GetPendingTimesheetsForApproverTests {

        @Test
        @DisplayName("Should get pending timesheets for admin approver")
        void shouldGetPendingTimesheetsForAdminApprover() {
            // Arrange
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));
            when(timesheetRepository.findPendingTimesheetsForApprover(3L, true)).thenReturn(List.of(testTimesheet));

            // Act
            List<Timesheet> result = service.getPendingTimesheetsForApprover(3L);

            // Assert
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when approver not found")
        void shouldThrowIllegalArgumentExceptionWhenApproverNotFound() {
            // Arrange
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.getPendingTimesheetsForApprover(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Approver user not found");
        }
    }

    @Nested
    @DisplayName("calculateTotalPay() - Pay Calculation")
    class CalculateTotalPayTests {

        @Test
        @DisplayName("Should calculate total pay using domain service")
        void shouldCalculateTotalPayUsingDomainService() {
            // Arrange
            when(timesheetDomainService.calculateTotalPay(any(BigDecimal.class), any(BigDecimal.class)))
                .thenReturn(BigDecimal.valueOf(450.0));

            // Act
            BigDecimal result = service.calculateTotalPay(testTimesheet);

            // Assert
            assertThat(result).isEqualByComparingTo(BigDecimal.valueOf(450.0));
            verify(timesheetDomainService).calculateTotalPay(any(BigDecimal.class), any(BigDecimal.class));
        }
    }

    @Nested
    @DisplayName("canUserEditTimesheet() - Edit Permission Check")
    class CanUserEditTimesheetTests {

        @Test
        @DisplayName("Should return true when user can edit timesheet")
        void shouldReturnTrueWhenUserCanEditTimesheet() {
            // Arrange
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canEditTimesheet(testTutor, testTimesheet, testCourse)).thenReturn(true);

            // Act
            boolean result = service.canUserEditTimesheet(10L, 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when user cannot edit timesheet")
        void shouldReturnFalseWhenUserCannotEditTimesheet() {
            // Arrange
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(99L)).thenReturn(Optional.of(TestDataBuilder.aTutor().withId(99L).build()));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(permissionPolicy.canEditTimesheet(any(), any(), any())).thenReturn(false);

            // Act
            boolean result = service.canUserEditTimesheet(10L, 99L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when timesheet not found")
        void shouldThrowResourceNotFoundExceptionWhenTimesheetNotFound() {
            // Arrange
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.canUserEditTimesheet(999L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
