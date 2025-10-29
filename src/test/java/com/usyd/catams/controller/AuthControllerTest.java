package com.usyd.catams.controller;

import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String bearerToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        User user = new User("admin@example.com", "Admin User", "$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDE", UserRole.ADMIN);
        user = userRepository.saveAndFlush(user);

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        this.bearerToken = "Bearer " + token;
    }

    @Test
    @DisplayName("POST /api/auth/logout returns 204 with valid token")
    void logout_returnsNoContent_withValidToken() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                .header(HttpHeaders.AUTHORIZATION, bearerToken))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/auth/logout without token is unauthorized (401)")
    void logout_unauthorized_withoutToken() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
            .andExpect(status().isUnauthorized());
    }
}
