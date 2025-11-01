package com.usyd.catams.controller;

import com.usyd.catams.controller.admin.UserAdminController;
import com.usyd.catams.repository.TutorProfileDefaultsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminTutorDefaultsResilienceTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TutorProfileDefaultsRepository defaultsRepository;

    @MockBean
    private com.usyd.catams.repository.TutorAssignmentRepository assignmentRepository;

    @TestConfiguration
    static class SupportConfig {
        @Bean
        java.time.Clock clock() { return java.time.Clock.systemUTC(); }
    }

    @MockBean
    private com.usyd.catams.security.JwtTokenProvider jwtTokenProvider;

    @MockBean
    private com.usyd.catams.repository.UserRepository userRepository;

    @Test
    @WithMockUser(username = "2", roles = {"LECTURER"})
    void getDefaultsShouldReturn200WithNullWhenRepositoryErrors() throws Exception {
        when(defaultsRepository.findById(99L)).thenThrow(new RuntimeException("DB down"));

        mockMvc.perform(get("/api/admin/tutors/{tutorId}/defaults", 99)
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.defaultQualification", nullValue()));
    }
}
