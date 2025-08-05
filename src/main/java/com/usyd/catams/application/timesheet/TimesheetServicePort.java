package com.usyd.catams.application.timesheet;

import com.usyd.catams.application.timesheet.dto.TimesheetDto;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Timesheet Service Port Interface
 * 
 * This interface defines the contract for timesheet operations in the microservices-ready architecture.
 * When extracted to a microservice, these methods will become REST endpoints and the interface
 * will be implemented by REST clients in consuming services.
 * 
 * Design Principles:
 * - Comprehensive CRUD operations for timesheet entities
 * - Rich business logic for approval workflows
 * - Complex queries and filtering operations
 * - Approval workflow management operations
 * - Budget and financial calculation methods
 * - Multi-user permission and access control
 * - Future-ready for REST API extraction
 * 
 * Key Features:
 * - Full timesheet lifecycle management
 * - Advanced approval workflow operations
 * - Rich query capabilities with filters
 * - Permission-based access control
 * - Budget tracking and validation
 * - Audit trail and history tracking
 * - Bulk operations for efficiency
 * - Dashboard and reporting support
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public interface TimesheetServicePort {
    
    // =================== Core CRUD Operations ===================
    
    /**
     * Create a new timesheet for a tutor and course
     * 
     * @param tutorId ID of the tutor creating the timesheet
     * @param courseId ID of the course for the timesheet
     * @param weekStartDate Start date of the work week
     * @param hours Number of hours worked
     * @param hourlyRate Rate per hour
     * @param description Description of work performed
     * @return Created timesheet DTO
     * @throws IllegalArgumentException if parameters are invalid
     * @throws SecurityException if user lacks permission to create timesheet
     */
    TimesheetDto createTimesheet(Long tutorId, Long courseId, LocalDate weekStartDate, 
                                BigDecimal hours, BigDecimal hourlyRate, String description);
    
    /**
     * Get a timesheet by its ID
     * 
     * @param timesheetId ID of the timesheet
     * @return Optional containing the timesheet if found
     */
    Optional<TimesheetDto> getTimesheetById(Long timesheetId);
    
    /**
     * Update an existing timesheet (only allowed in DRAFT or MODIFICATION_REQUESTED status)
     * 
     * @param timesheetId ID of the timesheet to update
     * @param hours New hours value
     * @param description New description
     * @param userId ID of user making the update (for permission checking)
     * @return Updated timesheet DTO
     * @throws IllegalStateException if timesheet cannot be updated
     * @throws SecurityException if user lacks permission
     */
    TimesheetDto updateTimesheet(Long timesheetId, BigDecimal hours, String description, Long userId);
    
    /**
     * Delete a timesheet (only allowed in DRAFT status)
     * 
     * @param timesheetId ID of the timesheet to delete
     * @param userId ID of user requesting deletion (for permission checking)
     * @return true if deletion was successful
     * @throws IllegalStateException if timesheet cannot be deleted
     * @throws SecurityException if user lacks permission
     */
    boolean deleteTimesheet(Long timesheetId, Long userId);
    
    // =================== Query Operations ===================
    
    /**
     * Get all timesheets for a specific tutor
     * 
     * @param tutorId ID of the tutor
     * @return List of timesheet DTOs
     */
    List<TimesheetDto> getTimesheetsByTutor(Long tutorId);
    
    /**
     * Get all timesheets for a specific course
     * 
     * @param courseId ID of the course
     * @return List of timesheet DTOs
     */
    List<TimesheetDto> getTimesheetsByCourse(Long courseId);
    
    /**
     * Get all timesheets for a specific lecturer (across all their courses)
     * 
     * @param lecturerId ID of the lecturer
     * @return List of timesheet DTOs
     */
    List<TimesheetDto> getTimesheetsByLecturer(Long lecturerId);
    
    /**
     * Get timesheets by status
     * 
     * @param status Approval status to filter by
     * @return List of timesheet DTOs with the specified status
     */
    List<TimesheetDto> getTimesheetsByStatus(ApprovalStatus status);
    
    /**
     * Get timesheets by date range
     * 
     * @param startDate Start of date range (inclusive)
     * @param endDate End of date range (inclusive)
     * @return List of timesheet DTOs within the date range
     */
    List<TimesheetDto> getTimesheetsByDateRange(LocalDate startDate, LocalDate endDate);
    
    /**
     * Get timesheets with complex filtering
     * 
     * @param tutorId Optional tutor ID filter
     * @param courseId Optional course ID filter
     * @param status Optional status filter
     * @param startDate Optional start date filter
     * @param endDate Optional end date filter
     * @param minHours Optional minimum hours filter
     * @param maxHours Optional maximum hours filter
     * @return List of filtered timesheet DTOs
     */
    List<TimesheetDto> getTimesheetsWithFilters(Long tutorId, Long courseId, ApprovalStatus status,
                                               LocalDate startDate, LocalDate endDate,
                                               BigDecimal minHours, BigDecimal maxHours);
    
    /**
     * Get pending timesheets for a specific approver
     * 
     * @param approverId ID of the approver (lecturer or HR)
     * @return List of timesheets pending approval by this user
     */
    List<TimesheetDto> getPendingTimesheetsForApprover(Long approverId);
    
    /**
     * Get recent timesheets (created within last N days)
     * 
     * @param days Number of days to look back
     * @param userId Optional user ID to filter by (if null, returns all users' recent timesheets)
     * @return List of recent timesheet DTOs
     */
    List<TimesheetDto> getRecentTimesheets(int days, Long userId);
    
    // =================== Approval Workflow Operations ===================
    
    /**
     * Submit a timesheet for approval (moves from DRAFT to workflow)
     * 
     * @param timesheetId ID of the timesheet to submit
     * @param submitterId ID of user submitting (must be timesheet owner)
     * @return Updated timesheet DTO with new status
     * @throws IllegalStateException if timesheet cannot be submitted
     * @throws SecurityException if user lacks permission
     */
    TimesheetDto submitForApproval(Long timesheetId, Long submitterId);
    
    /**
     * Process an approval action on a timesheet
     * 
     * @param timesheetId ID of the timesheet to process
     * @param approverId ID of the user taking the action
     * @param action Approval action to take (APPROVE, REJECT, REQUEST_MODIFICATION)
     * @param comments Optional comments from approver
     * @return Updated timesheet DTO with new status
     * @throws IllegalStateException if action cannot be performed
     * @throws SecurityException if user lacks permission
     */
    TimesheetDto processApprovalAction(Long timesheetId, Long approverId, 
                                      ApprovalAction action, String comments);
    
    /**
     * Get valid approval actions for a timesheet and user
     * 
     * @param timesheetId ID of the timesheet
     * @param userId ID of the user checking actions
     * @return List of valid approval actions for this user and timesheet
     */
    List<ApprovalAction> getValidApprovalActions(Long timesheetId, Long userId);
    
    /**
     * Get approval history for a timesheet
     * 
     * @param timesheetId ID of the timesheet
     * @return List of approval events (may be empty for new timesheets)
     */
    List<String> getApprovalHistory(Long timesheetId);
    
    /**
     * Check if a user can approve a specific timesheet
     * 
     * @param timesheetId ID of the timesheet
     * @param userId ID of the potential approver
     * @return true if user can approve this timesheet
     */
    boolean canUserApproveTimesheet(Long timesheetId, Long userId);
    
    /**
     * Get next approver in workflow for a timesheet
     * 
     * @param timesheetId ID of the timesheet
     * @return Optional containing next approver ID, empty if no next approver
     */
    Optional<Long> getNextApproverId(Long timesheetId);
    
    // =================== Business Logic Operations ===================
    
    /**
     * Calculate total payment amount for timesheets
     * 
     * @param timesheetIds List of timesheet IDs to calculate total for
     * @return Total payment amount
     */
    BigDecimal calculateTotalPayment(List<Long> timesheetIds);
    
    /**
     * Validate timesheet business rules
     * 
     * @param tutorId ID of the tutor
     * @param courseId ID of the course
     * @param weekStartDate Week start date
     * @param hours Hours worked
     * @param hourlyRate Hourly rate
     * @return Map of validation results (field -> error message, empty if valid)
     */
    Map<String, String> validateTimesheetData(Long tutorId, Long courseId, LocalDate weekStartDate,
                                              BigDecimal hours, BigDecimal hourlyRate);
    
    /**
     * Check if tutor can create timesheet for course in specific week
     * 
     * @param tutorId ID of the tutor
     * @param courseId ID of the course
     * @param weekStartDate Week start date
     * @return true if timesheet can be created
     */
    boolean canCreateTimesheetForWeek(Long tutorId, Long courseId, LocalDate weekStartDate);
    
    /**
     * Get suggested hourly rate for a course
     * 
     * @param courseId ID of the course
     * @param tutorId ID of the tutor (for experience-based rates)
     * @return Suggested hourly rate
     */
    BigDecimal getSuggestedHourlyRate(Long courseId, Long tutorId);
    
    /**
     * Calculate budget impact of timesheet
     * 
     * @param courseId ID of the course
     * @param hours Hours to be added
     * @param hourlyRate Rate per hour
     * @return Map with budget information (remaining, percentage used, etc.)
     */
    Map<String, Object> calculateBudgetImpact(Long courseId, BigDecimal hours, BigDecimal hourlyRate);
    
    // =================== Dashboard and Reporting Operations ===================
    
    /**
     * Get timesheet statistics for a tutor
     * 
     * @param tutorId ID of the tutor
     * @param startDate Start date for statistics period
     * @param endDate End date for statistics period
     * @return Map containing statistics (total hours, total payment, average rate, etc.)
     */
    Map<String, Object> getTutorTimesheetStatistics(Long tutorId, LocalDate startDate, LocalDate endDate);
    
    /**
     * Get timesheet statistics for a course
     * 
     * @param courseId ID of the course
     * @param startDate Start date for statistics period
     * @param endDate End date for statistics period
     * @return Map containing statistics (total hours, total cost, number of tutors, etc.)
     */
    Map<String, Object> getCourseTimesheetStatistics(Long courseId, LocalDate startDate, LocalDate endDate);
    
    /**
     * Get lecturer's dashboard data (all courses they manage)
     * 
     * @param lecturerId ID of the lecturer
     * @return Map containing dashboard data (pending approvals, recent activity, etc.)
     */
    Map<String, Object> getLecturerDashboardData(Long lecturerId);
    
    /**
     * Get overdue timesheets (past approval deadline)
     * 
     * @param currentDate Current date to compare against deadlines
     * @return List of overdue timesheet DTOs
     */
    List<TimesheetDto> getOverdueTimesheets(LocalDateTime currentDate);
    
    /**
     * Get timesheets requiring attention (various urgency levels)
     * 
     * @param userId ID of the user checking (determines what they see)
     * @return Map of urgency level -> list of timesheet DTOs
     */
    Map<String, List<TimesheetDto>> getTimesheetsRequiringAttention(Long userId);
    
    // =================== Bulk Operations ===================
    
    /**
     * Bulk approve timesheets (for HR mass approval)
     * 
     * @param timesheetIds List of timesheet IDs to approve
     * @param approverId ID of the approver
     * @param comments Optional bulk comments
     * @return Map of timesheet ID -> success/error status
     */
    Map<Long, String> bulkApproveTimesheets(List<Long> timesheetIds, Long approverId, String comments);
    
    /**
     * Bulk submit timesheets for approval
     * 
     * @param timesheetIds List of timesheet IDs to submit
     * @param submitterId ID of the submitter
     * @return Map of timesheet ID -> success/error status
     */
    Map<Long, String> bulkSubmitTimesheets(List<Long> timesheetIds, Long submitterId);
    
    /**
     * Generate timesheets for recurring work (e.g., weekly TA duties)
     * 
     * @param tutorId ID of the tutor
     * @param courseId ID of the course
     * @param startDate Start date for generation
     * @param endDate End date for generation
     * @param hoursPerWeek Hours per week
     * @param hourlyRate Rate per hour
     * @param description Description template
     * @return List of generated timesheet DTOs
     */
    List<TimesheetDto> generateRecurringTimesheets(Long tutorId, Long courseId, 
                                                   LocalDate startDate, LocalDate endDate,
                                                   BigDecimal hoursPerWeek, BigDecimal hourlyRate,
                                                   String description);
    
    // =================== Permission and Security Operations ===================
    
    /**
     * Check if user can perform specific operation on timesheet
     * 
     * @param timesheetId ID of the timesheet
     * @param userId ID of the user
     * @param operation Operation to check (CREATE, READ, UPDATE, DELETE, APPROVE, etc.)
     * @return true if user has permission
     */
    boolean canUserPerformOperation(Long timesheetId, Long userId, String operation);
    
    /**
     * Get timesheets visible to a specific user (based on their role and relationships)
     * 
     * @param userId ID of the user
     * @param includeFilters Optional additional filters to apply
     * @return List of timesheet DTOs visible to this user
     */
    List<TimesheetDto> getVisibleTimesheets(Long userId, Map<String, Object> includeFilters);
    
    /**
     * Audit log for timesheet operations
     * 
     * @param timesheetId ID of the timesheet
     * @param userId ID of user performing operation
     * @param operation Operation performed
     * @param details Additional operation details
     */
    void logTimesheetOperation(Long timesheetId, Long userId, String operation, String details);
}