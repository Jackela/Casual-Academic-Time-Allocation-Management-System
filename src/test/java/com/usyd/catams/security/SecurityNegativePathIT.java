package com.usyd.catams.security;

import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies that protected endpoints deny unauthenticated access (401/403).
 * Uses IntegrationTestBase so security filters and context are wired as in real runtime.
 */
class SecurityNegativePathIT extends IntegrationTestBase {

    @Test
    @DisplayName("POST /api/users without Authorization should be rejected")
    void createUser_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"x@y.z\",\"name\":\"X\",\"role\":\"TUTOR\",\"password\":\"Passw0rd!\"}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /api/timesheets/me without Authorization should be rejected")
    void myTimesheets_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(get("/api/timesheets/me").contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().is4xxClientError());
    }
}

