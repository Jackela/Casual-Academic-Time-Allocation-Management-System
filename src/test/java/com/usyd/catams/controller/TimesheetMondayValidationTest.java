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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TimesheetMondayValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = {"LECTURER"})
    void quoteShouldRejectNonMondaySessionDate() throws Exception {
        LocalDate wednesday = LocalDate.now().with(java.time.DayOfWeek.WEDNESDAY);
        var payload = new java.util.HashMap<String, Object>();
        payload.put("tutorId", 1);
        payload.put("courseId", 1);
        payload.put("sessionDate", wednesday.toString());
        payload.put("taskType", TimesheetTaskType.TUTORIAL.name());
        payload.put("qualification", TutorQualification.STANDARD.name());
        payload.put("repeat", false);
        payload.put("deliveryHours", new BigDecimal("1.0"));

        var result = mockMvc.perform(post("/api/timesheets/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload))
                        .header("X-Request-Id", "test-trace-quote-non-monday"))
                .andExpect(status().isBadRequest())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(body).contains("traceId");
        // ensure our header-provided trace id is present in body
        org.assertj.core.api.Assertions.assertThat(body).contains("test-trace-quote-non-monday");
    }

    @Test
    @WithMockUser(roles = {"LECTURER"})
    void createShouldRejectNonMondayWeekStart() throws Exception {
        LocalDate tuesday = LocalDate.now().with(java.time.DayOfWeek.TUESDAY);
        var payload = new java.util.HashMap<String, Object>();
        payload.put("tutorId", 1);
        payload.put("courseId", 1);
        payload.put("weekStartDate", tuesday.toString());
        payload.put("description", "Work performed");
        payload.put("taskType", TimesheetTaskType.TUTORIAL.name());
        payload.put("qualification", TutorQualification.STANDARD.name());
        payload.put("isRepeat", false);
        payload.put("deliveryHours", new BigDecimal("1.0"));

        var result = mockMvc.perform(post("/api/timesheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload))
                        .header("X-Request-Id", "test-trace-create-non-monday"))
                .andExpect(status().isBadRequest())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(body).contains("traceId");
        org.assertj.core.api.Assertions.assertThat(body).contains("test-trace-create-non-monday");
    }
}
