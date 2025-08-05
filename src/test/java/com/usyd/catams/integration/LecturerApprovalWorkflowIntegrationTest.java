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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.DayOfWeek;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for Story 2.1: Lecturer Approval Workflow (Approve/Reject).
 * 
 * Tests all acceptance criteria:
 * - AC1: GET /api/timesheets/pending-approval endpoint with proper access control
 * - AC2: LECTURER can APPROVE pending timesheets with auto-transition to HR review
 * - AC3: LECTURER can REJECT pending timesheets  
 * - AC4: Authorization validation - only course lecturers can approve/reject
 * - AC5: State transition validation - only PENDING_LECTURER_APPROVAL can be acted upon
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class LecturerApprovalWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

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
        course.setCode("COMP1001");
        course.setName("Introduction to Programming");
        course.setSemester("2024S1");
        course.setLecturerId(lecturer.getId());
        course.setBudgetAllocated(BigDecimal.valueOf(10000.00));
        course = courseRepository.save(course);

        otherCourse = new Course();
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
        pendingTimesheet.setStatus(ApprovalStatus.PENDING_LECTURER_APPROVAL);
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
        approvedTimesheet = new Timesheet();
        approvedTimesheet.setTutorId(tutor.getId());
        approvedTimesheet.setCourseId(course.getId());
        approvedTimesheet.setWeekStartDate(weekStart.minusWeeks(2));
        approvedTimesheet.setHours(new BigDecimal("12.0"));
        approvedTimesheet.setHourlyRate(new BigDecimal("45.00"));
        approvedTimesheet.setDescription("Assignment marking");
        approvedTimesheet.setStatus(ApprovalStatus.FINAL_APPROVED);
        approvedTimesheet.setCreatedBy(lecturer.getId());
        approvedTimesheet = timesheetRepository.save(approvedTimesheet);
    }

    @Test
    @DisplayName("AC1: LECTURER can retrieve pending approval timesheets for their courses")
    void shouldReturnPendingApprovalTimesheetsForLecturer() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].id").value(pendingTimesheet.getId()))
                .andExpect(jsonPath("$.content[0].status").value("PENDING_LECTURER_APPROVAL"))
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
    @DisplayName("AC1: TUTOR cannot access pending approval endpoint")
    void shouldRejectTutorAccessToPendingApproval() throws Exception {
        String token = jwtTokenProvider.generateToken(tutor.getId(), tutor.getEmail(), tutor.getRole().name());

        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AC2: LECTURER can successfully APPROVE pending timesheet")
    void shouldApproveTimesheetAndAutoTransitionToHRReview() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

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
                .andExpect(jsonPath("$.approverId").value(lecturer.getId()));

        // Verify timesheet status changed to PENDING_HR_REVIEW (auto-transition)
        Timesheet updatedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_HR_REVIEW, updatedTimesheet.getStatus());
    }

    @Test
    @DisplayName("AC3: LECTURER can successfully REJECT pending timesheet")
    void shouldRejectTimesheetAndSetStatusToRejected() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

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
    @DisplayName("AC4: Non-course LECTURER cannot approve/reject timesheet")
    void shouldRejectApprovalFromNonCourseLecturer() throws Exception {
        String token = jwtTokenProvider.generateToken(otherLecturer.getId(), otherLecturer.getEmail(), otherLecturer.getRole().name());

        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setTimesheetId(pendingTimesheet.getId());
        request.setAction(ApprovalAction.APPROVE);
        request.setComment("Trying to approve timesheet for different course");

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Verify timesheet status unchanged
        Timesheet unchangedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_LECTURER_APPROVAL, unchangedTimesheet.getStatus());
    }

    @Test
    @DisplayName("AC5: Cannot approve/reject timesheet not in PENDING_LECTURER_APPROVAL state")
    void shouldRejectApprovalOfNonPendingTimesheet() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

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

        // Verify timesheet status unchanged
        Timesheet unchangedTimesheet = timesheetRepository.findById(approvedTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.FINAL_APPROVED, unchangedTimesheet.getStatus());
    }

    @Test
    @DisplayName("ADMIN can override lecturer permissions and approve any timesheet")
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

        // Verify timesheet status changed to PENDING_HR_REVIEW (auto-transition)
        Timesheet updatedTimesheet = timesheetRepository.findById(pendingTimesheet.getId()).orElseThrow();
        assertEquals(ApprovalStatus.PENDING_HR_REVIEW, updatedTimesheet.getStatus());
    }

    @Test
    @DisplayName("Pending approval endpoint supports pagination and sorting")
    void shouldSupportPaginationAndSorting() throws Exception {
        String token = jwtTokenProvider.generateToken(lecturer.getId(), lecturer.getEmail(), lecturer.getRole().name());

        mockMvc.perform(get("/api/timesheets/pending-approval")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sort", "createdAt,asc")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.size").value(10))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.numberOfElements").exists());
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