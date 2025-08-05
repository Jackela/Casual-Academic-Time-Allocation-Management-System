package com.usyd.catams.application;

import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.mapper.TimesheetMapper;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Application Service for Timesheet operations following DDD principles.
 * 
 * This service handles application-level concerns including:
 * - Transaction management
 * - Security enforcement
 * - Repository orchestration
 * - DTO conversion
 * - External system integration
 * 
 * Domain logic is delegated to TimesheetDomainService.
 */
@Service
@Transactional
public class TimesheetApplicationService implements TimesheetService {

    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final TimesheetDomainService timesheetDomainService;
    private final TimesheetMapper timesheetMapper;

    @Autowired
    public TimesheetApplicationService(TimesheetRepository timesheetRepository,
                                     UserRepository userRepository,
                                     CourseRepository courseRepository,
                                     TimesheetDomainService timesheetDomainService,
                                     TimesheetMapper timesheetMapper) {
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.timesheetDomainService = timesheetDomainService;
        this.timesheetMapper = timesheetMapper;
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

        // Validate week start date - must be Monday  
        if (weekStartDate.getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday. Provided date: " + weekStartDate + " (" + weekStartDate.getDayOfWeek() + ")");
        }

        // Check for duplicate timesheet (repository-level concern)
        if (timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutorId, courseId, weekStartDate)) {
            throw new IllegalArgumentException("Timesheet already exists for this tutor, course, and week. " +
                "Tutor ID: " + tutorId + ", Course ID: " + courseId + ", Week: " + weekStartDate);
        }

        // Delegate domain validation to domain service
        String sanitizedDescription = timesheetDomainService.validateTimesheetCreation(
            creator, tutor, course, weekStartDate, hours, hourlyRate, description);
        
        // Create and persist the timesheet (application responsibility)
        Timesheet timesheet = new Timesheet(tutorId, courseId, weekStartDate, hours, hourlyRate, sanitizedDescription, creatorId);
        
        return timesheetRepository.save(timesheet);
    }

    @Override
    public String validateTimesheetCreation(Long tutorId, Long courseId, LocalDate weekStartDate,
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

        // Validate week start date - must be Monday  
        if (weekStartDate.getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday. Provided date: " + weekStartDate + " (" + weekStartDate.getDayOfWeek() + ")");
        }

        // Check for duplicate timesheet (repository-level concern)
        if (timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutorId, courseId, weekStartDate)) {
            throw new IllegalArgumentException("Timesheet already exists for this tutor, course, and week. " +
                "Tutor ID: " + tutorId + ", Course ID: " + courseId + ", Week: " + weekStartDate);
        }

        // Delegate domain validation to domain service
        return timesheetDomainService.validateTimesheetCreation(
            creator, tutor, course, weekStartDate, hours, hourlyRate, description);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Timesheet> getTimesheets(Long tutorId, Long courseId, ApprovalStatus status,
                                       Long requesterId, Pageable pageable) {
        
        // Load requester for access control
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
                    
                    if (!timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course)) {
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
                
                if (!timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course)) {
                    throw new SecurityException("LECTURER can only view timesheets for courses they teach");
                }
                return timesheetOpt;
                
            case TUTOR:
                // TUTOR can only view their own timesheets
                if (!timesheetDomainService.isTutorOwnerOfTimesheet(requester, timesheet)) {
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
        return timesheetDomainService.calculateTotalPay(timesheet.getHours(), timesheet.getHourlyRate());
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
    }

    @Override
    @PreAuthorize("@timesheetApplicationService.canUserEditTimesheetAuth(#timesheetId, authentication)")
    public Timesheet updateTimesheet(Long timesheetId, BigDecimal hours, BigDecimal hourlyRate, 
                                   String description, Long requesterId) {
        
        // Load timesheet and requester
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Validate timesheet is in editable state based on user role (domain logic)
        if (!timesheetDomainService.canRoleEditTimesheetWithStatus(requester.getRole(), timesheet.getStatus())) {
            if (requester.getRole() == UserRole.TUTOR) {
                throw new IllegalArgumentException("TUTOR can only update timesheets with REJECTED status. " +
                    "Current status: " + timesheet.getStatus());
            } else {
                throw new IllegalArgumentException("Cannot update timesheet with status: " + timesheet.getStatus() + 
                    ". Only DRAFT timesheets can be updated.");
            }
        }

        // Validate update data using domain service
        timesheetDomainService.validateUpdateData(hours, hourlyRate, description);

        // Update the timesheet fields
        timesheet.setHours(hours);
        timesheet.setHourlyRate(hourlyRate);
        timesheet.setDescription(description);
        
        // Handle status transition for TUTOR updates (domain logic)
        ApprovalStatus newStatus = timesheetDomainService.getStatusAfterTutorUpdate(timesheet.getStatus());
        timesheet.setStatus(newStatus);
        
        // Save and return updated timesheet
        return timesheetRepository.save(timesheet);
    }

    @Override
    @PreAuthorize("@timesheetApplicationService.canUserEditTimesheetAuth(#timesheetId, authentication)")
    public void deleteTimesheet(Long timesheetId, Long requesterId) {
        
        // Load timesheet and requester
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Validate timesheet is in deletable state based on user role (domain logic)
        if (!timesheetDomainService.canRoleDeleteTimesheetWithStatus(requester.getRole(), timesheet.getStatus())) {
            if (requester.getRole() == UserRole.TUTOR) {
                throw new IllegalArgumentException("TUTOR can only delete timesheets with REJECTED status. " +
                    "Current status: " + timesheet.getStatus());
            } else {
                throw new IllegalArgumentException("Cannot delete timesheet with status: " + timesheet.getStatus() + 
                    ". Only DRAFT timesheets can be deleted.");
            }
        }

        // Perform physical deletion
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
                
                return timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course);
                
            case TUTOR:
                // TUTOR cannot directly modify timesheets (use domain service)
                return timesheetDomainService.canRoleModifyTimesheets(requester.getRole());
                
            default:
                return false;
        }
    }

    @Override
    @Transactional(readOnly = true, timeout = 30)  
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public Page<Timesheet> getPendingApprovalTimesheets(Long requesterId, Pageable pageable) {
        
        // Load user for role-based filtering
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + requesterId));

        // Check role-based access control
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
        // Load timesheet and requester
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));
        
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
                
                return timesheetDomainService.hasLecturerAuthorityOverCourse(requester, course);
                
            case TUTOR:
                // TUTOR can only edit their own REJECTED timesheets (use domain service)
                return timesheetDomainService.isTutorOwnerOfTimesheet(requester, timesheet) && 
                       timesheetDomainService.canRoleEditTimesheetWithStatus(requester.getRole(), timesheet.getStatus());
                
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

    // DTO-based methods for controller layer

    /**
     * Create timesheet and return DTO response.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    public TimesheetResponse createTimesheetAndReturnDto(Long tutorId, Long courseId, LocalDate weekStartDate,
                                                        BigDecimal hours, BigDecimal hourlyRate, String description,
                                                        Long creatorId) {
        
        // Create timesheet (existing logic)
        Timesheet createdTimesheet = createTimesheet(tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);
        
        // Convert to DTO
        return timesheetMapper.toResponse(createdTimesheet);
    }

    /**
     * Get timesheets and return DTO response.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    @Transactional(readOnly = true)
    public PagedTimesheetResponse getTimesheetsAsDto(Long tutorId, Long courseId, ApprovalStatus status, 
                                                    Long requesterId, Pageable pageable) {
        
        // Get timesheets (existing logic)
        Page<Timesheet> timesheetsPage = getTimesheets(tutorId, courseId, status, requesterId, pageable);
        
        // Convert to DTO
        return timesheetMapper.toPagedResponse(timesheetsPage);
    }

    /**
     * Get timesheet by ID and return DTO response.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    @Transactional(readOnly = true)
    public Optional<TimesheetResponse> getTimesheetByIdAsDto(Long id, Long requesterId) {
        
        // Get timesheet (existing logic)
        Optional<Timesheet> timesheetOpt = getTimesheetById(id, requesterId);
        
        // Convert to DTO
        return timesheetOpt.map(timesheetMapper::toResponse);
    }

    /**
     * Update timesheet and return DTO response.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    @PreAuthorize("@timesheetApplicationService.canUserEditTimesheetAuth(#timesheetId, authentication)")
    public TimesheetResponse updateTimesheetAndReturnDto(Long timesheetId, BigDecimal hours, BigDecimal hourlyRate, 
                                                        String description, Long requesterId) {
        
        // Update timesheet (existing logic)
        Timesheet updatedTimesheet = updateTimesheet(timesheetId, hours, hourlyRate, description, requesterId);
        
        // Convert to DTO
        return timesheetMapper.toResponse(updatedTimesheet);
    }

    /**
     * Get timesheets by tutor and return DTO response.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    @Transactional(readOnly = true)
    public PagedTimesheetResponse getTimesheetsByTutorAsDto(Long tutorId, Pageable pageable) {
        
        // Get timesheets (existing logic)
        Page<Timesheet> timesheetPage = getTimesheetsByTutor(tutorId, pageable);
        
        // Convert to DTO
        return timesheetMapper.toPagedResponse(timesheetPage);
    }

    /**
     * Get pending approval timesheets and return DTO response.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    @Transactional(readOnly = true, timeout = 30)
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public PagedTimesheetResponse getPendingApprovalTimesheetsAsDto(Long requesterId, Pageable pageable) {
        
        // Get timesheets (existing logic)
        Page<Timesheet> timesheetPage = getPendingApprovalTimesheets(requesterId, pageable);
        
        // Convert to DTO
        return timesheetMapper.toPagedResponse(timesheetPage);
    }
}