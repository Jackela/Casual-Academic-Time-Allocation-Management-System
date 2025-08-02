package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for TimesheetController endpoints.
 * 
 * These tests verify all Acceptance Criteria (AC1-AC5) for Story 1.2:
 * - AC1: LECTURER can create timesheets for TUTORs
 * - AC2: TUTOR can view their own timesheets with pagination
 * - AC3: ADMIN can view all timesheets with filtering
 * - AC4: 404 error for non-existent timesheets
 * - AC5: Schema validation compliance
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Transactional
public class TimesheetControllerIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private LocalDate mondayDate;

    private String lecturerToken;
    private String tutorToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .webAppContextSetup(context)
            .apply(springSecurity())
            .build();

        // Clean up existing data
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        // Create test users
        lecturer = createUser("lecturer@test.com", "Dr. Smith", UserRole.LECTURER);
        tutor = createUser("tutor@test.com", "Jane Doe", UserRole.TUTOR);
        admin = createUser("admin@test.com", "Admin User", UserRole.ADMIN);

        // Create test course
        course = new Course("COMP5349", "Cloud Computing", "2025S1", lecturer.getId(), BigDecimal.valueOf(10000.00));
        course = courseRepository.save(course);

        // Get next Monday date
        mondayDate = getNextMonday();

        // Generate JWT tokens
        lecturerToken = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        tutorToken = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        adminToken = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());
    }

    @Test
    void testAC1_LecturerCanCreateTimesheetForTutor() throws Exception {
        // ARRANGE: Prepare timesheet creation request
        TimesheetCreateRequest request = new TimesheetCreateRequest(
            tutor.getId(),
            course.getId(),
            mondayDate,
            BigDecimal.valueOf(10.0),
            BigDecimal.valueOf(45.00),
            "Tutorial assistance for cloud computing module"
        );

        // ACT & ASSERT: LECTURER creates timesheet successfully
        mockMvc.perform(post("/api/timesheets")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.tutorId").value(tutor.getId()))
            .andExpect(jsonPath("$.courseId").value(course.getId()))
            .andExpect(jsonPath("$.weekStartDate").value(mondayDate.toString()))
            .andExpect(jsonPath("$.hours").value(10.0))
            .andExpect(jsonPath("$.hourlyRate").value(45.00))
            .andExpect(jsonPath("$.totalPay").value(450.00))
            .andExpect(jsonPath("$.description").value("Tutorial assistance for cloud computing module"))
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.createdBy").value(lecturer.getId()))
            .andExpect(jsonPath("$.isEditable").value(true))
            .andExpect(jsonPath("$.canBeApproved").value(false));
    }

    @Test
    void testAC1_NonLecturerCannotCreateTimesheet() throws Exception {
        // ARRANGE: Prepare timesheet creation request
        TimesheetCreateRequest request = new TimesheetCreateRequest(
            tutor.getId(),
            course.getId(),
            mondayDate,
            BigDecimal.valueOf(10.0),
            BigDecimal.valueOf(45.00),
            "Tutorial work"
        );

        // ACT & ASSERT: TUTOR cannot create timesheet
        mockMvc.perform(post("/api/timesheets")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());

        // ACT & ASSERT: ADMIN cannot create timesheet
        mockMvc.perform(post("/api/timesheets")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    void testAC1_ValidationErrors() throws Exception {
        // Test invalid hours (below minimum)
        TimesheetCreateRequest invalidHoursRequest = new TimesheetCreateRequest(
            tutor.getId(),
            course.getId(),
            mondayDate,
            BigDecimal.valueOf(0.05), // Below minimum
            BigDecimal.valueOf(45.00),
            "Tutorial work"
        );

        mockMvc.perform(post("/api/timesheets")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidHoursRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("Hours must be at least 0.1")));

        // Test invalid hourly rate (above maximum)
        TimesheetCreateRequest invalidRateRequest = new TimesheetCreateRequest(
            tutor.getId(),
            course.getId(),
            mondayDate,
            BigDecimal.valueOf(10.0),
            BigDecimal.valueOf(250.00), // Above maximum
            "Tutorial work"
        );

        mockMvc.perform(post("/api/timesheets")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRateRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("Hourly rate cannot exceed 200.00")));

        // Test empty description
        TimesheetCreateRequest emptyDescRequest = new TimesheetCreateRequest(
            tutor.getId(),
            course.getId(),
            mondayDate,
            BigDecimal.valueOf(10.0),
            BigDecimal.valueOf(45.00),
            "" // Empty description
        );

        mockMvc.perform(post("/api/timesheets")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emptyDescRequest)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("Description is required")));
    }

    @Test
    void testAC2_TutorCanViewOwnTimesheets() throws Exception {
        // ARRANGE: Create timesheet for tutor
        createTestTimesheet(tutor.getId(), course.getId(), mondayDate, "Tutorial work 1");
        createTestTimesheet(tutor.getId(), course.getId(), mondayDate.plusWeeks(1), "Tutorial work 2");

        // ACT & ASSERT: TUTOR can view their own timesheets
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + tutorToken)
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content", hasSize(2)))
            .andExpect(jsonPath("$.content[0].tutorId").value(tutor.getId()))
            .andExpect(jsonPath("$.content[1].tutorId").value(tutor.getId()))
            .andExpect(jsonPath("$.page.totalElements").value(2))
            .andExpect(jsonPath("$.page.totalPages").value(1))
            .andExpect(jsonPath("$.page.number").value(0))
            .andExpect(jsonPath("$.page.size").value(20));
    }

    @Test
    void testAC2_TutorCannotViewOtherTutorsTimesheets() throws Exception {
        // ARRANGE: Create another tutor and timesheet
        User otherTutor = createUser("tutor2@test.com", "John Smith", UserRole.TUTOR);
        createTestTimesheet(otherTutor.getId(), course.getId(), mondayDate, "Other tutor work");

        // ACT & ASSERT: TUTOR cannot see other tutor's timesheets by specifying tutorId
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + tutorToken)
                .param("tutorId", otherTutor.getId().toString()))
            .andExpect(status().isForbidden());
    }

    @Test 
    void testAC3_AdminCanViewAllTimesheetsWithFiltering() throws Exception {
        // ARRANGE: Create timesheets for different tutors and courses
        User tutor2 = createUser("tutor2@test.com", "John Smith", UserRole.TUTOR);
        Course course2 = new Course("COMP3600", "Algorithms", "2025S1", lecturer.getId(), BigDecimal.valueOf(8000.00));
        course2 = courseRepository.save(course2);

        createTestTimesheet(tutor.getId(), course.getId(), mondayDate, "Work 1");
        createTestTimesheet(tutor2.getId(), course.getId(), mondayDate.plusWeeks(1), "Work 2");
        createTestTimesheet(tutor.getId(), course2.getId(), mondayDate.plusWeeks(2), "Work 3");

        // ACT & ASSERT: ADMIN can view all timesheets
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(3)));

        // ACT & ASSERT: ADMIN can filter by tutorId
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + adminToken)
                .param("tutorId", tutor.getId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(2)))
            .andExpect(jsonPath("$.content[0].tutorId").value(tutor.getId()))
            .andExpect(jsonPath("$.content[1].tutorId").value(tutor.getId()));

        // ACT & ASSERT: ADMIN can filter by courseId
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + adminToken)
                .param("courseId", course.getId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(2)))
            .andExpect(jsonPath("$.content[0].courseId").value(course.getId()))
            .andExpect(jsonPath("$.content[1].courseId").value(course.getId()));
    }

    @Test
    void testAC4_NotFoundErrorForNonExistentTimesheet() throws Exception {
        // ACT & ASSERT: Request non-existent timesheet returns 404
        mockMvc.perform(get("/api/timesheets/99999")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNotFound());
    }

    @Test
    void testAC5_SchemaValidationCompliance() throws Exception {
        // ARRANGE: Create timesheet
        createTestTimesheet(tutor.getId(), course.getId(), mondayDate, "Schema test work");

        // ACT & ASSERT: Response matches OpenAPI schema
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content[0].id").isNumber())
            .andExpect(jsonPath("$.content[0].tutorId").isNumber())
            .andExpect(jsonPath("$.content[0].courseId").isNumber())
            .andExpect(jsonPath("$.content[0].weekStartDate").isString())
            .andExpect(jsonPath("$.content[0].hours").isNumber())
            .andExpect(jsonPath("$.content[0].hourlyRate").isNumber())
            .andExpect(jsonPath("$.content[0].totalPay").isNumber())
            .andExpect(jsonPath("$.content[0].description").isString())
            .andExpect(jsonPath("$.content[0].status").isString())
            .andExpect(jsonPath("$.content[0].createdAt").isString())
            .andExpect(jsonPath("$.content[0].updatedAt").isString())
            .andExpect(jsonPath("$.content[0].createdBy").isNumber())
            .andExpect(jsonPath("$.content[0].isEditable").isBoolean())
            .andExpect(jsonPath("$.content[0].canBeApproved").isBoolean())
            .andExpect(jsonPath("$.page.number").isNumber())
            .andExpect(jsonPath("$.page.size").isNumber())
            .andExpect(jsonPath("$.page.totalElements").isNumber())
            .andExpect(jsonPath("$.page.totalPages").isNumber())
            .andExpect(jsonPath("$.page.first").isBoolean())
            .andExpect(jsonPath("$.page.last").isBoolean());
    }

    @Test
    void testLecturerCanViewTimesheetsForTheirCourses() throws Exception {
        // ARRANGE: Create timesheet for lecturer's course
        createTestTimesheet(tutor.getId(), course.getId(), mondayDate, "Lecturer's course work");

        // Create another lecturer and course
        User otherLecturer = createUser("lecturer2@test.com", "Dr. Jones", UserRole.LECTURER);
        Course otherCourse = new Course("COMP2000", "Programming", "2025S1", otherLecturer.getId(), BigDecimal.valueOf(5000.00));
        otherCourse = courseRepository.save(otherCourse);
        createTestTimesheet(tutor.getId(), otherCourse.getId(), mondayDate.plusWeeks(1), "Other lecturer's course work");

        // ACT & ASSERT: LECTURER can view timesheets for their courses
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + lecturerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(1)))
            .andExpect(jsonPath("$.content[0].courseId").value(course.getId()));

        // ACT & ASSERT: LECTURER cannot view timesheets for other lecturer's courses by filtering
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + lecturerToken)
                .param("courseId", otherCourse.getId().toString()))
            .andExpect(status().isForbidden());
    }

    @Test
    void testPaginationAndSorting() throws Exception {
        // ARRANGE: Create multiple timesheets
        for (int i = 0; i < 5; i++) {
            createTestTimesheet(tutor.getId(), course.getId(), mondayDate.plusWeeks(i), "Work " + (i + 1));
            Thread.sleep(10); // Ensure different timestamps
        }

        // ACT & ASSERT: Test pagination
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + adminToken)
                .param("page", "0")
                .param("size", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(2)))
            .andExpect(jsonPath("$.page.totalElements").value(5))
            .andExpect(jsonPath("$.page.totalPages").value(3));

        // ACT & ASSERT: Test sorting by weekStartDate ascending
        mockMvc.perform(get("/api/timesheets")
                .header("Authorization", "Bearer " + adminToken)
                .param("sort", "weekStartDate,asc"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].weekStartDate").value(mondayDate.toString()));
    }

    // Helper methods

    private User createUser(String email, String name, UserRole role) {
        User user = new User(email, name, passwordEncoder.encode("password123"), role);
        return userRepository.save(user);
    }

    private void createTestTimesheet(Long tutorId, Long courseId, LocalDate weekStartDate, String description) {
        try {
            TimesheetCreateRequest request = new TimesheetCreateRequest(
                tutorId, courseId, weekStartDate, BigDecimal.valueOf(10.0), BigDecimal.valueOf(45.00), description
            );

            mockMvc.perform(post("/api/timesheets")
                    .header("Authorization", "Bearer " + lecturerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)));
        } catch (Exception e) {
            throw new RuntimeException("Failed to create test timesheet", e);
        }
    }

    private LocalDate getNextMonday() {
        LocalDate today = LocalDate.now();
        int daysUntilMonday = DayOfWeek.MONDAY.getValue() - today.getDayOfWeek().getValue();
        if (daysUntilMonday <= 0) {
            daysUntilMonday += 7;
        }
        return today.plusDays(daysUntilMonday);
    }
}