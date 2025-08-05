package com.usyd.catams.service.impl;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.TimesheetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Implementation of TimesheetService with comprehensive business rule validation.
 * 
 * This service enforces all CATAMS business rules for timesheet management
 * including role-based access control, data validation, and workflow management.
 */
@Service
@Transactional
public class TimesheetServiceImpl implements TimesheetService {

    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    @Autowired
    public TimesheetServiceImpl(TimesheetRepository timesheetRepository,
                               UserRepository userRepository,
                               CourseRepository courseRepository) {
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    public Timesheet createTimesheet(Long tutorId, Long courseId, LocalDate weekStartDate,
                                   BigDecimal hours, BigDecimal hourlyRate, String description,
                                   Long creatorId) {
        
        // Perform comprehensive validation and get sanitized description
        String sanitizedDescription = validateTimesheetCreation(tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);
        
        // Create and save the timesheet with sanitized description
        Timesheet timesheet = new Timesheet(tutorId, courseId, weekStartDate, hours, hourlyRate, sanitizedDescription, creatorId);
        
        return timesheetRepository.save(timesheet);
    }

    @Override
    public String validateTimesheetCreation(Long tutorId, Long courseId, LocalDate weekStartDate,
                                        BigDecimal hours, BigDecimal hourlyRate, String description,
                                        Long creatorId) {
        
        // 1. Validate creator exists and has LECTURER role
        User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new IllegalArgumentException("Creator user not found with ID: " + creatorId));
        
        if (creator.getRole() != UserRole.LECTURER) {
            throw new SecurityException("Only LECTURER users can create timesheets. User role: " + creator.getRole());
        }

        if (!creator.isAccountActive()) {
            throw new IllegalArgumentException("Creator account is not active");
        }

        // 2. Validate tutor exists and has TUTOR role
        User tutor = userRepository.findById(tutorId)
            .orElseThrow(() -> new IllegalArgumentException("Tutor user not found with ID: " + tutorId));
        
        if (tutor.getRole() != UserRole.TUTOR) {
            throw new IllegalArgumentException("Target user must have TUTOR role. User role: " + tutor.getRole());
        }

        if (!tutor.isAccountActive()) {
            throw new IllegalArgumentException("Tutor account is not active");
        }

        // 3. Validate course exists and is active
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));
        
        if (!course.getIsActive()) {
            throw new IllegalArgumentException("Course is not active");
        }

        // 4. Validate creator is assigned to the course
        if (!creator.getId().equals(course.getLecturerId())) {
            throw new SecurityException("LECTURER is not assigned to this course. Expected lecturer ID: " 
                + course.getLecturerId() + ", but got: " + creator.getId());
        }

        // 5. Validate weekStartDate is Monday
        if (weekStartDate.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday. Provided date is: " 
                + weekStartDate.getDayOfWeek());
        }

        // 6. Validate no duplicate timesheet exists
        if (timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutorId, courseId, weekStartDate)) {
            throw new IllegalArgumentException("Timesheet already exists for this tutor, course, and week. " +
                "Tutor ID: " + tutorId + ", Course ID: " + courseId + ", Week: " + weekStartDate);
        }

        // 7. Validate hours range (0.1 - 40.0)
        if (hours == null || hours.compareTo(BigDecimal.valueOf(0.1)) < 0 || hours.compareTo(BigDecimal.valueOf(40.0)) > 0) {
            throw new IllegalArgumentException("Hours must be between 0.1 and 40.0. Provided: " + hours);
        }

        // 8. Validate hourly rate range (10.00 - 200.00)
        if (hourlyRate == null || hourlyRate.compareTo(BigDecimal.valueOf(10.00)) < 0 || 
            hourlyRate.compareTo(BigDecimal.valueOf(200.00)) > 0) {
            throw new IllegalArgumentException("Hourly rate must be between 10.00 and 200.00. Provided: " + hourlyRate);
        }

        // 9. Validate and sanitize description
        String sanitizedDescription = description.trim();
        if (sanitizedDescription.isEmpty()) {
            throw new IllegalArgumentException("Description cannot be empty");
        }
        
        if (sanitizedDescription.length() > 1000) {
            throw new IllegalArgumentException("Description cannot exceed 1000 characters. Provided length: " + sanitizedDescription.length());
        }

        // 10. Validate budget availability (optional business rule)
        BigDecimal totalCost = hours.multiply(hourlyRate);
        if (!course.hasSufficientBudget(totalCost)) {
            // Note: This is a warning, not a blocking error, as per common business practices
            // But we could make it blocking if required
            // throw new IllegalArgumentException("Insufficient course budget. Required: " + totalCost + ", Available: " + course.getBudgetRemaining());
        }
        
        // Return the sanitized description
        return sanitizedDescription;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Timesheet> getTimesheets(Long tutorId, Long courseId, ApprovalStatus status,
                                       Long requesterId, Pageable pageable) {
        
        // Get requester user for access control
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Apply access control based on user role
        switch (requester.getRole()) {
            case ADMIN:
                // ADMIN can view all timesheets with any filters
                return timesheetRepository.findWithFilters(tutorId, courseId, status, pageable);
                
            case LECTURER:
                // LECTURER can view timesheets for courses they teach
                if (courseId != null) {
                    Course course = courseRepository.findById(courseId)
                        .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));
                    
                    if (!requester.getId().equals(course.getLecturerId())) {
                        throw new SecurityException("LECTURER can only view timesheets for courses they teach");
                    }
                }
                return timesheetRepository.findWithFilters(tutorId, courseId, status, pageable);
                
            case TUTOR:
                // TUTOR can only view their own timesheets
                if (tutorId != null && !tutorId.equals(requester.getId())) {
                    throw new SecurityException("TUTOR can only view their own timesheets");
                }
                return timesheetRepository.findWithFilters(requester.getId(), courseId, status, pageable);
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Timesheet> getTimesheetById(Long timesheetId, Long requesterId) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        Optional<Timesheet> timesheetOpt = timesheetRepository.findById(timesheetId);
        
        if (timesheetOpt.isEmpty()) {
            return timesheetOpt;
        }

        Timesheet timesheet = timesheetOpt.get();

        // Apply access control
        switch (requester.getRole()) {
            case ADMIN:
                return timesheetOpt; // ADMIN can view all
                
            case LECTURER:
                // LECTURER can view timesheets for courses they teach
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found"));
                
                if (!requester.getId().equals(course.getLecturerId())) {
                    throw new SecurityException("LECTURER can only view timesheets for courses they teach");
                }
                return timesheetOpt;
                
            case TUTOR:
                // TUTOR can only view their own timesheets
                if (!timesheet.getTutorId().equals(requester.getId())) {
                    throw new SecurityException("TUTOR can only view their own timesheets");
                }
                return timesheetOpt;
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Timesheet> getTimesheetsByTutorAndDateRange(Long tutorId, LocalDate startDate,
                                                          LocalDate endDate, Long requesterId) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Apply access control
        switch (requester.getRole()) {
            case ADMIN:
                // ADMIN can view any tutor's timesheets
                break;
                
            case LECTURER:
                // LECTURER can view timesheets for tutors in courses they teach
                // This requires checking if any courses are taught by this lecturer for this tutor
                // For simplicity, we'll allow lecturers to view any tutor's timesheets
                // In a more complex system, we'd check course relationships
                break;
                
            case TUTOR:
                // TUTOR can only view their own timesheets
                if (!tutorId.equals(requester.getId())) {
                    throw new SecurityException("TUTOR can only view their own timesheets");
                }
                break;
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }

        return timesheetRepository.findByTutorIdAndWeekStartDateBetween(tutorId, startDate, endDate);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean timesheetExists(Long tutorId, Long courseId, LocalDate weekStartDate) {
        return timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutorId, courseId, weekStartDate);
    }

    @Override
    public BigDecimal calculateTotalPay(Timesheet timesheet) {
        return timesheet.calculateTotalPay();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Timesheet> getPendingTimesheetsForApprover(Long approverId) {
        User approver = userRepository.findById(approverId)
            .orElseThrow(() -> new IllegalArgumentException("Approver user not found with ID: " + approverId));

        boolean isHR = approver.getRole() == UserRole.ADMIN; // Treating ADMIN as HR for this context
        
        return timesheetRepository.findPendingTimesheetsForApprover(approverId, isHR);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTotalHoursByTutorAndCourse(Long tutorId, Long courseId, Long requesterId) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Apply access control similar to getTimesheets
        switch (requester.getRole()) {
            case ADMIN:
                break; // ADMIN can view all
                
            case LECTURER:
                Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));
                
                if (!requester.getId().equals(course.getLecturerId())) {
                    throw new SecurityException("LECTURER can only view data for courses they teach");
                }
                break;
                
            case TUTOR:
                if (!tutorId.equals(requester.getId())) {
                    throw new SecurityException("TUTOR can only view their own data");
                }
                break;
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }

        return timesheetRepository.getTotalHoursByTutorAndCourse(tutorId, courseId);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTotalApprovedBudgetUsedByCourse(Long courseId, Long requesterId) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Apply access control
        switch (requester.getRole()) {
            case ADMIN:
                break; // ADMIN can view all
                
            case LECTURER:
                Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));
                
                if (!requester.getId().equals(course.getLecturerId())) {
                    throw new SecurityException("LECTURER can only view budget data for courses they teach");
                }
                break;
                
            case TUTOR:
                throw new SecurityException("TUTOR users cannot view course budget information");
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }

        return timesheetRepository.getTotalApprovedBudgetUsedByCourse(courseId);
    }

    @Override
    public Timesheet updateTimesheet(Long timesheetId, BigDecimal hours, BigDecimal hourlyRate, 
                                   String description, Long requesterId) {
        
        // 1. Validate timesheet exists
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        // 2. Get requester to check role for business rules
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // 3. Check user permission to edit this timesheet
        if (!canUserEditTimesheet(timesheetId, requesterId)) {
            throw new SecurityException("User does not have permission to modify this timesheet");
        }

        // 4. Validate timesheet is in editable state based on user role
        if (requester.getRole() == UserRole.TUTOR) {
            // TUTOR can only edit REJECTED timesheets
            if (timesheet.getStatus() != ApprovalStatus.REJECTED) {
                throw new IllegalArgumentException("TUTOR can only update timesheets with REJECTED status. " +
                    "Current status: " + timesheet.getStatus());
            }
        } else {
            // LECTURER/ADMIN can only edit DRAFT timesheets
            if (timesheet.getStatus() != ApprovalStatus.DRAFT) {
                throw new IllegalArgumentException("Cannot update timesheet with status: " + timesheet.getStatus() + 
                    ". Only DRAFT timesheets can be updated.");
            }
        }

        // 5. Validate update data (similar to creation validation)
        validateUpdateData(hours, hourlyRate, description);

        // 6. Update the timesheet fields
        timesheet.setHours(hours);
        timesheet.setHourlyRate(hourlyRate);
        timesheet.setDescription(description);
        
        // 7. Handle status transition for TUTOR updates
        if (requester.getRole() == UserRole.TUTOR && timesheet.getStatus() == ApprovalStatus.REJECTED) {
            // Reset status from REJECTED to DRAFT for TUTOR edits
            timesheet.setStatus(ApprovalStatus.DRAFT);
        }
        
        // The @PreUpdate will automatically set updatedAt timestamp

        // 8. Save and return updated timesheet
        return timesheetRepository.save(timesheet);
    }

    @Override
    public void deleteTimesheet(Long timesheetId, Long requesterId) {
        
        // 1. Validate timesheet exists
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        // 2. Get requester to check role for business rules
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // 3. Check user permission to edit this timesheet
        if (!canUserEditTimesheet(timesheetId, requesterId)) {
            throw new SecurityException("User does not have permission to delete this timesheet");
        }

        // 4. Validate timesheet is in deletable state based on user role
        if (requester.getRole() == UserRole.TUTOR) {
            // TUTOR can only delete REJECTED timesheets
            if (timesheet.getStatus() != ApprovalStatus.REJECTED) {
                throw new IllegalArgumentException("TUTOR can only delete timesheets with REJECTED status. " +
                    "Current status: " + timesheet.getStatus());
            }
        } else {
            // LECTURER/ADMIN can only delete DRAFT timesheets
            if (timesheet.getStatus() != ApprovalStatus.DRAFT) {
                throw new IllegalArgumentException("Cannot delete timesheet with status: " + timesheet.getStatus() + 
                    ". Only DRAFT timesheets can be deleted.");
            }
        }

        // 5. Perform physical deletion
        // Note: In a production system, we might want to create an audit log entry here
        // before deletion, but for this story we're focusing on core functionality
        timesheetRepository.delete(timesheet);
    }

    @Override
    public boolean canUserModifyTimesheet(Timesheet timesheet, Long requesterId) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                // ADMIN can modify any timesheet
                return true;
                
            case LECTURER:
                // LECTURER can modify timesheets for courses they teach
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                return requester.getId().equals(course.getLecturerId());
                
            case TUTOR:
                // TUTOR cannot directly modify timesheets
                return false;
                
            default:
                return false;
        }
    }

    /**
     * Validate data for timesheet updates.
     * 
     * @param hours the hours value to validate
     * @param hourlyRate the hourly rate to validate
     * @param description the description to validate
     */
    private void validateUpdateData(BigDecimal hours, BigDecimal hourlyRate, String description) {
        
        // Validate hours range (0.1 - 40.0)
        if (hours == null || hours.compareTo(BigDecimal.valueOf(0.1)) < 0 || hours.compareTo(BigDecimal.valueOf(40.0)) > 0) {
            throw new IllegalArgumentException("Hours must be between 0.1 and 40.0. Provided: " + hours);
        }

        // Validate hourly rate range (10.00 - 200.00)
        if (hourlyRate == null || hourlyRate.compareTo(BigDecimal.valueOf(10.00)) < 0 || 
            hourlyRate.compareTo(BigDecimal.valueOf(200.00)) > 0) {
            throw new IllegalArgumentException("Hourly rate must be between 10.00 and 200.00. Provided: " + hourlyRate);
        }

        // Validate description
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Description cannot be empty");
        }
        
        if (description.length() > 1000) {
            throw new IllegalArgumentException("Description cannot exceed 1000 characters. Provided length: " + description.length());
        }
    }

    @Override
    @Transactional(readOnly = true, timeout = 30)  
    public Page<Timesheet> getPendingApprovalTimesheets(Long requesterId, Pageable pageable) {
        
        // 1. Validate user exists and get user details
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + requesterId));

        // 2. Check role-based access control
        switch (requester.getRole()) {
            case TUTOR:
                // TUTOR cannot access this endpoint
                throw new SecurityException("TUTOR users cannot view pending approval timesheets");
                
            case LECTURER:
                // LECTURER can view timesheets pending approval for their courses only
                return timesheetRepository.findPendingLecturerApprovalByCourses(requesterId, pageable);
                
            case ADMIN:
                // ADMIN can view all pending approval timesheets
                return timesheetRepository.findByStatusOrderByCreatedAtAsc(
                    ApprovalStatus.PENDING_LECTURER_APPROVAL, pageable);
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Timesheet> getTimesheetsByTutor(Long tutorId, Pageable pageable) {
        // Validate tutor exists
        User tutor = userRepository.findById(tutorId)
            .orElseThrow(() -> new IllegalArgumentException("Tutor user not found with ID: " + tutorId));
        
        if (tutor.getRole() != UserRole.TUTOR) {
            throw new IllegalArgumentException("User must have TUTOR role. User role: " + tutor.getRole());
        }
        
        // Return all timesheets for the tutor across all statuses
        return timesheetRepository.findByTutorIdOrderByCreatedAtDesc(tutorId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canUserEditTimesheet(Long timesheetId, Long requesterId) {
        // Get timesheet
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));
        
        // Get requester
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                // ADMIN can edit any timesheet
                return true;
                
            case LECTURER:
                // LECTURER can edit timesheets for courses they teach
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                return requester.getId().equals(course.getLecturerId());
                
            case TUTOR:
                // TUTOR can only edit their own REJECTED timesheets
                return timesheet.getTutorId().equals(requester.getId()) && 
                       timesheet.getStatus() == ApprovalStatus.REJECTED;
                
            default:
                return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canUserEditTimesheetAuth(Long timesheetId, org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return false;
        }

        // Extract user ID from authentication principal
        Object principal = authentication.getPrincipal();
        Long requesterId = null;
        
        if (principal instanceof com.usyd.catams.entity.User) {
            requesterId = ((com.usyd.catams.entity.User) principal).getId();
        } else if (principal instanceof Long) {
            requesterId = (Long) principal;
        } else if (principal instanceof String) {
            try {
                requesterId = Long.parseLong((String) principal);
            } catch (NumberFormatException e) {
                return false;
            }
        } else {
            return false;
        }

        return canUserEditTimesheet(timesheetId, requesterId);
    }
}