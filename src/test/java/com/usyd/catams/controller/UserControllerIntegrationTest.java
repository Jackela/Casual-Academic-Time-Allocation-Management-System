package com.usyd.catams.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("User Management Integration Tests")
class UserControllerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanDatabase() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("PATCH /api/users/{id} should deactivate user when requested by admin")
    void adminCanDeactivateUser() throws Exception {
        User admin = persistUser(uniqueEmail("admin.deactivate"), UserRole.ADMIN, true);
        String adminToken = bearer(admin);
        User target = persistUser(uniqueEmail("tutor.deactivate"), UserRole.TUTOR, true);

        mockMvc.perform(patch("/api/users/{id}", target.getId())
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("isActive", false))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(target.getId()))
            .andExpect(jsonPath("$.isActive").value(false));

        JsonNode users = fetchUsers(adminToken);
        JsonNode updatedUser = findUser(users, target.getId());
        assertThat(updatedUser).isNotNull();
        assertThat(updatedUser.get("isActive").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("PATCH /api/users/{id} should reactivate an inactive user when requested by admin")
    void adminCanReactivateUser() throws Exception {
        User admin = persistUser(uniqueEmail("admin.reactivate"), UserRole.ADMIN, true);
        String adminToken = bearer(admin);
        User target = persistUser(uniqueEmail("tutor.reactivate"), UserRole.TUTOR, false);

        mockMvc.perform(patch("/api/users/{id}", target.getId())
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("isActive", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(target.getId()))
            .andExpect(jsonPath("$.isActive").value(true));

        JsonNode users = fetchUsers(adminToken);
        JsonNode updatedUser = findUser(users, target.getId());
        assertThat(updatedUser).isNotNull();
        assertThat(updatedUser.get("isActive").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("PATCH /api/users/{id} should allow admins to update user names")
    void adminCanUpdateUserNames() throws Exception {
        User admin = persistUser(uniqueEmail("admin.update"), UserRole.ADMIN, true);
        String adminToken = bearer(admin);
        User target = persistUser(uniqueEmail("tutor.update"), UserRole.TUTOR, true);

        mockMvc.perform(patch("/api/users/{id}", target.getId())
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "firstName", "Updated",
                        "lastName", "Tutor"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Updated Tutor"));

        JsonNode users = fetchUsers(adminToken);
        JsonNode updatedUser = findUser(users, target.getId());
        assertThat(updatedUser).isNotNull();
        assertThat(updatedUser.get("name").asText()).isEqualTo("Updated Tutor");
    }

    @Test
    @DisplayName("PATCH /api/users/{id} should forbid non-admin users")
    void nonAdminCannotUpdateUsers() throws Exception {
        User tutor = persistUser(uniqueEmail("tutor.actor"), UserRole.TUTOR, true);
        String tutorToken = bearer(tutor);
        User target = persistUser(uniqueEmail("tutor.forbidden"), UserRole.TUTOR, true);

        mockMvc.perform(patch("/api/users/{id}", target.getId())
                .header("Authorization", tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("isActive", false))))
            .andExpect(status().isForbidden());
    }

    private User persistUser(String email, UserRole role, boolean active) {
        var builder = TestDataBuilder.aUser()
            .withEmail(email)
            .withName("Integration User")
            .withRole(role);

        if (active) {
            builder.active();
        } else {
            builder.inactive();
        }

        return userRepository.save(builder.build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtTokenProvider.generateToken(
            user.getId(),
            user.getEmail(),
            user.getRole().name()
        );
    }

    private String uniqueEmail(String prefix) {
        return prefix + "+" + UUID.randomUUID() + "@integration.test";
    }

    private JsonNode fetchUsers(String authToken) throws Exception {
        String responseBody = performGet("/api/users", authToken)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        return objectMapper.readTree(responseBody);
    }

    private JsonNode findUser(JsonNode users, Long userId) {
        for (JsonNode node : users) {
            if (node.hasNonNull("id") && node.get("id").asLong() == userId) {
                return node;
            }
        }
        return null;
    }
}
