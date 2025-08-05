package com.usyd.catams.application.user;

import com.usyd.catams.application.user.dto.UserDto;
import com.usyd.catams.domain.rules.WorkflowRulesRegistry;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * User Management Application Service Implementation
 * 
 * This service implements the UserManagementService interface and provides
 * user-related operations. It's designed to be easily extracted to a microservice
 * when needed.
 * 
 * Architecture:
 * - Implements service interface for future microservice extraction
 * - Uses DTOs for external communication
 * - Delegates business logic to domain services where appropriate
 * - Handles application concerns (transactions, security, DTO mapping)
 * 
 * Future Migration:
 * - This implementation becomes a REST controller
 * - Repository calls become external service calls
 * - DTOs become JSON request/response bodies
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@Service
@Transactional(readOnly = true)
public class UserApplicationService implements UserManagementService {
    
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    
    public UserApplicationService(UserRepository userRepository, CourseRepository courseRepository) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }
    
    @Override
    public Optional<UserDto> getUserById(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        
        return userRepository.findById(userId)
            .map(this::mapToDto);
    }
    
    @Override
    public Optional<UserDto> getUserByEmail(String email) {
        if (email == null) {
            return Optional.empty();
        }
        
        return userRepository.findByEmail(email)
            .map(this::mapToDto);
    }
    
    @Override
    public List<UserDto> getUsersByRole(UserRole role) {
        if (role == null) {
            return List.of();
        }
        
        return userRepository.findByRole(role).stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    @Override
    public boolean hasPermission(Long userId, String permission) {
        if (userId == null || permission == null) {
            return false;
        }
        
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            return false;
        }
        
        // Delegate permission checking to business rules
        return checkRoleBasedPermission(user.get().getRole(), permission);
    }
    
    @Override
    public boolean hasRole(Long userId, UserRole role) {
        if (userId == null || role == null) {
            return false;
        }
        
        return userRepository.findById(userId)
            .map(user -> user.getRole() == role)
            .orElse(false);
    }
    
    @Override
    public List<UserDto> getTutorsForCourse(Long courseId) {
        if (courseId == null) {
            return List.of();
        }
        
        // This would typically involve a join query in a real implementation
        // For now, we'll return tutors (this would be implemented based on actual course-user relationships)
        return userRepository.findByRole(UserRole.TUTOR).stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    @Override
    public boolean isLecturerOfCourse(Long userId, Long courseId) {
        if (userId == null || courseId == null) {
            return false;
        }
        
        return courseRepository.findById(courseId)
            .map(course -> userId.equals(course.getLecturerId()))
            .orElse(false);
    }
    
    @Override
    public boolean isTutorOfCourse(Long userId, Long courseId) {
        if (userId == null || courseId == null) {
            return false;
        }
        
        // This would involve checking course-tutor relationships
        // Implementation depends on your specific course-tutor association logic
        return userRepository.findById(userId)
            .map(user -> user.getRole() == UserRole.TUTOR)
            .orElse(false);
    }
    
    @Override
    public Optional<UserDto> getUserProfile(Long userId) {
        // For now, getUserProfile is the same as getUserById
        // In a real implementation, this might include additional profile data
        return getUserById(userId);
    }
    
    @Override
    public boolean isUserActive(Long userId) {
        if (userId == null) {
            return false;
        }
        
        return userRepository.findById(userId)
            .map(User::isActive)
            .orElse(false);
    }
    
    @Override
    public List<UserDto> getApprovalUsers() {
        List<User> hrUsers = userRepository.findByRole(UserRole.HR);
        List<User> adminUsers = userRepository.findByRole(UserRole.ADMIN);
        
        return Stream.concat(hrUsers.stream(), adminUsers.stream())
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    @Override
    public boolean canUserPerformAction(Long userId, String action, String resourceType, Long resourceId) {
        if (userId == null || action == null || resourceType == null || resourceId == null) {
            return false;
        }
        
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            return false;
        }
        
        // This would integrate with WorkflowRulesRegistry for comprehensive permission checking
        // For now, implement basic role-based checking
        return checkActionPermission(user.get(), action, resourceType, resourceId);
    }
    
    /**
     * Maps User entity to UserDto for external communication
     * 
     * Following DDD principles: The entity handles its own domain logic
     * for name parsing. If the entity is invalid, we fail fast.
     */
    private UserDto mapToDto(User user) {
        // Validate domain invariants before mapping
        if (!user.hasValidName()) {
            throw new IllegalStateException("Cannot map user with invalid name: " + user.getId());
        }
        
        // Let the entity handle name parsing logic
        return UserDto.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())  // Entity handles the logic
            .lastName(user.getLastName())    // Entity handles the logic
            .role(user.getRole())
            .active(user.isActive())
            .createdAt(user.getCreatedAt())
            .lastLoginAt(user.getLastLoginAt())
            .build();
    }
    
    /**
     * Check role-based permissions for a specific permission string
     */
    private boolean checkRoleBasedPermission(UserRole role, String permission) {
        // Admin has override privileges for all permissions - consistent with checkActionPermission()
        if (role == UserRole.ADMIN) {
            return true; // Admin override - matches line 234 pattern
        }
        
        // Role-specific permissions for non-admin users
        return switch (permission) {
            case "TIMESHEET_CREATE" -> role == UserRole.LECTURER;
            case "TIMESHEET_APPROVE" -> role == UserRole.TUTOR || role == UserRole.HR;
            case "ADMIN_ACCESS" -> false; // Only admin can access (checked above)
            case "HR_ACCESS" -> role == UserRole.HR;
            default -> false; // Secure by default - deny unknown permissions
        };
    }
    
    /**
     * Check if user can perform a specific action on a resource
     */
    private boolean checkActionPermission(User user, String action, String resourceType, Long resourceId) {
        // This would integrate with WorkflowRulesRegistry and business rules
        // For now, implement basic logic
        if (user.getRole() == UserRole.ADMIN) {
            return true; // Admin can perform any action
        }
        
        return switch (resourceType) {
            case "TIMESHEET" -> checkTimesheetActionPermission(user, action, resourceId);
            case "USER" -> user.getRole() == UserRole.ADMIN || user.getId().equals(resourceId);
            case "COURSE" -> user.getRole() == UserRole.LECTURER && isLecturerOfCourse(user.getId(), resourceId);
            default -> false;
        };
    }
    
    /**
     * Check timesheet-specific action permissions
     */
    private boolean checkTimesheetActionPermission(User user, String action, Long timesheetId) {
        // This would integrate with actual timesheet business rules
        // For now, return basic role-based permissions
        return switch (action) {
            case "APPROVE_TIMESHEET" -> user.getRole() == UserRole.TUTOR || 
                                       user.getRole() == UserRole.HR || 
                                       user.getRole() == UserRole.ADMIN;
            case "CREATE_TIMESHEET" -> user.getRole() == UserRole.LECTURER;
            case "EDIT_TIMESHEET" -> user.getRole() == UserRole.LECTURER || user.getRole() == UserRole.TUTOR;
            default -> false;
        };
    }
}