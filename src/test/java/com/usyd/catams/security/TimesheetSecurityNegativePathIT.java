package com.usyd.catams.security;

import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies timesheet endpoints deny unauthenticated access (401/403).
 */
class TimesheetSecurityNegativePathIT extends IntegrationTestBase {

    @Test
    @DisplayName("POST /api/timesheets without Authorization should be rejected")
    void createTimesheet_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(post("/api/timesheets")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"courseId\":1,\"weekStart\":\"2025-08-11\",\"hours\":3,\"hourlyRate\":50,\"description\":\"x\"}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("POST /api/timesheets/quote without Authorization should be rejected")
    void quoteTimesheet_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(post("/api/timesheets/quote")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"courseId\":1,\"hours\":3,\"hourlyRate\":50}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /api/timesheets/me without Authorization should be rejected")
    void myTimesheets_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(get("/api/timesheets/me")).andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /api/timesheets/pending-approval without Authorization should be rejected")
    void pendingApproval_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(get("/api/timesheets/pending-approval")).andExpect(status().is4xxClientError());
    }
}

