package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
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
import com.usyd.catams.testdata.TestDataBuilder;
import com.usyd.catams.testutil.TestAuthenticationHelper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
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

/**
 * Integration tests for Story 2.1: Tutor Approval Workflow (Approve/Reject).
 * 
 * Based on SSOT: Tutors are first-level approvers, Lecturers are creators, HR are final approvers.
 * 
 * Tests all acceptance criteria:
 * - AC1: GET /api/timesheets/pending-approval endpoint with proper access control
 * - AC2: TUTOR can APPROVE pending timesheets with auto-transition to HR review
 * - AC3: TUTOR can REJECT pending timesheets  
 * - AC4: Authorization validation - only tutors for their own timesheets can approve/reject
 * - AC5: State transition validation - only PENDING_TUTOR_REVIEW can be acted upon
 */
@ActiveProfiles("integration-test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class TutorApprovalWorkflowIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private TestUserSeedingService testUserSeedingService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Test data
    private User lecturer;
    private User otherLecturer;
    private User tutor;
    private User admin;
    private Course course;
    private Course otherCourse;
    private Timesheet pendingTimesheet;
    private Timesheet draftTimesheet;
    private Timesheet approvedTimesheet;

    @BeforeAll
    void setUp() {
        // Use centralized test data seeding that works with TestAuthenticationHelper
        testUserSeedingService.seedTestUsers();
        
        // Debug: Check if admin user was created by TestUserSeedingService
        System.out.println("DEBUG: Users immediately after seedTestUsers():");
        var usersAfterSeed = userRepository.findAll();
        for (var user : usersAfterSeed) {
            System.out.println("  - ID: " + user.getId() + ", Email: " + user.getEmail() + ", Active: " + user.getIsActive());
        }
        
        // Clear only timesheet data to ensure predictable IDs for this test class  
        // (preserve users and courses created by TestUserSeedingService)
        timesheetRepository.deleteAll();
        timesheetRepository.flush();
        
        // Get references to the seeded users (using standardized emails from TestUserSeedingService)
        admin = userRepository.findByEmailAndIsActive("admin@integration.test", true).orElseThrow();
        lecturer = userRepository.findByEmailAndIsActive("lecturer1@integration.test", true).orElseThrow();  
        tutor = userRepository.findByEmailAndIsActive("tutor1@integration.test", true).orElseThrow();
        
        // Use existing courses from TestUserSeedingService instead of creating new ones
        var existingCourses = courseRepository.findAll();
        course = existingCourses.get(0); // Use first course
        otherCourse = existingCourses.get(1); // Use second course
        
        // Use the lecturer from the existing course for cross-user testing (avoid creating new users)
        otherLecturer = lecturer; // For simplicity, use the same lecturer for cross-user tests

        // Create test timesheets using TestDataBuilder with SSOT workflow states
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);

        // Timesheet in PENDING_TUTOR_REVIEW state (ready for tutor approval)
        pendingTimesheet = timesheetRepository.save(
            TestDataBuilder.aDraftTimesheet()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(weekStart)
                .withHours(new BigDecimal("10.0"))
                .withHourlyRate(new BigDecimal("45.00"))
                .withDescription("Tutorial sessions awaiting approval")
                .withStatus(ApprovalStatus.PENDING_TUTOR_REVIEW)
                .withCreatedBy(lecturer.getId())
                .build()
        );

        // Draft timesheet (should not appear in pending approval)
        draftTimesheet = timesheetRepository.save(
            TestDataBuilder.aDraftTimesheet()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(weekStart.minusWeeks(1))
                .withHours(new BigDecimal("8.0"))
                .withHourlyRate(new BigDecimal("45.00"))
                .withDescription("Lab supervision - still draft")
                .withStatus(ApprovalStatus.DRAFT)
                .withCreatedBy(lecturer.getId())
                .build()
        );

        // Already approved timesheet (following SSOT workflow)
        approvedTimesheet = timesheetRepository.save(
            TestDataBuilder.aDraftTimesheet()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(weekStart.minusWeeks(2))
                .withHours(new BigDecimal("12.0"))
                .withHourlyRate(new BigDecimal("45.00"))
                .withDescription("Assignment marking - fully approved")
                .withStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR)
                .withCreatedBy(lecturer.getId())
                .build()
        );
    }

    @Test
    @DisplayName("AC1: TUTOR can retrieve pending approval timesheets for themselves")
    void shouldReturnPendingApprovalTimesheetsForTutor() throws Exception {
        String tutorToken = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + tutorToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timesheets").isArray())
                .andExpect(jsonPath("$.timesheets[0].id").value(pendingTimesheet.getId()))
                .andExpect(jsonPath("$.timesheets[0].status").value("PENDING_TUTOR_REVIEW"))
                .andExpect(jsonPath("$.pageInfo.totalElements").value(1))
                .andExpect(jsonPath("$.pageInfo.first").value(true));
    }

    @Test
    @DisplayName("AC1: ADMIN can retrieve all pending approval timesheets")
    void shouldReturnAllPendingApprovalTimesheetsForAdmin() throws Exception {
        // Debug: Check what users actually exist in database
        var allUsers = userRepository.findAll();
        System.out.println("DEBUG: Users in database before admin test:");
        for (var user : allUsers) {
            System.out.println("  - ID: " + user.getId() + ", Email: " + user.getEmail() + ", Active: " + user.getIsActive());
        }
        
        String adminJwt = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());
        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timesheets").isArray())
                .andExpect(jsonPath("$.timesheets[0].id").value(pendingTimesheet.getId()))
                .andExpect(jsonPath("$.pageInfo.totalElements").value(1));
    }

    @Test
    @DisplayName("AC1: LECTURER cannot access pending approval endpoint (lecturers are creators, not approvers)")
    void shouldRejectLecturerAccessToPendingApproval() throws Exception {
        String lecturerJwt = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());
        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + lecturerJwt)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AC2: TUTOR APPROVE moves to APPROVED_BY_TUTOR (lecturer final approval pending)")
    void shouldApproveTimesheet_ToTutorApproved_PendingLecturerFinal() throws Exception {
        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.APPROVE);
        request.setComment("Approved - hours and description look correct");

        String tutorJwt = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());
        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + tutorJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("APPROVE"))
                .andExpect(jsonPath("$.timesheetId").value(pendingTimesheet.getId()))
                .andExpect(jsonPath("$.approverId").value(tutor.getId()));

        // Verify timesheet status changed to APPROVED_BY_TUTOR (no auto-transition)
        Timesheet updatedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.APPROVED_BY_TUTOR, updatedTimesheet.getStatus());
    }

    @Test
    @DisplayName("AC3: TUTOR can successfully REJECT pending timesheet")
    void shouldRejectTimesheetAndSetStatusToRejected() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.REJECT);
        request.setComment("Rejected - hours seem excessive for described work");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("REJECT"))
                .andExpect(jsonPath("$.timesheetId").value(pendingTimesheet.getId()))
                .andExpect(jsonPath("$.newStatus").value("REJECTED"));

        // Verify timesheet status changed to REJECTED
        Timesheet updatedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.REJECTED, updatedTimesheet.getStatus());
    }

    @Test
    @DisplayName("AC4: LECTURER cannot approve/reject timesheet (lecturers are creators, not approvers)")
    void shouldRejectApprovalFromLecturer() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.APPROVE);
        request.setComment("Trying to approve timesheet as lecturer");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Verify timesheet status unchanged
        Timesheet unchangedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_TUTOR_REVIEW, unchangedTimesheet.getStatus());
    }

    @Test
    @DisplayName("AC4: TUTOR cannot approve/reject other tutors' timesheets")
    void shouldRejectApprovalFromWrongTutor() throws Exception {
        // Create another tutor
        User otherTutor = new User();
        otherTutor.setEmail("other.tutor@test.com");
        otherTutor.setName("Other Tutor");
        otherTutor.setHashedPassword(passwordEncoder.encode("password"));
        otherTutor.setRole(UserRole.TUTOR);
        otherTutor = userRepository.save(otherTutor);

        String token = jwtTokenProvider.generateToken(otherTutor.getId(), otherTutor.getEmail(), otherTutor.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.APPROVE);
        request.setComment("Trying to approve different tutor's timesheet");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Verify timesheet status unchanged
        Timesheet unchangedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_TUTOR_REVIEW, unchangedTimesheet.getStatus());
    }

    @Test
    @DisplayName("AC5: Cannot approve/reject timesheet not in PENDING_TUTOR_REVIEW state")
    void shouldRejectApprovalOfNonPendingTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(draftTimesheet.getId()); // DRAFT status
        request.setAction(ApprovalAction.APPROVE);
        request.setComment("Trying to approve draft timesheet");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        // Verify timesheet status unchanged
        Timesheet unchangedTimesheet = timesheetRepository.findById(draftTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.DRAFT, unchangedTimesheet.getStatus());
    }

    @Test
    @DisplayName("AC5: Cannot reject already approved timesheet")
    void shouldRejectRejectionOfApprovedTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(approvedTimesheet.getId()); // FINAL_APPROVED status
        request.setAction(ApprovalAction.REJECT);
        request.setComment("Trying to reject approved timesheet");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        // Verify timesheet status unchanged (remains in HR queue state per SSOT)
        Timesheet unchangedTimesheet = timesheetRepository.findById(approvedTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR, unchangedTimesheet.getStatus());
    }

    @Test
    @DisplayName("ADMIN can approve pending tutor review; first step results in tutor-approved state")
    void shouldAllowAdminToApproveAnyTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.APPROVE);
        request.setComment("Admin override approval");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("APPROVE"))
                .andExpect(jsonPath("$.approverId").value(admin.getId()));

        // Verify timesheet status changed to APPROVED_BY_TUTOR (no auto-transition)
        Timesheet updatedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.APPROVED_BY_TUTOR, updatedTimesheet.getStatus());
    }

    @Test
    @DisplayName("Pending approval endpoint denies lecturer access with 403 (ADR-001)")
    void shouldDenyLecturerAccessToPendingApproval() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sort", "createdAt,asc")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthorized access returns 401")
    void shouldRejectUnauthorizedAccess() throws Exception {
        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.APPROVE);

        mockMvc.perform(post("/api/approvals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
