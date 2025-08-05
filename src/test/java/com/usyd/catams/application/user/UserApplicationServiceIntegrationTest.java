package com.usyd.catams.application.user;

import com.usyd.catams.application.user.dto.UserDto;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.repository.CourseRepository;
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
 * Integration Tests for UserApplicationService Implementation
 * 
 * These tests verify that our UserApplicationService implementation
 * correctly implements the UserManagementService interface contract.
 * 
 * This demonstrates TDD Green phase - making the tests pass with proper implementation.
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserApplicationService Implementation Tests")
class UserApplicationServiceIntegrationTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private CourseRepository courseRepository;
    
    private UserApplicationService userApplicationService;
    private User testLecturerEntity;
    private User testTutorEntity;
    private User testHREntity;
    private User testAdminEntity;
    
    @BeforeEach
    void setUp() {
        userApplicationService = new UserApplicationService(userRepository, courseRepository);
        
        LocalDateTime now = LocalDateTime.now();
        
        testLecturerEntity = createUserEntity(1L, "lecturer@usyd.edu.au", "John", "Smith", 
                                            UserRole.LECTURER, true, now.minusDays(30), now.minusDays(1));
        testTutorEntity = createUserEntity(2L, "tutor@usyd.edu.au", "Jane", "Doe", 
                                         UserRole.TUTOR, true, now.minusDays(15), now.minusHours(2));
        testHREntity = createUserEntity(3L, "hr@usyd.edu.au", "Alice", "Johnson", 
                                      UserRole.HR, true, now.minusDays(100), now.minusMinutes(30));
        testAdminEntity = createUserEntity(4L, "admin@usyd.edu.au", "Bob", "Wilson", 
                                         UserRole.ADMIN, true, now.minusDays(200), now.minusMinutes(5));
    }
    
    @Nested
    @DisplayName("User Retrieval Implementation Tests")
    class UserRetrievalImplementationTests {
        
        @Test
        @DisplayName("Should retrieve user by ID and map to DTO correctly")
        void shouldRetrieveUserByIdAndMapToDtoCorrectly() {
            // Given
            when(userRepository.findById(1L)).thenReturn(Optional.of(testLecturerEntity));
            
            // When
            Optional<UserDto> result = userApplicationService.getUserById(1L);
            
            // Then
            assertThat(result).isPresent();
            UserDto dto = result.get();
            assertThat(dto.getId()).isEqualTo(1L);
            assertThat(dto.getEmail()).isEqualTo("lecturer@usyd.edu.au");
            assertThat(dto.getFirstName()).isEqualTo("John");
            assertThat(dto.getLastName()).isEqualTo("Smith");
            assertThat(dto.getRole()).isEqualTo(UserRole.LECTURER);
            assertThat(dto.isActive()).isTrue();
        }
        
        @Test
        @DisplayName("Should return empty for non-existent user ID")
        void shouldReturnEmptyForNonExistentUserId() {
            // Given
            when(userRepository.findById(999L)).thenReturn(Optional.empty());
            
            // When
            Optional<UserDto> result = userApplicationService.getUserById(999L);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should retrieve user by email")
        void shouldRetrieveUserByEmail() {
            // Given
            when(userRepository.findByEmail("lecturer@usyd.edu.au")).thenReturn(Optional.of(testLecturerEntity));
            
            // When
            Optional<UserDto> result = userApplicationService.getUserByEmail("lecturer@usyd.edu.au");
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getEmail()).isEqualTo("lecturer@usyd.edu.au");
        }
        
        @Test
        @DisplayName("Should retrieve users by role")
        void shouldRetrieveUsersByRole() {
            // Given
            when(userRepository.findByRole(UserRole.TUTOR)).thenReturn(List.of(testTutorEntity));
            
            // When
            List<UserDto> result = userApplicationService.getUsersByRole(UserRole.TUTOR);
            
            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getRole()).isEqualTo(UserRole.TUTOR);
            assertThat(result.get(0).getId()).isEqualTo(2L);
        }
    }
    
    @Nested
    @DisplayName("Permission Checking Implementation Tests")
    class PermissionCheckingImplementationTests {
        
        @Test
        @DisplayName("Should check permissions based on role")
        void shouldCheckPermissionsBasedOnRole() {
            // Given
            when(userRepository.findById(1L)).thenReturn(Optional.of(testLecturerEntity));
            
            // When
            boolean canCreateTimesheet = userApplicationService.hasPermission(1L, "TIMESHEET_CREATE");
            boolean canAdminAccess = userApplicationService.hasPermission(1L, "ADMIN_ACCESS");
            
            // Then
            assertThat(canCreateTimesheet).isTrue();  // LECTURER can create timesheets
            assertThat(canAdminAccess).isFalse();     // LECTURER cannot access admin features
        }
        
        @Test
        @DisplayName("Should check user role correctly")
        void shouldCheckUserRoleCorrectly() {
            // Given
            when(userRepository.findById(1L)).thenReturn(Optional.of(testLecturerEntity));
            
            // When
            boolean isLecturer = userApplicationService.hasRole(1L, UserRole.LECTURER);
            boolean isTutor = userApplicationService.hasRole(1L, UserRole.TUTOR);
            
            // Then
            assertThat(isLecturer).isTrue();
            assertThat(isTutor).isFalse();
        }
        
        @Test
        @DisplayName("Admin should have all permissions")
        void adminShouldHaveAllPermissions() {
            // Given
            when(userRepository.findById(4L)).thenReturn(Optional.of(testAdminEntity));
            
            // When
            boolean canCreateTimesheet = userApplicationService.hasPermission(4L, "TIMESHEET_CREATE");
            boolean canAdminAccess = userApplicationService.hasPermission(4L, "ADMIN_ACCESS");
            boolean canApprove = userApplicationService.hasPermission(4L, "TIMESHEET_APPROVE");
            
            // Then
            assertThat(canCreateTimesheet).isTrue();
            assertThat(canAdminAccess).isTrue();
            assertThat(canApprove).isTrue();
        }
    }
    
    @Nested
    @DisplayName("Status and Profile Implementation Tests")
    class StatusProfileImplementationTests {
        
        @Test
        @DisplayName("Should check user active status")
        void shouldCheckUserActiveStatus() {
            // Given
            when(userRepository.findById(1L)).thenReturn(Optional.of(testLecturerEntity));
            
            // When
            boolean isActive = userApplicationService.isUserActive(1L);
            
            // Then
            assertThat(isActive).isTrue();
        }
        
        @Test
        @DisplayName("Should return false for inactive user")
        void shouldReturnFalseForInactiveUser() {
            // Given
            User inactiveUser = createUserEntity(5L, "inactive@test.com", "Test", "User", 
                                                UserRole.TUTOR, false, LocalDateTime.now(), null);
            when(userRepository.findById(5L)).thenReturn(Optional.of(inactiveUser));
            
            // When
            boolean isActive = userApplicationService.isUserActive(5L);
            
            // Then
            assertThat(isActive).isFalse();
        }
        
        @Test
        @DisplayName("Should get approval users (HR and ADMIN)")
        void shouldGetApprovalUsers() {
            // Given
            when(userRepository.findByRole(UserRole.HR)).thenReturn(List.of(testHREntity));
            when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of(testAdminEntity));
            
            // When
            List<UserDto> approvalUsers = userApplicationService.getApprovalUsers();
            
            // Then
            assertThat(approvalUsers).hasSize(2);
            assertThat(approvalUsers.stream().anyMatch(user -> user.getRole() == UserRole.HR)).isTrue();
            assertThat(approvalUsers.stream().anyMatch(user -> user.getRole() == UserRole.ADMIN)).isTrue();
        }
    }
    
    @Nested
    @DisplayName("Edge Cases Implementation Tests")
    class EdgeCasesImplementationTests {
        
        @Test
        @DisplayName("Should handle null user ID gracefully")
        void shouldHandleNullUserIdGracefully() {
            // When
            Optional<UserDto> result = userApplicationService.getUserById(null);
            
            // Then
            assertThat(result).isEmpty();
            verifyNoInteractions(userRepository);
        }
        
        @Test
        @DisplayName("Should handle null email gracefully")
        void shouldHandleNullEmailGracefully() {
            // When
            Optional<UserDto> result = userApplicationService.getUserByEmail(null);
            
            // Then
            assertThat(result).isEmpty();
            verifyNoInteractions(userRepository);
        }
        
        @Test
        @DisplayName("Should handle null role gracefully")
        void shouldHandleNullRoleGracefully() {
            // When
            List<UserDto> result = userApplicationService.getUsersByRole(null);
            
            // Then
            assertThat(result).isEmpty();
            verifyNoInteractions(userRepository);
        }
    }
    
    /**
     * Helper method to create User entities for testing
     */
    private User createUserEntity(Long id, String email, String firstName, String lastName,
                                UserRole role, boolean active, LocalDateTime createdAt, 
                                LocalDateTime lastLoginAt) {
        User user = new User();
        // Assuming User entity has these fields and setters
        // This would need to be adjusted based on actual User entity implementation
        user.setId(id);
        user.setEmail(email);
        // Combine firstName and lastName into full name
        String fullName = firstName + (lastName != null && !lastName.isEmpty() ? " " + lastName : "");
        user.setName(fullName);
        user.setRole(role);
        user.setActive(active);
        user.setCreatedAt(createdAt);
        user.setLastLoginAt(lastLoginAt);
        return user;
    }
}
