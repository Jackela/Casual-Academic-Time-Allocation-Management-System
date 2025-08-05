package com.usyd.catams.repository;

import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class UserRepositoryIntegrationTest extends IntegrationTestBase {

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

    // ... all other test methods from the original file
}

