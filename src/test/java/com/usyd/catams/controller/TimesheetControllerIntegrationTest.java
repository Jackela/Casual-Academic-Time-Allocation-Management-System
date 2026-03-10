package com.usyd.catams.controller;

import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetQuoteResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.TutorAssignment;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.testdata.builder.TimesheetBuilder;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.closeTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests that drive the Schedule 1 compliant API contract for timesheets.
 * These red-phase tests prove the current controller does not yet satisfy EA requirements.
 */
class TimesheetControllerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private TutorAssignmentRepository tutorAssignmentRepository;

    @Autowired
    private LecturerAssignmentRepository lecturerAssignmentRepository;

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private String lecturerAuthHeader;
    private String tutorAuthHeader;

    @BeforeEach
    void setUp() {
        timesheetRepository.deleteAll();
        tutorAssignmentRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();
        lecturer = userRepository.save(new User("lecturer.api@test", "Lecturer API", "$2a$10$hashedLecturer", UserRole.LECTURER));
        tutor = userRepository.save(new User("tutor.api@test", "Tutor API", "$2a$10$hashedTutor", UserRole.TUTOR));
        admin = userRepository.save(new User("admin.api@test", "Admin API", "$2a$10$hashedAdmin", UserRole.ADMIN));
        course = courseRepository.save(new Course("COMP6000", "EA Compliance Engineering", "2024S2",
                lecturer.getId(), BigDecimal.valueOf(20000)));

        tutorAssignmentRepository.save(new TutorAssignment(tutor.getId(), course.getId()));
        // SSOT: ensure lecturer assignments exist for scoping
        lecturerAssignmentRepository.deleteAll();
        lecturerAssignmentRepository.save(new com.usyd.catams.entity.LecturerAssignment(lecturer.getId(), course.getId()));

        lecturerAuthHeader = "Bearer " + jwtTokenProvider.generateToken(
                lecturer.getId(),
                lecturer.getEmailValue(),
                lecturer.getRole().name()
        );

        tutorAuthHeader = "Bearer " + jwtTokenProvider.generateToken(
                tutor.getId(),
                tutor.getEmailValue(),
                tutor.getRole().name()
        );

        adminToken = "Bearer " + jwtTokenProvider.generateToken(
                admin.getId(),
                admin.getEmailValue(),
                admin.getRole().name()
        );
    }

    @Test
    void shouldQuoteSchedule1TutorialFromBackendCalculator() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("taskType", "TUTORIAL");
        request.put("qualification", "STANDARD");
        request.put("isRepeat", false);
        request.put("deliveryHours", 1.0);
        request.put("sessionDate", "2025-07-07");
        request.put("tutorId", tutor.getId());
        request.put("courseId", course.getId());

        performPost("/api/timesheets/quote", request, lecturerAuthHeader)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rateCode").value("TU2"))
                .andExpect(jsonPath("$.taskType").value("TUTORIAL"))
                .andExpect(jsonPath("$.associatedHours").value(closeTo(2.0, 0.0001)))
                .andExpect(jsonPath("$.payableHours").value(closeTo(3.0, 0.0001)))
                .andExpect(jsonPath("$.hourlyRate").value(closeTo(60.85, 0.01)))
                .andExpect(jsonPath("$.amount").value(closeTo(182.54, 0.001)))
                .andExpect(jsonPath("$.formula").value(Matchers.containsString("1h delivery")));
    }

    @Test
    void shouldKeepRepeatTutorialQuoteWhenPriorSessionExistsWithinWindow() throws Exception {
        seedTutorialSession(LocalDate.of(2025, 7, 7));

        Map<String, Object> request = new HashMap<>();
        request.put("taskType", "TUTORIAL");
        request.put("qualification", "PHD");
        request.put("isRepeat", true);
        request.put("deliveryHours", 1.0);
        request.put("sessionDate", "2025-07-14");
        request.put("tutorId", tutor.getId());
        request.put("courseId", course.getId());

        performPost("/api/timesheets/quote", request, lecturerAuthHeader)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rateCode").value("TU3"))
                .andExpect(jsonPath("$.isRepeat").value(true))
                .andExpect(jsonPath("$.qualification").value("PHD"));
    }

    @Test
    void shouldDowngradeRepeatTutorialQuoteWhenOutsideEligibilityWindow() throws Exception {
        seedTutorialSession(LocalDate.of(2025, 6, 23));

        Map<String, Object> request = new HashMap<>();
        request.put("taskType", "TUTORIAL");
        request.put("qualification", "PHD");
        request.put("isRepeat", true);
        request.put("deliveryHours", 1.0);
        request.put("sessionDate", "2025-07-14");
        request.put("tutorId", tutor.getId());
        request.put("courseId", course.getId());

        performPost("/api/timesheets/quote", request, lecturerAuthHeader)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rateCode").value("TU1"))
                .andExpect(jsonPath("$.isRepeat").value(false))
                .andExpect(jsonPath("$.qualification").value("PHD"));
    }

    @Test
    void shouldIgnoreClientFinancialFieldsWhenCreatingTimesheet() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("tutorId", tutor.getId());
        request.put("courseId", course.getId());
        request.put("weekStartDate", "2025-07-07");
        request.put("taskType", "TUTORIAL");
        request.put("qualification", "STANDARD");
        request.put("isRepeat", false);
        request.put("deliveryHours", 1.0);
        request.put("sessionDate", "2025-07-07");
        request.put("description", "Tutorial entry requiring EA-compliant backend recalculation");

        performPost("/api/timesheets", request, lecturerAuthHeader)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.hours").value(closeTo(3.0, 0.0001)))
                .andExpect(jsonPath("$.deliveryHours").value(closeTo(1.0, 0.0001)))
                .andExpect(jsonPath("$.associatedHours").value(closeTo(2.0, 0.0001)))
                .andExpect(jsonPath("$.rateCode").value("TU2"))
                .andExpect(jsonPath("$.totalPay").value(closeTo(182.54, 0.001)));

        Timesheet persisted = timesheetRepository.findAll().get(0);
        assertThat(persisted.getHours()).isEqualByComparingTo(new BigDecimal("3.0"));
        assertThat(persisted.getCalculatedAmount()).isEqualByComparingTo(new BigDecimal("182.54"));
    }

    @Test
    @DisplayName("POST /api/timesheets should return 403 when attempted by a tutor user")
    void tutorCannotCreateTimesheetThroughApi() throws Exception {
        Map<String, Object> tutorRequest = new HashMap<>();
        tutorRequest.put("tutorId", tutor.getId());
        tutorRequest.put("courseId", course.getId());
        tutorRequest.put("weekStartDate", "2025-07-07");
        tutorRequest.put("taskType", "TUTORIAL");
        tutorRequest.put("qualification", "STANDARD");
        tutorRequest.put("isRepeat", false);
        tutorRequest.put("deliveryHours", 1.0);
        tutorRequest.put("sessionDate", "2025-07-07");
        tutorRequest.put("description", "Tutor attempting to self-create a timesheet should be blocked");

        performPost("/api/timesheets", tutorRequest, tutorAuthHeader)
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/timesheets/lecturer-final-approval should exclude tutor-confirmed entries for admin users")
    void adminLecturerFinalApprovalQueueShouldExcludeTutorConfirmedTimesheets() throws Exception {
        Timesheet tutorConfirmed = timesheetRepository.save(new TimesheetBuilder()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(LocalDate.of(2024, 7, 1))
                .withCreatedBy(lecturer.getId())
                .withStatus(ApprovalStatus.TUTOR_CONFIRMED)
                .build());

        Timesheet lecturerConfirmed = timesheetRepository.save(new TimesheetBuilder()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(LocalDate.of(2024, 7, 8))
                .withCreatedBy(lecturer.getId())
                .withStatus(ApprovalStatus.LECTURER_CONFIRMED)
                .build());

        MvcResult result = performGet("/api/timesheets/pending-final-approval?page=0&size=10", adminToken)
                .andExpect(status().isOk())
                .andReturn();

        PagedTimesheetResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                PagedTimesheetResponse.class);

        assertThat(response.getTimesheets())
                .extracting(TimesheetResponse::getId)
                .contains(lecturerConfirmed.getId())
                .doesNotContain(tutorConfirmed.getId());

        assertThat(response.getTimesheets())
                .extracting(TimesheetResponse::getStatus)
                .containsOnly(ApprovalStatus.LECTURER_CONFIRMED);
    }

    @Test
    @DisplayName("Repeat Tutorial without prior within 7 days should be rejected")
    void repeatTutorialWithoutPriorShouldFail() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("tutorId", tutor.getId());
        request.put("courseId", course.getId());
        request.put("weekStartDate", "2025-07-21");
        request.put("taskType", "TUTORIAL");
        request.put("qualification", "STANDARD");
        request.put("isRepeat", true);
        request.put("deliveryHours", 1.0);
        request.put("sessionDate", "2025-07-21");
        request.put("description", "Tutorial content A");

        performPost("/api/timesheets", request, lecturerAuthHeader)
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Repeat Tutorial with prior within 7 days should succeed")
    void repeatTutorialWithPriorShouldSucceed() throws Exception {
        // First, create an initial tutorial entry
        Map<String, Object> base = new HashMap<>();
        base.put("tutorId", tutor.getId());
        base.put("courseId", course.getId());
        base.put("weekStartDate", "2025-07-07");
        base.put("taskType", "TUTORIAL");
        base.put("qualification", "STANDARD");
        base.put("isRepeat", false);
        base.put("deliveryHours", 1.0);
        base.put("sessionDate", "2025-07-07");
        base.put("description", "Tutorial content A");

        performPost("/api/timesheets", base, lecturerAuthHeader)
                .andExpect(status().isCreated());

        // Now create a repeat within 7 days (next week)
        Map<String, Object> repeat = new HashMap<>();
        repeat.putAll(base);
        repeat.put("weekStartDate", "2025-07-14");
        repeat.put("sessionDate", "2025-07-14");
        repeat.put("isRepeat", true);

        performPost("/api/timesheets", repeat, lecturerAuthHeader)
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Updating a timesheet preserves its original session date")
    void updatingTimesheetShouldPreserveSessionDate() throws Exception {
        LocalDate originalSessionDate = LocalDate.of(2025, 7, 14);

        Map<String, Object> createRequest = new HashMap<>();
        createRequest.put("tutorId", tutor.getId());
        createRequest.put("courseId", course.getId());
        createRequest.put("weekStartDate", "2025-07-14");
        createRequest.put("taskType", "TUTORIAL");
        createRequest.put("qualification", "STANDARD");
        createRequest.put("isRepeat", false);
        createRequest.put("deliveryHours", 1.0);
        createRequest.put("sessionDate", originalSessionDate.toString());
        createRequest.put("hours", 1.0);
        createRequest.put("hourlyRate", 60.00);
        createRequest.put("description", "Initial session with specific date");

        MvcResult createResult = performPost("/api/timesheets", createRequest, lecturerAuthHeader)
                .andExpect(status().isCreated())
                .andReturn();

        TimesheetResponse created = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                TimesheetResponse.class);

        assertThat(created.getSessionDate()).isEqualTo(originalSessionDate);

        Map<String, Object> updateRequest = new HashMap<>();
        updateRequest.put("hours", created.getHours());
        updateRequest.put("hourlyRate", created.getHourlyRate());
        updateRequest.put("description", "Updated description only");
        updateRequest.put("taskType", created.getTaskType().name());
        updateRequest.put("isRepeat", created.getRepeat());
        updateRequest.put("qualification", created.getQualification().name());
        updateRequest.put("deliveryHours", created.getDeliveryHours());
        updateRequest.put("sessionDate", created.getSessionDate().toString());

        MvcResult updateResult = performPut("/api/timesheets/" + created.getId(), updateRequest, lecturerAuthHeader)
                .andExpect(status().isOk())
                .andReturn();

        TimesheetResponse updated = objectMapper.readValue(
                updateResult.getResponse().getContentAsString(),
                TimesheetResponse.class);

        assertThat(updated.getSessionDate()).isEqualTo(originalSessionDate);

        MvcResult fetchResult = performGet("/api/timesheets/" + created.getId(), lecturerAuthHeader)
                .andExpect(status().isOk())
                .andReturn();

        TimesheetResponse fetched = objectMapper.readValue(
                fetchResult.getResponse().getContentAsString(),
                TimesheetResponse.class);

        assertThat(fetched.getSessionDate()).isEqualTo(originalSessionDate);
    }

    @Test
    void calculatingRateForOraaTaskSucceeds() throws Exception {
        Map<String, Object> request = baseQuotePayload("ORAA", "STANDARD", 1.5, false);

        MvcResult response = mockMvc.perform(post("/api/timesheets/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", lecturerAuthHeader)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        TimesheetQuoteResponse quote = objectMapper.readValue(
                response.getResponse().getContentAsString(),
                TimesheetQuoteResponse.class);

        assertThat(quote.getTaskType()).isEqualTo(TimesheetTaskType.ORAA);
        assertThat(quote.getRateCode()).isEqualTo("AO2");
        assertThat(quote.getQualification()).isEqualTo(TutorQualification.STANDARD);
        assertThat(quote.isRepeat()).isFalse();
        assertThat(quote.getDeliveryHours()).isEqualByComparingTo(new BigDecimal("1.5"));
        assertThat(quote.getAssociatedHours()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(quote.getPayableHours()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(quote.getHourlyRate()).isEqualByComparingTo(new BigDecimal("58.32"));
        assertThat(quote.getAmount()).isEqualByComparingTo(new BigDecimal("58.32"));
        assertThat(quote.getFormula()).contains("Schedule 1 Clause 3.1(a)");
        assertThat(quote.getSessionDate()).isEqualTo(LocalDate.of(2025, 7, 7));
    }

    @Test
    void calculatorAutomaticallySelectsHigherRateBandForQualifiedTutor() throws Exception {
        Map<String, Object> request = baseQuotePayload("TUTORIAL", "PHD", 1.0, false);

        MvcResult response = mockMvc.perform(post("/api/timesheets/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", lecturerAuthHeader)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        TimesheetQuoteResponse quote = objectMapper.readValue(
                response.getResponse().getContentAsString(),
                TimesheetQuoteResponse.class);

        assertThat(quote.getRateCode()).isEqualTo("TU1");
        assertThat(quote.getAmount()).isEqualByComparingTo(new BigDecimal("218.07"));
    }

    private Map<String, Object> baseQuotePayload(String taskType,
                                                 String qualification,
                                                 double deliveryHours,
                                                 boolean repeat) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("taskType", taskType);
        payload.put("qualification", qualification);
        payload.put("isRepeat", repeat);
        payload.put("deliveryHours", deliveryHours);
        payload.put("sessionDate", "2025-07-07");
        payload.put("tutorId", tutor.getId());
        payload.put("courseId", course.getId());
        return payload;
    }

    private void seedTutorialSession(LocalDate sessionDate) {
        Timesheet prior = new TimesheetBuilder()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(sessionDate)
                .withSessionDate(sessionDate)
                .withHours(new BigDecimal("3.0"))
                .withHourlyRate(new BigDecimal("72.69"))
                .withDescription("Prior tutorial session for repeat-window checks")
                .withCreatedBy(lecturer.getId())
                .withStatus(ApprovalStatus.FINAL_CONFIRMED)
                .build();

        prior.setTaskType(TimesheetTaskType.TUTORIAL);
        prior.setRepeat(false);
        prior.setQualification(TutorQualification.PHD);
        prior.setDeliveryHours(new BigDecimal("1.0"));
        prior.setAssociatedHours(new BigDecimal("2.0"));
        prior.setRateCode("TU1");
        prior.setCalculatedAmount(new BigDecimal("218.07"));

        timesheetRepository.save(prior);
    }

    @Test
    @DisplayName("GET /api/timesheets should eagerly fetch approvals to avoid LazyInitializationException")
    void getTimesheetsShouldEagerlyFetchApprovalsCollection() throws Exception {
        // Create a timesheet with TUTOR_CONFIRMED status (has approval history)
        Timesheet timesheet = timesheetRepository.save(new TimesheetBuilder()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(LocalDate.of(2024, 7, 1))
                .withCreatedBy(lecturer.getId())
                .withStatus(ApprovalStatus.TUTOR_CONFIRMED)
                .build());

        // This test verifies that the approvals collection is eagerly fetched so the mapper
        // can safely read it without triggering a LazyInitializationException.
        MvcResult result = performGet("/api/timesheets?page=0&size=10", adminToken)
                .andExpect(status().isOk())
                .andReturn();

        PagedTimesheetResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                PagedTimesheetResponse.class);

        // Verify the response includes the timesheet without LazyInitializationException
        assertThat(response.getTimesheets()).isNotEmpty();
        assertThat(response.getTimesheets().get(0).getId()).isEqualTo(timesheet.getId());
    }
}
