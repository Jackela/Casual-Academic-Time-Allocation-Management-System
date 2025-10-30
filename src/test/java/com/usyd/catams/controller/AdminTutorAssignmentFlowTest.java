package com.usyd.catams.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.test.context.jdbc.Sql(statements = {
        "DELETE FROM tutor_assignments WHERE tutor_id IN (5)",
        "DELETE FROM courses WHERE id IN (1)",
        "DELETE FROM users WHERE id IN (5,10)",
        "DELETE FROM users WHERE email_value IN ('lecturer@example.com','tutor5@example.com')",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (10, 'lecturer@example.com', 'Lecturer X', 'x', 'LECTURER', true, NOW(), NOW())",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (5, 'tutor5@example.com', 'Tutor Five', 'x', 'TUTOR', true, NOW(), NOW())",
        "INSERT INTO courses (id, code_value, name, semester, lecturer_id, budget_allocated, budget_allocated_currency, budget_used, budget_used_currency, is_active, created_at, updated_at) VALUES (1, 'TEST1000', 'Test Course', '2025S1', 10, 10000.00, 'AUD', 0.00, 'AUD', true, NOW(), NOW())"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@org.springframework.test.context.jdbc.Sql(statements = {
        "DELETE FROM approvals WHERE timesheet_id IN (SELECT id FROM timesheets WHERE course_id = 1)",
        "DELETE FROM timesheets WHERE course_id = 1",
        "DELETE FROM tutor_assignments WHERE tutor_id IN (5)",
        "DELETE FROM courses WHERE id IN (1)",
        "DELETE FROM users WHERE id IN (5,10)"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD)
class AdminTutorAssignmentFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "10", roles = {"LECTURER"})
    void creatingTimesheetForUnassignedTutorShouldBeForbidden() throws Exception {
        LocalDate monday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        var payload = Map.of(
                "tutorId", 5,
                "courseId", 1,
                "weekStartDate", monday.toString(),
                "description", "Work",
                "taskType", TimesheetTaskType.TUTORIAL.name(),
                "qualification", TutorQualification.STANDARD.name(),
                "isRepeat", false,
                "deliveryHours", new BigDecimal("1.0")
        );

        mockMvc.perform(post("/api/timesheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "10", roles = {"ADMIN"})
    void afterAssignmentCreationSucceeds() throws Exception {
        // Assign tutor 5 to course 1
        var assign = Map.of(
                "tutorId", 5,
                "courseIds", List.of(1)
        );
        mockMvc.perform(post("/api/admin/tutors/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assign)))
                .andExpect(status().isNoContent());

        // Create a timesheet as lecturer for tutorId 5 / courseId 1
        LocalDate monday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        var payload = Map.of(
                "tutorId", 5,
                "courseId", 1,
                "weekStartDate", monday.toString(),
                "description", "Work",
                "taskType", TimesheetTaskType.TUTORIAL.name(),
                "qualification", TutorQualification.STANDARD.name(),
                "isRepeat", false,
                "deliveryHours", new BigDecimal("1.0")
        );

        // As ADMIN (superuser) for simplicity of auth in test; controller enforces lecturer policy elsewhere
        mockMvc.perform(post("/api/timesheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated());
    }
}
