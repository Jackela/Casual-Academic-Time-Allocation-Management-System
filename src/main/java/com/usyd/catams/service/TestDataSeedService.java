package com.usyd.catams.service;

import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Profile({"test", "e2e", "e2e-local"})
public class TestDataSeedService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TestDataSeedService.class);

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public TestDataSeedService(CourseRepository courseRepository, UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void ensureLecturerCourses(Long lecturerId) {
        if (lecturerId == null || lecturerId <= 0) {
            throw new IllegalArgumentException("lecturerId must be a positive number");
        }

        List<Course> existing = courseRepository.findByLecturerIdAndIsActive(lecturerId, true);
        if (!existing.isEmpty()) {
            return;
        }

        // Seed two simple active courses for the lecturer
        Course c1 = new Course(new CourseCode("E2E101"), "E2E Course 101", currentSemester(), lecturerId, new Money(new BigDecimal("10000")));
        c1.setIsActive(true);
        courseRepository.save(c1);

        Course c2 = new Course(new CourseCode("E2E102"), "E2E Course 102", currentSemester(), lecturerId, new Money(new BigDecimal("5000")));
        c2.setIsActive(true);
        courseRepository.save(c2);

        LOGGER.info("Seeded courses for lecturer {}: {}, {}", lecturerId, c1.getCode(), c2.getCode());
    }

    @Transactional
    public void ensureBasicTutors() {
        // Create a couple of active tutors if the system has none
        long tutors = userRepository.countByRole(UserRole.TUTOR);
        if (tutors > 0) return;

        createTutorIfMissing("tutor@example.com", "E2E Tutor One", "Tutor123!");
        createTutorIfMissing("tutor2@example.com", "E2E Tutor Two", "Tutor123!");
    }

    private void createTutorIfMissing(String email, String name, String rawPassword) {
        if (userRepository.findByEmail(email).isPresent()) return;
        String hashed = passwordEncoder.encode(rawPassword);
        User user = new User(email, name, hashed, UserRole.TUTOR);
        user.setActive(true);
        userRepository.save(user);
    }

    private String currentSemester() {
        // A simple placeholder semester code for seeded courses
        return "E2E";
    }
}
