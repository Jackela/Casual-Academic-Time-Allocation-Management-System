package com.usyd.catams.application;

import com.usyd.catams.common.application.ApprovalStateMachine;
import com.usyd.catams.common.infrastructure.event.DomainEventPublisher;
import com.usyd.catams.domain.service.ApprovalDomainService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.AuthorizationException;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

/**
 * Unit Tests for ApprovalApplicationService
 *
 * This test class provides comprehensive coverage of the ApprovalApplicationService
 * implementation, testing approval workflows, permission checks, and error handling.
 *
 * Coverage includes:
 * - Submit for approval workflow
 * - Tutor confirmation workflow
 * - Lecturer confirmation workflow
 * - HR confirmation workflow
 * - Rejection workflow
 * - Request modification workflow
 * - Approval history retrieval
 * - Pending approvals retrieval
 * - Permission checking
 * - Error scenarios (invalid state transitions, unauthorized access)
 *
 * @author Test Infrastructure Team
 * @since 2.0
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ApprovalApplicationService Unit Tests")
class ApprovalApplicationServiceTest {

    @Mock
    private TimesheetRepository timesheetRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private TutorAssignmentRepository tutorAssignmentRepository;

    @Mock
    private ApprovalDomainService approvalDomainService;

    @Mock
    private DomainEventPublisher eventPublisher;

    @InjectMocks
    private ApprovalApplicationService service;

    private User testTutor;
    private User testLecturer;
    private User testAdmin;
    private User testHR;
    private Course testCourse;
    private Timesheet testTimesheet;

    @BeforeEach
    void setUp() {
        ApprovalStateMachine stateMachine = new ApprovalStateMachine();
        lenient().when(approvalDomainService.resolveNextStatus(any(ApprovalStatus.class), any(ApprovalAction.class)))
            .thenAnswer(invocation -> stateMachine.getNextStatus(
                invocation.getArgument(0),
                invocation.getArgument(1)
            ));
        lenient().when(tutorAssignmentRepository.existsByTutorIdAndCourseId(anyLong(), anyLong())).thenReturn(true);

        testTutor = TestDataBuilder.aTutor().withId(1L).build();
        testLecturer = TestDataBuilder.aLecturer().withId(2L).build();
        testAdmin = TestDataBuilder.anAdmin().withId(3L).build();
        testHR = TestDataBuilder.aHR().withId(4L).build();

        testCourse = TestDataBuilder.aCourse()
            .withId(100L)
            .withLecturerId(testLecturer.getId())
            .build();

        testTimesheet = TestDataBuilder.aDraftTimesheet()
            .withId(10L)
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .build();
    }

    @Nested
    @DisplayName("performApprovalAction() - Submit for Approval")
    class SubmitForApprovalTests {

        @Test
        @DisplayName("Should submit timesheet for approval successfully")
        void shouldSubmitTimesheetForApprovalSuccessfully() {
            // Arrange
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doNothing().when(approvalDomainService).validateApprovalActionBusinessRules(
                any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(testTimesheet);

            // Act
            service.performApprovalAction(10L, ApprovalAction.SUBMIT_FOR_APPROVAL, "Submit comment", 1L);

            // Assert
            verify(timesheetRepository).findById(10L);
            verify(userRepository).findById(1L);
            verify(courseRepository).findById(100L);
            verify(approvalDomainService).validateApprovalActionBusinessRules(
                eq(testTimesheet), eq(ApprovalAction.SUBMIT_FOR_APPROVAL), eq(testTutor), eq(testCourse));
            verify(timesheetRepository).save(testTimesheet);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when timesheet not found")
        void shouldThrowResourceNotFoundExceptionWhenTimesheetNotFound() {
            // Arrange
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() ->
                service.performApprovalAction(999L, ApprovalAction.SUBMIT_FOR_APPROVAL, "comment", 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Timesheet");

            verify(timesheetRepository).findById(999L);
            verify(userRepository, never()).findById(anyLong());
            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when requester not found")
        void shouldThrowResourceNotFoundExceptionWhenRequesterNotFound() {
            // Arrange
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() ->
                service.performApprovalAction(10L, ApprovalAction.SUBMIT_FOR_APPROVAL, "comment", 999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User");

            verify(timesheetRepository).findById(10L);
            verify(userRepository).findById(999L);
            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when course not found")
        void shouldThrowResourceNotFoundExceptionWhenCourseNotFound() {
            // Arrange
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() ->
                service.performApprovalAction(10L, ApprovalAction.SUBMIT_FOR_APPROVAL, "comment", 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Course");

            verify(timesheetRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("performApprovalAction() - Tutor Confirm")
    class TutorConfirmTests {

        @Test
        @DisplayName("Should confirm timesheet by tutor successfully")
        void shouldConfirmTimesheetByTutorSuccessfully() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doNothing().when(approvalDomainService).validateApprovalActionBusinessRules(
                any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(testTimesheet);

            // Act
            service.performApprovalAction(10L, ApprovalAction.TUTOR_CONFIRM, "Tutor confirms", 1L);

            // Assert
            verify(approvalDomainService).validateApprovalActionBusinessRules(
                eq(testTimesheet), eq(ApprovalAction.TUTOR_CONFIRM), eq(testTutor), eq(testCourse));
            verify(timesheetRepository).save(testTimesheet);
        }
    }

    @Nested
    @DisplayName("performApprovalAction() - Lecturer Confirm")
    class LecturerConfirmTests {

        @Test
        @DisplayName("Should confirm timesheet by lecturer successfully")
        void shouldConfirmTimesheetByLecturerSuccessfully() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doNothing().when(approvalDomainService).validateApprovalActionBusinessRules(
                any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(testTimesheet);

            // Act
            service.performApprovalAction(10L, ApprovalAction.LECTURER_CONFIRM, "Lecturer confirms", 2L);

            // Assert
            verify(approvalDomainService).validateApprovalActionBusinessRules(
                eq(testTimesheet), eq(ApprovalAction.LECTURER_CONFIRM), eq(testLecturer), eq(testCourse));
            verify(timesheetRepository).save(testTimesheet);
        }
    }

    @Nested
    @DisplayName("performApprovalAction() - HR Confirm")
    class HRConfirmTests {

        @Test
        @DisplayName("Should confirm timesheet by HR successfully")
        void shouldConfirmTimesheetByHRSuccessfully() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.LECTURER_CONFIRMED);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(4L)).thenReturn(Optional.of(testHR));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doNothing().when(approvalDomainService).validateApprovalActionBusinessRules(
                any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(testTimesheet);

            // Act
            service.performApprovalAction(10L, ApprovalAction.HR_CONFIRM, "HR confirms", 4L);

            // Assert
            verify(approvalDomainService).validateApprovalActionBusinessRules(
                eq(testTimesheet), eq(ApprovalAction.HR_CONFIRM), eq(testHR), eq(testCourse));
            verify(timesheetRepository).save(testTimesheet);
        }
    }

    @Nested
    @DisplayName("performApprovalAction() - Reject")
    class RejectTests {

        @Test
        @DisplayName("Should reject timesheet successfully")
        void shouldRejectTimesheetSuccessfully() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doNothing().when(approvalDomainService).validateApprovalActionBusinessRules(
                any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(testTimesheet);

            // Act
            service.performApprovalAction(10L, ApprovalAction.REJECT, "Reject reason", 2L);

            // Assert
            verify(approvalDomainService).validateApprovalActionBusinessRules(
                eq(testTimesheet), eq(ApprovalAction.REJECT), eq(testLecturer), eq(testCourse));
            verify(timesheetRepository).save(testTimesheet);
        }
    }

    @Nested
    @DisplayName("performApprovalAction() - Request Modification")
    class RequestModificationTests {

        @Test
        @DisplayName("Should request modification successfully")
        void shouldRequestModificationSuccessfully() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doNothing().when(approvalDomainService).validateApprovalActionBusinessRules(
                any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(testTimesheet);

            // Act
            service.performApprovalAction(10L, ApprovalAction.REQUEST_MODIFICATION, "Please fix hours", 2L);

            // Assert
            verify(approvalDomainService).validateApprovalActionBusinessRules(
                eq(testTimesheet), eq(ApprovalAction.REQUEST_MODIFICATION), eq(testLecturer), eq(testCourse));
            verify(timesheetRepository).save(testTimesheet);
        }
    }

    @Nested
    @DisplayName("performApprovalAction() - Error Scenarios")
    class ErrorScenarioTests {

        @Test
        @DisplayName("Should throw SecurityException when user lacks permission")
        void shouldThrowSecurityExceptionWhenUserLacksPermission() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doThrow(new SecurityException("User does not have permission"))
                .when(approvalDomainService).validateApprovalActionBusinessRules(
                    any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));

            // Act & Assert
            assertThatThrownBy(() ->
                service.performApprovalAction(10L, ApprovalAction.LECTURER_CONFIRM, "comment", 1L))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("permission");

            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException for invalid state transition")
        void shouldThrowIllegalArgumentExceptionForInvalidStateTransition() {
            // Arrange - trying to confirm when status is DRAFT (invalid transition)
            testTimesheet.setStatus(ApprovalStatus.DRAFT);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doThrow(new IllegalArgumentException("Cannot perform LECTURER_CONFIRM on timesheet with status DRAFT"))
                .when(approvalDomainService).validateApprovalActionBusinessRules(
                    any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));

            // Act & Assert
            assertThatThrownBy(() ->
                service.performApprovalAction(10L, ApprovalAction.LECTURER_CONFIRM, "comment", 2L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot perform");

            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw SecurityException for unauthorized role action")
        void shouldThrowSecurityExceptionForUnauthorizedRoleAction() {
            // Arrange - Tutor trying to perform HR action
            testTimesheet.setStatus(ApprovalStatus.LECTURER_CONFIRMED);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doThrow(new SecurityException("User role TUTOR cannot perform action HR_CONFIRM"))
                .when(approvalDomainService).validateApprovalActionBusinessRules(
                    any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));

            // Act & Assert
            assertThatThrownBy(() ->
                service.performApprovalAction(10L, ApprovalAction.HR_CONFIRM, "comment", 1L))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("TUTOR cannot perform");

            verify(timesheetRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("getApprovalHistory() - Approval History Retrieval")
    class GetApprovalHistoryTests {

        @Test
        @DisplayName("Should get approval history successfully")
        void shouldGetApprovalHistorySuccessfully() {
            // Arrange
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(approvalDomainService.canUserViewTimesheet(testTimesheet, testTutor, testCourse)).thenReturn(true);

            // Act
            List<com.usyd.catams.entity.Approval> result = service.getApprovalHistory(10L, 1L);

            // Assert
            assertThat(result).isNotNull();
            verify(timesheetRepository).findById(10L);
            verify(userRepository).findById(1L);
            verify(courseRepository).findById(100L);
            verify(approvalDomainService).canUserViewTimesheet(testTimesheet, testTutor, testCourse);
        }

        @Test
        @DisplayName("Should throw AuthorizationException when user cannot view timesheet")
        void shouldThrowAuthorizationExceptionWhenUserCannotViewTimesheet() {
            // Arrange
            User otherUser = TestDataBuilder.aTutor().withId(99L).build();
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));
            when(userRepository.findById(99L)).thenReturn(Optional.of(otherUser));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(approvalDomainService.canUserViewTimesheet(testTimesheet, otherUser, testCourse)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> service.getApprovalHistory(10L, 99L))
                .isInstanceOf(AuthorizationException.class)
                .hasMessageContaining("does not have permission to view approval history");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when timesheet not found")
        void shouldThrowResourceNotFoundExceptionWhenTimesheetNotFound() {
            // Arrange
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.getApprovalHistory(999L, 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Timesheet");
        }
    }

    @Nested
    @DisplayName("getPendingApprovalsForUser() - Pending Approvals Retrieval")
    class GetPendingApprovalsForUserTests {

        @Test
        @DisplayName("Should get pending approvals for lecturer")
        void shouldGetPendingApprovalsForLecturer() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(approvalDomainService.getRelevantStatusesForRole(UserRole.LECTURER))
                .thenReturn(List.of(ApprovalStatus.TUTOR_CONFIRMED));
            when(timesheetRepository.findByStatusIn(any())).thenReturn(List.of(testTimesheet));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(approvalDomainService.canUserActOnTimesheet(testTimesheet, testLecturer, testCourse))
                .thenReturn(true);

            // Act
            List<Timesheet> result = service.getPendingApprovalsForUser(2L);

            // Assert
            assertThat(result).isNotEmpty();
            assertThat(result).contains(testTimesheet);
            verify(userRepository).findById(2L);
            verify(approvalDomainService).getRelevantStatusesForRole(UserRole.LECTURER);
        }

        @Test
        @DisplayName("Should return empty list when no pending approvals")
        void shouldReturnEmptyListWhenNoPendingApprovals() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(approvalDomainService.getRelevantStatusesForRole(UserRole.LECTURER))
                .thenReturn(List.of(ApprovalStatus.TUTOR_CONFIRMED));
            when(timesheetRepository.findByStatusIn(any())).thenReturn(List.of());

            // Act
            List<Timesheet> result = service.getPendingApprovalsForUser(2L);

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when user not found")
        void shouldThrowResourceNotFoundExceptionWhenUserNotFound() {
            // Arrange
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.getPendingApprovalsForUser(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User");
        }
    }

    @Nested
    @DisplayName("canUserPerformAction() - Permission Checking")
    class CanUserPerformActionTests {

        @Test
        @DisplayName("Should return true when user can perform action")
        void shouldReturnTrueWhenUserCanPerformAction() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(approvalDomainService.canRolePerformAction(UserRole.LECTURER, ApprovalAction.SUBMIT_FOR_APPROVAL))
                .thenReturn(true);
            when(approvalDomainService.hasPermissionForTimesheet(testTimesheet, testLecturer, testCourse, ApprovalAction.SUBMIT_FOR_APPROVAL))
                .thenReturn(true);
            when(approvalDomainService.canTransition(testTimesheet.getStatus(), ApprovalAction.SUBMIT_FOR_APPROVAL))
                .thenReturn(true);

            // Act
            boolean result = service.canUserPerformAction(testTimesheet, ApprovalAction.SUBMIT_FOR_APPROVAL, 2L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when validation fails")
        void shouldReturnFalseWhenValidationFails() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            when(approvalDomainService.canRolePerformAction(UserRole.TUTOR, ApprovalAction.HR_CONFIRM))
                .thenReturn(false);

            // Act
            boolean result = service.canUserPerformAction(testTimesheet, ApprovalAction.HR_CONFIRM, 1L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when user not found")
        void shouldReturnFalseWhenUserNotFound() {
            // Arrange
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act
            boolean result = service.canUserPerformAction(testTimesheet, ApprovalAction.SUBMIT_FOR_APPROVAL, 999L);

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("getCurrentApprovalStatus() - Status Retrieval")
    class GetCurrentApprovalStatusTests {

        @Test
        @DisplayName("Should get current approval status successfully")
        void shouldGetCurrentApprovalStatusSuccessfully() {
            // Arrange
            testTimesheet.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
            when(timesheetRepository.findById(10L)).thenReturn(Optional.of(testTimesheet));

            // Act
            ApprovalStatus status = service.getCurrentApprovalStatus(10L);

            // Assert
            assertThat(status).isEqualTo(ApprovalStatus.TUTOR_CONFIRMED);
            verify(timesheetRepository).findById(10L);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when timesheet not found")
        void shouldThrowResourceNotFoundExceptionWhenTimesheetNotFound() {
            // Arrange
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.getCurrentApprovalStatus(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Timesheet");
        }
    }

    @Nested
    @DisplayName("validateApprovalAction() - Validation")
    class ValidateApprovalActionTests {

        @Test
        @DisplayName("Should validate approval action successfully")
        void shouldValidateApprovalActionSuccessfully() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doNothing().when(approvalDomainService).validateApprovalActionBusinessRules(
                any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));

            // Act & Assert - no exception thrown
            service.validateApprovalAction(testTimesheet, ApprovalAction.LECTURER_CONFIRM, 2L);

            verify(approvalDomainService).validateApprovalActionBusinessRules(
                eq(testTimesheet), eq(ApprovalAction.LECTURER_CONFIRM), eq(testLecturer), eq(testCourse));
        }

        @Test
        @DisplayName("Should throw exception when validation fails")
        void shouldThrowExceptionWhenValidationFails() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));
            doThrow(new SecurityException("Validation failed"))
                .when(approvalDomainService).validateApprovalActionBusinessRules(
                    any(Timesheet.class), any(ApprovalAction.class), any(User.class), any(Course.class));

            // Act & Assert
            assertThatThrownBy(() ->
                service.validateApprovalAction(testTimesheet, ApprovalAction.HR_CONFIRM, 1L))
                .isInstanceOf(SecurityException.class);
        }
    }
}
