package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.TutorAssignment;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
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
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.containsString;

/**
 * Integration tests for approval submission functionality.
 * 
 * Tests AC3 from Story 1.3:
 * - AC3: Users can submit DRAFT timesheets for approval via SUBMIT_FOR_APPROVAL action
 * - AC4: Permission validation for approval operations
 * - AC5: API response compliance with OpenAPI specification
 */
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class ApprovalSubmissionIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private TutorAssignmentRepository tutorAssignmentRepository;

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private Timesheet draftTimesheet;
    private Timesheet approvedTimesheet;

    @BeforeEach
    void setUp() {
        // Clean up existing data
        tutorAssignmentRepository.deleteAll();
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

        tutorAssignmentRepository.save(new TutorAssignment(tutor.getId(), course.getId()));

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

    // AC3 Tests: Submit DRAFT timesheet for approval

    @Test
    @DisplayName("AC3: TUTOR can successfully submit their own DRAFT timesheet for approval")
    void testTutorCanSubmitOwnDraftTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Submitting timesheet for approval"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timesheetId").value(draftTimesheet.getId()))
                .andExpect(jsonPath("$.action").value("SUBMIT_FOR_APPROVAL"))
                .andExpect(jsonPath("$.newStatus").value("PENDING_TUTOR_CONFIRMATION"))
                .andExpect(jsonPath("$.approverId").value(tutor.getId()))
                .andExpect(jsonPath("$.approverName").value("John Doe"))
                .andExpect(jsonPath("$.comment").value(nullValue()))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.nextSteps").exists())
                .andExpect(jsonPath("$.nextSteps[0]").value("Timesheet is now pending lecturer approval"));

        // Verify timesheet status was updated
        Timesheet updated = timesheetRepository.findById(draftTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, updated.getStatus());

        // Verify approval record was created through aggregate
        List<Approval> approvals = updated.getApprovalHistory();
        assertEquals(1, approvals.size());
        Approval approval = approvals.get(0);
        assertEquals(ApprovalAction.SUBMIT_FOR_APPROVAL, approval.getAction());
        assertEquals(ApprovalStatus.DRAFT, approval.getPreviousStatus());
        assertEquals(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, approval.getNewStatus());
        assertEquals(tutor.getId(), approval.getApproverId());
        assertEquals("Submitting timesheet for approval", approval.getComment());
    }

    @Test
    @DisplayName("AC3: ADMIN can submit any DRAFT timesheet for approval")
    void testAdminCanSubmitDraftTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Admin submitting timesheet"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newStatus").value("PENDING_TUTOR_CONFIRMATION"));

        // Verify timesheet status was updated
        Timesheet updated = timesheetRepository.findById(draftTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, updated.getStatus());
    }

    @Test
    @DisplayName("AC3: Cannot submit non-DRAFT timesheet - returns 400")
    void testCannotSubmitApprovedTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            approvedTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Attempting to submit approved timesheet"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.message").value(containsString("Cannot perform SUBMIT_FOR_APPROVAL on timesheet with status LECTURER_CONFIRMED")));
    }

    @Test
    @DisplayName("AC4: TUTOR cannot submit other users' timesheets - returns 403")
    void testTutorCannotSubmitOtherUsersTimesheet() throws Exception {
        // Create another tutor
        User otherTutor = new User();
        otherTutor.setEmail("other.tutor@university.edu");
        otherTutor.setName("Jane Wilson");
        otherTutor.setHashedPassword(passwordEncoder.encode("password123"));
        otherTutor.setRole(UserRole.TUTOR);
        otherTutor.setIsActive(true);
        otherTutor = userRepository.save(otherTutor);

        String token = jwtTokenProvider.generateToken(otherTutor.getId(), otherTutor.getEmail(), otherTutor.getRole().name());
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            draftTimesheet.getId(), // This belongs to the original tutor
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Unauthorized submission attempt"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());

        // Verify timesheet status was not changed
        Timesheet unchanged = timesheetRepository.findById(draftTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.DRAFT, unchanged.getStatus());
    }

    @Test
    @DisplayName("AC4: LECTURER can submit timesheets (lecturers are creators per SSOT)")
    void testLecturerCanSubmitTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Lecturer submitting timesheet"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newStatus").value("PENDING_TUTOR_CONFIRMATION"));

        // Verify timesheet status was updated
        Timesheet updated = timesheetRepository.findById(draftTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, updated.getStatus());
    }

    @Test
    @DisplayName("AC4: LECTURER cannot approve timesheets (only tutors can approve per SSOT)")
    void testLecturerCannotApproveTimesheet() throws Exception {
        // First submit the timesheet to get it into PENDING_TUTOR_CONFIRMATION state (lecturer submits per SSOT)
        String lecturerToken = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        ApprovalActionRequest submitRequest = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Submitting for approval"
        );
        
        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isOk());

        // Now try to approve as lecturer - should fail (lecturers can't approve per SSOT)
        ApprovalActionRequest approveRequest = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.TUTOR_CONFIRM,
            "Lecturer attempting to approve"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + lecturerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(approveRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").exists());
    }

    // AC5 Tests: API compliance with OpenAPI specification

    @Test
    @DisplayName("AC5: Approval submission response matches OpenAPI schema")
    void testApprovalSubmissionResponseSchema() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Schema compliance test"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                // Verify all required fields per OpenAPI schema
                .andExpect(jsonPath("$.timesheetId").exists())
                .andExpect(jsonPath("$.timesheetId").isNumber())
                .andExpect(jsonPath("$.action").exists())
                .andExpect(jsonPath("$.action").isString())
                .andExpect(jsonPath("$.newStatus").exists())
                .andExpect(jsonPath("$.newStatus").isString())
                .andExpect(jsonPath("$.approverId").exists())
                .andExpect(jsonPath("$.approverId").isNumber())
                .andExpect(jsonPath("$.approverName").exists())
                .andExpect(jsonPath("$.approverName").isString())
                .andExpect(jsonPath("$.comment").value(nullValue()))
                .andExpect(jsonPath("$.timestamp").exists())
                // Verify optional fields
                .andExpect(jsonPath("$.nextSteps").exists())
                .andExpect(jsonPath("$.nextSteps").isArray());
    }

    // Error handling tests

    @Test
    @DisplayName("Submit approval without authentication returns 401")
    void testSubmitApprovalWithoutAuth() throws Exception {
        ApprovalActionRequest request = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Unauthorized submission"
        );

        mockMvc.perform(post("/api/confirmations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Submit approval for non-existent timesheet returns 404")
    void testSubmitApprovalForNonExistentTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            99999L, // Non-existent timesheet ID
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Non-existent timesheet"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Submit approval with invalid data returns 400")
    void testSubmitApprovalWithInvalidData() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        
        // Request with null action
        String invalidJson = "{\"timesheetId\":" + draftTimesheet.getId() + ",\"action\":null,\"comment\":\"Invalid action\"}";

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Submit approval with comment exceeding limit returns 400")
    void testSubmitApprovalWithLongComment() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        
        // Create comment longer than 500 characters
        String longComment = "A".repeat(501);
        
        ApprovalActionRequest request = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            longComment
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("Get approval history for accessible timesheet")
    void testGetApprovalHistory() throws Exception {
        // First submit the timesheet
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        
        ApprovalActionRequest submitRequest = new ApprovalActionRequest(
            draftTimesheet.getId(),
            ApprovalAction.SUBMIT_FOR_APPROVAL,
            "Initial submission"
        );

        mockMvc.perform(post("/api/confirmations")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isOk());

        // Now get approval history
        mockMvc.perform(get("/api/confirmations/history/{timesheetId}", draftTimesheet.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isNotEmpty())
                .andExpect(jsonPath("$[0].action").value("SUBMIT_FOR_APPROVAL"))
                .andExpect(jsonPath("$[0].timesheetId").value(draftTimesheet.getId()));
    }
}
