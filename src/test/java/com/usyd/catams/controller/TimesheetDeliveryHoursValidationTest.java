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
class TimesheetDeliveryHoursValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = {"LECTURER"})
    void quoteTutorialShouldRejectNonOneHourDelivery() throws Exception {
        LocalDate monday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        var payload = new java.util.HashMap<String, Object>();
        payload.put("tutorId", 1);
        payload.put("courseId", 1);
        payload.put("sessionDate", monday.toString());
        payload.put("taskType", TimesheetTaskType.TUTORIAL.name());
        payload.put("qualification", TutorQualification.STANDARD.name());
        payload.put("repeat", false);
        payload.put("deliveryHours", new BigDecimal("0.5"));

        mockMvc.perform(post("/api/timesheets/quote")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = {"LECTURER"})
    void quoteOraaShouldAllowFractionalDelivery() throws Exception {
        LocalDate monday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        var payload = new java.util.HashMap<String, Object>();
        payload.put("tutorId", 1);
        payload.put("courseId", 1);
        payload.put("sessionDate", monday.toString());
        payload.put("taskType", TimesheetTaskType.ORAA.name());
        payload.put("qualification", TutorQualification.STANDARD.name());
        payload.put("repeat", false);
        payload.put("deliveryHours", new BigDecimal("1.5"));

        mockMvc.perform(post("/api/timesheets/quote")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isOk());
    }
}

