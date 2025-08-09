package com.usyd.catams.application;

<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
========
import com.usyd.catams.application.TimesheetApplicationService;
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.javaimport com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.BusinessException;import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.TimesheetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
@Service
@Transactional
public class TimesheetApplicationService implements TimesheetService {
========
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
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java

    private final TimesheetApplicationService timesheetApplicationService;    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final TimesheetDomainService timesheetDomainService;
    private final TimesheetMapper timesheetMapper;

    @Autowired
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.timesheetDomainService = timesheetDomainService;
        this.timesheetMapper = timesheetMapper;
    }

    @Override
    @Transactional        // Load entities from repositories
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
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
        
        validateCreateTimesheetPostconditions(savedTimesheet, tutorId, courseId, creatorId, weekStartDate);
        
        return savedTimesheet;    }

    @Override
    public String validateTimesheetCreation(Long tutorId, Long courseId, LocalDate weekStartDate,
                                        BigDecimal hours, BigDecimal hourlyRate, String description,
                                        Long creatorId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
                User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new IllegalArgumentException("Creator user not found with ID: " + creatorId));
        User tutor = userRepository.findById(tutorId)
            .orElseThrow(() -> new IllegalArgumentException("Tutor user not found with ID: " + tutorId));
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));

=======
        // Validate creator role - only LECTURER can create timesheets
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
        if (creator.getRole() != UserRole.LECTURER) {
            throw new SecurityException("Only LECTURER users can create timesheets. Creator role: " + creator.getRole());
        }

<<<<<<< HEAD        if (tutor.getRole() != UserRole.TUTOR) {
            throw new IllegalArgumentException("User assigned as tutor must have TUTOR role. User role: " + tutor.getRole());
        }

=======
        // Validate course ownership - lecturer must be assigned to the course
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
        if (!course.getLecturerId().equals(creatorId)) {
            throw new SecurityException("LECTURER can only create timesheets for courses they are assigned to");
        }

<<<<<<< HEAD        if (weekStartDate.getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday. Provided date: " + weekStartDate + " (" + weekStartDate.getDayOfWeek() + ")");
        }

        if (timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(tutorId, courseId, weekStartDate)) {            throw new IllegalArgumentException("Timesheet already exists for this tutor, course, and week. " +
                "Tutor ID: " + tutorId + ", Course ID: " + courseId + ", Week: " + weekStartDate);
        }

        return timesheetDomainService.validateTimesheetCreation(
            creator, tutor, course, weekStartDate, hours, hourlyRate, description);
========
        return timesheetApplicationService.validateTimesheetCreation(
            tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public Page<Timesheet> getTimesheets(Long tutorId, Long courseId, ApprovalStatus status,
                                       Long requesterId, Pageable pageable) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                return timesheetRepository.findWithFilters(tutorId, courseId, status, pageable);
                
            case LECTURER:                if (courseId != null) {
                    Course course = courseRepository.findById(courseId)
                        .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));
                    
                    if (!timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course)) {
                        throw new SecurityException("LECTURER can only view timesheets for courses they teach");
                    }
                }
                return timesheetRepository.findWithFilters(tutorId, courseId, status, pageable);
                
            case TUTOR:
=======
                // TUTOR can only view their own timesheets
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
                if (tutorId != null && !tutorId.equals(requester.getId())) {
                    throw new SecurityException("TUTOR can only view their own timesheets");
                }
                return timesheetRepository.findWithFilters(requester.getId(), courseId, status, pageable);
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }
<<<<<<< HEAD
========
        return timesheetApplicationService.getTimesheets(tutorId, courseId, status, requesterId, pageable);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public Optional<Timesheet> getTimesheetById(Long timesheetId, Long requesterId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        Optional<Timesheet> timesheetOpt = timesheetRepository.findById(timesheetId);
        
        if (timesheetOpt.isEmpty()) {
            return timesheetOpt;
        }

        Timesheet timesheet = timesheetOpt.get();

        switch (requester.getRole()) {
            case ADMIN:
                return timesheetOpt;
                
            case LECTURER:                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found"));
                
                if (!timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course)) {
                    throw new SecurityException("LECTURER can only view timesheets for courses they teach");
                }
                return timesheetOpt;
                
            case TUTOR:
=======
                // TUTOR can only view their own timesheets
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
                if (!timesheetDomainService.isTutorOwnerOfTimesheet(requester, timesheet)) {
                    throw new SecurityException("TUTOR can only view their own timesheets");
                }
                return timesheetOpt;
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }
<<<<<<< HEAD
========
        return timesheetApplicationService.getTimesheetById(timesheetId, requesterId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public List<Timesheet> getTimesheetsByTutorAndDateRange(Long tutorId, LocalDate startDate,
                                                          LocalDate endDate, Long requesterId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                break;
                
            case LECTURER:
                break;
                
            case TUTOR:                if (!tutorId.equals(requester.getId())) {
                    throw new SecurityException("TUTOR can only view their own timesheets");
                }
                break;
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }

        return timesheetRepository.findByTutorIdAndWeekPeriod_WeekStartDateBetween(tutorId, startDate, endDate);
========
        return timesheetApplicationService.getTimesheetsByTutorAndDateRange(
            tutorId, startDate, endDate, requesterId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public boolean timesheetExists(Long tutorId, Long courseId, LocalDate weekStartDate) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
        return timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(tutorId, courseId, weekStartDate);
========
        return timesheetApplicationService.timesheetExists(tutorId, courseId, weekStartDate);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalPay(Timesheet timesheet) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
        return timesheetDomainService.calculateTotalPay(timesheet.getHours(), timesheet.getHourlyRate());
========
        return timesheetApplicationService.calculateTotalPay(timesheet);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public List<Timesheet> getPendingTimesheetsForApprover(Long approverId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
        User approver = userRepository.findById(approverId)
            .orElseThrow(() -> new IllegalArgumentException("Approver user not found with ID: " + approverId));

        boolean isHR = approver.getRole() == UserRole.ADMIN;
        
        return timesheetRepository.findPendingTimesheetsForApprover(approverId, isHR);
========
        return timesheetApplicationService.getPendingTimesheetsForApprover(approverId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public BigDecimal getTotalHoursByTutorAndCourse(Long tutorId, Long courseId, Long requesterId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                break;                
            case LECTURER:
                Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));
                
                if (!timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course)) {
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
========
        return timesheetApplicationService.getTotalHoursByTutorAndCourse(tutorId, courseId, requesterId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public BigDecimal getTotalApprovedBudgetUsedByCourse(Long courseId, Long requesterId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                break;                
            case LECTURER:
                Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Course not found with ID: " + courseId));
                
                if (!timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course)) {
                    throw new SecurityException("LECTURER can only view budget data for courses they teach");
                }
                break;
                
            case TUTOR:
                throw new SecurityException("TUTOR users cannot view course budget information");
                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }

        return timesheetRepository.getTotalApprovedBudgetUsedByCourse(courseId);
========
        return timesheetApplicationService.getTotalApprovedBudgetUsedByCourse(courseId, requesterId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

=======
        // Validate timesheet is in editable state based on user role (domain logic)
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
        if (!timesheetDomainService.canRoleEditTimesheetWithStatus(requester.getRole(), timesheet.getStatus())) {
            if (requester.getRole() == UserRole.TUTOR) {
                throw new IllegalArgumentException("TUTOR can only update timesheets with REJECTED status. " +
                    "Current status: " + timesheet.getStatus());
            } else {
                throw new IllegalArgumentException("Cannot update timesheet with status: " + timesheet.getStatus() + 
                    ". Only DRAFT timesheets can be updated.");
            }
        }

<<<<<<< HEAD
        timesheetDomainService.validateUpdateData(hours, hourlyRate, description);
        timesheet.setHours(hours);
        timesheet.setHourlyRate(hourlyRate);
        timesheet.setDescription(description);
        
        ApprovalStatus newStatus = timesheetDomainService.getStatusAfterTutorUpdate(timesheet.getStatus());
        timesheet.setStatus(newStatus);
        
        return timesheetRepository.save(timesheet);
========
        return timesheetApplicationService.updateTimesheet(
            timesheetId, hours, hourlyRate, description, requesterId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    @Transactional
    @PreAuthorize("@timesheetApplicationService.canUserEditTimesheetAuth(#timesheetId, authentication)")
    public void deleteTimesheet(Long timesheetId, Long requesterId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java
                Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

=======
        // Validate timesheet is in deletable state based on user role (domain logic)
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
        if (!timesheetDomainService.canRoleDeleteTimesheetWithStatus(requester.getRole(), timesheet.getStatus())) {
            if (requester.getRole() == UserRole.TUTOR) {
                throw new IllegalArgumentException("TUTOR can only delete timesheets with REJECTED status. " +
                    "Current status: " + timesheet.getStatus());
            } else {
                throw new IllegalArgumentException("Cannot delete timesheet with status: " + timesheet.getStatus() + 
                    ". Only DRAFT timesheets can be deleted.");
            }
        }

<<<<<<< HEAD
        timesheetRepository.delete(timesheet);
========
        timesheetApplicationService.deleteTimesheet(timesheetId, requesterId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canUserModifyTimesheet(Timesheet timesheet, Long requesterId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                return true;
                
            case LECTURER:                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                return timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course);
                
            case TUTOR:
=======
                // TUTOR cannot directly modify timesheets (use domain service)
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
                return timesheetDomainService.canRoleModifyTimesheets(requester.getRole());
                
            default:
                return false;
        }
    }

    @Override
    @Transactional(readOnly = true, timeout = 30)  
<<<<<<< HEAD
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public Page<Timesheet> getPendingApprovalTimesheets(Long requesterId, Pageable pageable) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case TUTOR:
                return timesheetRepository.findByStatusAndTutorIdOrderByCreatedAtAsc(
                    ApprovalStatus.PENDING_TUTOR_REVIEW, requester.getId(), pageable);
                
            case LECTURER:
                // For AC1 in TutorApprovalWorkflowIntegrationTest, lecturers are creators and should not access this list
                throw new SecurityException("LECTURER users cannot access pending approval list");
                
            case ADMIN:
                return timesheetRepository.findByStatusOrderByCreatedAtAsc(
                    ApprovalStatus.PENDING_TUTOR_REVIEW, pageable);                
            default:
                throw new SecurityException("Unknown user role: " + requester.getRole());
        }
========
        return timesheetApplicationService.canUserModifyTimesheet(timesheet, requesterId);
    }

    @Override
    public Page<Timesheet> getPendingApprovalTimesheets(Long requesterId, Pageable pageable) {
        return timesheetApplicationService.getPendingApprovalTimesheets(requesterId, pageable);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public Page<Timesheet> getTimesheetsByTutor(Long tutorId, Pageable pageable) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        User tutor = userRepository.findById(tutorId)
            .orElseThrow(() -> new IllegalArgumentException("Tutor user not found with ID: " + tutorId));
        
        if (tutor.getRole() != UserRole.TUTOR) {
            throw new IllegalArgumentException("User must have TUTOR role. User role: " + tutor.getRole());
        }
        
        return timesheetRepository.findByTutorIdOrderByCreatedAtDesc(tutorId, pageable);
========
        return timesheetApplicationService.getTimesheetsByTutor(tutorId, pageable);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public boolean canUserEditTimesheet(Long timesheetId, Long requesterId) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case ADMIN:
                return true;
                
            case LECTURER:
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                return timesheetDomainService.hasLecturerAuthorityOverCourse( requester, course);
                
            case TUTOR:                return timesheetDomainService.isTutorOwnerOfTimesheet(requester, timesheet) && 
                       timesheetDomainService.canRoleEditTimesheetWithStatus(requester.getRole(), timesheet.getStatus());
                
            default:
                return false;
        }
========
        return timesheetApplicationService.canUserEditTimesheet(timesheetId, requesterId);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }

    @Override
    public boolean canUserEditTimesheetAuth(Long timesheetId, org.springframework.security.core.Authentication authentication) {
<<<<<<<< HEAD:src/main/java/com/usyd/catams/application/TimesheetApplicationService.java        if (authentication == null || authentication.getPrincipal() == null) {
            return false;
        }

=======
        // Extract user ID from authentication principal
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
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
<<<<<<< HEAD
========
        return timesheetApplicationService.canUserEditTimesheetAuth(timesheetId, authentication);
>>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a:src/main/java/com/usyd/catams/service/impl/TimesheetServiceImpl.java
    }
    public TimesheetResponse createTimesheetAndReturnDto(Long tutorId, Long courseId, LocalDate weekStartDate,
                                                        BigDecimal hours, BigDecimal hourlyRate, String description,
                                                        Long creatorId) {
        
        Timesheet createdTimesheet = createTimesheet(tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);
        
        return timesheetMapper.toResponse(createdTimesheet);
    }
    @Transactional(readOnly = true)
    public PagedTimesheetResponse getTimesheetsAsDto(Long tutorId, Long courseId, ApprovalStatus status, 
                                                    Long requesterId, Pageable pageable) {
        
        Page<Timesheet> timesheetsPage = getTimesheets(tutorId, courseId, status, requesterId, pageable);
        
        return timesheetMapper.toPagedResponse(timesheetsPage);
    }

    @Transactional(readOnly = true)
    public Optional<TimesheetResponse> getTimesheetByIdAsDto(Long id, Long requesterId) {
        
        Optional<Timesheet> timesheetOpt = getTimesheetById(id, requesterId);
        
        return timesheetOpt.map(timesheetMapper::toResponse);
    }
    @PreAuthorize("@timesheetApplicationService.canUserEditTimesheetAuth(#timesheetId, authentication)")
    public TimesheetResponse updateTimesheetAndReturnDto(Long timesheetId, BigDecimal hours, BigDecimal hourlyRate, 
                                                        String description, Long requesterId) {
        
        Timesheet updatedTimesheet = updateTimesheet(timesheetId, hours, hourlyRate, description, requesterId);
        
        return timesheetMapper.toResponse(updatedTimesheet);
    }

    @Transactional(readOnly = true)
    public PagedTimesheetResponse getTimesheetsByTutorAsDto(Long tutorId, Pageable pageable) {
        
        Page<Timesheet> timesheetPage = getTimesheetsByTutor(tutorId, pageable);
        
        return timesheetMapper.toPagedResponse(timesheetPage);
    }

    @Transactional(readOnly = true, timeout = 30)
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public PagedTimesheetResponse getPendingApprovalTimesheetsAsDto(Long requesterId, Pageable pageable) {
        
        Page<Timesheet> timesheetPage = getPendingApprovalTimesheets(requesterId, pageable);
        
        return timesheetMapper.toPagedResponse(timesheetPage);
    }

    @Transactional(readOnly = true)
    public Page<Timesheet> getLecturerFinalApprovalQueue(Long requesterId, Pageable pageable) {
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + requesterId));

        switch (requester.getRole()) {
            case LECTURER:
                return timesheetRepository.findApprovedByTutorByCourses(requester.getId(), pageable);
            case ADMIN:
                return timesheetRepository.findByStatus(ApprovalStatus.APPROVED_BY_TUTOR, pageable);
            default:
                throw new SecurityException("Only LECTURER or ADMIN can view lecturer final approval queue");
        }
    }

    @Transactional(readOnly = true)
    public PagedTimesheetResponse getLecturerFinalApprovalQueueAsDto(Long requesterId, Pageable pageable) {
        Page<Timesheet> page = getLecturerFinalApprovalQueue(requesterId, pageable);
        return timesheetMapper.toPagedResponse(page);
    }

    private void validateCreateTimesheetPreconditions(Long tutorId, Long courseId, LocalDate weekStartDate,
                                                    BigDecimal hours, BigDecimal hourlyRate, String description, 
                                                    Long creatorId) {
        if (creatorId == null) {
            throw new IllegalArgumentException("Precondition violated: Creator ID must be provided");
        }
        if (tutorId == null) {
            throw new IllegalArgumentException("Precondition violated: Tutor ID must be provided");
        }
        if (courseId == null) {
            throw new IllegalArgumentException("Precondition violated: Course ID must be provided");
        }
        if (weekStartDate == null) {
            throw new IllegalArgumentException("Precondition violated: Week start date must be provided");
        }
        if (hours == null || hours.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Precondition violated: Hours must be positive. Provided: " + hours);
        }
        if (hourlyRate == null || hourlyRate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Precondition violated: Hourly rate must be positive. Provided: " + hourlyRate);
        }
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Precondition violated: Description must not be empty");
        }
    }

    private User findUserByIdOrThrow(Long userId, String errorMessage) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException(errorMessage + " with ID: " + userId));
    }

    private Course findCourseByIdOrThrow(Long courseId, String errorMessage) {
        return courseRepository.findById(courseId)
            .orElseThrow(() -> new IllegalArgumentException(errorMessage + " with ID: " + courseId));
    }

    private void validateCreatorAuthorization(User creator) {
        if (creator.getRole() != UserRole.LECTURER) {
            throw new SecurityException("Authorization violated: Only LECTURER users can create timesheets. " +
                "Creator role: " + creator.getRole() + " (ID: " + creator.getId() + ")");
        }
    }

    private void validateTutorRole(User tutor) {
        if (tutor.getRole() != UserRole.TUTOR) {
            throw new IllegalArgumentException("Business rule violated: User assigned as tutor must have TUTOR role. " +
                "User role: " + tutor.getRole() + " (ID: " + tutor.getId() + ")");
        }
    }

    private void validateLecturerCourseAssignment(User creator, Course course) {
        if (!course.getLecturerId().equals(creator.getId())) {
            throw new SecurityException("Authorization violated: LECTURER can only create timesheets for courses they are assigned to. " +
                "Lecturer ID: " + creator.getId() + ", Course lecturer ID: " + course.getLecturerId() + " (Course: " + course.getId() + ")");
        }
    }

    private void validateWeekStartDate(LocalDate weekStartDate) {
        if (weekStartDate.getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Business rule violated: Week start date must be a Monday. " +
                "Provided date: " + weekStartDate + " (" + weekStartDate.getDayOfWeek() + ")");
        }
    }

    private void validateTimesheetUniqueness(Long tutorId, Long courseId, LocalDate weekStartDate) {
        if (timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(tutorId, courseId, weekStartDate)) {
            throw new IllegalArgumentException("Business rule violated: Timesheet already exists for this tutor, course, and week. " +
                "Tutor ID: " + tutorId + ", Course ID: " + courseId + ", Week: " + weekStartDate);
        }
    }

    private void validateCreateTimesheetPostconditions(Timesheet savedTimesheet, Long tutorId, Long courseId, 
                                                     Long creatorId, LocalDate weekStartDate) {
        if (savedTimesheet == null) {
            throw new IllegalStateException("Postcondition violated: Created timesheet must not be null");
        }
        
        if (savedTimesheet.getStatus() != ApprovalStatus.DRAFT) {
            throw new IllegalStateException("Postcondition violated: New timesheets must start in DRAFT status. " +
                "Actual status: " + savedTimesheet.getStatus());
        }
        
        if (!savedTimesheet.getTutorId().equals(tutorId)) {
            throw new IllegalStateException("Postcondition violated: Timesheet must be assigned to correct tutor. " +
                "Expected: " + tutorId + ", Actual: " + savedTimesheet.getTutorId());
        }
        
        if (!savedTimesheet.getCourseId().equals(courseId)) {
            throw new IllegalStateException("Postcondition violated: Timesheet must be assigned to correct course. " +
                "Expected: " + courseId + ", Actual: " + savedTimesheet.getCourseId());
        }
        
        if (!savedTimesheet.getCreatedBy().equals(creatorId)) {
            throw new IllegalStateException("Postcondition violated: Creator must be properly recorded. " +
                "Expected: " + creatorId + ", Actual: " + savedTimesheet.getCreatedBy());
        }
        
        if (!savedTimesheet.getWeekStartDate().equals(weekStartDate)) {
            throw new IllegalStateException("Postcondition violated: Week start date must be preserved. " +
                "Expected: " + weekStartDate + ", Actual: " + savedTimesheet.getWeekStartDate());
        }
        
        if (!timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(tutorId, courseId, weekStartDate)) {
            throw new IllegalStateException("Postcondition violated: Timesheet must be persisted in repository");
        }
    }}