package com.usyd.catams.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.enums.TutorQualification;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.test.context.jdbc.Sql(statements = {
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (20, 'lecturer2@example.com', 'Lecturer Two', 'x', 'LECTURER', true, NOW(), NOW()) ON CONFLICT DO NOTHING",
        "INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES (25, 'tutor25@example.com', 'Tutor Twenty Five', 'x', 'TUTOR', true, NOW(), NOW()) ON CONFLICT DO NOTHING",
        "INSERT INTO courses (id, code_value, name, semester, lecturer_id, budget_allocated, budget_allocated_currency, budget_used, budget_used_currency, is_active, created_at, updated_at) VALUES (101, 'TEST2000', 'Another Test', '2025S1', 20, 10000.00, 'AUD', 0.00, 'AUD', true, NOW(), NOW()) ON CONFLICT DO NOTHING",
        "INSERT INTO tutor_assignments (tutor_id, course_id, created_at) VALUES (25, 101, NOW()) ON CONFLICT DO NOTHING"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@org.springframework.test.context.jdbc.Sql(statements = {
        "DELETE FROM tutor_assignments WHERE tutor_id IN (25)",
        "DELETE FROM courses WHERE id IN (101)",
        "DELETE FROM users WHERE id IN (25,20)"
}, executionPhase = org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD)
class AdminTutorReadEndpointsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "20", roles = {"LECTURER"})
    void getAssignmentsShouldReturnBoundCourses() throws Exception {
        mockMvc.perform(get("/api/admin/tutors/{tutorId}/assignments", 25)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseIds").isArray());
    }

    @Test
    @WithMockUser(username = "20", roles = {"LECTURER"})
    void getDefaultsShouldReturnQualificationOrNull() throws Exception {
        // First set a default as ADMIN
        String body = objectMapper.writeValueAsString(java.util.Map.of(
                "tutorId", 25,
                "defaultQualification", TutorQualification.COORDINATOR.name()
        ));
        mockMvc.perform(put("/api/admin/tutors/defaults")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("10").roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/tutors/{tutorId}/defaults", 25)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultQualification").value("COORDINATOR"));
    }
}

