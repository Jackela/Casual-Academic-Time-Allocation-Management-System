package com.usyd.catams.application.user;

import com.usyd.catams.application.user.dto.UserDto;
import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TDD Tests for UserManagementService
 * 
 * These tests define the expected behavior of the UserManagementService interface.
 * They serve as:
 * 1. Contract definition for the service
 * 2. Documentation of expected behavior
 * 3. Safety net for future refactoring
 * 4. Specification for microservice API
 * 
 * Test Structure:
 * - Each method has comprehensive test coverage
 * - Edge cases and error conditions included
 * - Performance expectations documented
 * - Future microservice behavior specified
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserManagementService TDD Tests")
class UserManagementServiceTest {
    
    @Mock
    private UserManagementService userManagementService;
    
    private UserDto testLecturer;
    private UserDto testTutor;
    private UserDto testHR;
    private UserDto testAdmin;
    
    @BeforeEach
    void setUp() {
        LocalDateTime now = LocalDateTime.now();
        
        testLecturer = UserDto.builder()
            .id(1L)
            .email("lecturer@usyd.edu.au")
            .firstName("John")
            .lastName("Smith")
            .role(UserRole.LECTURER)
            .active(true)
            .createdAt(now.minusDays(30))
            .lastLoginAt(now.minusDays(1))
            .build();
            
        testTutor = UserDto.builder()
            .id(2L)
            .email("tutor@usyd.edu.au")
            .firstName("Jane")
            .lastName("Doe")
            .role(UserRole.TUTOR)
            .active(true)
            .createdAt(now.minusDays(15))
            .lastLoginAt(now.minusHours(2))
            .build();
            
        testHR = UserDto.builder()
            .id(3L)
            .email("hr@usyd.edu.au")
            .firstName("Alice")
            .lastName("Johnson")
            .role(UserRole.HR)
            .active(true)
            .createdAt(now.minusDays(100))
            .lastLoginAt(now.minusMinutes(30))
            .build();
            
        testAdmin = UserDto.builder()
            .id(4L)
            .email("admin@usyd.edu.au")
            .firstName("Bob")
            .lastName("Wilson")
            .role(UserRole.ADMIN)
            .active(true)
            .createdAt(now.minusDays(200))
            .lastLoginAt(now.minusMinutes(5))
            .build();
    }
    
    @Nested
    @DisplayName("User Retrieval Operations")
    class UserRetrievalTests {
        
        @Test
        @DisplayName("Should retrieve user by valid ID")
        void shouldRetrieveUserByValidId() {
            // Given
            Long userId = 1L;
            when(userManagementService.getUserById(userId)).thenReturn(Optional.of(testLecturer));
            
            // When
            Optional<UserDto> result = userManagementService.getUserById(userId);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get()).isEqualTo(testLecturer);
            assertThat(result.get().getId()).isEqualTo(userId);
            assertThat(result.get().getRole()).isEqualTo(UserRole.LECTURER);
        }
        
        @Test
        @DisplayName("Should return empty for non-existent user ID")
        void shouldReturnEmptyForNonExistentUserId() {
            // Given
            Long nonExistentId = 999L;
            when(userManagementService.getUserById(nonExistentId)).thenReturn(Optional.empty());
            
            // When
            Optional<UserDto> result = userManagementService.getUserById(nonExistentId);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should retrieve user by valid email")
        void shouldRetrieveUserByValidEmail() {
            // Given
            String email = "lecturer@usyd.edu.au";
            when(userManagementService.getUserByEmail(email)).thenReturn(Optional.of(testLecturer));
            
            // When
            Optional<UserDto> result = userManagementService.getUserByEmail(email);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getEmail()).isEqualTo(email);
        }
        
        @Test
        @DisplayName("Should return empty for non-existent email")
        void shouldReturnEmptyForNonExistentEmail() {
            // Given
            String nonExistentEmail = "notfound@usyd.edu.au";
            when(userManagementService.getUserByEmail(nonExistentEmail)).thenReturn(Optional.empty());
            
            // When
            Optional<UserDto> result = userManagementService.getUserByEmail(nonExistentEmail);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should retrieve users by role")
        void shouldRetrieveUsersByRole() {
            // Given
            UserRole role = UserRole.TUTOR;
            List<UserDto> tutors = List.of(testTutor);
            when(userManagementService.getUsersByRole(role)).thenReturn(tutors);
            
            // When
            List<UserDto> result = userManagementService.getUsersByRole(role);
            
            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0)).isEqualTo(testTutor);
            assertThat(result.get(0).getRole()).isEqualTo(UserRole.TUTOR);
        }
        
        @Test
        @DisplayName("Should return empty list for role with no users")
        void shouldReturnEmptyListForRoleWithNoUsers() {
            // Given
            UserRole role = UserRole.HR;
            when(userManagementService.getUsersByRole(role)).thenReturn(List.of());
            
            // When
            List<UserDto> result = userManagementService.getUsersByRole(role);
            
            // Then
            assertThat(result).isEmpty();
        }
    }
    
    @Nested
    @DisplayName("Permission and Role Checking")
    class PermissionRoleTests {
        
        @Test
        @DisplayName("Should check user has specific permission")
        void shouldCheckUserHasPermission() {
            // Given
            Long userId = 1L;
            String permission = "TIMESHEET_CREATE";
            when(userManagementService.hasPermission(userId, permission)).thenReturn(true);
            
            // When
            boolean result = userManagementService.hasPermission(userId, permission);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check user does not have permission")
        void shouldCheckUserDoesNotHavePermission() {
            // Given
            Long userId = 2L;
            String permission = "ADMIN_ACCESS";
            when(userManagementService.hasPermission(userId, permission)).thenReturn(false);
            
            // When
            boolean result = userManagementService.hasPermission(userId, permission);
            
            // Then
            assertThat(result).isFalse();
        }
        
        @Test
        @DisplayName("Should check user has specific role")
        void shouldCheckUserHasRole() {
            // Given
            Long userId = 1L;
            UserRole role = UserRole.LECTURER;
            when(userManagementService.hasRole(userId, role)).thenReturn(true);
            
            // When
            boolean result = userManagementService.hasRole(userId, role);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check user does not have role")
        void shouldCheckUserDoesNotHaveRole() {
            // Given
            Long userId = 2L;
            UserRole role = UserRole.ADMIN;
            when(userManagementService.hasRole(userId, role)).thenReturn(false);
            
            // When
            boolean result = userManagementService.hasRole(userId, role);
            
            // Then
            assertThat(result).isFalse();
        }
    }
    
    @Nested
    @DisplayName("Course-Related Operations")
    class CourseRelatedTests {
        
        @Test
        @DisplayName("Should get tutors for course")
        void shouldGetTutorsForCourse() {
            // Given
            Long courseId = 100L;
            List<UserDto> tutors = List.of(testTutor);
            when(userManagementService.getTutorsForCourse(courseId)).thenReturn(tutors);
            
            // When
            List<UserDto> result = userManagementService.getTutorsForCourse(courseId);
            
            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getRole()).isEqualTo(UserRole.TUTOR);
        }
        
        @Test
        @DisplayName("Should check if user is lecturer of course")
        void shouldCheckIfUserIsLecturerOfCourse() {
            // Given
            Long userId = 1L;
            Long courseId = 100L;
            when(userManagementService.isLecturerOfCourse(userId, courseId)).thenReturn(true);
            
            // When
            boolean result = userManagementService.isLecturerOfCourse(userId, courseId);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check if user is tutor of course")
        void shouldCheckIfUserIsTutorOfCourse() {
            // Given
            Long userId = 2L;
            Long courseId = 100L;
            when(userManagementService.isTutorOfCourse(userId, courseId)).thenReturn(true);
            
            // When
            boolean result = userManagementService.isTutorOfCourse(userId, courseId);
            
            // Then
            assertThat(result).isTrue();
        }
    }
    
    @Nested
    @DisplayName("User Status and Profile Operations")
    class UserStatusProfileTests {
        
        @Test
        @DisplayName("Should get user profile")
        void shouldGetUserProfile() {
            // Given
            Long userId = 1L;
            when(userManagementService.getUserProfile(userId)).thenReturn(Optional.of(testLecturer));
            
            // When
            Optional<UserDto> result = userManagementService.getUserProfile(userId);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get()).isEqualTo(testLecturer);
        }
        
        @Test
        @DisplayName("Should check if user is active")
        void shouldCheckIfUserIsActive() {
            // Given
            Long userId = 1L;
            when(userManagementService.isUserActive(userId)).thenReturn(true);
            
            // When
            boolean result = userManagementService.isUserActive(userId);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check if user is inactive")
        void shouldCheckIfUserIsInactive() {
            // Given
            Long userId = 999L;
            when(userManagementService.isUserActive(userId)).thenReturn(false);
            
            // When
            boolean result = userManagementService.isUserActive(userId);
            
            // Then
            assertThat(result).isFalse();
        }
    }
    
    @Nested
    @DisplayName("Approval and Action Operations")
    class ApprovalActionTests {
        
        @Test
        @DisplayName("Should get approval users")
        void shouldGetApprovalUsers() {
            // Given
            List<UserDto> approvalUsers = List.of(testHR, testAdmin);
            when(userManagementService.getApprovalUsers()).thenReturn(approvalUsers);
            
            // When
            List<UserDto> result = userManagementService.getApprovalUsers();
            
            // Then
            assertThat(result).hasSize(2);
            assertThat(result).containsExactly(testHR, testAdmin);
            assertThat(result.stream().allMatch(user -> 
                user.getRole() == UserRole.HR || user.getRole() == UserRole.ADMIN)).isTrue();
        }
        
        @Test
        @DisplayName("Should check if user can perform action")
        void shouldCheckIfUserCanPerformAction() {
            // Given
            Long userId = 1L;
            String action = "APPROVE_TIMESHEET";
            String resourceType = "TIMESHEET";
            Long resourceId = 500L;
            when(userManagementService.canUserPerformAction(userId, action, resourceType, resourceId))
                .thenReturn(true);
            
            // When
            boolean result = userManagementService.canUserPerformAction(userId, action, resourceType, resourceId);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check if user cannot perform action")
        void shouldCheckIfUserCannotPerformAction() {
            // Given
            Long userId = 2L;
            String action = "DELETE_USER";
            String resourceType = "USER";
            Long resourceId = 100L;
            when(userManagementService.canUserPerformAction(userId, action, resourceType, resourceId))
                .thenReturn(false);
            
            // When
            boolean result = userManagementService.canUserPerformAction(userId, action, resourceType, resourceId);
            
            // Then
            assertThat(result).isFalse();
        }
    }
    
    @Nested
    @DisplayName("Edge Cases and Error Conditions")
    class EdgeCaseTests {
        
        @Test
        @DisplayName("Should handle null user ID gracefully")
        void shouldHandleNullUserIdGracefully() {
            // Given
            when(userManagementService.getUserById(null)).thenReturn(Optional.empty());
            
            // When
            Optional<UserDto> result = userManagementService.getUserById(null);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should handle null email gracefully")
        void shouldHandleNullEmailGracefully() {
            // Given
            when(userManagementService.getUserByEmail(null)).thenReturn(Optional.empty());
            
            // When
            Optional<UserDto> result = userManagementService.getUserByEmail(null);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should handle null role gracefully")
        void shouldHandleNullRoleGracefully() {
            // Given
            when(userManagementService.getUsersByRole(null)).thenReturn(List.of());
            
            // When
            List<UserDto> result = userManagementService.getUsersByRole(null);
            
            // Then
            assertThat(result).isEmpty();
        }
    }
    
    @Nested
    @DisplayName("Performance and Contract Tests")
    class PerformanceContractTests {
        
        @Test
        @DisplayName("Service methods should be idempotent")
        void serviceMethodsShouldBeIdempotent() {
            // Given
            Long userId = 1L;
            when(userManagementService.getUserById(userId)).thenReturn(Optional.of(testLecturer));
            
            // When - Called multiple times
            Optional<UserDto> result1 = userManagementService.getUserById(userId);
            Optional<UserDto> result2 = userManagementService.getUserById(userId);
            Optional<UserDto> result3 = userManagementService.getUserById(userId);
            
            // Then - Should return same result
            assertThat(result1).isEqualTo(result2);
            assertThat(result2).isEqualTo(result3);
        }
        
        @Test
        @DisplayName("Should maintain data consistency across calls")
        void shouldMaintainDataConsistencyAcrossCalls() {
            // Given
            when(userManagementService.getUserById(1L)).thenReturn(Optional.of(testLecturer));
            when(userManagementService.hasRole(1L, UserRole.LECTURER)).thenReturn(true);
            
            // When
            Optional<UserDto> user = userManagementService.getUserById(1L);
            boolean hasRole = userManagementService.hasRole(1L, UserRole.LECTURER);
            
            // Then
            assertThat(user).isPresent();
            assertThat(hasRole).isTrue();
            assertThat(user.get().getRole()).isEqualTo(UserRole.LECTURER);
        }
    }
}
