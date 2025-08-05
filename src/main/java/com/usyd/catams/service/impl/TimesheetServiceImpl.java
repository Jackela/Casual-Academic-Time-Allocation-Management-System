package com.usyd.catams.service.impl;

import com.usyd.catams.application.TimesheetApplicationService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.BusinessException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.TimesheetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Legacy implementation of TimesheetService that delegates to TimesheetApplicationService.
 * 
 * This class serves as a bridge during the DDD refactoring transition.
 * Controllers and other services that still reference TimesheetServiceImpl
 * will continue to work while we gradually migrate to direct usage of
 * TimesheetApplicationService in the application layer.
 * 
 * @deprecated Use TimesheetApplicationService directly instead
 */
@Service
@Primary
@Deprecated
public class TimesheetServiceImpl implements TimesheetService {

    private final TimesheetApplicationService timesheetApplicationService;
    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    @Autowired
    public TimesheetServiceImpl(TimesheetApplicationService timesheetApplicationService,
                               TimesheetRepository timesheetRepository,
                               UserRepository userRepository,
                               CourseRepository courseRepository) {
        this.timesheetApplicationService = timesheetApplicationService;
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    public Timesheet createTimesheet(Long tutorId, Long courseId, LocalDate weekStartDate,
                                   BigDecimal hours, BigDecimal hourlyRate, String description,
                                   Long creatorId) {
        
        // Load entities from repositories
        User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new IllegalArgumentException("Creator user not found with ID: " + creatorId));
        User tutor = userRepository.findById(tutorId)
            .orElseThrow(() -> new IllegalArgumentException("Tutor user not found with ID: " + tutorId));
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));

        // Validate creator role - only LECTURER can create timesheets
        if (creator.getRole() != UserRole.LECTURER) {
            throw new SecurityException("Only LECTURER users can create timesheets. Creator role: " + creator.getRole());
        }

        // Validate tutor role - tutor must have TUTOR role
        if (tutor.getRole() != UserRole.TUTOR) {
            throw new IllegalArgumentException("User assigned as tutor must have TUTOR role. User role: " + tutor.getRole());
        }

        // Validate course ownership - lecturer must be assigned to the course
        if (!course.getLecturerId().equals(creatorId)) {
            throw new SecurityException("LECTURER can only create timesheets for courses they are assigned to");
        }

        // Validate hours range - must be between 0.1 and 40.0
        if (hours.compareTo(new BigDecimal("0.1")) < 0 || hours.compareTo(new BigDecimal("40.0")) > 0) {
            throw new IllegalArgumentException("Hours must be between 0.1 and 40.0");
        }

        // Validate hourly rate - must be positive
        if (hourlyRate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hourly rate must be positive");
        }

        // Validate week start date - must be Monday  
        if (weekStartDate.getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday. Provided date: " + weekStartDate + " (" + weekStartDate.getDayOfWeek() + ")");
        }

        // Validate week start date - cannot be in the future
        if (weekStartDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Week start date cannot be in the future");
        }

        // Check for duplicate timesheet
        if (timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutorId, courseId, weekStartDate)) {
            throw new IllegalArgumentException("Timesheet already exists for this tutor, course, and week. " +
                "Tutor ID: " + tutorId + ", Course ID: " + courseId + ", Week: " + weekStartDate);
        }

        // Validate budget - check if creating this timesheet would exceed course budget
        BigDecimal newTimesheetCost = hours.multiply(hourlyRate);
        BigDecimal currentBudgetUsed = timesheetApplicationService.getTotalApprovedBudgetUsedByCourse(courseId, creatorId);
        BigDecimal totalAfterNewTimesheet = currentBudgetUsed.add(newTimesheetCost);
        
        if (totalAfterNewTimesheet.compareTo(course.getBudgetAllocated()) > 0) {
            throw new BusinessException("BUDGET_EXCEEDED", "Creating this timesheet would exceed the course budget");
        }

        // Create and persist the timesheet
        Timesheet timesheet = new Timesheet(tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);
        
        return timesheetRepository.save(timesheet);
    }

    @Override
    public String validateTimesheetCreation(Long tutorId, Long courseId, LocalDate weekStartDate,
                                        BigDecimal hours, BigDecimal hourlyRate, String description,
                                        Long creatorId) {
        return timesheetApplicationService.validateTimesheetCreation(
            tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);
    }

    @Override
    public Page<Timesheet> getTimesheets(Long tutorId, Long courseId, ApprovalStatus status,
                                       Long requesterId, Pageable pageable) {
        return timesheetApplicationService.getTimesheets(tutorId, courseId, status, requesterId, pageable);
    }

    @Override
    public Optional<Timesheet> getTimesheetById(Long timesheetId, Long requesterId) {
        return timesheetApplicationService.getTimesheetById(timesheetId, requesterId);
    }

    @Override
    public List<Timesheet> getTimesheetsByTutorAndDateRange(Long tutorId, LocalDate startDate,
                                                          LocalDate endDate, Long requesterId) {
        return timesheetApplicationService.getTimesheetsByTutorAndDateRange(
            tutorId, startDate, endDate, requesterId);
    }

    @Override
    public boolean timesheetExists(Long tutorId, Long courseId, LocalDate weekStartDate) {
        return timesheetApplicationService.timesheetExists(tutorId, courseId, weekStartDate);
    }

    @Override
    public BigDecimal calculateTotalPay(Timesheet timesheet) {
        return timesheetApplicationService.calculateTotalPay(timesheet);
    }

    @Override
    public List<Timesheet> getPendingTimesheetsForApprover(Long approverId) {
        return timesheetApplicationService.getPendingTimesheetsForApprover(approverId);
    }

    @Override
    public BigDecimal getTotalHoursByTutorAndCourse(Long tutorId, Long courseId, Long requesterId) {
        return timesheetApplicationService.getTotalHoursByTutorAndCourse(tutorId, courseId, requesterId);
    }

    @Override
    public BigDecimal getTotalApprovedBudgetUsedByCourse(Long courseId, Long requesterId) {
        return timesheetApplicationService.getTotalApprovedBudgetUsedByCourse(courseId, requesterId);
    }

    @Override
    public Timesheet updateTimesheet(Long timesheetId, BigDecimal hours, BigDecimal hourlyRate, 
                                   String description, Long requesterId) {
        return timesheetApplicationService.updateTimesheet(
            timesheetId, hours, hourlyRate, description, requesterId);
    }

    @Override
    public void deleteTimesheet(Long timesheetId, Long requesterId) {
        timesheetApplicationService.deleteTimesheet(timesheetId, requesterId);
    }

    @Override
    public boolean canUserModifyTimesheet(Timesheet timesheet, Long requesterId) {
        return timesheetApplicationService.canUserModifyTimesheet(timesheet, requesterId);
    }

    @Override
    public Page<Timesheet> getPendingApprovalTimesheets(Long requesterId, Pageable pageable) {
        return timesheetApplicationService.getPendingApprovalTimesheets(requesterId, pageable);
    }

    @Override
    public Page<Timesheet> getTimesheetsByTutor(Long tutorId, Pageable pageable) {
        return timesheetApplicationService.getTimesheetsByTutor(tutorId, pageable);
    }

    @Override
    public boolean canUserEditTimesheet(Long timesheetId, Long requesterId) {
        return timesheetApplicationService.canUserEditTimesheet(timesheetId, requesterId);
    }

    @Override
    public boolean canUserEditTimesheetAuth(Long timesheetId, org.springframework.security.core.Authentication authentication) {
        return timesheetApplicationService.canUserEditTimesheetAuth(timesheetId, authentication);
    }
}