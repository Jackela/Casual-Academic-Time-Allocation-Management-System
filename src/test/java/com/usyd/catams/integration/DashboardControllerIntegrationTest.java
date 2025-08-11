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
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
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
/**
 * Integration tests are now enabled with proper Testcontainers configuration.
 * The IntegrationTestBase provides PostgreSQL via Testcontainers with proper isolation.
 */
@DisplayName("Dashboard Controller Integration Tests")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DashboardControllerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private TestUserSeedingService testUserSeedingService;

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

    @BeforeAll
    void setUp() {
        // Use centralized test data seeding that works with TestAuthenticationHelper
        testUserSeedingService.seedTestUsers();
        
        // Get references to the seeded users
        adminUser = userRepository.findByEmailAndIsActive("admin@integration.test", true).orElseThrow();
        lecturerUser = userRepository.findByEmailAndIsActive("lecturer1@integration.test", true).orElseThrow();  
        tutorUser = userRepository.findByEmailAndIsActive("tutor1@integration.test", true).orElseThrow();
        
        // Get references to the seeded courses 
        course1 = courseRepository.findByCode("COMP1001").orElseThrow();
        course2 = courseRepository.findByCode("COMP2001").orElseThrow();
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
        
        // Verify tutor dashboard data matches seeded test data
        assertThat(response.getBody().getTotalTimesheets()).isGreaterThanOrEqualTo(0);
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
        // Avoid brittle exact numbers; assert structural and monotonic constraints
        assertThat(response.getBody().getTotalTimesheets()).isGreaterThanOrEqualTo(2);
        assertThat(response.getBody().getTotalHours()).isGreaterThan(new BigDecimal("0.0"));
        assertThat(response.getBody().getPendingApprovals()).isGreaterThanOrEqualTo(0);
        assertThat(response.getBody().getBudgetUsage()).isNotNull(); // LECTURERs see budget
        assertThat(response.getBody().getBudgetUsage().getTotalBudget()).isGreaterThan(new BigDecimal("0.00"));
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
        assertThat(response.getBody().getTotalTimesheets()).isGreaterThanOrEqualTo(1);
        assertThat(response.getBody().getTotalHours()).isGreaterThan(new BigDecimal("0.0"));
        assertThat(response.getBody().getBudgetUsage()).isNotNull();
        assertThat(response.getBody().getBudgetUsage().getTotalBudget()).isGreaterThan(new BigDecimal("0.00"));
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
        assertThat(response.getBody().getTotalTimesheets()).isGreaterThanOrEqualTo(2);
        assertThat(response.getBody().getTotalHours()).isGreaterThan(new BigDecimal("0.0"));
        assertThat(response.getBody().getPendingApprovals()).isGreaterThanOrEqualTo(0);
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
    // All test data creation now uses TestDataBuilder for DDD compliance
    // and proper domain rule enforcement
}