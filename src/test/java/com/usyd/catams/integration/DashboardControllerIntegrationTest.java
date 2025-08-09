package com.usyd.catams.integration;

import com.usyd.catams.dto.response.DashboardSummaryResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for DashboardController
 * 
 * Tests complete API functionality including authentication, authorization,
 * and role-based data access using real database with TestContainers
 */
// TODO: Re-enable this test once a Docker environment with Testcontainers is configured for the CI/CD pipeline.
// This test is disabled as it's a non-critical feature for the MVP and fails in environments without Docker.
@Disabled("Requires a Docker environment for Testcontainers.")
@DisplayName("Dashboard Controller Integration Tests")
class DashboardControllerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User tutorUser;
    private User lecturerUser;
    private User adminUser;
    private Course course1;
    private Course course2;

    @BeforeEach
    void setUp() {
        // Clean up database
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        // Create test users
        tutorUser = createUser("tutor@university.edu.au", "Alice Johnson", UserRole.TUTOR);
        lecturerUser = createUser("lecturer@university.edu.au", "Dr. John Smith", UserRole.LECTURER);
        adminUser = createUser("admin@university.edu.au", "Admin User", UserRole.ADMIN);

        // Create test courses
        course1 = createCourse("COMP1001", "Introduction to Programming", lecturerUser.getId(), new BigDecimal("5000.00"));
        course2 = createCourse("COMP2001", "Data Structures", lecturerUser.getId(), new BigDecimal("7000.00"));

        // Create test timesheets
        createTimesheet(tutorUser.getId(), course1.getId(), new BigDecimal("10.5"), new BigDecimal("45.00"), ApprovalStatus.PENDING_LECTURER_APPROVAL);
        createTimesheet(tutorUser.getId(), course2.getId(), new BigDecimal("8.0"), new BigDecimal("45.00"), ApprovalStatus.APPROVED);
    }

    // ==================== TUTOR DASHBOARD TESTS ====================

    @Test
    @DisplayName("TUTOR can retrieve dashboard summary")
    void shouldReturnTutorDashboardSummary() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(tutorUser.getId(), tutorUser.getEmail(), tutorUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<DashboardSummaryResponse> response = restTemplate.exchange(
            "/api/dashboard/summary", HttpMethod.GET, request, DashboardSummaryResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalTimesheets()).isEqualTo(2);
        assertThat(response.getBody().getTotalHours()).isEqualTo(new BigDecimal("18.5"));
        assertThat(response.getBody().getTotalPay()).isEqualTo(new BigDecimal("832.5"));
        assertThat(response.getBody().getPendingApprovals()).isEqualTo(1);
        assertThat(response.getBody().getBudgetUsage()).isNull(); // TUTORs don't see budget
        assertThat(response.getBody().getRecentActivities()).isNotNull();
        assertThat(response.getBody().getPendingItems()).isNotNull();
        assertThat(response.getBody().getWorkloadAnalysis()).isNotNull();
    }

    @Test
    @DisplayName("TUTOR cannot filter by course")
    void shouldRejectTutorCourseFilter() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(tutorUser.getId(), tutorUser.getEmail(), tutorUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/dashboard/summary?courseId=" + course1.getId(), 
            HttpMethod.GET, request, String.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("TUTORs cannot filter by course");
    }

    // ==================== LECTURER DASHBOARD TESTS ====================

    @Test
    @DisplayName("LECTURER can retrieve course-level dashboard summary")
    void shouldReturnLecturerDashboardSummary() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(lecturerUser.getId(), lecturerUser.getEmail(), lecturerUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<DashboardSummaryResponse> response = restTemplate.exchange(
            "/api/dashboard/summary", HttpMethod.GET, request, DashboardSummaryResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalTimesheets()).isEqualTo(2);
        assertThat(response.getBody().getTotalHours()).isEqualTo(new BigDecimal("18.5"));
        assertThat(response.getBody().getPendingApprovals()).isEqualTo(1);
        assertThat(response.getBody().getBudgetUsage()).isNotNull(); // LECTURERs see budget
        assertThat(response.getBody().getBudgetUsage().getTotalBudget()).isEqualTo(new BigDecimal("12000.00"));
    }

    @Test
    @DisplayName("LECTURER can filter by specific course they manage")
    void shouldReturnLecturerDashboardWithCourseFilter() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(lecturerUser.getId(), lecturerUser.getEmail(), lecturerUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<DashboardSummaryResponse> response = restTemplate.exchange(
            "/api/dashboard/summary?courseId=" + course1.getId(), 
            HttpMethod.GET, request, DashboardSummaryResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalTimesheets()).isEqualTo(1);
        assertThat(response.getBody().getTotalHours()).isEqualTo(new BigDecimal("10.5"));
        assertThat(response.getBody().getBudgetUsage()).isNotNull();
        assertThat(response.getBody().getBudgetUsage().getTotalBudget()).isEqualTo(new BigDecimal("5000.00"));
    }

    // ==================== ADMIN DASHBOARD TESTS ====================

    @Test
    @DisplayName("ADMIN can retrieve system-wide dashboard summary")
    void shouldReturnAdminDashboardSummary() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(adminUser.getId(), adminUser.getEmail(), adminUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<DashboardSummaryResponse> response = restTemplate.exchange(
            "/api/dashboard/summary", HttpMethod.GET, request, DashboardSummaryResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalTimesheets()).isEqualTo(2);
        assertThat(response.getBody().getTotalHours()).isEqualTo(new BigDecimal("18.5"));
        assertThat(response.getBody().getPendingApprovals()).isEqualTo(1);
        assertThat(response.getBody().getBudgetUsage()).isNotNull(); // ADMINs see budget
    }

    @Test
    @DisplayName("ADMIN can filter by any course")
    void shouldReturnAdminDashboardWithCourseFilter() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(adminUser.getId(), adminUser.getEmail(), adminUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<DashboardSummaryResponse> response = restTemplate.exchange(
            "/api/dashboard/summary?courseId=" + course2.getId(), 
            HttpMethod.GET, request, DashboardSummaryResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalTimesheets()).isEqualTo(1);
        assertThat(response.getBody().getTotalHours()).isEqualTo(new BigDecimal("8.0"));
    }

    // ==================== PARAMETER VALIDATION TESTS ====================

    @Test
    @DisplayName("Should accept valid semester parameter")
    void shouldAcceptValidSemesterParameter() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(tutorUser.getId(), tutorUser.getEmail(), tutorUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<DashboardSummaryResponse> response = restTemplate.exchange(
            "/api/dashboard/summary?semester=2025-1", 
            HttpMethod.GET, request, DashboardSummaryResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("Should reject invalid semester format")
    void shouldRejectInvalidSemesterFormat() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(tutorUser.getId(), tutorUser.getEmail(), tutorUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/dashboard/summary?semester=2025-3", 
            HttpMethod.GET, request, String.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("Invalid semester format");
    }

    @Test
    @DisplayName("Should accept valid custom date range")
    void shouldAcceptValidCustomDateRange() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(tutorUser.getId(), tutorUser.getEmail(), tutorUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<DashboardSummaryResponse> response = restTemplate.exchange(
            "/api/dashboard/summary?startDate=2025-01-01&endDate=2025-12-31", 
            HttpMethod.GET, request, DashboardSummaryResponse.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("Should reject invalid date range")
    void shouldRejectInvalidDateRange() {
        // Given
        String jwtToken = jwtTokenProvider.generateToken(tutorUser.getId(), tutorUser.getEmail(), tutorUser.getRole().name());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/dashboard/summary?startDate=2025-06-01&endDate=2025-01-01", 
            HttpMethod.GET, request, String.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("Start date cannot be after end date");
    }

    // ==================== AUTHENTICATION TESTS ====================

    @Test
    @DisplayName("Should require authentication")
    void shouldRequireAuthentication() {
        // When
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/dashboard/summary", String.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should reject invalid JWT token")
    void shouldRejectInvalidJwtToken() {
        // Given
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("invalid.jwt.token");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // When
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/dashboard/summary", HttpMethod.GET, request, String.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ==================== HELPER METHODS ====================

    private User createUser(String email, String name, UserRole role) {
        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setRole(role);
        user.setHashedPassword("encodedPassword");
        return userRepository.save(user);
    }

    private Course createCourse(String code, String name, Long lecturerId, BigDecimal budget) {
        Course course = new Course();
        course.setCode(code);
        course.setName(name);
        course.setLecturerId(lecturerId);
        course.setBudgetAllocated(budget);
        course.setBudgetUsed(BigDecimal.ZERO);
        course.setIsActive(true);
        return courseRepository.save(course);
    }

    private Timesheet createTimesheet(Long tutorId, Long courseId, BigDecimal hours, BigDecimal hourlyRate, ApprovalStatus status) {
        Timesheet timesheet = new Timesheet();
        timesheet.setTutorId(tutorId);
        timesheet.setCourseId(courseId);
        timesheet.setWeekStartDate(LocalDate.now().with(java.time.DayOfWeek.MONDAY));
        timesheet.setHours(hours);
        timesheet.setHourlyRate(hourlyRate);
        timesheet.setDescription("Test timesheet");
        timesheet.setStatus(status);
        timesheet.setCreatedBy(tutorId);
        return timesheetRepository.save(timesheet);
    }
}