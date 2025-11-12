package com.usyd.catams.application.course;

import com.usyd.catams.application.course.dto.CourseDto;
import com.usyd.catams.application.decision.DecisionService;
import com.usyd.catams.application.decision.dto.PermissionCheckRequest;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.repository.TimesheetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Course Application Service Implementation
 * 
 * This service implements the CourseManagementService interface, providing comprehensive
 * course-related operations that integrate with multiple repositories and domain services.
 * It handles the complex mapping between Course entities and CourseDto objects, aggregating
 * data from multiple sources.
 * 
 * Design Principles:
 * - Integrates with existing repositories (Course, User, Timesheet)
 * - Provides rich DTO mapping with calculated fields
 * - Handles business logic for course operations
 * - Integrates with DecisionService for permission checks
 * - Future-ready for microservices extraction
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@Service
public class CourseApplicationService implements CourseManagementService {
    
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final TimesheetRepository timesheetRepository;
    private final DecisionService decisionService;
    
    @Autowired
    public CourseApplicationService(CourseRepository courseRepository,
                                  UserRepository userRepository,
                                  TimesheetRepository timesheetRepository,
                                  DecisionService decisionService) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.timesheetRepository = timesheetRepository;
        this.decisionService = decisionService;
    }
    
    @Override
    public Optional<CourseDto> getCourseById(Long courseId) {
        return courseRepository.findById(courseId)
            .map(this::convertToDto);
    }
    
    @Override
    public Optional<CourseDto> getCourseByCode(String courseCode) {
        return courseRepository.findByCode(courseCode)
            .map(this::convertToDto);
    }
    
    @Override
    public List<CourseDto> getCoursesByLecturer(Long lecturerId) {
        List<Course> courses = courseRepository.findByLecturerId(lecturerId);
        return courses.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }
    
    @Override
    public List<CourseDto> getCoursesByTutor(Long tutorId) {
        // Get courses where the tutor has timesheets
        List<Timesheet> timesheets = timesheetRepository.findByTutorId(tutorId);
        List<Long> courseIds = timesheets.stream()
            .map(Timesheet::getCourseId)
            .distinct()
            .collect(Collectors.toList());
        List<Course> courses = courseRepository.findAllById(courseIds);
        return courses.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }
    
    @Override
    public boolean isLecturerOfCourse(Long userId, Long courseId) {
        return courseRepository.findById(courseId)
            .map(course -> course.getLecturerId().equals(userId))
            .orElse(false);
    }
    
    @Override
    public boolean isTutorOfCourse(Long userId, Long courseId) {
        // Check if user has any timesheets for this course
        List<Timesheet> timesheets = timesheetRepository.findByTutorIdAndCourseId(userId, courseId);
        return !timesheets.isEmpty();
    }
    
    @Override
    public List<CourseDto> getActiveCourses() {
        List<Course> courses = courseRepository.findByIsActive(true);
        return courses.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }
    
    @Override
    public List<CourseDto> getCoursesBySemesterAndYear(String semester, Integer year) {
        List<Course> courses;
        if (semester != null && year != null) {
            // For now, search by semester since Course entity doesn't have separate year field
            courses = courseRepository.findBySemester(semester);
            // Filter by year if needed based on business logic
            courses = courses.stream()
                .filter(course -> isCourseFromYear(course, year))
                .collect(Collectors.toList());
        } else if (semester != null) {
            courses = courseRepository.findBySemester(semester);
        } else {
            courses = courseRepository.findAll();
        }
        
        return courses.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }
    
    @Override
    public Optional<CourseDto> getCourseForTimesheetOperations(Long courseId) {
        return courseRepository.findById(courseId)
            .filter(course -> Boolean.TRUE.equals(course.getIsActive()))
            .map(this::convertToDtoWithTimesheetInfo);
    }
    
    @Override
    public boolean isCourseActiveAndValid(Long courseId) {
        return courseRepository.findById(courseId)
            .map(course -> Boolean.TRUE.equals(course.getIsActive()))
            .orElse(false);
    }
    
    @Override
    public Optional<CourseDto> getCourseBudgetInfo(Long courseId) {
        return courseRepository.findById(courseId)
            .map(this::convertToDtoWithBudgetFocus);
    }
    
    @Override
    public boolean hasUserCourseRelationship(Long userId, Long courseId) {
        // Check if user is lecturer
        if (isLecturerOfCourse(userId, courseId)) {
            return true;
        }
        
        // Check if user is tutor
        return isTutorOfCourse(userId, courseId);
    }
    
    @Override
    public Optional<CourseDto> getCourseCapacityInfo(Long courseId) {
        return courseRepository.findById(courseId)
            .map(this::convertToDtoWithCapacityInfo);
    }
    
    @Override
    public boolean canAssignMoreTutors(Long courseId) {
        Optional<CourseDto> courseDto = getCourseCapacityInfo(courseId);
        return courseDto.map(CourseDto::hasTutorSlots).orElse(false);
    }
    
    @Override
    public List<CourseDto> getCoursesNeedingTutors() {
        List<Course> courses = courseRepository.findByIsActive(true);
        return courses.stream()
            .map(this::convertToDtoWithCapacityInfo)
            .filter(CourseDto::hasTutorSlots)
            .collect(Collectors.toList());
    }
    
    @Override
    public boolean canUserPerformCourseOperation(Long courseId, Long userId, String operation) {
        try {
            Optional<User> user = userRepository.findById(userId);
            if (user.isEmpty()) {
                return false;
            }
            
            PermissionCheckRequest request = PermissionCheckRequest.builder()
                .userId(userId.toString())
                .userRole(user.get().getRole())
                .action(operation)
                .resourceType("COURSE")
                .resourceId(courseId.toString())
                .build();
                
            return decisionService.checkPermission(request);
        } catch (Exception e) {
            return false; // Deny access on error
        }
    }
    
    // Private helper methods for entity to DTO conversion
    
    private CourseDto convertToDto(Course course) {
        User lecturer = userRepository.findById(course.getLecturerId()).orElse(null);
        int currentTutors = getCurrentTutorCount(course.getId());
        
        return CourseDto.builder()
            .id(course.getId())
            .courseCode(course.getCode())
            .courseName(course.getName())
            .description(null) // Not available in current entity
            .semester(course.getSemester())
            .year(extractYearFromSemester(course.getSemester()))
            .lecturerId(course.getLecturerId())
            .lecturerName(lecturer != null ? lecturer.getName() : "Unknown")
            .lecturerEmail(lecturer != null ? lecturer.getEmail() : null)
            .active(Boolean.TRUE.equals(course.getIsActive()))
            .startDate(null) // Not available in current entity
            .endDate(null) // Not available in current entity
            .maxStudents(null) // Not available in current entity
            .currentEnrollment(0) // Not available in current entity
            .maxTutors(null) // Not available in current entity - could be configured
            .currentTutors(currentTutors)
            .budgetLimit(course.getBudgetAllocated())
            .budgetUsed(course.getBudgetUsed())
            .defaultHourlyRate(getDefaultHourlyRateForCourse(course))
            .createdAt(course.getCreatedAt())
            .updatedAt(course.getUpdatedAt())
            .build();
    }
    
    private CourseDto convertToDtoWithTimesheetInfo(Course course) {
        CourseDto baseDto = convertToDto(course);
        // Add any specific timesheet-related information
        return baseDto;
    }
    
    private CourseDto convertToDtoWithBudgetFocus(Course course) {
        CourseDto baseDto = convertToDto(course);
        // Budget information is already included in base conversion
        return baseDto;
    }
    
    private CourseDto convertToDtoWithCapacityInfo(Course course) {
        User lecturer = userRepository.findById(course.getLecturerId()).orElse(null);
        int currentTutors = getCurrentTutorCount(course.getId());
        
        // For capacity info, we might have business rules about max tutors
        Integer maxTutors = calculateMaxTutors(course);
        
        return CourseDto.builder()
            .id(course.getId())
            .courseCode(course.getCode())
            .courseName(course.getName())
            .description(null)
            .semester(course.getSemester())
            .year(extractYearFromSemester(course.getSemester()))
            .lecturerId(course.getLecturerId())
            .lecturerName(lecturer != null ? lecturer.getName() : "Unknown")
            .lecturerEmail(lecturer != null ? lecturer.getEmail() : null)
            .active(Boolean.TRUE.equals(course.getIsActive()))
            .startDate(null)
            .endDate(null)
            .maxStudents(null)
            .currentEnrollment(0)
            .maxTutors(maxTutors)
            .currentTutors(currentTutors)
            .budgetLimit(course.getBudgetAllocated())
            .budgetUsed(course.getBudgetUsed())
            .defaultHourlyRate(getDefaultHourlyRateForCourse(course))
            .createdAt(course.getCreatedAt())
            .updatedAt(course.getUpdatedAt())
            .build();
    }
    
    private int getCurrentTutorCount(Long courseId) {
        // Count distinct tutors who have timesheets for this course
        List<Timesheet> timesheets = timesheetRepository.findByCourseId(courseId);
        return (int) timesheets.stream()
            .map(Timesheet::getTutorId)
            .distinct()
            .count();
    }
    
    private Integer extractYearFromSemester(String semester) {
        if (semester == null || semester.trim().isEmpty()) {
            return LocalDate.now().getYear();
        }

        // Try to extract year from semester string
        try {
            // Check if string contains a 4-digit year anywhere
            if (semester.matches(".*\\d{4}.*")) {
                // Extract 4-digit year from string
                String yearStr = semester.replaceAll(".*?(\\d{4}).*", "$1");
                return Integer.parseInt(yearStr);
            }
        } catch (NumberFormatException e) {
            // If parsing fails, return current year as default
            return LocalDate.now().getYear();
        }

        return LocalDate.now().getYear(); // Default to current year
    }
    
    private BigDecimal getDefaultHourlyRateForCourse(Course course) {
        // This could be based on course level, budget, or other factors
        String courseCode = course.getCode();
        
        // Basic business logic for default rates
        if (courseCode.matches(".*[123]\\d{3}.*")) {
            // Undergraduate courses (1000-3000 level)
            return new BigDecimal("35.00");
        } else if (courseCode.matches(".*[456]\\d{3}.*")) {
            // Postgraduate courses (4000-6000 level)
            return new BigDecimal("42.00");
        } else if (courseCode.matches(".*[789]\\d{3}.*")) {
            // Research/PhD courses (7000+ level)
            return new BigDecimal("50.00");
        }
        
        // Default rate
        return new BigDecimal("38.00");
    }
    
    private Integer calculateMaxTutors(Course course) {
        // Business logic for calculating max tutors based on budget and course type
        BigDecimal budget = course.getBudgetAllocated();
        BigDecimal defaultRate = getDefaultHourlyRateForCourse(course);
        
        if (budget != null && defaultRate != null && budget.compareTo(BigDecimal.ZERO) > 0) {
            // Assume each tutor works ~100 hours per semester on average
            BigDecimal hoursPerTutor = new BigDecimal("100");
            BigDecimal costPerTutor = defaultRate.multiply(hoursPerTutor);
            
            // Use 80% of budget for tutor costs (20% buffer for other expenses)
            BigDecimal availableBudget = budget.multiply(new BigDecimal("0.8"));
            
            int maxTutors = availableBudget.divide(costPerTutor, 0, java.math.RoundingMode.DOWN).intValue();
            
            // Set reasonable bounds (1-10 tutors per course)
            return Math.max(1, Math.min(maxTutors, 10));
        }
        
        // Default to 3 tutors if calculation not possible
        return 3;
    }
    
    private boolean isCourseFromYear(Course course, Integer year) {
        // Simple check - could be enhanced with actual course start/end dates
        Integer courseYear = extractYearFromSemester(course.getSemester());
        return courseYear != null && courseYear.equals(year);
    }
}