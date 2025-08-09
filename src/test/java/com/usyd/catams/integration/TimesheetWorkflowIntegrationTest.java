package com.usyd.catams.integration;

import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Full integration test for timesheet workflow.
 * 
 * Tests the complete flow from HTTP request through all layers:
 * - HTTP/REST controller layer
 * - Security and authentication
 * - Service layer business logic
 * - Data persistence layer
 * - Database transactions
 * 
 * Uses TestContainers for realistic database testing.
 */
@DisplayName("Timesheet Workflow Integration Tests")
class TimesheetWorkflowIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testLecturer;
    private User testTutor;
    private Course testCourse;

    @BeforeEach
    void setupTestData() {
        // Clear any existing test data
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        // Create test lecturer
        testLecturer = TestDataBuilder.aLecturer()
            .withId(1L)
            .withEmail("lecturer.integration@test.com")
            .withHashedPassword(passwordEncoder.encode("password123"))
            .withName("Integration Test Lecturer")
            .build();
        testLecturer = userRepository.save(testLecturer);

        // Create test tutor
        testTutor = TestDataBuilder.aTutor()
            .withId(2L)
            .withEmail("tutor.integration@test.com")
            .withHashedPassword(passwordEncoder.encode("password123"))
            .withName("Integration Test Tutor")
            .build();
        testTutor = userRepository.save(testTutor);

        // Create test course
        testCourse = TestDataBuilder.aCourse()
            .withCode("COMP3999")
            .withName("Integration Testing Course")
            .withLecturer(testLecturer)            .build();
        testCourse = courseRepository.save(testCourse);

        // Update auth tokens with real user IDs
        lecturerToken = "Bearer " + jwtTokenProvider.generateToken(
            testLecturer.getId(), testLecturer.getEmail(), testLecturer.getRole().name()
        );
        tutorToken = "Bearer " + jwtTokenProvider.generateToken(
            testTutor.getId(), testTutor.getEmail(), testTutor.getRole().name()
        );
    }

    @Test
    @DisplayName("Complete timesheet creation workflow - should succeed")
    void createTimesheetWorkflow_ValidRequest_ShouldSucceed() throws Exception {
        // Arrange
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(1);
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .withWeekStartDate(nextMonday)
            .withHours(new BigDecimal("15.5"))
            .withHourlyRate(new BigDecimal("45.00"))
            .withDescription("Full integration test timesheet - database persistence verified")
            .build();

        // Act & Assert - HTTP layer
        performPost("/api/timesheets", request, lecturerToken)
            .andExpect(status().isCreated())
            .andExpect(content().contentType("application/json"))
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.tutorId").value(testTutor.getId()))
            .andExpect(jsonPath("$.courseId").value(testCourse.getId()))
            .andExpect(jsonPath("$.hours").value(15.5))
            .andExpect(jsonPath("$.hourlyRate").value(45.00))
            .andExpect(jsonPath("$.description").value("Full integration test timesheet - database persistence verified"))
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.weekStartDate").value(nextMonday.toString()));

        // Verify database persistence
        var savedTimesheets = timesheetRepository.findAll();
        assert !savedTimesheets.isEmpty();
        var savedTimesheet = savedTimesheets.get(0);
        assert savedTimesheet.getTutorId().equals(testTutor.getId());
        assert savedTimesheet.getCourseId().equals(testCourse.getId());
        assert savedTimesheet.getHours().compareTo(new BigDecimal("15.5")) == 0;
        assert savedTimesheet.getHourlyRate().compareTo(new BigDecimal("45.00")) == 0;
    }

    @Test
    @DisplayName("Authentication workflow - should enforce security")
    void timesheetCreation_UnauthenticatedRequest_ShouldReturn401() throws Exception {
        // Arrange
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .build();

        // Act & Assert
        performPost("/api/timesheets", request, null) // No auth token
            .andExpect(status().isUnauthorized());

        // Verify no data was persisted
        var timesheets = timesheetRepository.findAll();
        assert timesheets.isEmpty();
    }

    @Test
    @DisplayName("Authorization workflow - tutor cannot create timesheets")
    void timesheetCreation_TutorRole_ShouldReturn403() throws Exception {
        // Arrange
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .build();

        // Act & Assert
        performPost("/api/timesheets", request, tutorToken) // Tutor token
            .andExpect(status().isForbidden());

        // Verify no data was persisted
        var timesheets = timesheetRepository.findAll();
        assert timesheets.isEmpty();
    }

    @Test
    @DisplayName("Business rule validation - invalid hours should be rejected")
    void timesheetCreation_InvalidHours_ShouldReturn400() throws Exception {
        // Arrange
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .withHours(new BigDecimal("0.05")) // Below minimum 0.1
            .build();

        // Act & Assert
        performPost("/api/timesheets", request, lecturerToken)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorMessage").exists());

        // Verify no data was persisted
        var timesheets = timesheetRepository.findAll();
        assert timesheets.isEmpty();
    }

    @Test
    @DisplayName("Database transaction rollback - invalid data should not persist")
    void timesheetCreation_DatabaseConstraintViolation_ShouldRollback() throws Exception {
        // Arrange - Create request with non-existent course ID
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(99999L) // Non-existent course
            .build();

        // Act & Assert
        performPost("/api/timesheets", request, lecturerToken)
            .andExpect(status().isBadRequest());

        // Verify transaction rollback - no partial data persisted
        var timesheets = timesheetRepository.findAll();
        assert timesheets.isEmpty();
    }

    @Test
    @DisplayName("End-to-end timesheet retrieval workflow")
    void timesheetRetrieval_AfterCreation_ShouldWork() throws Exception {
        // Arrange - Create a timesheet first
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(1);
        TimesheetCreateRequest createRequest = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .withWeekStartDate(nextMonday)
            .build();

        // Ensure clean security context and set authenticated lecturer directly
        SecurityContextHolder.clearContext();
        UsernamePasswordAuthenticationToken lecturerAuth = new UsernamePasswordAuthenticationToken(
            testLecturer, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_LECTURER"))
        );
        SecurityContextHolder.getContext().setAuthentication(lecturerAuth);

        MvcResult createResponse = mockMvc.perform(
                post("/api/timesheets")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(createRequest))
            )
            .andExpect(status().isCreated())
            .andReturn();

        // Extract timesheet ID from response
        String responseContent = createResponse.getResponse().getContentAsString();
        var responseNode = objectMapper.readTree(responseContent);
        Long timesheetId = responseNode.get("id").asLong();

        // Act & Assert - Retrieve the created timesheet
        performGet("/api/timesheets/" + timesheetId, null)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(timesheetId))
            .andExpect(jsonPath("$.tutorId").value(testTutor.getId()))
            .andExpect(jsonPath("$.courseId").value(testCourse.getId()));

        // Test list endpoint
        performGet("/api/timesheets", null)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.timesheets").isArray())
            .andExpect(jsonPath("$.timesheets[0].id").value(timesheetId))
            .andExpect(jsonPath("$.pageInfo").exists())
            .andExpect(jsonPath("$.pageInfo.totalElements").value(1));
    }

    @Test
    @DisplayName("Cross-lecturer security - lecturer cannot access other lecturer's course timesheets")
    void timesheetAccess_DifferentLecturer_ShouldBeRestricted() throws Exception {
        // Arrange - Create another lecturer and course
        User otherLecturer = TestDataBuilder.aLecturer()
            .withEmail("other.lecturer@test.com")
            .withHashedPassword(passwordEncoder.encode("password123"))
            .withName("Other Lecturer")
            .build();
        otherLecturer = userRepository.save(otherLecturer);

        Course otherCourse = TestDataBuilder.aCourse()
            .withCode("MATH2001")
            .withName("Other Course")
            .withLecturer(otherLecturer)            .build();
        otherCourse = courseRepository.save(otherCourse);

        String otherLecturerToken = "Bearer " + jwtTokenProvider.generateToken(
            otherLecturer.getId(), otherLecturer.getEmail(), otherLecturer.getRole().name()
        );

        // Create timesheet with original lecturer
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .build();

        var createResponse = performPost("/api/timesheets", request, lecturerToken)
            .andExpect(status().isCreated())
            .andReturn();

        String responseContent = createResponse.getResponse().getContentAsString();
        var responseNode = objectMapper.readTree(responseContent);
        Long timesheetId = responseNode.get("id").asLong();

        // Act & Assert - Other lecturer should not be able to access
        performGet("/api/timesheets/" + timesheetId, otherLecturerToken)
            .andExpect(status().isForbidden());
    }
}
