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
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class TutorApprovalWorkflowIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

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

    @BeforeEach
    void setUp() {
        // Create test users
        lecturer = new User();
        lecturer.setEmail("lecturer@test.com");
        lecturer.setName("Test Lecturer");
        lecturer.setHashedPassword(passwordEncoder.encode("password"));
        lecturer.setRole(UserRole.LECTURER);
        lecturer = userRepository.save(lecturer);

        otherLecturer = new User();
        otherLecturer.setEmail("other.lecturer@test.com");
        otherLecturer.setName("Other Lecturer");
        otherLecturer.setHashedPassword(passwordEncoder.encode("password"));
        otherLecturer.setRole(UserRole.LECTURER);
        otherLecturer = userRepository.save(otherLecturer);

        tutor = new User();
        tutor.setEmail("tutor@test.com");
        tutor.setName("Test Tutor");
        tutor.setHashedPassword(passwordEncoder.encode("password"));
        tutor.setRole(UserRole.TUTOR);
        tutor = userRepository.save(tutor);

        admin = new User();
        admin.setEmail("admin@test.com");
        admin.setName("Test Admin");
        admin.setHashedPassword(passwordEncoder.encode("password"));
        admin.setRole(UserRole.ADMIN);
        admin = userRepository.save(admin);

        // Create test courses
        course = new Course();
        course.setIsActive(true);
        course.setCode("COMP1001");
        course.setName("Introduction to Programming");
        course.setSemester("2024S1");
        course.setLecturerId(lecturer.getId());
        course.setBudgetAllocated(BigDecimal.valueOf(10000.00));
        course = courseRepository.save(course);

        otherCourse = new Course();
        otherCourse.setIsActive(true);
        otherCourse.setCode("COMP2001");
        otherCourse.setName("Advanced Programming");
        otherCourse.setSemester("2024S1");
        otherCourse.setLecturerId(otherLecturer.getId());
        otherCourse.setBudgetAllocated(BigDecimal.valueOf(8000.00));
        otherCourse = courseRepository.save(otherCourse);

        // Create test timesheets
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);

        // Timesheet pending lecturer approval
        pendingTimesheet = new Timesheet();
        pendingTimesheet.setTutorId(tutor.getId());
        pendingTimesheet.setCourseId(course.getId());
        pendingTimesheet.setWeekStartDate(weekStart);
        pendingTimesheet.setHours(new BigDecimal("10.0"));
        pendingTimesheet.setHourlyRate(new BigDecimal("45.00"));
        pendingTimesheet.setDescription("Tutorial sessions");
        pendingTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        pendingTimesheet.setCreatedBy(lecturer.getId());
        pendingTimesheet = timesheetRepository.save(pendingTimesheet);

        // Draft timesheet (should not appear in pending approval)
        draftTimesheet = new Timesheet();
        draftTimesheet.setTutorId(tutor.getId());
        draftTimesheet.setCourseId(course.getId());
        draftTimesheet.setWeekStartDate(weekStart.minusWeeks(1));
        draftTimesheet.setHours(new BigDecimal("8.0"));
        draftTimesheet.setHourlyRate(new BigDecimal("45.00"));
        draftTimesheet.setDescription("Lab supervision");
        draftTimesheet.setStatus(ApprovalStatus.DRAFT);
        draftTimesheet.setCreatedBy(lecturer.getId());
        draftTimesheet = timesheetRepository.save(draftTimesheet);

        // Already approved timesheet (should not appear in pending approval)
        // Following proper workflow: DRAFT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED
        approvedTimesheet = new Timesheet();
        approvedTimesheet.setTutorId(tutor.getId());
        approvedTimesheet.setCourseId(course.getId());
        approvedTimesheet.setWeekStartDate(weekStart.minusWeeks(2));
        approvedTimesheet.setHours(new BigDecimal("12.0"));
        approvedTimesheet.setHourlyRate(new BigDecimal("45.00"));
        approvedTimesheet.setDescription("Assignment marking");
        approvedTimesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
        approvedTimesheet.setCreatedBy(lecturer.getId());
        approvedTimesheet = timesheetRepository.save(approvedTimesheet);
    }

    @Test
    @DisplayName("AC1: TUTOR can retrieve pending approval timesheets for themselves")
    void shouldReturnPendingApprovalTimesheetsForTutor() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());

        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].id").value(pendingTimesheet.getId()))
                .andExpect(jsonPath("$.content[0].status").value("PENDING_TUTOR_REVIEW"))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.page.first").value(true));
    }

    @Test
    @DisplayName("AC1: ADMIN can retrieve all pending approval timesheets")
    void shouldReturnAllPendingApprovalTimesheetsForAdmin() throws Exception {
        String token = jwtTokenProvider.generateToken(admin.getId(), admin.getEmail(), admin.getRole().name());

        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].id").value(pendingTimesheet.getId()))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    @DisplayName("AC1: LECTURER cannot access pending approval endpoint (lecturers are creators, not approvers)")
    void shouldRejectLecturerAccessToPendingApproval() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AC2: TUTOR APPROVE moves to APPROVED_BY_TUTOR (lecturer final approval pending)")
    void shouldApproveTimesheet_ToTutorApproved_PendingLecturerFinal() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.APPROVE);
        request.setComment("Approved - hours and description look correct");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
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
