package com.usyd.catams.security;

import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class AuthNegativeIT extends IntegrationTestBase {

    @Test
    @DisplayName("/api/auth/login returns 401 for invalid password")
    void login_invalidPassword_unauthorized() throws Exception {
        seedTestUsers();
        String payload = "{\"email\":\"admin@integration.test\",\"password\":\"wrongPassword\"}";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("AUTH_FAILED"));
    }

    @Test
    @DisplayName("/api/auth/login returns 400 for invalid request body")
    void login_invalidBody_badRequest() throws Exception {
        String payload = "{\"email\":\"not-an-email\",\"password\":\"\"}";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }
}

