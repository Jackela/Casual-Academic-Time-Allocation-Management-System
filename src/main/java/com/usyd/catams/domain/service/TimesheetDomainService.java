package com.usyd.catams.domain.service;

import com.usyd.catams.domain.rules.*;
import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Domain calculations, status rules, and authorization business rules (not implementation).
 */
@Service
public class TimesheetDomainService {

    private final RuleEngine ruleEngine;
    private final List<Specification<TimesheetValidationContext>> creationRules;
    private final TimesheetValidationService timesheetValidationService;

    public TimesheetDomainService(RuleEngine ruleEngine, 
                                  HoursRangeRule hoursRangeRule, 
                                  HourlyRateRangeRule hourlyRateRangeRule, 
                                  FutureDateRule futureDateRule, 
                                  BudgetExceededRule budgetExceededRule,
                                  TimesheetValidationService timesheetValidationService) {
        this.ruleEngine = ruleEngine;
        this.creationRules = List.of(
            hoursRangeRule,
            hourlyRateRangeRule,
            futureDateRule,
            budgetExceededRule
        );
        this.timesheetValidationService = timesheetValidationService;
    }

    /**
     * Validates timesheet creation business rules using the RuleEngine.     * 
     * @param creator the user creating the timesheet
     * @param tutor the tutor for whom the timesheet is created
     * @param course the course for which work was performed
     * @param weekStartDate the week start date
     * @param hours the hours worked
     * @param hourlyRate the hourly rate
     * @param description the work description
     * @return sanitized description
     * @throws BusinessException if business rules are violated     */
    public String validateTimesheetCreation(User creator, User tutor, Course course,
                                          LocalDate weekStartDate, BigDecimal hours, 
                                          BigDecimal hourlyRate, String description) {
        
        TimesheetValidationContext context = new TimesheetValidationContext(creator, tutor, course, weekStartDate, hours, hourlyRate, description);
        ruleEngine.execute(context, creationRules);
        
        return description.trim(); // Return sanitized description
    }

    /**
     * Validates update data for timesheet modifications.
     */
    public void validateUpdateData(BigDecimal hours, BigDecimal hourlyRate, String description) {
        timesheetValidationService.validateInputs(hours, hourlyRate);
        timesheetValidationService.validateDescription(description);
    }

    /**
     * Calculates total pay for a timesheet.
     */
    public BigDecimal calculateTotalPay(BigDecimal hours, BigDecimal hourlyRate) {
        if (hours == null || hourlyRate == null) {
            throw new IllegalArgumentException("Hours and hourly rate cannot be null");
        }
        return hours.multiply(hourlyRate).setScale(2, java.math.RoundingMode.HALF_UP);
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
                return status == ApprovalStatus.DRAFT
                    || status == ApprovalStatus.MODIFICATION_REQUESTED
                    || status == ApprovalStatus.REJECTED;
            case LECTURER:
            case ADMIN:
                return status == ApprovalStatus.DRAFT || status == ApprovalStatus.MODIFICATION_REQUESTED;
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
                return status == ApprovalStatus.DRAFT || status == ApprovalStatus.REJECTED;
            case LECTURER:
            case ADMIN:
                return status == ApprovalStatus.DRAFT || status == ApprovalStatus.MODIFICATION_REQUESTED;
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
}
