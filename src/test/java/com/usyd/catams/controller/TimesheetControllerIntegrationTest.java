package com.usyd.catams.controller;

import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetQuoteResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.PolicyVersion;
import com.usyd.catams.entity.RateAmount;
import com.usyd.catams.entity.RateCode;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.PolicyVersionRepository;
import com.usyd.catams.repository.RateAmountRepository;
import com.usyd.catams.repository.RateCodeRepository;
import com.usyd.catams.repository.TimesheetRepository;
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
    private PolicyVersionRepository policyVersionRepository;

    @Autowired
    private RateCodeRepository rateCodeRepository;

    @Autowired
    private RateAmountRepository rateAmountRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private String lecturerAuthHeader;

    @BeforeEach
    void setUp() {
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();
        rateAmountRepository.deleteAll();
        rateCodeRepository.deleteAll();
        policyVersionRepository.deleteAll();

        seedTutorialPolicySnapshot();
        lecturer = userRepository.save(new User("lecturer.api@test", "Lecturer API", "$2a$10$hashedLecturer", UserRole.LECTURER));
        tutor = userRepository.save(new User("tutor.api@test", "Tutor API", "$2a$10$hashedTutor", UserRole.TUTOR));
        admin = userRepository.save(new User("admin@integration.test", "Admin API", "$2a$10$hashedAdmin", UserRole.ADMIN));
        course = courseRepository.save(new Course("COMP6000", "EA Compliance Engineering", "2024S2",
                lecturer.getId(), BigDecimal.valueOf(20000)));

        lecturerAuthHeader = "Bearer " + jwtTokenProvider.generateToken(
                lecturer.getId(),
                lecturer.getEmailValue(),
                lecturer.getRole().name()
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
        request.put("repeat", false);
        request.put("deliveryHours", 1.0);
        request.put("sessionDate", "2024-07-08");
        request.put("tutorId", tutor.getId());
        request.put("courseId", course.getId());

        performPost("/api/timesheets/quote", request, lecturerAuthHeader)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rateCode").value("TU2"))
                .andExpect(jsonPath("$.taskType").value("TUTORIAL"))
                .andExpect(jsonPath("$.associatedHours").value(closeTo(2.0, 0.0001)))
                .andExpect(jsonPath("$.payableHours").value(closeTo(3.0, 0.0001)))
                .andExpect(jsonPath("$.hourlyRate").value(closeTo(58.65, 0.01)))
                .andExpect(jsonPath("$.amount").value(closeTo(175.94, 0.001)))
                .andExpect(jsonPath("$.formula").value(Matchers.containsString("1h delivery")));
    }

    @Test
    void shouldIgnoreClientFinancialFieldsWhenCreatingTimesheet() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("tutorId", tutor.getId());
        request.put("courseId", course.getId());
        request.put("weekStartDate", "2024-07-08");
        request.put("taskType", "TUTORIAL");
        request.put("qualification", "STANDARD");
        request.put("isRepeat", false);
        request.put("deliveryHours", 1.0);
        request.put("sessionDate", "2024-07-08");
        request.put("hours", 0.5);          // intentionally incorrect client value
        request.put("hourlyRate", 25.00);   // intentionally incorrect client value
        request.put("description", "Tutorial entry requiring EA-compliant backend recalculation");

        performPost("/api/timesheets", request, lecturerAuthHeader)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.hours").value(closeTo(3.0, 0.0001)))
                .andExpect(jsonPath("$.deliveryHours").value(closeTo(1.0, 0.0001)))
                .andExpect(jsonPath("$.associatedHours").value(closeTo(2.0, 0.0001)))
                .andExpect(jsonPath("$.rateCode").value("TU2"))
                .andExpect(jsonPath("$.totalPay").value(closeTo(175.94, 0.001)));

        Timesheet persisted = timesheetRepository.findAll().get(0);
        assertThat(persisted.getHours()).isEqualByComparingTo(new BigDecimal("3.0"));
        assertThat(persisted.getCalculatedAmount()).isEqualByComparingTo(new BigDecimal("175.94"));
    }

    private void seedTutorialPolicySnapshot() {
        PolicyVersion version = new PolicyVersion();
        version.setEaReference("EA-2023-2026-Schedule-1");
        version.setMajorVersion(2023);
        version.setMinorVersion(0);
        version.setEffectiveFrom(LocalDate.of(2023, 7, 1));
        version.setEffectiveTo(null);
        version.setSourceDocumentUrl("docs/requirements/University-of-Sydney-Enterprise-Agreement-2023-2026.pdf");
        version.setNotes("Integration test seed for Schedule 1 tutorial rates");
        version = policyVersionRepository.save(version);

        RateCode tutorialPhd = new RateCode();
        tutorialPhd.setCode("TU1");
        tutorialPhd.setTaskType(TimesheetTaskType.TUTORIAL);
        tutorialPhd.setDescription("Tutorial rate – PhD holder or unit coordinator");
        tutorialPhd.setDefaultAssociatedHours(new BigDecimal("2.0"));
        tutorialPhd.setDefaultDeliveryHours(new BigDecimal("1.0"));
        tutorialPhd.setRequiresPhd(true);
        tutorialPhd.setRepeatable(false);
        tutorialPhd.setEaClauseReference("Schedule 1 – Tutoring p. 213");
        tutorialPhd = rateCodeRepository.save(tutorialPhd);

        RateCode tutorialStandard = new RateCode();
        tutorialStandard.setCode("TU2");
        tutorialStandard.setTaskType(TimesheetTaskType.TUTORIAL);
        tutorialStandard.setDescription("Tutorial rate – standard eligibility");
        tutorialStandard.setDefaultAssociatedHours(new BigDecimal("2.0"));
        tutorialStandard.setDefaultDeliveryHours(new BigDecimal("1.0"));
        tutorialStandard.setRequiresPhd(false);
        tutorialStandard.setRepeatable(false);
        tutorialStandard.setEaClauseReference("Schedule 1 – Tutoring p. 213");
        tutorialStandard = rateCodeRepository.save(tutorialStandard);

        RateAmount phdAmount = new RateAmount();
        phdAmount.setRateCode(tutorialPhd);
        phdAmount.setPolicyVersion(version);
        phdAmount.setYearLabel("2024-07");
        phdAmount.setEffectiveFrom(LocalDate.of(2024, 7, 1));
        phdAmount.setEffectiveTo(null);
        phdAmount.setHourlyAmountAud(new BigDecimal("210.19")); // session amount for 3 payable hours
        phdAmount.setMaxAssociatedHours(new BigDecimal("2.0"));
        phdAmount.setMaxPayableHours(new BigDecimal("3.0"));
        phdAmount.setQualification(TutorQualification.PHD);
        phdAmount.setNotes("Tutorial PhD rate (1 July 2024, EA Schedule 1)");
        rateAmountRepository.save(phdAmount);

        RateAmount coordinatorAmount = new RateAmount();
        coordinatorAmount.setRateCode(tutorialPhd);
        coordinatorAmount.setPolicyVersion(version);
        coordinatorAmount.setYearLabel("2024-07");
        coordinatorAmount.setEffectiveFrom(LocalDate.of(2024, 7, 1));
        coordinatorAmount.setEffectiveTo(null);
        coordinatorAmount.setHourlyAmountAud(new BigDecimal("210.19"));
        coordinatorAmount.setMaxAssociatedHours(new BigDecimal("2.0"));
        coordinatorAmount.setMaxPayableHours(new BigDecimal("3.0"));
        coordinatorAmount.setQualification(TutorQualification.COORDINATOR);
        coordinatorAmount.setNotes("Tutorial coordinator rate (1 July 2024, EA Schedule 1)");
        rateAmountRepository.save(coordinatorAmount);

        RateAmount standardAmount = new RateAmount();
        standardAmount.setRateCode(tutorialStandard);
        standardAmount.setPolicyVersion(version);
        standardAmount.setYearLabel("2024-07");
        standardAmount.setEffectiveFrom(LocalDate.of(2024, 7, 1));
        standardAmount.setEffectiveTo(null);
        standardAmount.setHourlyAmountAud(new BigDecimal("175.94")); // session amount for 3 payable hours
        standardAmount.setMaxAssociatedHours(new BigDecimal("2.0"));
        standardAmount.setMaxPayableHours(new BigDecimal("3.0"));
        standardAmount.setQualification(TutorQualification.STANDARD);
        standardAmount.setNotes("Tutorial standard rate (1 July 2024, EA Schedule 1)");
        rateAmountRepository.save(standardAmount);
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
    @DisplayName("Updating a timesheet preserves its original session date")
    void updatingTimesheetShouldPreserveSessionDate() throws Exception {
        LocalDate originalSessionDate = LocalDate.of(2024, 7, 15);

        Map<String, Object> createRequest = new HashMap<>();
        createRequest.put("tutorId", tutor.getId());
        createRequest.put("courseId", course.getId());
        createRequest.put("weekStartDate", "2024-07-15");
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
        updateRequest.put("repeat", created.getRepeat());
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
        assertThat(quote.getSessionDate()).isEqualTo(LocalDate.of(2024, 7, 8));
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
        assertThat(quote.getAmount()).isEqualByComparingTo(new BigDecimal("210.19"));
    }

    private Map<String, Object> baseQuotePayload(String taskType,
                                                 String qualification,
                                                 double deliveryHours,
                                                 boolean repeat) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("taskType", taskType);
        payload.put("qualification", qualification);
        payload.put("repeat", repeat);
        payload.put("deliveryHours", deliveryHours);
        payload.put("sessionDate", "2024-07-08");
        payload.put("tutorId", tutor.getId());
        payload.put("courseId", course.getId());
        return payload;
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
