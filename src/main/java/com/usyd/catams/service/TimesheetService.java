package com.usyd.catams.service;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Service interface for managing timesheet operations.
 * 
 * This service handles the business logic for timesheet creation, retrieval,
 * and management according to the CATAMS business rules and workflow.
 * 
 * Key business rules enforced:
 * - Only LECTURER can create timesheets for TUTOR users
 * - LECTURER must be assigned to the course
 * - One timesheet per tutor per course per week (Monday-based weeks)
 * - All input values must be within defined ranges
 * - Proper approval workflow state management
 */
public interface TimesheetService {

    /**
     * Create a new timesheet with business rule validation.
     * 
     * Business rules enforced:
     * - Creator must have LECTURER role
     * - Creator must be assigned to the specified course
     * - Tutor must have TUTOR role and be active
     * - Course must exist and be active
     * - weekStartDate must be a Monday
     * - No duplicate timesheet for same tutor+course+week combination
     * - Hours must be within range (0.1 - 40.0)
     * - Hourly rate must be within range (10.00 - 200.00)
     * - Description must not be empty and within length limits
     * 
     * @param tutorId ID of the tutor for whom the timesheet is created
     * @param courseId ID of the course for which work was performed
     * @param weekStartDate Start date of the work week (must be Monday)
     * @param hours Number of hours worked (0.1 - 40.0)
     * @param hourlyRate Hourly rate for the work (10.00 - 200.00)
     * @param description Description of work performed (1-1000 characters)
     * @param creatorId ID of the user creating the timesheet (must be LECTURER)
     * @return the created timesheet with generated ID
     * @throws IllegalArgumentException if business rules are violated
     * @throws SecurityException if creator lacks permission to create timesheet
     */
    Timesheet createTimesheet(Long tutorId, Long courseId, LocalDate weekStartDate,
                            BigDecimal hours, BigDecimal hourlyRate, String description,
                            Long creatorId);

    /**
     * Get timesheets with filtering and pagination.
     * 
     * Access control:
     * - TUTOR users can only view their own timesheets
     * - LECTURER users can view timesheets for courses they teach
     * - ADMIN users can view all timesheets
     * 
     * @param tutorId optional tutor ID filter
     * @param courseId optional course ID filter
     * @param status optional approval status filter
     * @param requesterId ID of the user making the request
     * @param pageable pagination parameters
     * @return page of timesheets matching the criteria
     * @throws SecurityException if user lacks permission to view requested data
     */
    Page<Timesheet> getTimesheets(Long tutorId, Long courseId, ApprovalStatus status,
                                Long requesterId, Pageable pageable);

    /**
     * Get a specific timesheet by ID.
     * 
     * Access control applied based on user role and ownership.
     * 
     * @param timesheetId the timesheet ID
     * @param requesterId ID of the user making the request
     * @return the timesheet if found and accessible
     * @throws SecurityException if user lacks permission to view the timesheet
     */
    Optional<Timesheet> getTimesheetById(Long timesheetId, Long requesterId);

    /**
     * Get timesheets for a specific tutor within a date range.
     * 
     * @param tutorId the tutor's ID
     * @param startDate start of date range (inclusive)
     * @param endDate end of date range (inclusive)
     * @param requesterId ID of the user making the request
     * @return list of timesheets in the date range
     * @throws SecurityException if user lacks permission to view the data
     */
    List<Timesheet> getTimesheetsByTutorAndDateRange(Long tutorId, LocalDate startDate,
                                                   LocalDate endDate, Long requesterId);

    /**
     * Check if a timesheet already exists for the given combination.
     * 
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param weekStartDate the week start date
     * @return true if timesheet exists
     */
    boolean timesheetExists(Long tutorId, Long courseId, LocalDate weekStartDate);

    /**
     * Calculate total pay for a timesheet.
     * 
     * @param timesheet the timesheet
     * @return total pay amount (hours * hourly rate)
     */
    BigDecimal calculateTotalPay(Timesheet timesheet);

    /**
     * Validate business rules for timesheet creation.
     * 
     * This method performs all validation without creating the timesheet,
     * useful for pre-validation checks.
     * 
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param weekStartDate the week start date
     * @param hours the hours worked
     * @param hourlyRate the hourly rate
     * @param description the work description
     * @param creatorId the creator's ID
     * @throws IllegalArgumentException if validation fails
     * @throws SecurityException if creator lacks permission
     */
    void validateTimesheetCreation(Long tutorId, Long courseId, LocalDate weekStartDate,
                                 BigDecimal hours, BigDecimal hourlyRate, String description,
                                 Long creatorId);

    /**
     * Get pending timesheets that require approval from a specific user.
     * 
     * @param approverId the approver's ID
     * @return list of timesheets pending approval
     */
    List<Timesheet> getPendingTimesheetsForApprover(Long approverId);

    /**
     * Get paginated timesheets pending lecturer approval.
     * 
     * Access control:
     * - LECTURER can view timesheets pending approval for their courses only
     * - ADMIN can view all timesheets pending approval system-wide
     * - TUTOR cannot access this endpoint (will throw SecurityException)
     * 
     * Business rules:
     * - Only returns timesheets with status PENDING_LECTURER_APPROVAL
     * - Results are filtered by lecturer's assigned courses (unless ADMIN)
     * - Supports pagination and sorting
     * - Default sort is by submission date (oldest first for priority)
     * 
     * @param requesterId the ID of the user making the request
     * @param pageable pagination and sorting parameters
     * @return page of timesheets pending lecturer approval
     * @throws SecurityException if user lacks permission (TUTOR role)
     */
    Page<Timesheet> getPendingApprovalTimesheets(Long requesterId, Pageable pageable);

    /**
     * Get total hours worked by a tutor for a specific course.
     * 
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param requesterId ID of the user making the request
     * @return total hours across all timesheets
     * @throws SecurityException if user lacks permission to view the data
     */
    BigDecimal getTotalHoursByTutorAndCourse(Long tutorId, Long courseId, Long requesterId);

    /**
     * Get total approved budget used for a course.
     * 
     * @param courseId the course ID
     * @param requesterId ID of the user making the request
     * @return total budget used from approved timesheets
     * @throws SecurityException if user lacks permission to view the data
     */
    BigDecimal getTotalApprovedBudgetUsedByCourse(Long courseId, Long requesterId);

    /**
     * Update an existing timesheet.
     * 
     * Business rules enforced:
     * - Only DRAFT status timesheets can be updated
     * - LECTURER can update timesheets for their courses
     * - ADMIN can update any timesheet
     * - Updated timesheet status remains DRAFT
     * - All validation rules from creation apply
     * 
     * @param timesheetId the timesheet ID to update
     * @param hours new number of hours worked (0.1 - 40.0)
     * @param hourlyRate new hourly rate (10.00 - 200.00)
     * @param description new description of work performed (1-1000 characters)
     * @param requesterId ID of the user making the update request
     * @return the updated timesheet
     * @throws IllegalArgumentException if business rules are violated
     * @throws SecurityException if user lacks permission to update timesheet
     */
    Timesheet updateTimesheet(Long timesheetId, BigDecimal hours, BigDecimal hourlyRate, 
                            String description, Long requesterId);

    /**
     * Delete an existing timesheet.
     * 
     * Business rules enforced:
     * - Only DRAFT status timesheets can be deleted
     * - LECTURER can delete timesheets for their courses
     * - ADMIN can delete any timesheet
     * - Deletion is permanent (physical delete)
     * - Audit log entry is created for the deletion
     * 
     * @param timesheetId the timesheet ID to delete
     * @param requesterId ID of the user making the delete request
     * @throws IllegalArgumentException if timesheet doesn't exist
     * @throws SecurityException if user lacks permission to delete timesheet
     */
    void deleteTimesheet(Long timesheetId, Long requesterId);

    /**
     * Check if the current user can modify (update/delete) the specified timesheet.
     * 
     * Access control:
     * - LECTURER can modify timesheets for courses they teach
     * - ADMIN can modify any timesheet
     * - TUTOR cannot directly modify timesheets
     * 
     * @param timesheet the timesheet to check
     * @param requesterId ID of the user making the request
     * @return true if user can modify the timesheet
     */
    boolean canUserModifyTimesheet(Timesheet timesheet, Long requesterId);
}