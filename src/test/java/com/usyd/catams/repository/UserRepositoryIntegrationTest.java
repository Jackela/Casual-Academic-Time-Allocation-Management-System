package com.usyd.catams.repository;

import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.common.domain.model.Email;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:13")
            .withDatabaseName("catams_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User tutorUser;
    private User lecturerUser;
    private User adminUser;
    private User inactiveUser;

    @BeforeEach
    void setUp() {
        tutorUser = new User(
            new Email("tutor@example.com"),
            "John Doe",
            "$2a$10$hashedPassword1",
            UserRole.TUTOR
        );
        tutorUser.setIsActive(true);

        lecturerUser = new User(
            new Email("lecturer@example.com"),
            "Jane Smith",
            "$2a$10$hashedPassword2",
            UserRole.LECTURER
        );
        lecturerUser.setIsActive(true);

        adminUser = new User(
            new Email("admin@example.com"),
            "Admin User",
            "$2a$10$hashedPassword3",
            UserRole.ADMIN
        );
        adminUser.setIsActive(true);

        inactiveUser = new User(
            new Email("inactive@example.com"),
            "Inactive User",
            "$2a$10$hashedPassword4",
            UserRole.TUTOR
        );
        inactiveUser.setIsActive(false);

        entityManager.persistAndFlush(tutorUser);
        entityManager.persistAndFlush(lecturerUser);
        entityManager.persistAndFlush(adminUser);
        entityManager.persistAndFlush(inactiveUser);
    }

    @Test
    void findByEmail_ShouldReturnUserWhenExists() {
        Optional<User> result = userRepository.findByEmail("tutor@example.com");

        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("tutor@example.com");
        assertThat(result.get().getName()).isEqualTo("John Doe");
        assertThat(result.get().getRole()).isEqualTo(UserRole.TUTOR);
    }

    @Test
    void findByEmail_ShouldReturnEmptyWhenNotExists() {
        Optional<User> result = userRepository.findByEmail("nonexistent@example.com");

        assertThat(result).isEmpty();
    }

    @Test
    void findByEmail_ShouldBeCaseExact() {
        Optional<User> result = userRepository.findByEmail("TUTOR@EXAMPLE.COM");

        assertThat(result).isEmpty();
    }

    @Test
    void existsByEmail_ShouldReturnTrueWhenUserExists() {
        boolean exists = userRepository.existsByEmail("tutor@example.com");

        assertThat(exists).isTrue();
    }

    @Test
    void existsByEmail_ShouldReturnFalseWhenUserNotExists() {
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");

        assertThat(exists).isFalse();
    }

    @Test
    void existsByEmail_ShouldReturnTrueForInactiveUser() {
        boolean exists = userRepository.existsByEmail("inactive@example.com");

        assertThat(exists).isTrue();
    }

    @Test
    void findByRole_ShouldReturnUsersWithSpecificRole() {
        List<User> result = userRepository.findByRole(UserRole.TUTOR);

        assertThat(result).hasSize(2); // tutorUser and inactiveUser
        assertThat(result).extracting(User::getRole).containsOnly(UserRole.TUTOR);
        assertThat(result).extracting(User::getEmail).containsExactlyInAnyOrder("tutor@example.com", "inactive@example.com");
    }

    @Test
    void findByRole_ShouldReturnEmptyForNonExistentRole() {
        List<User> result = userRepository.findByRole(UserRole.HR);

        assertThat(result).isEmpty();
    }

    @Test
    void findByIsActive_ShouldReturnActiveUsers() {
        List<User> result = userRepository.findByIsActive(true);

        assertThat(result).hasSize(3);
        assertThat(result).allMatch(User::getIsActive);
        assertThat(result).extracting(User::getEmail)
            .containsExactlyInAnyOrder("tutor@example.com", "lecturer@example.com", "admin@example.com");
    }

    @Test
    void findByIsActive_ShouldReturnInactiveUsers() {
        List<User> result = userRepository.findByIsActive(false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("inactive@example.com");
        assertThat(result.get(0).getIsActive()).isFalse();
    }

    @Test
    void findByRoleAndIsActive_ShouldReturnActiveTutors() {
        List<User> result = userRepository.findByRoleAndIsActive(UserRole.TUTOR, true);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("tutor@example.com");
        assertThat(result.get(0).getRole()).isEqualTo(UserRole.TUTOR);
        assertThat(result.get(0).getIsActive()).isTrue();
    }

    @Test
    void findByRoleAndIsActive_ShouldReturnInactiveTutors() {
        List<User> result = userRepository.findByRoleAndIsActive(UserRole.TUTOR, false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("inactive@example.com");
        assertThat(result.get(0).getRole()).isEqualTo(UserRole.TUTOR);
        assertThat(result.get(0).getIsActive()).isFalse();
    }

    @Test
    void findByRoleAndIsActive_ShouldReturnEmptyWhenNoMatch() {
        List<User> result = userRepository.findByRoleAndIsActive(UserRole.HR, true);

        assertThat(result).isEmpty();
    }

    @Test
    void findByEmailAndIsActive_ShouldReturnActiveUser() {
        Optional<User> result = userRepository.findByEmailAndIsActive("tutor@example.com", true);

        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("tutor@example.com");
        assertThat(result.get().getIsActive()).isTrue();
    }

    @Test
    void findByEmailAndIsActive_ShouldReturnEmptyForInactiveUser() {
        Optional<User> result = userRepository.findByEmailAndIsActive("inactive@example.com", true);

        assertThat(result).isEmpty();
    }

    @Test
    void findByEmailAndIsActive_ShouldReturnInactiveUser() {
        Optional<User> result = userRepository.findByEmailAndIsActive("inactive@example.com", false);

        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("inactive@example.com");
        assertThat(result.get().getIsActive()).isFalse();
    }

    @Test
    void findByEmailAndIsActive_ShouldReturnEmptyForNonExistentUser() {
        Optional<User> result = userRepository.findByEmailAndIsActive("nonexistent@example.com", true);

        assertThat(result).isEmpty();
    }

    @Test
    void countByRole_ShouldReturnCorrectCount() {
        long count = userRepository.countByRole(UserRole.TUTOR);

        assertThat(count).isEqualTo(2L); // tutorUser and inactiveUser
    }

    @Test
    void countByRole_ShouldReturnZeroForNonExistentRole() {
        long count = userRepository.countByRole(UserRole.HR);

        assertThat(count).isEqualTo(0L);
    }

    @Test
    void countByIsActive_ShouldReturnCorrectCountForActiveUsers() {
        long count = userRepository.countByIsActive(true);

        assertThat(count).isEqualTo(3L);
    }

    @Test
    void countByIsActive_ShouldReturnCorrectCountForInactiveUsers() {
        long count = userRepository.countByIsActive(false);

        assertThat(count).isEqualTo(1L);
    }

    @Test
    void findByNameContainingIgnoreCase_ShouldReturnMatchingUsers() {
        List<User> result = userRepository.findByNameContainingIgnoreCase("john");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("John Doe");
    }

    @Test
    void findByNameContainingIgnoreCase_ShouldBeCaseInsensitive() {
        List<User> result = userRepository.findByNameContainingIgnoreCase("JOHN");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("John Doe");
    }

    @Test
    void findByNameContainingIgnoreCase_ShouldReturnPartialMatches() {
        List<User> result = userRepository.findByNameContainingIgnoreCase("user");

        assertThat(result).hasSize(2); // adminUser and inactiveUser
        assertThat(result).extracting(User::getName)
            .containsExactlyInAnyOrder("Admin User", "Inactive User");
    }

    @Test
    void findByNameContainingIgnoreCase_ShouldReturnEmptyWhenNoMatch() {
        List<User> result = userRepository.findByNameContainingIgnoreCase("nonexistent");

        assertThat(result).isEmpty();
    }

    @Test
    void findByNameContainingIgnoreCase_ShouldHandleEmptyString() {
        List<User> result = userRepository.findByNameContainingIgnoreCase("");

        assertThat(result).hasSize(4); // All users should match empty string
    }

    @Test
    void findByNameContainingIgnoreCase_ShouldMatchWhitespace() {
        List<User> result = userRepository.findByNameContainingIgnoreCase("doe");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("John Doe");
    }

    @Test
    void repositoryShouldHandleMultipleRoles() {
        List<User> lecturers = userRepository.findByRole(UserRole.LECTURER);
        List<User> admins = userRepository.findByRole(UserRole.ADMIN);

        assertThat(lecturers).hasSize(1);
        assertThat(lecturers.get(0).getRole()).isEqualTo(UserRole.LECTURER);

        assertThat(admins).hasSize(1);
        assertThat(admins.get(0).getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void repositoryShouldMaintainDataIntegrity() {
        // Test that email uniqueness is enforced at database level
        User duplicateEmailUser = new User(
            new Email("tutor@example.com"), // Same email as tutorUser
            "Duplicate User",
            "$2a$10$hashedPassword5",
            UserRole.LECTURER
        );

        // This should fail due to unique constraint on email
        try {
            entityManager.persistAndFlush(duplicateEmailUser);
            // If we reach here, the test should fail
            assertThat(false).as("Expected unique constraint violation").isTrue();
        } catch (Exception e) {
            // Expected behavior - unique constraint violation
            assertThat(e.getMessage()).contains("unique");
        }
    }
}