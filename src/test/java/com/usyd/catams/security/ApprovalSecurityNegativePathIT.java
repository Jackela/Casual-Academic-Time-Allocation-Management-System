package com.usyd.catams.security;

import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies approvals endpoints reject unauthenticated requests.
 */
class ApprovalSecurityNegativePathIT extends IntegrationTestBase {

    @Test
    @DisplayName("POST /api/approvals without Authorization should be rejected")
    void postApproval_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(post("/api/approvals")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"timesheetId\":1,\"action\":\"LECTURER_CONFIRM\",\"comment\":\"x\"}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /api/approvals/pending without Authorization should be rejected")
    void getPending_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(get("/api/approvals/pending")).andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /api/approvals/history/{id} without Authorization should be rejected")
    void getHistory_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(get("/api/approvals/history/1")).andExpect(status().is4xxClientError());
    }
}

