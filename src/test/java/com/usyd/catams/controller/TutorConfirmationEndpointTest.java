package com.usyd.catams.controller;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.testdata.builder.TimesheetBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * TDD Test for Bug #1: Tutor Confirmation Endpoint Missing
 * 
 * This test reproduces the critical bug where the frontend calls
 * PUT /api/timesheets/{id}/confirm but the endpoint doesn't exist,
 * resulting in a 500 Internal Server Error (or 404 Not Found).
 * 
 * RED PHASE: This test should FAIL initially because the endpoint
 * PUT /api/timesheets/{id}/confirm does not exist in TimesheetController.
 * 
 * Expected failure: HTTP 404 Not Found or 405 Method Not Allowed
 * 
 * Once the endpoint is implemented, this test should pass with HTTP 200 OK
 * and the timesheet status should transition from PENDING_TUTOR_REVIEW to TUTOR_CONFIRMED.
 */
class TutorConfirmationEndpointTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User lecturer;
    private User tutor;
    private Course course;
    private String tutorToken;

    @BeforeEach
    void setUp() {
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        lecturer = userRepository.save(new User(
                "lecturer@test.com",
                "Test Lecturer",
                "$2a$10$hashedLecturer",
                UserRole.LECTURER
        ));

        tutor = userRepository.save(new User(
                "tutor@test.com",
                "Test Tutor",
                "$2a$10$hashedTutor",
                UserRole.TUTOR
        ));

        course = courseRepository.save(new Course(
                "COMP6000",
                "Test Course",
                "2024S2",
                lecturer.getId(),
                BigDecimal.valueOf(20000)
        ));

        tutorToken = "Bearer " + jwtTokenProvider.generateToken(
                tutor.getId(),
                tutor.getEmailValue(),
                tutor.getRole().name()
        );
    }

    @Test
    @DisplayName("PUT /api/timesheets/{id}/confirm should confirm timesheet (Bug #1 - GREEN PHASE)")
    void tutorConfirmationEndpointShouldConfirmTimesheet() throws Exception {
        Timesheet pendingTimesheet = timesheetRepository.save(new TimesheetBuilder()
                .withTutorId(tutor.getId())
                .withCourseId(course.getId())
                .withWeekStartDate(LocalDate.of(2024, 7, 15))
                .withCreatedBy(lecturer.getId())
                .withStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
                .build());

        // GREEN PHASE: Endpoint now exists and should return 200 OK
        performPut("/api/timesheets/" + pendingTimesheet.getId() + "/confirm",
                new java.util.HashMap<>(),
                tutorToken)
                .andExpect(status().isOk());
    }
}
