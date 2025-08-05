package com.usyd.catams.application.course;

import com.usyd.catams.application.course.dto.CourseDto;
import com.usyd.catams.enums.UserRole;

import java.util.List;
import java.util.Optional;

/**
 * Course Management Service Interface
 * 
 * This interface defines the contract for course-related operations that will become
 * REST API endpoints when extracted to a microservice. It follows the port-adapter
 * pattern to enable future service extraction without code changes.
 * 
 * Design Principles:
 * - Interface represents future microservice API
 * - All methods are idempotent and stateless
 * - DTOs used for data transfer (future: JSON over HTTP)
 * - No domain entity exposure across service boundaries
 * - Clear separation of concerns between course and user management
 * 
 * Future Migration:
 * - These methods will become REST endpoints (@GetMapping, @PostMapping, etc.)
 * - DTOs will become JSON request/response bodies
 * - Service calls will become HTTP client calls
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public interface CourseManagementService {
    
    /**
     * Retrieve course by ID.
     * Future: GET /api/courses/{courseId}
     * 
     * @param courseId The course ID
     * @return Course information or empty if not found
     */
    Optional<CourseDto> getCourseById(Long courseId);
    
    /**
     * Retrieve course by code.
     * Future: GET /api/courses?code={courseCode}
     * 
     * @param courseCode The course code (e.g., "COMP3221")
     * @return Course information or empty if not found
     */
    Optional<CourseDto> getCourseByCode(String courseCode);
    
    /**
     * Retrieve all courses taught by a specific lecturer.
     * Future: GET /api/lecturers/{lecturerId}/courses
     * 
     * @param lecturerId The lecturer's user ID
     * @return List of courses taught by the lecturer
     */
    List<CourseDto> getCoursesByLecturer(Long lecturerId);
    
    /**
     * Retrieve all courses where a tutor is assigned.
     * Future: GET /api/tutors/{tutorId}/courses
     * 
     * @param tutorId The tutor's user ID
     * @return List of courses where the tutor is assigned
     */
    List<CourseDto> getCoursesByTutor(Long tutorId);
    
    /**
     * Check if a user is the lecturer for a specific course.
     * Future: GET /api/courses/{courseId}/lecturers/{userId}
     * 
     * @param userId The user ID
     * @param courseId The course ID
     * @return true if user is the lecturer for the course, false otherwise
     */
    boolean isLecturerOfCourse(Long userId, Long courseId);
    
    /**
     * Check if a user is assigned as a tutor for a specific course.
     * Future: GET /api/courses/{courseId}/tutors/{userId}
     * 
     * @param userId The user ID
     * @param courseId The course ID
     * @return true if user is assigned as tutor for the course, false otherwise
     */
    boolean isTutorOfCourse(Long userId, Long courseId);
    
    /**
     * Get all active courses in the system.
     * Future: GET /api/courses?active=true
     * 
     * @return List of all active courses
     */
    List<CourseDto> getActiveCourses();
    
    /**
     * Get all courses for a specific semester and year.
     * 
     * @param semester The semester (e.g., "S1", "S2")
     * @param year The year (e.g., 2024)
     * @return List of courses for the specified semester and year
     */
    List<CourseDto> getCoursesBySemesterAndYear(String semester, Integer year);
    
    /**
     * Get basic course information needed for timesheet creation.
     * This includes course details, lecturer info, and budget constraints.
     * Future: GET /api/courses/{courseId}/timesheet-info
     * 
     * @param courseId The course ID
     * @return Course information for timesheet operations or empty if not found
     */
    Optional<CourseDto> getCourseForTimesheetOperations(Long courseId);
    
    /**
     * Validate if a course exists and is active for operations.
     * Future: GET /api/courses/{courseId}/status
     * 
     * @param courseId The course ID
     * @return true if course exists and is active, false otherwise
     */
    boolean isCourseActiveAndValid(Long courseId);
    
    /**
     * Get course budget information for financial validations.
     * Future: GET /api/courses/{courseId}/budget
     * 
     * @param courseId The course ID
     * @return Course budget details or empty if not found/authorized
     */
    Optional<CourseDto> getCourseBudgetInfo(Long courseId);
    
    /**
     * Check if a user has any relationship with a course (lecturer or tutor).
     * Future: GET /api/courses/{courseId}/users/{userId}/relationship
     * 
     * @param userId The user ID
     * @param courseId The course ID
     * @return true if user has any relationship with the course, false otherwise
     */
    boolean hasUserCourseRelationship(Long userId, Long courseId);
    
    /**
     * Get course capacity and enrollment information.
     * Future: GET /api/courses/{courseId}/capacity
     * 
     * @param courseId The course ID
     * @return Course capacity information or empty if not found
     */
    Optional<CourseDto> getCourseCapacityInfo(Long courseId);
    
    /**
     * Check if course has reached its tutor assignment limit.
     * Future: GET /api/courses/{courseId}/tutor-limit-status
     * 
     * @param courseId The course ID
     * @return true if course has space for more tutors, false if at limit
     */
    boolean canAssignMoreTutors(Long courseId);
    
    /**
     * Get courses that need tutor assignments.
     * Future: GET /api/courses/needs-tutors
     * 
     * @return List of courses that need tutor assignments
     */
    List<CourseDto> getCoursesNeedingTutors();
    
    /**
     * Validate course permissions for a specific operation.
     * This integrates with the business rules engine.
     * Future: POST /api/courses/{courseId}/permissions/validate
     * 
     * @param courseId The course ID
     * @param userId The user ID
     * @param operation The operation to validate (e.g., "CREATE_TIMESHEET", "ASSIGN_TUTOR")
     * @return true if user can perform the operation on the course, false otherwise
     */
    boolean canUserPerformCourseOperation(Long courseId, Long userId, String operation);
}