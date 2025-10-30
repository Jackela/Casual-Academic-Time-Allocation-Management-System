package com.usyd.catams.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.enums.ApprovalAction;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.test.context.jdbc.Sql(statements = {
        "DELETE FROM tutor_assignments WHERE tutor_id IN (35)",
        "DELETE FROM courses WHERE id IN (201)",
        "DELETE FROM users WHERE id IN (35,30,10)",
        "DELETE FROM users WHERE email_value IN ('admin@example.com','lecturer3@example.com','tutor35@example.com')",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (10, 'admin@example.com', 'Admin', 'x', 'ADMIN', true, NOW(), NOW())",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (30, 'lecturer3@example.com', 'Lecturer Three', 'x', 'LECTURER', true, NOW(), NOW())",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (35, 'tutor35@example.com', 'Tutor Thirty Five', 'x', 'TUTOR', true, NOW(), NOW())",
        "INSERT INTO courses (id, code_value, name, semester, lecturer_id, budget_allocated, budget_allocated_currency, budget_used, budget_used_currency, is_active, created_at, updated_at) VALUES (201, 'ASSIGN201', 'Assign Course', '2025S1', 30, 10000.00, 'AUD', 0.00, 'AUD', true, NOW(), NOW())"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@org.springframework.test.context.jdbc.Sql(statements = {
        "DELETE FROM approvals WHERE timesheet_id IN (SELECT id FROM timesheets WHERE course_id=201 AND tutor_id=35)",
        "DELETE FROM timesheets WHERE course_id=201 AND tutor_id=35",
        "DELETE FROM tutor_assignments WHERE tutor_id IN (35)",
        "DELETE FROM courses WHERE id IN (201)",
        "DELETE FROM users WHERE id IN (35,30,10)"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD)
class LecturerApprovalAssignmentEnforcementTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "30", roles = {"LECTURER"})
    void lecturerCanApproveWhenTutorAssigned() throws Exception {
        // Assign tutor 35 to course 201
        mockMvc.perform(post("/api/admin/tutors/assignments")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("10").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "tutorId", 35,
                                "courseIds", java.util.List.of(201)
                        ))))
                .andExpect(status().isNoContent());

        // Create a timesheet as ADMIN
        String nextMonday = java.time.LocalDate.now().with(java.time.DayOfWeek.MONDAY)
                .plusWeeks(java.time.LocalDate.now().getDayOfWeek() == java.time.DayOfWeek.MONDAY ? 0 : 0)
                .toString();
        var create = new java.util.HashMap<String, Object>();
        create.put("tutorId", 35);
        create.put("courseId", 201);
        create.put("weekStartDate", nextMonday);
        create.put("deliveryHours", 1.0);
        create.put("description", "Work");
        create.put("taskType", "TUTORIAL");
        create.put("qualification", "STANDARD");
        create.put("isRepeat", false);
        var createResult = mockMvc.perform(post("/api/timesheets")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("10").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isCreated())
                .andReturn();
        var created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long timesheetId = created.get("id").asLong();

        // As TUTOR, submit and confirm
        var submit = java.util.Map.of("timesheetId", timesheetId, "action", ApprovalAction.SUBMIT_FOR_APPROVAL.name());
        mockMvc.perform(post("/api/approvals")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("35").roles("TUTOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andExpect(status().isOk());

        var confirm = java.util.Map.of("timesheetId", timesheetId, "action", ApprovalAction.TUTOR_CONFIRM.name());
        mockMvc.perform(post("/api/approvals")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("35").roles("TUTOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirm)))
                .andExpect(status().isOk());

        // As LECTURER, confirm
        var lecturerConfirm = java.util.Map.of("timesheetId", timesheetId, "action", ApprovalAction.LECTURER_CONFIRM.name());
        mockMvc.perform(post("/api/approvals")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("30").roles("LECTURER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lecturerConfirm)))
                .andExpect(status().isOk());
    }
}
