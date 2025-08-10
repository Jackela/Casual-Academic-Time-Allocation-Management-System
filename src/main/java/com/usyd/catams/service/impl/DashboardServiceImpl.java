package com.usyd.catams.service.impl;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.dto.response.*;
import com.usyd.catams.entity.Course;
import com.usyd.catams.enums.ActivityType;
import com.usyd.catams.enums.PendingItemType;
import com.usyd.catams.enums.Priority;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.AuthenticationException;
import com.usyd.catams.exception.BusinessException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Dashboard service implementation with role-based data aggregation
 * 
 * Provides efficient dashboard summaries using direct repository aggregation queries
 * to minimize memory usage and maximize performance. Enforces strict role-based
 * access control and data filtering.
 * 
 * @author Development Team
 * @since 1.0
 */
@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final TimesheetRepository timesheetRepository;
    private final CourseRepository courseRepository;

    @Autowired
    public DashboardServiceImpl(TimesheetRepository timesheetRepository,
                               CourseRepository courseRepository) {
        this.timesheetRepository = timesheetRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    public DashboardSummaryResponse getDashboardSummary(Long userId, UserRole role, 
                                                       Optional<Long> courseId, 
                                                       LocalDate startDate, LocalDate endDate) {
        if (role == null) {
            throw new AuthenticationException("Invalid user role");
        }
        
        switch (role) {
            case TUTOR:
                // TUTORs can only see their own data
                if (courseId.isPresent()) {
                    throw new BusinessException("VALIDATION_FAILED", "TUTORs cannot filter by course");
                }
                return getTutorDashboard(userId, startDate, endDate);
                
            case LECTURER:
                // LECTURERs can only see data for courses they manage
                validateLecturerAccess(userId, courseId);
                return getLecturerDashboard(userId, courseId, startDate, endDate);
                
            case ADMIN:
                // ADMINs have system-wide access
                return getAdminDashboard(courseId, startDate, endDate);
                
            default:
                throw new AuthenticationException("Invalid user role");
        }
    }

    /**
     * Generate TUTOR-specific dashboard summary.
     * Aggregates personal timesheet data for the authenticated tutor.
     */
    private DashboardSummaryResponse getTutorDashboard(Long tutorId, LocalDate startDate, LocalDate endDate) {
        // Use efficient aggregation query to get summary data
        TimesheetSummaryData summaryData = timesheetRepository.findTimesheetSummaryByTutor(
            tutorId, startDate, endDate);

        return new DashboardSummaryResponse(
            summaryData.getTotalTimesheets().intValue(),
            summaryData.getPendingApprovals().intValue(),
            summaryData.getTotalHours(),
            summaryData.getTotalPay(),
            null, // TUTORs don't see budget information
            getRecentActivitiesForTutor(tutorId),
            getPendingItemsForTutor(tutorId),
            getWorkloadAnalysisForTutor(tutorId, startDate, endDate)
        );
    }

    /**
     * Generate LECTURER-specific dashboard summary.
     * Aggregates data for courses managed by the lecturer.
     */
    private DashboardSummaryResponse getLecturerDashboard(Long lecturerId, Optional<Long> courseId, 
                                                         LocalDate startDate, LocalDate endDate) {
        List<Course> managedCourses;
        TimesheetSummaryData summaryData;

        if (courseId.isPresent()) {
            // Filter to specific course
            Course course = courseRepository.findById(courseId.get())
                .orElseThrow(() -> new BusinessException("RESOURCE_NOT_FOUND", 
                    "Course with id " + courseId.get() + " not found"));
            managedCourses = List.of(course);
            summaryData = timesheetRepository.findTimesheetSummaryByCourse(
                courseId.get(), startDate, endDate);
        } else {
            // Get all courses managed by this lecturer
            managedCourses = courseRepository.findByLecturerIdAndIsActive(lecturerId, true);
            System.out.println("DEBUG: Lecturer " + lecturerId + " has " + managedCourses.size() + " courses");
            List<Long> courseIds = managedCourses.stream()
                .map(Course::getId)
                .collect(Collectors.toList());
            System.out.println("DEBUG: Course IDs: " + courseIds);
            
            if (courseIds.isEmpty()) {
                // Lecturer has no active courses
                summaryData = new TimesheetSummaryData(0L, BigDecimal.ZERO, BigDecimal.ZERO, 0L);
            } else {
                summaryData = timesheetRepository.findTimesheetSummaryByCourses(
                    courseIds, startDate, endDate);
                System.out.println("DEBUG: Summary data: " + summaryData.getTotalTimesheets() + " timesheets");
            }
        }

        return new DashboardSummaryResponse(
            summaryData.getTotalTimesheets().intValue(),
            summaryData.getPendingApprovals().intValue(),
            summaryData.getTotalHours(),
            summaryData.getTotalPay(),
            calculateBudgetUsage(managedCourses, summaryData.getTotalPay()),
            getRecentActivitiesForCourses(managedCourses),
            getPendingItemsForLecturer(lecturerId),
            getWorkloadAnalysisForCourses(managedCourses, startDate, endDate)
        );
    }

    /**
     * Generate ADMIN-specific dashboard summary.
     * Provides system-wide administrative metrics.
     */
    private DashboardSummaryResponse getAdminDashboard(Optional<Long> courseId, 
                                                      LocalDate startDate, LocalDate endDate) {
        TimesheetSummaryData summaryData;

        if (courseId.isPresent()) {
            summaryData = timesheetRepository.findTimesheetSummaryByCourse(
                courseId.get(), startDate, endDate);
        } else {
            summaryData = timesheetRepository.findTimesheetSummarySystemWide(
                startDate, endDate);
        }

        return new DashboardSummaryResponse(
            summaryData.getTotalTimesheets().intValue(),
            summaryData.getPendingApprovals().intValue(),
            summaryData.getTotalHours(),
            summaryData.getTotalPay(),
            calculateSystemWideBudgetUsage(courseId),
            getSystemWideRecentActivities(),
            getPendingItemsForAdmin(),
            getSystemWideWorkloadAnalysis(startDate, endDate)
        );
    }

    /**
     * Validate lecturer access to course filtering.
     */
    private void validateLecturerAccess(Long lecturerId, Optional<Long> courseId) {
        if (courseId.isPresent()) {
            boolean hasAccess = courseRepository.existsByIdAndLecturerId(courseId.get(), lecturerId);
            if (!hasAccess) {
                throw new BusinessException("ACCESS_DENIED", 
                    "Lecturer does not have access to this course");
            }
        }
    }

    /**
     * Calculate budget usage for LECTURER dashboard.
     */
    private BudgetUsage calculateBudgetUsage(List<Course> courses, BigDecimal usedBudget) {
        BigDecimal totalBudget = courses.stream()
            .map(Course::getBudgetAllocated)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalBudget.compareTo(BigDecimal.ZERO) == 0) {
            return new BudgetUsage(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        BigDecimal remainingBudget = totalBudget.subtract(usedBudget);
        BigDecimal utilizationPercentage = usedBudget
            .divide(totalBudget, 4, RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100"))
            .setScale(2, RoundingMode.HALF_UP);

        return new BudgetUsage(totalBudget, usedBudget, remainingBudget, utilizationPercentage);
    }

    /**
     * Calculate system-wide budget usage for ADMIN dashboard.
     */
    private BudgetUsage calculateSystemWideBudgetUsage(Optional<Long> courseId) {
        if (courseId.isPresent()) {
            Course course = courseRepository.findById(courseId.get())
                .orElseThrow(() -> new BusinessException("RESOURCE_NOT_FOUND", 
                    "Course with id " + courseId.get() + " not found"));
            return calculateBudgetUsage(List.of(course), course.getBudgetUsed());
        } else {
            List<Course> allActiveCourses = courseRepository.findByIsActive(true);
            BigDecimal totalUsed = allActiveCourses.stream()
                .map(Course::getBudgetUsed)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            return calculateBudgetUsage(allActiveCourses, totalUsed);
        }
    }

    /**
     * Get recent activities for TUTOR.
     */
    private List<RecentActivity> getRecentActivitiesForTutor(Long tutorId) {
        // For MVP, return mock data - will be implemented with actual activity tracking
        List<RecentActivity> activities = new ArrayList<>();
        activities.add(new RecentActivity(
            1L, ActivityType.TIMESHEET_SUBMITTED, "Timesheet submitted for approval", 
            LocalDateTime.now().minus(1, ChronoUnit.DAYS), 1L, tutorId, "You"
        ));
        return activities;
    }

    /**
     * Get recent activities for LECTURER courses.
     */
    private List<RecentActivity> getRecentActivitiesForCourses(List<Course> courses) {
        // For MVP, return mock data - will be implemented with actual activity tracking
        List<RecentActivity> activities = new ArrayList<>();
        if (!courses.isEmpty()) {
            activities.add(new RecentActivity(
                2L, ActivityType.TIMESHEET_SUBMITTED, "New timesheet submitted for " + courses.get(0).getName(), 
                LocalDateTime.now().minus(2, ChronoUnit.HOURS), 2L, 1L, "Alice Johnson"
            ));
        }
        return activities;
    }

    /**
     * Get system-wide recent activities for ADMIN.
     */
    private List<RecentActivity> getSystemWideRecentActivities() {
        // For MVP, return mock data - will be implemented with actual activity tracking
        List<RecentActivity> activities = new ArrayList<>();
        activities.add(new RecentActivity(
            3L, ActivityType.TIMESHEET_APPROVED, "System-wide timesheet activity", 
            LocalDateTime.now().minus(1, ChronoUnit.HOURS), 3L, 1L, "System User"
        ));
        return activities;
    }

    /**
     * Get pending items for TUTOR.
     */
    private List<PendingItem> getPendingItemsForTutor(Long tutorId) {
        // For MVP, return mock data - will be implemented with actual pending item tracking
        return new ArrayList<>();
    }

    /**
     * Get pending items for LECTURER.
     */
    private List<PendingItem> getPendingItemsForLecturer(Long lecturerId) {
        // For MVP, return mock data - will be implemented with actual pending item tracking
        List<PendingItem> items = new ArrayList<>();
        items.add(new PendingItem(
            1L, PendingItemType.TIMESHEET_APPROVAL, "Review timesheet submissions", 
            "3 timesheets pending your approval", Priority.MEDIUM, 
            LocalDateTime.now().plus(2, ChronoUnit.DAYS), 1L
        ));
        return items;
    }

    /**
     * Get pending items for ADMIN.
     */
    private List<PendingItem> getPendingItemsForAdmin() {
        // For MVP, return mock data - will be implemented with actual pending item tracking
        List<PendingItem> items = new ArrayList<>();
        items.add(new PendingItem(
            2L, PendingItemType.HR_REVIEW, "System-wide reviews needed", 
            "5 items requiring HR attention", Priority.HIGH, 
            LocalDateTime.now().plus(1, ChronoUnit.DAYS), null
        ));
        return items;
    }

    /**
     * Get workload analysis for TUTOR.
     */
    private WorkloadAnalysis getWorkloadAnalysisForTutor(Long tutorId, LocalDate startDate, LocalDate endDate) {
        // Calculate current week and previous week hours
        LocalDate currentWeekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        LocalDate currentWeekEnd = currentWeekStart.plusDays(6);
        LocalDate previousWeekStart = currentWeekStart.minusWeeks(1);
        LocalDate previousWeekEnd = previousWeekStart.plusDays(6);

        TimesheetSummaryData currentWeek = timesheetRepository.findTimesheetSummaryByTutor(
            tutorId, currentWeekStart, currentWeekEnd);
        TimesheetSummaryData previousWeek = timesheetRepository.findTimesheetSummaryByTutor(
            tutorId, previousWeekStart, previousWeekEnd);
        TimesheetSummaryData totalPeriod = timesheetRepository.findTimesheetSummaryByTutor(
            tutorId, startDate, endDate);

        long weeksBetween = ChronoUnit.WEEKS.between(startDate, endDate) + 1;
        BigDecimal averageWeeklyHours = weeksBetween > 0 
            ? totalPeriod.getTotalHours().divide(BigDecimal.valueOf(weeksBetween), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return new WorkloadAnalysis(
            currentWeek.getTotalHours(),
            previousWeek.getTotalHours(),
            averageWeeklyHours,
            currentWeek.getTotalHours().max(previousWeek.getTotalHours()), // Simple peak calculation
            null, // TUTORs don't see tutor counts
            null  // TUTORs don't see tutor counts
        );
    }

    /**
     * Get workload analysis for LECTURER courses.
     */
    private WorkloadAnalysis getWorkloadAnalysisForCourses(List<Course> courses, LocalDate startDate, LocalDate endDate) {
        if (courses.isEmpty()) {
            return new WorkloadAnalysis(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, 0);
        }

        List<Long> courseIds = courses.stream().map(Course::getId).collect(Collectors.toList());
        
        LocalDate currentWeekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        LocalDate currentWeekEnd = currentWeekStart.plusDays(6);
        LocalDate previousWeekStart = currentWeekStart.minusWeeks(1);
        LocalDate previousWeekEnd = previousWeekStart.plusDays(6);

        TimesheetSummaryData currentWeek = timesheetRepository.findTimesheetSummaryByCourses(
            courseIds, currentWeekStart, currentWeekEnd);
        TimesheetSummaryData previousWeek = timesheetRepository.findTimesheetSummaryByCourses(
            courseIds, previousWeekStart, previousWeekEnd);
        TimesheetSummaryData totalPeriod = timesheetRepository.findTimesheetSummaryByCourses(
            courseIds, startDate, endDate);

        long weeksBetween = ChronoUnit.WEEKS.between(startDate, endDate) + 1;
        BigDecimal averageWeeklyHours = weeksBetween > 0 
            ? totalPeriod.getTotalHours().divide(BigDecimal.valueOf(weeksBetween), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        // For MVP, use mock tutor counts - will be implemented with actual data
        int totalTutors = courses.size() * 3; // Estimate
        int activeTutors = courses.size() * 2; // Estimate

        return new WorkloadAnalysis(
            currentWeek.getTotalHours(),
            previousWeek.getTotalHours(),
            averageWeeklyHours,
            currentWeek.getTotalHours().max(previousWeek.getTotalHours()),
            totalTutors,
            activeTutors
        );
    }

    /**
     * Get system-wide workload analysis for ADMIN.
     */
    private WorkloadAnalysis getSystemWideWorkloadAnalysis(LocalDate startDate, LocalDate endDate) {
        LocalDate currentWeekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        LocalDate currentWeekEnd = currentWeekStart.plusDays(6);
        LocalDate previousWeekStart = currentWeekStart.minusWeeks(1);
        LocalDate previousWeekEnd = previousWeekStart.plusDays(6);

        TimesheetSummaryData currentWeek = timesheetRepository.findTimesheetSummarySystemWide(
            currentWeekStart, currentWeekEnd);
        TimesheetSummaryData previousWeek = timesheetRepository.findTimesheetSummarySystemWide(
            previousWeekStart, previousWeekEnd);
        TimesheetSummaryData totalPeriod = timesheetRepository.findTimesheetSummarySystemWide(
            startDate, endDate);

        long weeksBetween = ChronoUnit.WEEKS.between(startDate, endDate) + 1;
        BigDecimal averageWeeklyHours = weeksBetween > 0 
            ? totalPeriod.getTotalHours().divide(BigDecimal.valueOf(weeksBetween), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        // For MVP, use mock tutor counts - will be implemented with actual data
        List<Course> allCourses = courseRepository.findByIsActive(true);
        int totalTutors = allCourses.size() * 4; // Estimate
        int activeTutors = allCourses.size() * 3; // Estimate

        return new WorkloadAnalysis(
            currentWeek.getTotalHours(),
            previousWeek.getTotalHours(),
            averageWeeklyHours,
            currentWeek.getTotalHours().max(previousWeek.getTotalHours()),
            totalTutors,
            activeTutors
        );
    }
}