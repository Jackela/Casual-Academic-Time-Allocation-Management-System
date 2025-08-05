package com.usyd.catams.domain.service;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Domain Service containing pure business logic for Timesheet operations.
 * 
 * This service contains stateless domain logic that operates purely on domain objects
 * without any knowledge of persistence, security, or external systems.
 * 
 * Responsibilities:
 * - Business rule validation
 * - Domain calculations
 * - Status transition logic
 * - Authorization business rules (not implementation)
 */
@Service
public class TimesheetDomainService {

    // Constants for business rules
    private static final BigDecimal MIN_HOURS = BigDecimal.valueOf(0.1);
    private static final BigDecimal MAX_HOURS = BigDecimal.valueOf(40.0);
    private static final BigDecimal MIN_HOURLY_RATE = BigDecimal.valueOf(10.00);
    private static final BigDecimal MAX_HOURLY_RATE = BigDecimal.valueOf(200.00);
    private static final int MAX_DESCRIPTION_LENGTH = 1000;

    /**
     * Validates timesheet creation business rules.
     * 
     * @param creator the user creating the timesheet
     * @param tutor the tutor for whom the timesheet is created
     * @param course the course for which work was performed
     * @param weekStartDate the week start date
     * @param hours the hours worked
     * @param hourlyRate the hourly rate
     * @param description the work description
     * @return sanitized description
     * @throws IllegalArgumentException if business rules are violated
     * @throws SecurityException if creator lacks permission
     */
    public String validateTimesheetCreation(User creator, User tutor, Course course, 
                                          LocalDate weekStartDate, BigDecimal hours, 
                                          BigDecimal hourlyRate, String description) {
        
        // Validate creator role and status
        validateCreatorPermissions(creator, course);
        
        // Validate tutor role and status
        validateTutorEligibility(tutor);
        
        // Validate course status
        validateCourseActive(course);
        
        // Validate week start date is Monday
        validateWeekStartDate(weekStartDate);
        
        // Validate hours range
        validateHours(hours);
        
        // Validate hourly rate range
        validateHourlyRate(hourlyRate);
        
        // Validate and sanitize description
        return validateAndSanitizeDescription(description);
    }

    /**
     * Validates update data for timesheet modifications.
     */
    public void validateUpdateData(BigDecimal hours, BigDecimal hourlyRate, String description) {
        validateHours(hours);
        validateHourlyRate(hourlyRate);
        validateDescription(description);
    }

    /**
     * Calculates total pay for a timesheet.
     */
    public BigDecimal calculateTotalPay(BigDecimal hours, BigDecimal hourlyRate) {
        if (hours == null || hourlyRate == null) {
            throw new IllegalArgumentException("Hours and hourly rate cannot be null");
        }
        return hours.multiply(hourlyRate);
    }

    /**
     * Determines if a timesheet is editable based on its status.
     */
    public boolean isTimesheetEditable(ApprovalStatus status) {
        return status == ApprovalStatus.DRAFT || status == ApprovalStatus.REJECTED;
    }

    /**
     * Determines if a timesheet is deletable based on its status.
     */
    public boolean isTimesheetDeletable(ApprovalStatus status) {
        return status == ApprovalStatus.DRAFT || status == ApprovalStatus.REJECTED;
    }

    /**
     * Determines the editable status rule for a specific user role.
     */
    public boolean canRoleEditTimesheetWithStatus(UserRole role, ApprovalStatus status) {
        switch (role) {
            case TUTOR:
                // TUTOR can only edit REJECTED timesheets
                return status == ApprovalStatus.REJECTED;
            case LECTURER:
            case ADMIN:
                // LECTURER/ADMIN can edit DRAFT timesheets
                return status == ApprovalStatus.DRAFT;
            default:
                return false;
        }
    }

    /**
     * Determines the deletable status rule for a specific user role.
     */
    public boolean canRoleDeleteTimesheetWithStatus(UserRole role, ApprovalStatus status) {
        switch (role) {
            case TUTOR:
                // TUTOR can only delete REJECTED timesheets
                return status == ApprovalStatus.REJECTED;
            case LECTURER:
            case ADMIN:
                // LECTURER/ADMIN can delete DRAFT timesheets
                return status == ApprovalStatus.DRAFT;
            default:
                return false;
        }
    }

    /**
     * Determines if a user role can modify timesheets in general.
     */
    public boolean canRoleModifyTimesheets(UserRole role) {
        return role == UserRole.LECTURER || role == UserRole.ADMIN;
    }

    /**
     * Determines if a lecturer has authority over a specific course.
     */
    public boolean hasLecturerAuthorityOverCourse(User lecturer, Course course) {
        return lecturer.getRole() == UserRole.LECTURER && 
               lecturer.getId().equals(course.getLecturerId());
    }

    /**
     * Determines if a tutor owns a specific timesheet.
     */
    public boolean isTutorOwnerOfTimesheet(User tutor, Timesheet timesheet) {
        return tutor.getRole() == UserRole.TUTOR && 
               tutor.getId().equals(timesheet.getTutorId());
    }

    /**
     * Determines the new status when a TUTOR updates a REJECTED timesheet.
     */
    public ApprovalStatus getStatusAfterTutorUpdate(ApprovalStatus currentStatus) {
        if (currentStatus == ApprovalStatus.REJECTED) {
            return ApprovalStatus.DRAFT;
        }
        return currentStatus;
    }

    // Private validation methods

    private void validateCreatorPermissions(User creator, Course course) {
        if (creator.getRole() != UserRole.LECTURER) {
            throw new SecurityException("Only LECTURER users can create timesheets. User role: " + creator.getRole());
        }

        if (!creator.isAccountActive()) {
            throw new IllegalArgumentException("Creator account is not active");
        }

        if (!creator.getId().equals(course.getLecturerId())) {
            throw new SecurityException("LECTURER is not assigned to this course. Expected lecturer ID: " 
                + course.getLecturerId() + ", but got: " + creator.getId());
        }
    }

    private void validateTutorEligibility(User tutor) {
        if (tutor.getRole() != UserRole.TUTOR) {
            throw new IllegalArgumentException("Target user must have TUTOR role. User role: " + tutor.getRole());
        }

        if (!tutor.isAccountActive()) {
            throw new IllegalArgumentException("Tutor account is not active");
        }
    }

    private void validateCourseActive(Course course) {
        if (!course.getIsActive()) {
            throw new IllegalArgumentException("Course is not active");
        }
    }

    private void validateWeekStartDate(LocalDate weekStartDate) {
        if (weekStartDate.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday. Provided date is: " 
                + weekStartDate.getDayOfWeek());
        }
    }

    private void validateHours(BigDecimal hours) {
        if (hours == null || hours.compareTo(MIN_HOURS) < 0 || hours.compareTo(MAX_HOURS) > 0) {
            throw new IllegalArgumentException("Hours must be between " + MIN_HOURS + " and " + MAX_HOURS + ". Provided: " + hours);
        }
    }

    private void validateHourlyRate(BigDecimal hourlyRate) {
        if (hourlyRate == null || hourlyRate.compareTo(MIN_HOURLY_RATE) < 0 || 
            hourlyRate.compareTo(MAX_HOURLY_RATE) > 0) {
            throw new IllegalArgumentException("Hourly rate must be between " + MIN_HOURLY_RATE + " and " + MAX_HOURLY_RATE + ". Provided: " + hourlyRate);
        }
    }

    private String validateAndSanitizeDescription(String description) {
        String sanitizedDescription = description.trim();
        validateDescription(sanitizedDescription);
        return sanitizedDescription;
    }

    private void validateDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Description cannot be empty");
        }
        
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("Description cannot exceed " + MAX_DESCRIPTION_LENGTH + " characters. Provided length: " + description.length());
        }
    }
}