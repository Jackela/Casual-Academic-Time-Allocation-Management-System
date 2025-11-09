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
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.entity.TutorAssignment;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.concurrent.atomic.AtomicReference;

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
    @Autowired
    private TutorAssignmentRepository tutorAssignmentRepository;
    
    @Autowired
    private LecturerAssignmentRepository lecturerAssignmentRepository;
    
    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setupTestData() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        AtomicReference<User> lecturerRef = new AtomicReference<>();
        AtomicReference<User> tutorRef = new AtomicReference<>();
        AtomicReference<Course> courseRef = new AtomicReference<>();

        template.execute(status -> {
            timesheetRepository.deleteAll();
            timesheetRepository.flush();
            tutorAssignmentRepository.deleteAll();
            tutorAssignmentRepository.flush();
            lecturerAssignmentRepository.deleteAll();
            lecturerAssignmentRepository.flush();
            courseRepository.deleteAll();
            courseRepository.flush();
            userRepository.deleteAll();
            userRepository.flush();

            User persistedLecturer = userRepository.save(TestDataBuilder.aLecturer()
                .withEmail("lecturer.integration@test.com")
                .withHashedPassword(passwordEncoder.encode("password123"))
                .withName("Integration Test Lecturer")
                .build());
            lecturerRef.set(persistedLecturer);

            User persistedTutor = userRepository.save(TestDataBuilder.aTutor()
                .withEmail("tutor.integration@test.com")
                .withHashedPassword(passwordEncoder.encode("password123"))
                .withName("Integration Test Tutor")
                .build());
            tutorRef.set(persistedTutor);

            Course persistedCourse = courseRepository.save(TestDataBuilder.aCourse()
                .withCode("COMP3999")
                .withName("Integration Testing Course")
                .withLecturer(persistedLecturer)
                .build());
            courseRef.set(persistedCourse);

            tutorAssignmentRepository.save(new TutorAssignment(persistedTutor.getId(), persistedCourse.getId()));

            courseRepository.flush();
            userRepository.flush();
            tutorAssignmentRepository.flush();
            return null;
        });

        testLecturer = lecturerRef.get();
        testTutor = tutorRef.get();
        testCourse = courseRef.get();

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
            .withHours(new BigDecimal("3.0"))
            .withDeliveryHours(new BigDecimal("1.0"))
            .withHourlyRate(new BigDecimal("45.00"))
            .withDescription("Full integration test timesheet - database persistence verified")
            .build();

        // Act & Assert - HTTP layer
        performPostWithoutFinancialFields("/api/timesheets", request, lecturerToken)
            .andExpect(status().isCreated())
            .andExpect(content().contentType("application/json"))
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.tutorId").value(testTutor.getId()))
            .andExpect(jsonPath("$.courseId").value(testCourse.getId()))
            .andExpect(jsonPath("$.hours").value(closeTo(3.0, 0.0001)))
            .andExpect(jsonPath("$.hourlyRate").value(closeTo(58.65, 0.01)))
            .andExpect(jsonPath("$.description").value("Full integration test timesheet - database persistence verified"))
            .andExpect(jsonPath("$.status").value(com.usyd.catams.enums.ApprovalStatus.DRAFT.name()))
            .andExpect(jsonPath("$.weekStartDate").value(nextMonday.toString()));

        // Verify database persistence
        var savedTimesheets = timesheetRepository.findAll();
        assert !savedTimesheets.isEmpty();
        var savedTimesheet = savedTimesheets.get(0);
        assert savedTimesheet.getTutorId().equals(testTutor.getId());
        assert savedTimesheet.getCourseId().equals(testCourse.getId());
        assert savedTimesheet.getHours().compareTo(new BigDecimal("3.0")) == 0;
        assert savedTimesheet.getHourlyRate().compareTo(new BigDecimal("58.65")) == 0;
    }

    @Test
    @DisplayName("Authentication workflow - should enforce security")
    void timesheetCreation_UnauthenticatedRequest_ShouldReturn401() throws Exception {
        // Arrange
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .withDeliveryHours(BigDecimal.ONE)
            .build();

        // Act & Assert
        performPostWithoutFinancialFields("/api/timesheets", request, null) // No auth token
            .andExpect(status().isUnauthorized());

        // Verify no data was persisted
        var timesheets = timesheetRepository.findAll();
        assert timesheets.isEmpty();
    }

    @Test
    @DisplayName("Authorization workflow - tutor self-creation is forbidden")
    void timesheetCreation_TutorRole_ShouldBeForbidden() throws Exception {
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .withDeliveryHours(BigDecimal.ONE)
            .build();

        performPostWithoutFinancialFields("/api/timesheets", request, tutorToken)
            .andExpect(status().isForbidden());

        assert timesheetRepository.findAll().isEmpty();
    }

    @Test
    @DisplayName("Authorization workflow - tutor cannot create timesheet for another tutor")
    void timesheetCreation_TutorRoleCreatingForAnotherTutor_ShouldReturn403() throws Exception {
        // Arrange
        User otherTutor = userRepository.save(
            TestDataBuilder.aTutor()
                .withEmail("other.tutor.integration@test.com")
                .withHashedPassword(passwordEncoder.encode("password123"))
                .withName("Integration Test Tutor B")
                .build()
        );

        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(otherTutor.getId())
            .withCourseId(testCourse.getId())
            .withDeliveryHours(BigDecimal.ONE)
            .build();

        // Act & Assert
        performPostWithoutFinancialFields("/api/timesheets", request, tutorToken)
            .andExpect(status().isForbidden());

        // Verify no unauthorized timesheet was persisted
        assert timesheetRepository.findAll().isEmpty();
    }

    @Test
    @DisplayName("Business rule validation - invalid hours should be rejected")
    void timesheetCreation_InvalidHours_ShouldReturn400() throws Exception {
        // Arrange
        TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
            .withTutorId(testTutor.getId())
            .withCourseId(testCourse.getId())
            .withDeliveryHours(BigDecimal.ONE)
            .withHours(new BigDecimal("0.05")) // Below minimum 0.1
            .build();

        // Act & Assert
        performPostWithoutFinancialFields("/api/timesheets", request, lecturerToken)
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.traceId").exists())
            .andExpect(jsonPath("$.message").exists());

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
            .withDeliveryHours(BigDecimal.ONE)
            .build();

        // Act & Assert
        performPostWithoutFinancialFields("/api/timesheets", request, lecturerToken)
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
            .withDeliveryHours(BigDecimal.ONE)
            .build();

        // Create with proper JWT auth header (consistent with other tests)
        MvcResult createResponse = performPostWithoutFinancialFields("/api/timesheets", createRequest, lecturerToken)
                .andExpect(status().isCreated())
                .andReturn();

        // Extract timesheet ID from response
        String responseContent = createResponse.getResponse().getContentAsString();
        var responseNode = objectMapper.readTree(responseContent);
        Long timesheetId = responseNode.get("id").asLong();

        // Act & Assert - Retrieve the created timesheet
        performGet("/api/timesheets/" + timesheetId, lecturerToken)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(timesheetId))
            .andExpect(jsonPath("$.tutorId").value(testTutor.getId()))
            .andExpect(jsonPath("$.courseId").value(testCourse.getId()));

        // Test list endpoint
        performGet("/api/timesheets", lecturerToken)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.timesheets").isArray())
            .andExpect(jsonPath("$.pageInfo").exists());
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
            .withDeliveryHours(BigDecimal.ONE)
            .build();

        var createResponse = performPostWithoutFinancialFields("/api/timesheets", request, lecturerToken)
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
