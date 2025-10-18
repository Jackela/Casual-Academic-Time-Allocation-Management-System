package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.dto.request.TimesheetUpdateRequest;
import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import static org.hamcrest.Matchers.closeTo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.DayOfWeek;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.containsString;

/**
 * Integration tests for timesheet update and delete functionality.
 * 
 * Tests AC1 and AC2 from Story 1.3:
 * - AC1: Users can update DRAFT timesheets with proper permissions
 * - AC2: Users can delete DRAFT timesheets with proper permissions
 * - AC4: Permission validation for cross-user operations
 */
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class TimesheetUpdateDeleteIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

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

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private Timesheet draftTimesheet;
    private Timesheet approvedTimesheet;

    @Autowired
    private TimesheetValidationProperties validationProperties;

    @BeforeEach
    void setUp() {
        // Clean up existing data
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        // Create test users
        lecturer = new User();
        lecturer.setEmail("lecturer@university.edu");
        lecturer.setName("Dr. Jane Smith");
        lecturer.setHashedPassword(passwordEncoder.encode("password123"));
        lecturer.setRole(UserRole.LECTURER);
        lecturer.setIsActive(true);
        lecturer = userRepository.save(lecturer);

        tutor = new User();
        tutor.setEmail("tutor@university.edu");
        tutor.setName("John Doe");
        tutor.setHashedPassword(passwordEncoder.encode("password123"));
        tutor.setRole(UserRole.TUTOR);
        tutor.setIsActive(true);
        tutor = userRepository.save(tutor);

        admin = new User();
        admin.setEmail("admin@university.edu");
        admin.setName("Admin User");
        admin.setHashedPassword(passwordEncoder.encode("password123"));
        admin.setRole(UserRole.ADMIN);
        admin.setIsActive(true);
        admin = userRepository.save(admin);

        // Create test course
        course = new Course();
        course.setName("COMP1001 - Introduction to Programming");
        course.setCode("COMP1001");
        course.setSemester("2024S1");
        course.setLecturerId(lecturer.getId());
        course.setIsActive(true);
        course.setBudgetAllocated(BigDecimal.valueOf(10000.00));
        course = courseRepository.save(course);

        // Create test timesheets
        LocalDate monday = LocalDate.now().with(DayOfWeek.MONDAY);
        
        draftTimesheet = new Timesheet();
        draftTimesheet.setTutorId(tutor.getId());
        draftTimesheet.setCourseId(course.getId());
        draftTimesheet.setWeekStartDate(monday);
        draftTimesheet.setHours(BigDecimal.valueOf(10.0));
        draftTimesheet.setHourlyRate(BigDecimal.valueOf(25.00));
        draftTimesheet.setDescription("Tutorial sessions and grading");
        draftTimesheet.setStatus(ApprovalStatus.DRAFT);
        draftTimesheet.setCreatedBy(lecturer.getId());
        draftTimesheet = timesheetRepository.save(draftTimesheet);

        approvedTimesheet = new Timesheet();
        approvedTimesheet.setTutorId(tutor.getId());
        approvedTimesheet.setCourseId(course.getId());
        approvedTimesheet.setWeekStartDate(monday.plusWeeks(1));
        approvedTimesheet.setHours(BigDecimal.valueOf(8.0));
        approvedTimesheet.setHourlyRate(BigDecimal.valueOf(25.00));
        approvedTimesheet.setDescription("Lab sessions");
        approvedTimesheet.setStatus(ApprovalStatus.LECTURER_CONFIRMED);
        approvedTimesheet.setCreatedBy(lecturer.getId());
        approvedTimesheet = timesheetRepository.save(approvedTimesheet);
    }

    // AC1 Tests: Update DRAFT timesheet functionality

    @Test
    @DisplayName("AC1: LECTURER can successfully update DRAFT timesheet for their course")
    void testLecturerCanUpdateDraftTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        
        TimesheetUpdateRequest updateRequest = buildUpdateRequest(
            BigDecimal.valueOf(12.0),
            BigDecimal.valueOf(30.00),
            "Updated: Tutorial sessions, grading, and consultation hours",
            draftTimesheet
        );

        mockMvc.perform(put("/api/timesheets/{id}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(draftTimesheet.getId()))
                .andExpect(jsonPath("$.hours").value(closeTo(3.0, 0.0001)))
                .andExpect(jsonPath("$.hourlyRate").value(closeTo(58.65, 0.01)))
                .andExpect(jsonPath("$.description").value("Updated: Tutorial sessions, grading, and consultation hours"))
                .andExpect(jsonPath("$.status").value(ApprovalStatus.DRAFT.name()));

        // Verify database was updated
        Timesheet updated = timesheetRepository.findById(draftTimesheet.getId()).orElseThrow();
        assertEquals(0, updated.getHours().compareTo(BigDecimal.valueOf(3.0)));
        assertEquals(0, updated.getHourlyRate().compareTo(new BigDecimal("58.65")));
        assertEquals("Updated: Tutorial sessions, grading, and consultation hours", updated.getDescription());
        assertEquals(ApprovalStatus.DRAFT, updated.getStatus());
    }

    @Test
    @DisplayName("AC1: ADMIN can successfully update any DRAFT timesheet")
    void testAdminCanUpdateDraftTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());
        
        TimesheetUpdateRequest updateRequest = buildUpdateRequest(
            BigDecimal.valueOf(15.0),
            BigDecimal.valueOf(35.00),
            "Admin updated timesheet",
            draftTimesheet
        );

        mockMvc.perform(put("/api/timesheets/{id}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hours").value(closeTo(3.0, 0.0001)))
                .andExpect(jsonPath("$.hourlyRate").value(closeTo(58.65, 0.01)))
                .andExpect(jsonPath("$.status").value(ApprovalStatus.DRAFT.name()));
    }

    @Test
    @DisplayName("AC1: Cannot update non-DRAFT timesheet - returns 400")
    void testCannotUpdateApprovedTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        
        TimesheetUpdateRequest updateRequest = buildUpdateRequest(
            BigDecimal.valueOf(12.0),
            BigDecimal.valueOf(30.00),
            "Attempting to update approved timesheet",
            approvedTimesheet
        );

        mockMvc.perform(put("/api/timesheets/{id}", approvedTimesheet.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.message").value(containsString("Only DRAFT timesheets can be updated")));
    }

    @Test
    @DisplayName("AC4: LECTURER cannot update timesheet for course they don't teach - returns 403")
    void testLecturerCannotUpdateTimesheetForOtherCourse() throws Exception {
        // Create another lecturer
        User otherLecturer = new User();
        otherLecturer.setEmail("other.lecturer@university.edu");
        otherLecturer.setName("Dr. Bob Wilson");
        otherLecturer.setHashedPassword(passwordEncoder.encode("password123"));
        otherLecturer.setRole(UserRole.LECTURER);
        otherLecturer.setIsActive(true);
        otherLecturer = userRepository.save(otherLecturer);

        String token = jwtTokenProvider.generateToken(otherLecturer.getId(), otherLecturer.getEmail(), otherLecturer.getRole().name());
        
        TimesheetUpdateRequest updateRequest = buildUpdateRequest(
            BigDecimal.valueOf(12.0),
            BigDecimal.valueOf(30.00),
            "Lecturer attempting to update other course timesheet",
            draftTimesheet
        );

        mockMvc.perform(put("/api/timesheets/{id}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());
    }

    // AC2 Tests: Delete DRAFT timesheet functionality

    @Test
    @DisplayName("AC2: LECTURER can successfully delete DRAFT timesheet for their course")
    void testLecturerCanDeleteDraftTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        mockMvc.perform(delete("/api/timesheets/{id}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify timesheet was deleted
        assertFalse(timesheetRepository.existsById(draftTimesheet.getId()));
    }

    @Test
    @DisplayName("AC2: ADMIN can successfully delete any DRAFT timesheet")
    void testAdminCanDeleteDraftTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());

        mockMvc.perform(delete("/api/timesheets/{id}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify timesheet was deleted
        assertFalse(timesheetRepository.existsById(draftTimesheet.getId()));
    }

    @Test
    @DisplayName("AC2: Cannot delete non-DRAFT timesheet - returns 400")
    void testCannotDeleteApprovedTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        mockMvc.perform(delete("/api/timesheets/{id}", approvedTimesheet.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.message").value(containsString("Only DRAFT timesheets can be deleted")));

        // Verify timesheet was not deleted
        assertTrue(timesheetRepository.existsById(approvedTimesheet.getId()));
    }

    @Test
    @DisplayName("AC4: LECTURER cannot delete timesheet for course they don't teach - returns 403")
    void testLecturerCannotDeleteTimesheetForOtherCourse() throws Exception {
        // Create another lecturer
        User otherLecturer = new User();
        otherLecturer.setEmail("other.lecturer@university.edu");
        otherLecturer.setName("Dr. Alice Brown");
        otherLecturer.setHashedPassword(passwordEncoder.encode("password123"));
        otherLecturer.setRole(UserRole.LECTURER);
        otherLecturer.setIsActive(true);
        otherLecturer = userRepository.save(otherLecturer);

        String token = jwtTokenProvider.generateToken(otherLecturer.getId(), otherLecturer.getEmail(), otherLecturer.getRole().name());

        mockMvc.perform(delete("/api/timesheets/{id}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());

        // Verify timesheet was not deleted
        assertTrue(timesheetRepository.existsById(draftTimesheet.getId()));
    }

    // Error handling tests

    @Test
    @DisplayName("Update non-existent timesheet returns 404")
    void testUpdateNonExistentTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        
        TimesheetUpdateRequest updateRequest = buildUpdateRequest(
            BigDecimal.valueOf(12.0),
            BigDecimal.valueOf(30.00),
            "Update non-existent timesheet",
            draftTimesheet
        );

        mockMvc.perform(put("/api/timesheets/{id}", 99999L)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Delete non-existent timesheet returns 404")
    void testDeleteNonExistentTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        mockMvc.perform(delete("/api/timesheets/{id}", 99999L)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Update timesheet without authentication returns 401")
    void testUpdateTimesheetWithoutAuth() throws Exception {
        TimesheetUpdateRequest updateRequest = buildUpdateRequest(
            BigDecimal.valueOf(12.0),
            BigDecimal.valueOf(30.00),
            "Unauthorized update",
            draftTimesheet
        );

        mockMvc.perform(put("/api/timesheets/{id}", draftTimesheet.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Delete timesheet without authentication returns 401")
    void testDeleteTimesheetWithoutAuth() throws Exception {
        mockMvc.perform(delete("/api/timesheets/{id}", draftTimesheet.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Update timesheet with invalid data returns 400")
    void testUpdateTimesheetWithInvalidData() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        
        // Invalid hours (too high): derive from SSOT validation properties to avoid magic numbers
        BigDecimal maxHours = validationProperties.getHours().getMax();
        TimesheetUpdateRequest invalidRequest = buildUpdateRequest(
            maxHours.add(BigDecimal.ONE),
            BigDecimal.valueOf(30.00),
            "Invalid hours",
            draftTimesheet
        );
        invalidRequest.setDeliveryHours(maxHours.add(BigDecimal.ONE));

        mockMvc.perform(put("/api/timesheets/{id}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
    private TimesheetUpdateRequest buildUpdateRequest(BigDecimal hours,
                                                     BigDecimal hourlyRate,
                                                     String description,
                                                     Timesheet baseTimesheet) {

        TimesheetUpdateRequest request = new TimesheetUpdateRequest(hours, hourlyRate, description);

        request.setTaskType(TimesheetTaskType.TUTORIAL);

        request.setQualification(TutorQualification.STANDARD);

        request.setRepeat(Boolean.FALSE);

        request.setDeliveryHours(BigDecimal.ONE);

        request.setSessionDate(baseTimesheet.getWeekStartDate());

        return request;

    }

}
