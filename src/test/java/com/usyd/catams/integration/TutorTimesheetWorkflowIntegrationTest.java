package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.dto.request.TimesheetUpdateRequest;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Story 2.2: TUTOR Timesheet Feedback Workflow.
 * 
 * Tests all acceptance criteria:
 * - AC1: GET /api/timesheets/me endpoint for TUTORs
 * - AC2: REJECTED status visibility for TUTORs
 * - AC3: TUTOR can edit REJECTED timesheets (status resets to DRAFT)
 * - AC4: TUTOR can delete REJECTED timesheets
 * - AC5: TUTOR can resubmit edited timesheets via POST /api/approvals
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class TutorTimesheetWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private LocalDate mondayDate;
    private String tutorToken;
    private String lecturerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        // Clear existing data
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        // Create test users
        lecturer = createUser("lecturer@test.com", "Lecturer User", UserRole.LECTURER);
        tutor = createUser("tutor@test.com", "Tutor User", UserRole.TUTOR);
        admin = createUser("admin@test.com", "Admin User", UserRole.ADMIN);

        // Create test course
        course = createCourse("TEST3001", "Test Course", lecturer.getId());

        // Get next Monday for testing
        mondayDate = getNextMonday();

        // Generate JWT tokens for testing
        tutorToken = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        lecturerToken = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        adminToken = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());
    }

    /**
     * Test AC1: GET /api/timesheets/me endpoint returns all tutor's timesheets.
     */
    @Test
    void testAC1_TutorCanViewAllOwnTimesheets() throws Exception {
        // Given: Create timesheets in different statuses for the tutor
        Timesheet draftTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.DRAFT);
        Timesheet rejectedTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate.plusWeeks(1), ApprovalStatus.REJECTED);
        Timesheet approvedTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate.plusWeeks(2), ApprovalStatus.FINAL_APPROVED);

        // When: TUTOR calls GET /api/timesheets/me
        MvcResult result = mockMvc.perform(get("/api/timesheets/me")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        // Then: All tutor's timesheets are returned
        PagedTimesheetResponse response = objectMapper.readValue(
            result.getResponse().getContentAsString(), PagedTimesheetResponse.class);

        assertThat(response.getContent()).hasSize(3);
        assertThat(response.getContent()).extracting("id")
            .containsExactlyInAnyOrder(draftTimesheet.getId(), rejectedTimesheet.getId(), approvedTimesheet.getId());
    }

    /**
     * Test AC1: GET /api/timesheets/me with status filtering.
     */
    @Test
    void testAC1_TutorCanFilterTimesheetsByStatus() throws Exception {
        // Given: Create timesheets in different statuses
        createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.DRAFT);
        Timesheet rejectedTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate.plusWeeks(1), ApprovalStatus.REJECTED);

        // When: TUTOR calls GET /api/timesheets/me?status=REJECTED
        MvcResult result = mockMvc.perform(get("/api/timesheets/me")
                .param("status", "REJECTED")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        // Then: Only REJECTED timesheets are returned
        PagedTimesheetResponse response = objectMapper.readValue(
            result.getResponse().getContentAsString(), PagedTimesheetResponse.class);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getId()).isEqualTo(rejectedTimesheet.getId());
        assertThat(response.getContent().get(0).getStatus()).isEqualTo(ApprovalStatus.REJECTED);
    }

    /**
     * Test AC2: TUTOR can see REJECTED status through the new endpoint.
     */
    @Test
    void testAC2_TutorCanSeeRejectedStatus() throws Exception {
        // Given: Create a REJECTED timesheet
        Timesheet rejectedTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.REJECTED);

        // When: TUTOR calls GET /api/timesheets/me
        MvcResult result = mockMvc.perform(get("/api/timesheets/me")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        // Then: REJECTED status is visible
        PagedTimesheetResponse response = objectMapper.readValue(
            result.getResponse().getContentAsString(), PagedTimesheetResponse.class);

        assertThat(response.getContent()).hasSize(1);
        TimesheetResponse timesheetResponse = response.getContent().get(0);
        assertThat(timesheetResponse.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(timesheetResponse.getId()).isEqualTo(rejectedTimesheet.getId());
    }

    /**
     * Test AC3: TUTOR can edit REJECTED timesheets and status resets to DRAFT.
     */
    @Test
    void testAC3_TutorCanEditRejectedTimesheetsAndStatusResetsToDraft() throws Exception {
        // Given: Create a REJECTED timesheet
        Timesheet rejectedTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.REJECTED);

        // When: TUTOR updates the REJECTED timesheet
        TimesheetUpdateRequest updateRequest = new TimesheetUpdateRequest();
        updateRequest.setHours(new BigDecimal("8.0"));
        updateRequest.setHourlyRate(new BigDecimal("25.00"));
        updateRequest.setDescription("Updated work description after rejection feedback");

        mockMvc.perform(put("/api/timesheets/" + rejectedTimesheet.getId())
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.hours").value(8.0))
                .andExpect(jsonPath("$.description").value("Updated work description after rejection feedback"));

        // Then: Status has been reset to DRAFT in database
        Timesheet updatedTimesheet = timesheetRepository.findById(rejectedTimesheet.getId()).orElseThrow();
        assertThat(updatedTimesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        assertThat(updatedTimesheet.getHours()).isEqualTo(new BigDecimal("8.0"));
        assertThat(updatedTimesheet.getDescription()).isEqualTo("Updated work description after rejection feedback");
    }

    /**
     * Test AC3: TUTOR cannot edit non-REJECTED timesheets.
     */
    @Test
    void testAC3_TutorCannotEditNonRejectedTimesheets() throws Exception {
        // Given: Create a DRAFT timesheet
        Timesheet draftTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.DRAFT);

        // When: TUTOR tries to update the DRAFT timesheet
        TimesheetUpdateRequest updateRequest = new TimesheetUpdateRequest();
        updateRequest.setHours(new BigDecimal("8.0"));
        updateRequest.setHourlyRate(new BigDecimal("25.00"));
        updateRequest.setDescription("Should not be allowed");

        // Then: Request should be forbidden
        mockMvc.perform(put("/api/timesheets/" + draftTimesheet.getId())
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    /**
     * Test AC4: TUTOR can delete REJECTED timesheets.
     */
    @Test
    void testAC4_TutorCanDeleteRejectedTimesheets() throws Exception {
        // Given: Create a REJECTED timesheet
        Timesheet rejectedTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.REJECTED);

        // When: TUTOR deletes the REJECTED timesheet
        mockMvc.perform(delete("/api/timesheets/" + rejectedTimesheet.getId())
                .header("Authorization", "Bearer " + tutorToken))
                .andExpect(status().isNoContent());

        // Then: Timesheet should be deleted from database
        assertThat(timesheetRepository.findById(rejectedTimesheet.getId())).isEmpty();
    }

    /**
     * Test AC4: TUTOR cannot delete non-REJECTED timesheets.
     */
    @Test
    void testAC4_TutorCannotDeleteNonRejectedTimesheets() throws Exception {
        // Given: Create a DRAFT timesheet
        Timesheet draftTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.DRAFT);

        // When: TUTOR tries to delete the DRAFT timesheet
        // Then: Request should be forbidden
        mockMvc.perform(delete("/api/timesheets/" + draftTimesheet.getId())
                .header("Authorization", "Bearer " + tutorToken))
                .andExpect(status().isForbidden());

        // And: Timesheet should still exist in database
        assertThat(timesheetRepository.findById(draftTimesheet.getId())).isPresent();
    }

    /**
     * Test AC5: TUTOR can resubmit edited timesheets via POST /api/approvals.
     */
    @Test
    void testAC5_TutorCanResubmitEditedTimesheets() throws Exception {
        // Given: Create and edit a REJECTED timesheet (becomes DRAFT)
        Timesheet rejectedTimesheet = createTimesheet(tutor.getId(), course.getId(), mondayDate, ApprovalStatus.REJECTED);
        
        // Edit it to DRAFT status
        TimesheetUpdateRequest updateRequest = new TimesheetUpdateRequest();
        updateRequest.setHours(new BigDecimal("8.0"));
        updateRequest.setHourlyRate(new BigDecimal("25.00"));
        updateRequest.setDescription("Updated after feedback");

        mockMvc.perform(put("/api/timesheets/" + rejectedTimesheet.getId())
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());

        // When: TUTOR resubmits via POST /api/approvals
        ApprovalActionRequest approvalRequest = new ApprovalActionRequest();
        approvalRequest.setTimesheetId(rejectedTimesheet.getId());
        approvalRequest.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);
        approvalRequest.setComment("Resubmitting after addressing feedback");

        mockMvc.perform(post("/api/approvals")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(approvalRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newStatus").value("PENDING_LECTURER_APPROVAL"));

        // Then: Status should be PENDING_LECTURER_APPROVAL
        Timesheet resubmittedTimesheet = timesheetRepository.findById(rejectedTimesheet.getId()).orElseThrow();
        assertThat(resubmittedTimesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_LECTURER_APPROVAL);
    }

    /**
     * Test complete feedback loop workflow.
     */
    @Test
    void testCompleteFeedbackLoopWorkflow() throws Exception {
        // Step 1: LECTURER creates timesheet
        TimesheetCreateRequest createRequest = new TimesheetCreateRequest();
        createRequest.setTutorId(tutor.getId());
        createRequest.setCourseId(course.getId());
        createRequest.setWeekStartDate(mondayDate);
        createRequest.setHours(new BigDecimal("10.0"));
        createRequest.setHourlyRate(new BigDecimal("20.00"));
        createRequest.setDescription("Initial timesheet");

        MvcResult createResult = mockMvc.perform(post("/api/timesheets")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        TimesheetResponse createdTimesheet = objectMapper.readValue(
            createResult.getResponse().getContentAsString(), TimesheetResponse.class);

        // Step 2: TUTOR submits for approval (as TUTORs submit their own timesheets)
        ApprovalActionRequest submitRequest = new ApprovalActionRequest();
        submitRequest.setTimesheetId(createdTimesheet.getId());
        submitRequest.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);

        mockMvc.perform(post("/api/approvals")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isOk());

        // Step 3: LECTURER rejects timesheet
        ApprovalActionRequest rejectRequest = new ApprovalActionRequest();
        rejectRequest.setTimesheetId(createdTimesheet.getId());
        rejectRequest.setAction(ApprovalAction.REJECT);
        rejectRequest.setComment("Please increase hours and provide more detail");

        mockMvc.perform(post("/api/approvals")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(rejectRequest)))
                .andExpect(status().isOk());

        // Step 4: TUTOR views rejection via GET /api/timesheets/me
        MvcResult viewResult = mockMvc.perform(get("/api/timesheets/me")
                .param("status", "REJECTED")
                .header("Authorization", "Bearer " + tutorToken))
                .andExpect(status().isOk())
                .andReturn();

        PagedTimesheetResponse viewResponse = objectMapper.readValue(
            viewResult.getResponse().getContentAsString(), PagedTimesheetResponse.class);
        assertThat(viewResponse.getContent()).hasSize(1);
        assertThat(viewResponse.getContent().get(0).getStatus()).isEqualTo(ApprovalStatus.REJECTED);

        // Step 5: TUTOR edits rejected timesheet
        TimesheetUpdateRequest updateRequest = new TimesheetUpdateRequest();
        updateRequest.setHours(new BigDecimal("15.0"));
        updateRequest.setHourlyRate(new BigDecimal("20.00"));
        updateRequest.setDescription("Updated timesheet with more detail and increased hours as requested");

        mockMvc.perform(put("/api/timesheets/" + createdTimesheet.getId())
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));

        // Step 6: TUTOR resubmits
        ApprovalActionRequest resubmitRequest = new ApprovalActionRequest();
        resubmitRequest.setTimesheetId(createdTimesheet.getId());
        resubmitRequest.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);
        resubmitRequest.setComment("Addressed feedback - increased hours and added detail");

        mockMvc.perform(post("/api/approvals")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resubmitRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newStatus").value("PENDING_LECTURER_APPROVAL"));

        // Verify final state
        Timesheet finalTimesheet = timesheetRepository.findById(createdTimesheet.getId()).orElseThrow();
        assertThat(finalTimesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_LECTURER_APPROVAL);
        assertThat(finalTimesheet.getHours()).isEqualTo(new BigDecimal("15.0"));
        assertThat(finalTimesheet.getDescription()).contains("increased hours");
    }

    /**
     * Test security: TUTOR cannot access other tutor's timesheets.
     */
    @Test
    void testSecurityTutorCannotAccessOtherTutorTimesheets() throws Exception {
        // Given: Create another tutor with timesheets
        User otherTutor = createUser("other@test.com", "Other Tutor", UserRole.TUTOR);
        createTimesheet(otherTutor.getId(), course.getId(), mondayDate, ApprovalStatus.REJECTED);

        // When: TUTOR calls GET /api/timesheets/me
        MvcResult result = mockMvc.perform(get("/api/timesheets/me")
                .header("Authorization", "Bearer " + tutorToken))
                .andExpect(status().isOk())
                .andReturn();

        // Then: Only own timesheets are returned
        PagedTimesheetResponse response = objectMapper.readValue(
            result.getResponse().getContentAsString(), PagedTimesheetResponse.class);
        assertThat(response.getContent()).isEmpty();
    }

    // Helper methods

    private User createUser(String email, String name, UserRole role) {
        User user = new User(email, name, "password123", role);
        return userRepository.save(user);
    }

    private Course createCourse(String code, String name, Long lecturerId) {
        Course course = new Course(code, name, "2025S1", lecturerId, new BigDecimal("10000.00"));
        return courseRepository.save(course);
    }

    private Timesheet createTimesheet(Long tutorId, Long courseId, LocalDate weekStartDate, ApprovalStatus status) {
        Timesheet timesheet = new Timesheet(tutorId, courseId, weekStartDate, 
                                           new BigDecimal("10.0"), new BigDecimal("20.00"), 
                                           "Test timesheet", lecturer.getId());
        timesheet.setStatus(status);
        return timesheetRepository.save(timesheet);
    }

    private LocalDate getNextMonday() {
        LocalDate date = LocalDate.now();
        while (date.getDayOfWeek() != DayOfWeek.MONDAY) {
            date = date.plusDays(1);
        }
        return date;
    }
}