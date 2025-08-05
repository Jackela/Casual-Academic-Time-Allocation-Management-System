package com.usyd.catams.service;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.dto.response.DashboardSummaryResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.AuthenticationException;
import com.usyd.catams.exception.BusinessException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.service.impl.DashboardServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DashboardServiceImpl
 * 
 * Tests role-based dashboard logic, data aggregation, and security boundaries
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private TimesheetRepository timesheetRepository;

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() {
        startDate = LocalDate.of(2025, 2, 1);
        endDate = LocalDate.of(2025, 6, 30);
    }

    // ==================== TUTOR DASHBOARD TESTS ====================

    @Test
    @DisplayName("TUTOR dashboard returns personal timesheet summary")
    void shouldReturnTutorDashboard() {
        // Given
        Long tutorId = 123L;
        TimesheetSummaryData mockSummary = new TimesheetSummaryData(5L, new BigDecimal("42.5"), new BigDecimal("1912.50"), 2L);
        TimesheetSummaryData mockCurrentWeek = new TimesheetSummaryData(2L, new BigDecimal("16.0"), new BigDecimal("720.00"), 1L);
        TimesheetSummaryData mockPreviousWeek = new TimesheetSummaryData(2L, new BigDecimal("18.0"), new BigDecimal("810.00"), 0L);
        
        // Mock all calls with any LocalDate to return appropriate responses
        when(timesheetRepository.findTimesheetSummaryByTutor(eq(tutorId), any(LocalDate.class), any(LocalDate.class)))
            .thenAnswer(invocation -> {
                LocalDate start = invocation.getArgument(1);
                LocalDate end = invocation.getArgument(2);
                // If it's the original call with test dates, return main summary
                if (start.equals(startDate) && end.equals(endDate)) {
                    return mockSummary;
                }
                // For workload analysis calls with different date ranges
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end);
                if (daysBetween <= 7) {
                    // Weekly calls - alternate between current and previous week data
                    return start.isAfter(LocalDate.now().minusWeeks(1)) ? mockCurrentWeek : mockPreviousWeek;
                }
                return mockSummary; // Default to summary for longer periods
            });

        // When
        DashboardSummaryResponse result = dashboardService.getDashboardSummary(
            tutorId, UserRole.TUTOR, Optional.empty(), startDate, endDate);

        // Then
        assertThat(result.getTotalTimesheets()).isEqualTo(5);
        assertThat(result.getTotalHours()).isEqualTo(new BigDecimal("42.5"));
        assertThat(result.getTotalPay()).isEqualTo(new BigDecimal("1912.50"));
        assertThat(result.getPendingApprovals()).isEqualTo(2);
        assertThat(result.getBudgetUsage()).isNull(); // TUTORs don't see budget
        assertThat(result.getRecentActivities()).isNotNull();
        assertThat(result.getPendingItems()).isNotNull();
        assertThat(result.getWorkloadAnalysis()).isNotNull();
        assertThat(result.getWorkloadAnalysis().getCurrentWeekHours()).isEqualTo(new BigDecimal("16.0"));
        assertThat(result.getWorkloadAnalysis().getPreviousWeekHours()).isEqualTo(new BigDecimal("18.0"));
        
        verify(timesheetRepository, times(4)).findTimesheetSummaryByTutor(eq(tutorId), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    @DisplayName("TUTOR cannot filter by course")
    void shouldThrowExceptionWhenTutorTriesToFilterByCourse() {
        // Given
        Long tutorId = 123L;
        Long courseId = 456L;

        // When & Then
        assertThatThrownBy(() -> dashboardService.getDashboardSummary(
            tutorId, UserRole.TUTOR, Optional.of(courseId), startDate, endDate))
            .isInstanceOf(BusinessException.class)
            .hasMessage("TUTORs cannot filter by course");
        
        verifyNoInteractions(timesheetRepository);
    }

    // ==================== LECTURER DASHBOARD TESTS ====================

    @Test
    @DisplayName("LECTURER dashboard returns course-level summary without course filter")
    void shouldReturnLecturerDashboardWithoutCourseFilter() {
        // Given
        Long lecturerId = 999L;
        Course course1 = createMockCourse(1L, "COMP1001", new BigDecimal("5000.00"));
        Course course2 = createMockCourse(2L, "COMP2001", new BigDecimal("7000.00"));
        List<Course> managedCourses = List.of(course1, course2);
        List<Long> courseIds = List.of(1L, 2L);
        
        TimesheetSummaryData mockSummary = new TimesheetSummaryData(15L, new BigDecimal("120.0"), new BigDecimal("5400.00"), 5L);
        TimesheetSummaryData mockCurrentWeek = new TimesheetSummaryData(8L, new BigDecimal("60.0"), new BigDecimal("2700.00"), 2L);
        TimesheetSummaryData mockPreviousWeek = new TimesheetSummaryData(7L, new BigDecimal("50.0"), new BigDecimal("2250.00"), 1L);
        
        when(courseRepository.findByLecturerIdAndIsActive(lecturerId, true))
            .thenReturn(managedCourses);
        // Mock all calls to return appropriate responses based on date range
        when(timesheetRepository.findTimesheetSummaryByCourses(eq(courseIds), any(LocalDate.class), any(LocalDate.class)))
            .thenAnswer(invocation -> {
                LocalDate start = invocation.getArgument(1);
                LocalDate end = invocation.getArgument(2);
                if (start.equals(startDate) && end.equals(endDate)) {
                    return mockSummary;
                }
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end);
                if (daysBetween <= 7) {
                    return start.isAfter(LocalDate.now().minusWeeks(1)) ? mockCurrentWeek : mockPreviousWeek;
                }
                return mockSummary;
            });

        // When
        DashboardSummaryResponse result = dashboardService.getDashboardSummary(
            lecturerId, UserRole.LECTURER, Optional.empty(), startDate, endDate);

        // Then
        assertThat(result.getTotalTimesheets()).isEqualTo(15);
        assertThat(result.getTotalHours()).isEqualTo(new BigDecimal("120.0"));
        assertThat(result.getTotalPay()).isEqualTo(new BigDecimal("5400.00"));
        assertThat(result.getPendingApprovals()).isEqualTo(5);
        assertThat(result.getBudgetUsage()).isNotNull();
        assertThat(result.getBudgetUsage().getTotalBudget()).isEqualTo(new BigDecimal("12000.00"));
        assertThat(result.getWorkloadAnalysis()).isNotNull();
        assertThat(result.getWorkloadAnalysis().getCurrentWeekHours()).isEqualTo(new BigDecimal("60.0"));
        assertThat(result.getWorkloadAnalysis().getPreviousWeekHours()).isEqualTo(new BigDecimal("50.0"));
        
        verify(courseRepository).findByLecturerIdAndIsActive(lecturerId, true);
        verify(timesheetRepository, times(4)).findTimesheetSummaryByCourses(eq(courseIds), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    @DisplayName("LECTURER dashboard returns specific course summary with course filter")
    void shouldReturnLecturerDashboardWithCourseFilter() {
        // Given
        Long lecturerId = 999L;
        Long courseId = 456L;
        Course course = createMockCourse(courseId, "COMP1001", new BigDecimal("5000.00"));
        List<Long> singleCourseIds = List.of(courseId);
        
        TimesheetSummaryData mockSummary = new TimesheetSummaryData(8L, new BigDecimal("64.0"), new BigDecimal("2880.00"), 3L);
        TimesheetSummaryData mockCurrentWeek = new TimesheetSummaryData(4L, new BigDecimal("30.0"), new BigDecimal("1350.00"), 1L);
        TimesheetSummaryData mockPreviousWeek = new TimesheetSummaryData(3L, new BigDecimal("25.0"), new BigDecimal("1125.00"), 0L);
        
        when(courseRepository.existsByIdAndLecturerId(courseId, lecturerId))
            .thenReturn(true);
        when(courseRepository.findById(courseId))
            .thenReturn(Optional.of(course));
        // Mock the main summary call
        when(timesheetRepository.findTimesheetSummaryByCourse(courseId, startDate, endDate))
            .thenReturn(mockSummary);
        // Mock the workload analysis calls (uses courses method with single course)
        when(timesheetRepository.findTimesheetSummaryByCourses(eq(singleCourseIds), any(LocalDate.class), any(LocalDate.class)))
            .thenAnswer(invocation -> {
                LocalDate start = invocation.getArgument(1);
                LocalDate end = invocation.getArgument(2);
                if (start.equals(startDate) && end.equals(endDate)) {
                    return mockSummary;
                }
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end);
                if (daysBetween <= 7) {
                    return start.isAfter(LocalDate.now().minusWeeks(1)) ? mockCurrentWeek : mockPreviousWeek;
                }
                return mockSummary;
            });

        // When
        DashboardSummaryResponse result = dashboardService.getDashboardSummary(
            lecturerId, UserRole.LECTURER, Optional.of(courseId), startDate, endDate);

        // Then
        assertThat(result.getTotalTimesheets()).isEqualTo(8);
        assertThat(result.getTotalHours()).isEqualTo(new BigDecimal("64.0"));
        assertThat(result.getTotalPay()).isEqualTo(new BigDecimal("2880.00"));
        assertThat(result.getPendingApprovals()).isEqualTo(3);
        assertThat(result.getBudgetUsage()).isNotNull();
        assertThat(result.getWorkloadAnalysis()).isNotNull();
        
        verify(courseRepository).existsByIdAndLecturerId(courseId, lecturerId);
        verify(courseRepository).findById(courseId);
        verify(timesheetRepository).findTimesheetSummaryByCourse(courseId, startDate, endDate);
        verify(timesheetRepository, times(3)).findTimesheetSummaryByCourses(eq(singleCourseIds), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    @DisplayName("LECTURER cannot access course they don't manage")
    void shouldThrowExceptionWhenLecturerAccessesUnauthorizedCourse() {
        // Given
        Long lecturerId = 999L;
        Long unauthorizedCourseId = 456L;
        
        when(courseRepository.existsByIdAndLecturerId(unauthorizedCourseId, lecturerId))
            .thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> dashboardService.getDashboardSummary(
            lecturerId, UserRole.LECTURER, Optional.of(unauthorizedCourseId), startDate, endDate))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Lecturer does not have access to this course");
        
        verify(courseRepository).existsByIdAndLecturerId(unauthorizedCourseId, lecturerId);
        verifyNoInteractions(timesheetRepository);
    }

    @Test
    @DisplayName("LECTURER with no active courses returns empty summary")
    void shouldReturnEmptyLecturerDashboardWhenNoActiveCourses() {
        // Given
        Long lecturerId = 999L;
        
        when(courseRepository.findByLecturerIdAndIsActive(lecturerId, true))
            .thenReturn(List.of());

        // When
        DashboardSummaryResponse result = dashboardService.getDashboardSummary(
            lecturerId, UserRole.LECTURER, Optional.empty(), startDate, endDate);

        // Then
        assertThat(result.getTotalTimesheets()).isEqualTo(0);
        assertThat(result.getTotalHours()).isEqualTo(BigDecimal.ZERO);
        assertThat(result.getTotalPay()).isEqualTo(BigDecimal.ZERO);
        assertThat(result.getPendingApprovals()).isEqualTo(0);
        assertThat(result.getBudgetUsage()).isNotNull();
        assertThat(result.getBudgetUsage().getTotalBudget()).isEqualTo(BigDecimal.ZERO);
        
        verify(courseRepository).findByLecturerIdAndIsActive(lecturerId, true);
        verifyNoInteractions(timesheetRepository);
    }

    // ==================== ADMIN DASHBOARD TESTS ====================

    @Test
    @DisplayName("ADMIN dashboard returns system-wide summary without course filter")
    void shouldReturnAdminDashboardSystemWide() {
        // Given
        Long adminId = 777L;
        TimesheetSummaryData mockSummary = new TimesheetSummaryData(50L, new BigDecimal("400.0"), new BigDecimal("18000.00"), 12L);
        TimesheetSummaryData mockCurrentWeek = new TimesheetSummaryData(20L, new BigDecimal("150.0"), new BigDecimal("6750.00"), 5L);
        TimesheetSummaryData mockPreviousWeek = new TimesheetSummaryData(18L, new BigDecimal("140.0"), new BigDecimal("6300.00"), 3L);
        Course course1 = createMockCourse(1L, "COMP1001", new BigDecimal("5000.00"));
        Course course2 = createMockCourse(2L, "COMP2001", new BigDecimal("7000.00"));
        
        // Mock all system-wide calls
        when(timesheetRepository.findTimesheetSummarySystemWide(any(LocalDate.class), any(LocalDate.class)))
            .thenAnswer(invocation -> {
                LocalDate start = invocation.getArgument(0);
                LocalDate end = invocation.getArgument(1);
                if (start.equals(startDate) && end.equals(endDate)) {
                    return mockSummary;
                }
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end);
                if (daysBetween <= 7) {
                    return start.isAfter(LocalDate.now().minusWeeks(1)) ? mockCurrentWeek : mockPreviousWeek;
                }
                return mockSummary;
            });
        when(courseRepository.findByIsActive(true))
            .thenReturn(List.of(course1, course2));

        // When
        DashboardSummaryResponse result = dashboardService.getDashboardSummary(
            adminId, UserRole.ADMIN, Optional.empty(), startDate, endDate);

        // Then
        assertThat(result.getTotalTimesheets()).isEqualTo(50);
        assertThat(result.getTotalHours()).isEqualTo(new BigDecimal("400.0"));
        assertThat(result.getTotalPay()).isEqualTo(new BigDecimal("18000.00"));
        assertThat(result.getPendingApprovals()).isEqualTo(12);
        assertThat(result.getBudgetUsage()).isNotNull();
        assertThat(result.getWorkloadAnalysis()).isNotNull();
        assertThat(result.getWorkloadAnalysis().getCurrentWeekHours()).isEqualTo(new BigDecimal("150.0"));
        assertThat(result.getWorkloadAnalysis().getPreviousWeekHours()).isEqualTo(new BigDecimal("140.0"));
        
        verify(timesheetRepository, times(4)).findTimesheetSummarySystemWide(any(LocalDate.class), any(LocalDate.class));
        verify(courseRepository, times(2)).findByIsActive(true); // Called for budget and workload analysis
    }

    @Test
    @DisplayName("ADMIN dashboard returns specific course summary with course filter")
    void shouldReturnAdminDashboardWithCourseFilter() {
        // Given
        Long adminId = 777L;
        Long courseId = 456L;
        Course course = createMockCourse(courseId, "COMP1001", new BigDecimal("5000.00"));
        List<Long> singleCourseIds = List.of(courseId);
        TimesheetSummaryData mockSummary = new TimesheetSummaryData(12L, new BigDecimal("96.0"), new BigDecimal("4320.00"), 4L);
        TimesheetSummaryData mockCurrentWeek = new TimesheetSummaryData(5L, new BigDecimal("40.0"), new BigDecimal("1800.00"), 2L);
        TimesheetSummaryData mockPreviousWeek = new TimesheetSummaryData(4L, new BigDecimal("32.0"), new BigDecimal("1440.00"), 1L);
        
        // Mock the main summary call
        when(timesheetRepository.findTimesheetSummaryByCourse(courseId, startDate, endDate))
            .thenReturn(mockSummary);
        when(courseRepository.findById(courseId))
            .thenReturn(Optional.of(course));
        // Mock the system-wide workload analysis calls (Admin always uses system-wide for workload analysis)
        when(timesheetRepository.findTimesheetSummarySystemWide(any(LocalDate.class), any(LocalDate.class)))
            .thenAnswer(invocation -> {
                LocalDate start = invocation.getArgument(0);
                LocalDate end = invocation.getArgument(1);
                if (start.equals(startDate) && end.equals(endDate)) {
                    return mockSummary;
                }
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end);
                if (daysBetween <= 7) {
                    return start.isAfter(LocalDate.now().minusWeeks(1)) ? mockCurrentWeek : mockPreviousWeek;
                }
                return mockSummary;
            });
        when(courseRepository.findByIsActive(true))
            .thenReturn(List.of(course)); // For workload analysis tutor counts

        // When
        DashboardSummaryResponse result = dashboardService.getDashboardSummary(
            adminId, UserRole.ADMIN, Optional.of(courseId), startDate, endDate);

        // Then
        assertThat(result.getTotalTimesheets()).isEqualTo(12);
        assertThat(result.getTotalHours()).isEqualTo(new BigDecimal("96.0"));
        assertThat(result.getTotalPay()).isEqualTo(new BigDecimal("4320.00"));
        assertThat(result.getPendingApprovals()).isEqualTo(4);
        assertThat(result.getBudgetUsage()).isNotNull();
        assertThat(result.getWorkloadAnalysis()).isNotNull();
        
        verify(timesheetRepository).findTimesheetSummaryByCourse(courseId, startDate, endDate);
        verify(courseRepository).findById(courseId); // Called for budget calculation
        verify(timesheetRepository, atLeastOnce()).findTimesheetSummarySystemWide(any(LocalDate.class), any(LocalDate.class));
        verify(courseRepository).findByIsActive(true); // Called for workload analysis tutor counts
    }

    // ==================== ERROR HANDLING TESTS ====================

    @Test
    @DisplayName("Should throw exception for invalid user role")
    void shouldThrowExceptionForInvalidUserRole() {
        // Given
        Long userId = 123L;

        // When & Then
        assertThatThrownBy(() -> dashboardService.getDashboardSummary(
            userId, null, Optional.empty(), startDate, endDate))
            .isInstanceOf(AuthenticationException.class)
            .hasMessage("Invalid user role");
        
        verifyNoInteractions(timesheetRepository);
    }

    @Test
    @DisplayName("Should throw exception when course not found for LECTURER filter")
    void shouldThrowExceptionWhenCourseNotFoundForLecturerFilter() {
        // Given
        Long lecturerId = 999L;
        Long nonExistentCourseId = 999L;
        
        when(courseRepository.existsByIdAndLecturerId(nonExistentCourseId, lecturerId))
            .thenReturn(true);
        when(courseRepository.findById(nonExistentCourseId))
            .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> dashboardService.getDashboardSummary(
            lecturerId, UserRole.LECTURER, Optional.of(nonExistentCourseId), startDate, endDate))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Course with id 999 not found");
        
        verify(courseRepository).existsByIdAndLecturerId(nonExistentCourseId, lecturerId);
        verify(courseRepository).findById(nonExistentCourseId);
    }

    // ==================== HELPER METHODS ====================

    private Course createMockCourse(Long id, String code, BigDecimal budgetAllocated) {
        Course course = new Course();
        course.setId(id);
        course.setCode(code);
        course.setName(code + " - Mock Course");
        course.setBudgetAllocated(budgetAllocated);
        course.setBudgetUsed(budgetAllocated.multiply(new BigDecimal("0.6"))); // 60% used
        course.setIsActive(true);
        return course;
    }
}