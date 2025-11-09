package com.usyd.catams.application.user;

import com.usyd.catams.application.user.dto.UserDto;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit Tests for UserApplicationService
 *
 * This test class provides comprehensive coverage of the UserApplicationService
 * implementation, testing all CRUD operations, permission checks, and DTO mapping.
 *
 * Coverage includes:
 * - User retrieval by ID and email
 * - Role-based queries
 * - Permission and eligibility checks
 * - Course relationships
 * - DTO mapping with validation
 * - Edge cases and error handling
 *
 * @author Test Infrastructure Team
 * @since 2.0
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserApplicationService Unit Tests")
class UserApplicationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private UserApplicationService service;

    private User testTutor;
    private User testLecturer;
    private User testAdmin;
    private User testHR;
    private Course testCourse;

    @BeforeEach
    void setUp() {
        testTutor = TestDataBuilder.aTutor().withId(1L).build();
        testLecturer = TestDataBuilder.aLecturer().withId(2L).build();
        testAdmin = TestDataBuilder.anAdmin().withId(3L).build();
        testHR = TestDataBuilder.aUser().withRole(UserRole.HR).withId(4L).build();

        testCourse = TestDataBuilder.aCourse()
            .withId(100L)
            .withLecturerId(testLecturer.getId())
            .build();
    }

    @Nested
    @DisplayName("getUserById() - User Retrieval by ID")
    class GetUserByIdTests {

        @Test
        @DisplayName("Should retrieve user by valid ID")
        void shouldRetrieveUserByValidId() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            Optional<UserDto> result = service.getUserById(1L);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(1L);
            assertThat(result.get().getRole()).isEqualTo(UserRole.TUTOR);
            verify(userRepository).findById(1L);
        }

        @Test
        @DisplayName("Should return empty for non-existent user ID")
        void shouldReturnEmptyForNonExistentUserId() {
            // Arrange
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act
            Optional<UserDto> result = service.getUserById(999L);

            // Assert
            assertThat(result).isEmpty();
            verify(userRepository).findById(999L);
        }

        @Test
        @DisplayName("Should return empty for null user ID")
        void shouldReturnEmptyForNullUserId() {
            // Act
            Optional<UserDto> result = service.getUserById(null);

            // Assert
            assertThat(result).isEmpty();
            verify(userRepository, never()).findById(any());
        }

        @Test
        @DisplayName("Should map user entity to DTO correctly")
        void shouldMapUserEntityToDtoCorrectly() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            Optional<UserDto> result = service.getUserById(1L);

            // Assert
            assertThat(result).isPresent();
            UserDto dto = result.get();
            assertThat(dto.getId()).isEqualTo(testTutor.getId());
            assertThat(dto.getEmail()).isEqualTo(testTutor.getEmail());
            assertThat(dto.getFirstName()).isEqualTo(testTutor.getFirstName());
            assertThat(dto.getLastName()).isEqualTo(testTutor.getLastName());
            assertThat(dto.getRole()).isEqualTo(testTutor.getRole());
            assertThat(dto.isActive()).isEqualTo(testTutor.isActive());
        }
    }

    @Nested
    @DisplayName("getUserByEmail() - User Retrieval by Email")
    class GetUserByEmailTests {

        @Test
        @DisplayName("Should retrieve user by valid email")
        void shouldRetrieveUserByValidEmail() {
            // Arrange
            String email = testTutor.getEmail();
            when(userRepository.findByEmail(email)).thenReturn(Optional.of(testTutor));

            // Act
            Optional<UserDto> result = service.getUserByEmail(email);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getEmail()).isEqualTo(email);
            verify(userRepository).findByEmail(email);
        }

        @Test
        @DisplayName("Should return empty for non-existent email")
        void shouldReturnEmptyForNonExistentEmail() {
            // Arrange
            String email = "nonexistent@usyd.edu.au";
            when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

            // Act
            Optional<UserDto> result = service.getUserByEmail(email);

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return empty for null email")
        void shouldReturnEmptyForNullEmail() {
            // Act
            Optional<UserDto> result = service.getUserByEmail(null);

            // Assert
            assertThat(result).isEmpty();
            verify(userRepository, never()).findByEmail(any());
        }
    }

    @Nested
    @DisplayName("getUsersByRole() - Role-based User Retrieval")
    class GetUsersByRoleTests {

        @Test
        @DisplayName("Should retrieve users by TUTOR role")
        void shouldRetrieveUsersByTutorRole() {
            // Arrange
            when(userRepository.findByRole(UserRole.TUTOR))
                .thenReturn(List.of(testTutor));

            // Act
            List<UserDto> result = service.getUsersByRole(UserRole.TUTOR);

            // Assert
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getRole()).isEqualTo(UserRole.TUTOR);
            verify(userRepository).findByRole(UserRole.TUTOR);
        }

        @ParameterizedTest
        @EnumSource(UserRole.class)
        @DisplayName("Should handle all user roles")
        void shouldHandleAllUserRoles(UserRole role) {
            // Arrange
            when(userRepository.findByRole(role)).thenReturn(List.of());

            // Act
            List<UserDto> result = service.getUsersByRole(role);

            // Assert
            assertThat(result).isNotNull();
            verify(userRepository).findByRole(role);
        }

        @Test
        @DisplayName("Should return empty list for null role")
        void shouldReturnEmptyListForNullRole() {
            // Act
            List<UserDto> result = service.getUsersByRole(null);

            // Assert
            assertThat(result).isEmpty();
            verify(userRepository, never()).findByRole(any());
        }

        @Test
        @DisplayName("Should return empty list when no users for role")
        void shouldReturnEmptyListWhenNoUsersForRole() {
            // Arrange
            when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of());

            // Act
            List<UserDto> result = service.getUsersByRole(UserRole.ADMIN);

            // Assert
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("hasPermission() - Permission Checking")
    class HasPermissionTests {

        @Test
        @DisplayName("Should grant TIMESHEET_CREATE permission to LECTURER")
        void shouldGrantTimesheetCreatePermissionToLecturer() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));

            // Act
            boolean result = service.hasPermission(2L, "TIMESHEET_CREATE");

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should grant TIMESHEET_APPROVE permission to TUTOR")
        void shouldGrantTimesheetApprovePermissionToTutor() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.hasPermission(1L, "TIMESHEET_APPROVE");

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should grant TIMESHEET_APPROVE permission to HR")
        void shouldGrantTimesheetApprovePermissionToHR() {
            // Arrange
            when(userRepository.findById(4L)).thenReturn(Optional.of(testHR));

            // Act
            boolean result = service.hasPermission(4L, "TIMESHEET_APPROVE");

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should grant all permissions to ADMIN")
        void shouldGrantAllPermissionsToAdmin() {
            // Arrange
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));

            // Act & Assert
            assertThat(service.hasPermission(3L, "TIMESHEET_CREATE")).isTrue();
            assertThat(service.hasPermission(3L, "TIMESHEET_APPROVE")).isTrue();
            assertThat(service.hasPermission(3L, "ADMIN_ACCESS")).isTrue();
            assertThat(service.hasPermission(3L, "HR_ACCESS")).isTrue();
        }

        @Test
        @DisplayName("Should deny ADMIN_ACCESS to non-admin users")
        void shouldDenyAdminAccessToNonAdminUsers() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.hasPermission(1L, "ADMIN_ACCESS");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny HR_ACCESS to non-HR users")
        void shouldDenyHRAccessToNonHRUsers() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.hasPermission(1L, "HR_ACCESS");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null user ID")
        void shouldReturnFalseForNullUserId() {
            // Act
            boolean result = service.hasPermission(null, "TIMESHEET_CREATE");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null permission")
        void shouldReturnFalseForNullPermission() {
            // Act
            boolean result = service.hasPermission(1L, null);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for non-existent user")
        void shouldReturnFalseForNonExistentUser() {
            // Arrange
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act
            boolean result = service.hasPermission(999L, "TIMESHEET_CREATE");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny unknown permissions")
        void shouldDenyUnknownPermissions() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.hasPermission(1L, "UNKNOWN_PERMISSION");

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("hasRole() - Role Checking")
    class HasRoleTests {

        @Test
        @DisplayName("Should confirm user has TUTOR role")
        void shouldConfirmUserHasTutorRole() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.hasRole(1L, UserRole.TUTOR);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should confirm user does not have ADMIN role")
        void shouldConfirmUserDoesNotHaveAdminRole() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.hasRole(1L, UserRole.ADMIN);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null user ID")
        void shouldReturnFalseForNullUserId() {
            // Act
            boolean result = service.hasRole(null, UserRole.TUTOR);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null role")
        void shouldReturnFalseForNullRole() {
            // Act
            boolean result = service.hasRole(1L, null);

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("Course Relationship Operations")
    class CourseRelationshipTests {

        @Test
        @DisplayName("Should get tutors for course")
        void shouldGetTutorsForCourse() {
            // Arrange
            when(userRepository.findByRole(UserRole.TUTOR))
                .thenReturn(List.of(testTutor));

            // Act
            List<UserDto> result = service.getTutorsForCourse(100L);

            // Assert
            assertThat(result).isNotEmpty();
            assertThat(result).allMatch(dto -> dto.getRole() == UserRole.TUTOR);
        }

        @Test
        @DisplayName("Should return empty list for null course ID")
        void shouldReturnEmptyListForNullCourseId() {
            // Act
            List<UserDto> result = service.getTutorsForCourse(null);

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should check if user is lecturer of course")
        void shouldCheckIfUserIsLecturerOfCourse() {
            // Arrange
            when(courseRepository.findById(100L))
                .thenReturn(Optional.of(testCourse));

            // Act
            boolean result = service.isLecturerOfCourse(testLecturer.getId(), 100L);

            // Assert
            assertThat(result).isTrue();
            verify(courseRepository).findById(100L);
        }

        @Test
        @DisplayName("Should return false if user is not lecturer of course")
        void shouldReturnFalseIfUserIsNotLecturerOfCourse() {
            // Arrange
            when(courseRepository.findById(100L))
                .thenReturn(Optional.of(testCourse));

            // Act
            boolean result = service.isLecturerOfCourse(999L, 100L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null user ID in lecturer check")
        void shouldReturnFalseForNullUserIdInLecturerCheck() {
            // Act
            boolean result = service.isLecturerOfCourse(null, 100L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null course ID in lecturer check")
        void shouldReturnFalseForNullCourseIdInLecturerCheck() {
            // Act
            boolean result = service.isLecturerOfCourse(1L, null);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should check if user is tutor of course")
        void shouldCheckIfUserIsTutorOfCourse() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.isTutorOfCourse(1L, 100L);

            // Assert
            assertThat(result).isTrue();
        }
    }

    @Nested
    @DisplayName("User Status and Profile Operations")
    class UserStatusProfileTests {

        @Test
        @DisplayName("Should get user profile")
        void shouldGetUserProfile() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            Optional<UserDto> result = service.getUserProfile(1L);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Should check if user is active")
        void shouldCheckIfUserIsActive() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.isUserActive(1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false for null user ID in active check")
        void shouldReturnFalseForNullUserIdInActiveCheck() {
            // Act
            boolean result = service.isUserActive(null);

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("Approval User Operations")
    class ApprovalUserTests {

        @Test
        @DisplayName("Should get approval users (HR and ADMIN)")
        void shouldGetApprovalUsers() {
            // Arrange
            when(userRepository.findByRole(UserRole.HR))
                .thenReturn(List.of(testHR));
            when(userRepository.findByRole(UserRole.ADMIN))
                .thenReturn(List.of(testAdmin));

            // Act
            List<UserDto> result = service.getApprovalUsers();

            // Assert
            assertThat(result).hasSize(2);
            assertThat(result).extracting(UserDto::getRole)
                .containsExactlyInAnyOrder(UserRole.HR, UserRole.ADMIN);
        }
    }

    @Nested
    @DisplayName("Action Permission Checking")
    class ActionPermissionTests {

        @Test
        @DisplayName("Should allow ADMIN to perform any action")
        void shouldAllowAdminToPerformAnyAction() {
            // Arrange
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));

            // Act
            boolean result = service.canUserPerformAction(3L, "APPROVE_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should allow user to perform action on their own user resource")
        void shouldAllowUserToPerformActionOnOwnUserResource() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "VIEW", "USER", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should allow LECTURER to perform action on their course")
        void shouldAllowLecturerToPerformActionOnTheirCourse() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            when(courseRepository.findById(100L)).thenReturn(Optional.of(testCourse));

            // Act
            boolean result = service.canUserPerformAction(2L, "EDIT", "COURSE", 100L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false for null parameters")
        void shouldReturnFalseForNullParameters() {
            // Act
            boolean result = service.canUserPerformAction(null, null, null, null);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for unknown resource type")
        void shouldReturnFalseForUnknownResourceType() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "ACTION", "UNKNOWN_RESOURCE", 1L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny user action on another user's resource")
        void shouldDenyUserActionOnAnotherUsersResource() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "VIEW", "USER", 999L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny LECTURER action on course they don't own")
        void shouldDenyLecturerActionOnCourseTheyDontOwn() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));
            Course otherCourse = TestDataBuilder.aCourse()
                .withId(200L)
                .withLecturerId(999L)
                .build();
            when(courseRepository.findById(200L)).thenReturn(Optional.of(otherCourse));

            // Act
            boolean result = service.canUserPerformAction(2L, "EDIT", "COURSE", 200L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny TUTOR action on course resource")
        void shouldDenyTutorActionOnCourseResource() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "EDIT", "COURSE", 100L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when user ID parameter is null")
        void shouldReturnFalseWhenUserIdIsNull() {
            // Act
            boolean result = service.canUserPerformAction(null, "APPROVE_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when action parameter is null")
        void shouldReturnFalseWhenActionIsNull() {
            // Act
            boolean result = service.canUserPerformAction(1L, null, "TIMESHEET", 1L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when resourceType parameter is null")
        void shouldReturnFalseWhenResourceTypeIsNull() {
            // Act
            boolean result = service.canUserPerformAction(1L, "APPROVE_TIMESHEET", null, 1L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when resourceId parameter is null")
        void shouldReturnFalseWhenResourceIdIsNull() {
            // Act
            boolean result = service.canUserPerformAction(1L, "APPROVE_TIMESHEET", "TIMESHEET", null);

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("Timesheet Action Permission Checking")
    class TimesheetActionPermissionTests {

        @Test
        @DisplayName("Should allow TUTOR to approve timesheet")
        void shouldAllowTutorToApproveTimesheet() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "APPROVE_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should allow HR to approve timesheet")
        void shouldAllowHRToApproveTimesheet() {
            // Arrange
            when(userRepository.findById(4L)).thenReturn(Optional.of(testHR));

            // Act
            boolean result = service.canUserPerformAction(4L, "APPROVE_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should allow ADMIN to approve timesheet")
        void shouldAllowAdminToApproveTimesheet() {
            // Arrange
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));

            // Act
            boolean result = service.canUserPerformAction(3L, "APPROVE_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should allow LECTURER to create timesheet")
        void shouldAllowLecturerToCreateTimesheet() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));

            // Act
            boolean result = service.canUserPerformAction(2L, "CREATE_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should deny TUTOR to create timesheet")
        void shouldDenyTutorToCreateTimesheet() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "CREATE_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should allow LECTURER to edit timesheet")
        void shouldAllowLecturerToEditTimesheet() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));

            // Act
            boolean result = service.canUserPerformAction(2L, "EDIT_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should allow TUTOR to edit timesheet")
        void shouldAllowTutorToEditTimesheet() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "EDIT_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should deny HR to edit timesheet")
        void shouldDenyHRToEditTimesheet() {
            // Arrange
            when(userRepository.findById(4L)).thenReturn(Optional.of(testHR));

            // Act
            boolean result = service.canUserPerformAction(4L, "EDIT_TIMESHEET", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny unknown timesheet action")
        void shouldDenyUnknownTimesheetAction() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.canUserPerformAction(1L, "UNKNOWN_ACTION", "TIMESHEET", 1L);

            // Assert
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("DTO Mapping and Validation")
    class DtoMappingTests {

        @Test
        @DisplayName("Should map user with valid name to DTO")
        void shouldMapUserWithValidNameToDto() {
            // Arrange
            User user = TestDataBuilder.aTutor()
                .withId(1L)
                .withName("John Smith")
                .build();
            when(userRepository.findById(1L)).thenReturn(Optional.of(user));

            // Act
            Optional<UserDto> result = service.getUserById(1L);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getFirstName()).isEqualTo("John");
            assertThat(result.get().getLastName()).isEqualTo("Smith");
        }

        @Test
        @DisplayName("Should map user with single name to DTO")
        void shouldMapUserWithSingleNameToDto() {
            // Arrange
            User user = TestDataBuilder.aTutor()
                .withId(1L)
                .withName("Madonna")
                .build();
            when(userRepository.findById(1L)).thenReturn(Optional.of(user));

            // Act
            Optional<UserDto> result = service.getUserById(1L);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getFirstName()).isEqualTo("Madonna");
            assertThat(result.get().getLastName()).isEmpty();
        }

        @Test
        @DisplayName("Should throw exception when mapping user with invalid name")
        void shouldThrowExceptionWhenMappingUserWithInvalidName() throws Exception {
            // Arrange
            User user = TestDataBuilder.aTutor()
                .withId(1L)
                .build();
            // Use reflection to set invalid name (bypassing validation in setter)
            java.lang.reflect.Field nameField = User.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(user, "   ");
            when(userRepository.findById(1L)).thenReturn(Optional.of(user));

            // Act & Assert
            assertThatThrownBy(() -> service.getUserById(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot map user with invalid name");
        }

        @Test
        @DisplayName("Should map all DTO fields correctly")
        void shouldMapAllDtoFieldsCorrectly() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            Optional<UserDto> result = service.getUserById(1L);

            // Assert
            assertThat(result).isPresent();
            UserDto dto = result.get();
            assertThat(dto.getId()).isEqualTo(testTutor.getId());
            assertThat(dto.getEmail()).isEqualTo(testTutor.getEmail());
            assertThat(dto.getRole()).isEqualTo(testTutor.getRole());
            assertThat(dto.isActive()).isEqualTo(testTutor.isActive());
            assertThat(dto.getCreatedAt()).isEqualTo(testTutor.getCreatedAt());
            assertThat(dto.getLastLoginAt()).isEqualTo(testTutor.getLastLoginAt());
        }
    }

    @Nested
    @DisplayName("Edge Cases and Error Handling")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should handle inactive user in isUserActive check")
        void shouldHandleInactiveUserInActiveCheck() {
            // Arrange
            User inactiveUser = TestDataBuilder.aTutor()
                .withId(5L)
                .build();
            inactiveUser.deactivate();
            when(userRepository.findById(5L)).thenReturn(Optional.of(inactiveUser));

            // Act
            boolean result = service.isUserActive(5L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for non-existent user in active check")
        void shouldReturnFalseForNonExistentUserInActiveCheck() {
            // Arrange
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act
            boolean result = service.isUserActive(999L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when course not found in lecturer check")
        void shouldReturnFalseWhenCourseNotFoundInLecturerCheck() {
            // Arrange
            when(courseRepository.findById(999L)).thenReturn(Optional.empty());

            // Act
            boolean result = service.isLecturerOfCourse(2L, 999L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null user in tutor check")
        void shouldReturnFalseForNullUserInTutorCheck() {
            // Act
            boolean result = service.isTutorOfCourse(null, 100L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null course in tutor check")
        void shouldReturnFalseForNullCourseInTutorCheck() {
            // Act
            boolean result = service.isTutorOfCourse(1L, null);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when tutor not found in tutor check")
        void shouldReturnFalseWhenTutorNotFoundInTutorCheck() {
            // Arrange
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // Act
            boolean result = service.isTutorOfCourse(999L, 100L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when non-tutor user in tutor check")
        void shouldReturnFalseWhenNonTutorUserInTutorCheck() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));

            // Act
            boolean result = service.isTutorOfCourse(2L, 100L);

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should handle multiple users with same role")
        void shouldHandleMultipleUsersWithSameRole() {
            // Arrange
            User tutor1 = TestDataBuilder.aTutor().withId(1L).build();
            User tutor2 = TestDataBuilder.aTutor().withId(2L).build();
            User tutor3 = TestDataBuilder.aTutor().withId(3L).build();
            when(userRepository.findByRole(UserRole.TUTOR))
                .thenReturn(List.of(tutor1, tutor2, tutor3));

            // Act
            List<UserDto> result = service.getUsersByRole(UserRole.TUTOR);

            // Assert
            assertThat(result).hasSize(3);
            assertThat(result).allMatch(dto -> dto.getRole() == UserRole.TUTOR);
        }

        @Test
        @DisplayName("Should get approval users with only HR when no admin exists")
        void shouldGetApprovalUsersWithOnlyHRWhenNoAdminExists() {
            // Arrange
            when(userRepository.findByRole(UserRole.HR))
                .thenReturn(List.of(testHR));
            when(userRepository.findByRole(UserRole.ADMIN))
                .thenReturn(List.of());

            // Act
            List<UserDto> result = service.getApprovalUsers();

            // Assert
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getRole()).isEqualTo(UserRole.HR);
        }

        @Test
        @DisplayName("Should get approval users with only admin when no HR exists")
        void shouldGetApprovalUsersWithOnlyAdminWhenNoHRExists() {
            // Arrange
            when(userRepository.findByRole(UserRole.HR))
                .thenReturn(List.of());
            when(userRepository.findByRole(UserRole.ADMIN))
                .thenReturn(List.of(testAdmin));

            // Act
            List<UserDto> result = service.getApprovalUsers();

            // Assert
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getRole()).isEqualTo(UserRole.ADMIN);
        }

        @Test
        @DisplayName("Should return empty list when no approval users exist")
        void shouldReturnEmptyListWhenNoApprovalUsersExist() {
            // Arrange
            when(userRepository.findByRole(UserRole.HR)).thenReturn(List.of());
            when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of());

            // Act
            List<UserDto> result = service.getApprovalUsers();

            // Assert
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("Permission Matrix - Comprehensive Role Tests")
    class PermissionMatrixTests {

        @Test
        @DisplayName("Should grant HR_ACCESS only to HR role")
        void shouldGrantHRAccessOnlyToHR() {
            // Arrange
            when(userRepository.findById(4L)).thenReturn(Optional.of(testHR));

            // Act
            boolean result = service.hasPermission(4L, "HR_ACCESS");

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should deny HR_ACCESS to LECTURER")
        void shouldDenyHRAccessToLecturer() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));

            // Act
            boolean result = service.hasPermission(2L, "HR_ACCESS");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny TIMESHEET_CREATE to TUTOR")
        void shouldDenyTimesheetCreateToTutor() {
            // Arrange
            when(userRepository.findById(1L)).thenReturn(Optional.of(testTutor));

            // Act
            boolean result = service.hasPermission(1L, "TIMESHEET_CREATE");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny TIMESHEET_CREATE to HR")
        void shouldDenyTimesheetCreateToHR() {
            // Arrange
            when(userRepository.findById(4L)).thenReturn(Optional.of(testHR));

            // Act
            boolean result = service.hasPermission(4L, "TIMESHEET_CREATE");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should deny TIMESHEET_APPROVE to LECTURER")
        void shouldDenyTimesheetApproveToLecturer() {
            // Arrange
            when(userRepository.findById(2L)).thenReturn(Optional.of(testLecturer));

            // Act
            boolean result = service.hasPermission(2L, "TIMESHEET_APPROVE");

            // Assert
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should allow ADMIN to have TIMESHEET_CREATE permission")
        void shouldAllowAdminToHaveTimesheetCreatePermission() {
            // Arrange
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));

            // Act
            boolean result = service.hasPermission(3L, "TIMESHEET_CREATE");

            // Assert
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should grant ADMIN any arbitrary permission")
        void shouldGrantAdminAnyArbitraryPermission() {
            // Arrange
            when(userRepository.findById(3L)).thenReturn(Optional.of(testAdmin));

            // Act
            boolean result = service.hasPermission(3L, "ANY_CUSTOM_PERMISSION");

            // Assert
            assertThat(result).isTrue();
        }
    }
}
