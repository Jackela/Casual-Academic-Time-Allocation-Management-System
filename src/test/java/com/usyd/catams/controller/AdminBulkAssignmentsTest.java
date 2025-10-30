package com.usyd.catams.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.test.context.jdbc.Sql(statements = {
        "DELETE FROM tutor_assignments WHERE tutor_id IN (45)",
        "DELETE FROM courses WHERE id IN (301,302)",
        "DELETE FROM users WHERE id IN (45,40)",
        "DELETE FROM users WHERE email_value IN ('lecturer4@example.com','tutor45@example.com')",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (40, 'lecturer4@example.com', 'Lecturer Four', 'x', 'LECTURER', true, NOW(), NOW())",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (45, 'tutor45@example.com', 'Tutor Forty Five', 'x', 'TUTOR', true, NOW(), NOW())",
        "INSERT INTO courses (id, code_value, name, semester, lecturer_id, budget_allocated, budget_allocated_currency, budget_used, budget_used_currency, is_active, created_at, updated_at) VALUES (301, 'ASSIGN301', 'Assign 301', '2025S1', 40, 10000.00, 'AUD', 0.00, 'AUD', true, NOW(), NOW())",
        "INSERT INTO courses (id, code_value, name, semester, lecturer_id, budget_allocated, budget_allocated_currency, budget_used, budget_used_currency, is_active, created_at, updated_at) VALUES (302, 'ASSIGN302', 'Assign 302', '2025S1', 40, 10000.00, 'AUD', 0.00, 'AUD', true, NOW(), NOW())",
        "INSERT INTO tutor_assignments (tutor_id, course_id, created_at) VALUES (45, 301, NOW())",
        "INSERT INTO tutor_assignments (tutor_id, course_id, created_at) VALUES (45, 302, NOW())"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@org.springframework.test.context.jdbc.Sql(statements = {
        "DELETE FROM tutor_assignments WHERE tutor_id IN (45)",
        "DELETE FROM courses WHERE id IN (301,302)",
        "DELETE FROM users WHERE id IN (45,40)"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD)
class AdminBulkAssignmentsTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "40", roles = {"LECTURER"})
    void bulkAssignmentsReturnsMappingForCourses() throws Exception {
        mockMvc.perform(get("/api/admin/tutors/courses/assignments")
                        .queryParam("courseIds", "301,302")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments").exists())
                .andExpect(jsonPath("$.assignments['301']").isArray())
                .andExpect(jsonPath("$.assignments['302']").isArray());
    }
}
