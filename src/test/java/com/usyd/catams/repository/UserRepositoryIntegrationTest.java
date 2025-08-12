package com.usyd.catams.repository;

import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.persistence.EntityManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class UserRepositoryIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    private User tutorUser;
    private User lecturerUser;
    private User adminUser;
    private User inactiveUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        tutorUser = new User(new Email("tutor@example.com"), "John Doe", "$2a$10$hashedPassword1", UserRole.TUTOR);
        tutorUser.setIsActive(true);
        lecturerUser = new User(new Email("lecturer@example.com"), "Jane Smith", "$2a$10$hashedPassword2", UserRole.LECTURER);
        lecturerUser.setIsActive(true);
        adminUser = new User(new Email("admin@example.com"), "Admin User", "$2a$10$hashedPassword3", UserRole.ADMIN);
        adminUser.setIsActive(true);
        inactiveUser = new User(new Email("inactive@example.com"), "Inactive User", "$2a$10$hashedPassword4", UserRole.TUTOR);
        inactiveUser.setIsActive(false);

        entityManager.persist(tutorUser);
        entityManager.persist(lecturerUser);
        entityManager.persist(adminUser);
        entityManager.persist(inactiveUser);
        entityManager.flush();
    }

    @Test
    void findByEmail_ShouldReturnUser() {
        Optional<User> found = userRepository.findByEmail("tutor@example.com");
        assertThat(found).isPresent();
        assertThat(found.get().getRole()).isEqualTo(UserRole.TUTOR);
    }

    @Test
    void existsByEmail_ShouldWork() {
        assertThat(userRepository.existsByEmail("admin@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("nope@example.com")).isFalse();
    }

    @Test
    void roleQueries_ShouldFilter() {
        List<User> tutors = userRepository.findByRole(UserRole.TUTOR);
        List<User> actives = userRepository.findByIsActive(true);
        List<User> activeTutors = userRepository.findByRoleAndIsActive(UserRole.TUTOR, true);
        assertThat(tutors).extracting(User::getRole).contains(UserRole.TUTOR);
        assertThat(actives).allMatch(User::getIsActive);
        assertThat(activeTutors).allMatch(u -> u.getRole() == UserRole.TUTOR && Boolean.TRUE.equals(u.getIsActive()));
    }

    @Test
    void findByEmailAndIsActive_ShouldRespectActiveFlag() {
        assertThat(userRepository.findByEmailAndIsActive("tutor@example.com", true)).isPresent();
        assertThat(userRepository.findByEmailAndIsActive("inactive@example.com", true)).isEmpty();
        assertThat(userRepository.findByEmailAndIsActive("inactive@example.com", false)).isPresent();
    }

    @Test
    void countQueries_ShouldWork() {
        assertThat(userRepository.countByRole(UserRole.TUTOR)).isGreaterThanOrEqualTo(1);
        assertThat(userRepository.countByIsActive(true)).isGreaterThanOrEqualTo(3);
    }

    @Test
    void searchByName_ShouldBeCaseInsensitive() {
        List<User> results = userRepository.findByNameContainingIgnoreCase("doe");
        assertThat(results)
            .extracting(User::getEmail)
            .contains("tutor@example.com");
    }
}
