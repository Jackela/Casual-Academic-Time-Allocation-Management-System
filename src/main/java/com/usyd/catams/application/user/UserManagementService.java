package com.usyd.catams.application.user;

import com.usyd.catams.application.user.dto.UserDto;
import com.usyd.catams.enums.UserRole;

import java.util.List;
import java.util.Optional;

/**
 * User Management Service Interface
 * 
 * This interface defines the contract for user-related operations that will become
 * REST API endpoints when extracted to a microservice. It follows the port-adapter
 * pattern to enable future service extraction without code changes.
 * 
 * Design Principles:
 * - Interface represents future microservice API
 * - All methods are idempotent and stateless
 * - DTOs used for data transfer (future: JSON over HTTP)
 * - No domain entity exposure across service boundaries
 * 
 * Future Migration:
 * - These methods will become REST endpoints (@GetMapping, @PostMapping, etc.)
 * - DTOs will become JSON request/response bodies
 * - Service calls will become HTTP client calls
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public interface UserManagementService {
    
    /**
     * Retrieve user by ID.
     * Future: GET /api/users/{userId}
     * 
     * @param userId The user ID
     * @return User information or empty if not found
     */
    Optional<UserDto> getUserById(Long userId);
    
    /**
     * Retrieve user by email address.
     * Future: GET /api/users?email={email}
     * 
     * @param email The user's email address
     * @return User information or empty if not found
     */
    Optional<UserDto> getUserByEmail(String email);
    
    /**
     * Retrieve all users with a specific role.
     * Future: GET /api/users?role={role}
     * 
     * @param role The user role to filter by
     * @return List of users with the specified role
     */
    List<UserDto> getUsersByRole(UserRole role);
    
    /**
     * Check if a user has a specific permission.
     * Future: GET /api/users/{userId}/permissions/{permission}
     * 
     * @param userId The user ID
     * @param permission The permission to check
     * @return true if user has the permission, false otherwise
     */
    boolean hasPermission(Long userId, String permission);
    
    /**
     * Check if a user has a specific role.
     * Future: GET /api/users/{userId}/roles/{role}
     * 
     * @param userId The user ID
     * @param role The role to check
     * @return true if user has the role, false otherwise
     */
    boolean hasRole(Long userId, UserRole role);
    
    /**
     * Get all tutors assigned to a specific course.
     * Future: GET /api/courses/{courseId}/tutors
     * 
     * @param courseId The course ID
     * @return List of tutors assigned to the course
     */
    List<UserDto> getTutorsForCourse(Long courseId);
    
    /**
     * Check if a user is a lecturer for a specific course.
     * Future: GET /api/courses/{courseId}/lecturers/{userId}
     * 
     * @param userId The user ID
     * @param courseId The course ID
     * @return true if user is a lecturer for the course, false otherwise
     */
    boolean isLecturerOfCourse(Long userId, Long courseId);
    
    /**
     * Check if a user is a tutor for a specific course.
     * Future: GET /api/courses/{courseId}/tutors/{userId}
     * 
     * @param userId The user ID
     * @param courseId The course ID
     * @return true if user is a tutor for the course, false otherwise
     */
    boolean isTutorOfCourse(Long userId, Long courseId);
    
    /**
     * Get user's full profile with all related information.
     * Future: GET /api/users/{userId}/profile
     * 
     * @param userId The user ID
     * @return Complete user profile or empty if not found
     */
    Optional<UserDto> getUserProfile(Long userId);
    
    /**
     * Validate if a user exists and is active.
     * Future: GET /api/users/{userId}/status
     * 
     * @param userId The user ID
     * @return true if user exists and is active, false otherwise
     */
    boolean isUserActive(Long userId);
    
    /**
     * Get users who can approve timesheets (HR and ADMIN roles).
     * Future: GET /api/users/approvers
     * 
     * @return List of users with approval permissions
     */
    List<UserDto> getApprovalUsers();
    
    /**
     * Check if user can perform a specific action based on their role and context.
     * This integrates with the business rules engine.
     * Future: POST /api/users/{userId}/can-perform
     * 
     * @param userId The user ID
     * @param action The action to check
     * @param resourceType The type of resource (e.g., "TIMESHEET")
     * @param resourceId The resource ID
     * @return true if user can perform the action, false otherwise
     */
    boolean canUserPerformAction(Long userId, String action, String resourceType, Long resourceId);
}