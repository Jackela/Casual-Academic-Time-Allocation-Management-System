package com.usyd.catams.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("CourseController availability & RBAC")
class CourseControllerAvailabilityIntegrationTest extends IntegrationTestBase {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private UserRepository userRepository;

    private User admin;
    private User lecturer;
    private User tutor;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        courseRepository.deleteAll();

        admin = userRepository.save(TestDataBuilder.aUser()
            .withEmail("admin+courses@test.local")
            .withName("Admin")
            .withRole(UserRole.ADMIN)
            .active()
            .build());

        lecturer = userRepository.save(TestDataBuilder.aUser()
            .withEmail("lecturer+courses@test.local")
            .withName("Lecturer")
            .withRole(UserRole.LECTURER)
            .active()
            .build());

        tutor = userRepository.save(TestDataBuilder.aUser()
            .withEmail("tutor+courses@test.local")
            .withName("Tutor")
            .withRole(UserRole.TUTOR)
            .active()
            .build());

        Course c1 = TestDataBuilder.aCourse().withId(1001L).withCode("COMP7001").withName("Test A").withLecturer(lecturer).build();
        Course c2 = TestDataBuilder.aCourse().withId(1002L).withCode("COMP7002").withName("Test B").withLecturer(lecturer).build();
        courseRepository.save(c1);
        courseRepository.save(c2);
        courseRepository.flush();
    }

    @Test
    @DisplayName("GET /api/courses returns list for ADMIN")
    void adminCanListCourses() throws Exception {
        String token = bearer(admin);
        String content = performGet("/api/courses", token)
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode root = objectMapper.readTree(content);
        assertThat(root.isArray()).isTrue();
        assertThat(root.size()).isGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("GET /api/courses returns list for LECTURER")
    void lecturerCanListCourses() throws Exception {
        String token = bearer(lecturer);
        String content = performGet("/api/courses", token)
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode root = objectMapper.readTree(content);
        assertThat(root.isArray()).isTrue();
        assertThat(root.size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("GET /api/courses is forbidden for TUTOR")
    void tutorCannotListCourses() throws Exception {
        String token = bearer(tutor);
        performGet("/api/courses", token)
            .andExpect(status().isForbidden());
    }

    private String bearer(User user) {
        return "Bearer " + jwtTokenProvider.generateToken(
            user.getId(),
            user.getEmail(),
            user.getRole().name()
        );
    }
}

