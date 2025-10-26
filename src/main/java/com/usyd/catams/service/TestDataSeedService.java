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

        // Idempotent upsert by globally-unique course code to avoid unique constraint conflicts
        ensureCourseByCode("E2E101", "E2E Course 101", lecturerId, new BigDecimal("10000"));
        ensureCourseByCode("E2E102", "E2E Course 102", lecturerId, new BigDecimal("5000"));

        LOGGER.info("Ensured courses for lecturer {} exist and are active: E2E101, E2E102", lecturerId);
    }

    private void ensureCourseByCode(String code, String name, Long lecturerId, BigDecimal budgetAllocated) {
        courseRepository.findByCode(code).ifPresentOrElse(existing -> {
            // Update ownership/metadata to requested lecturer deterministically for test environments
            existing.setName(name);
            existing.setSemester(currentSemester());
            existing.setLecturerId(lecturerId);
            existing.setBudgetAllocated(budgetAllocated);
            existing.setIsActive(true);
            courseRepository.save(existing);
        }, () -> {
            Course course = new Course(new CourseCode(code), name, currentSemester(), lecturerId, new Money(budgetAllocated));
            course.setIsActive(true);
            courseRepository.save(course);
        });
    }

    @Transactional
    public void ensureBasicTutors() {
        // Create or update a couple of active tutors deterministically
        upsertTutor("tutor@example.com", "E2E Tutor One", "Tutor123!");
        upsertTutor("tutor2@example.com", "E2E Tutor Two", "Tutor123!");
    }

    private void upsertTutor(String email, String name, String rawPassword) {
        userRepository.findByEmail(email).ifPresentOrElse(existing -> {
            // Normalize to an active TUTOR for test determinism; keep existing password
            existing.setName(name);
            existing.setRole(UserRole.TUTOR);
            existing.setActive(true);
            userRepository.save(existing);
        }, () -> {
            String hashed = passwordEncoder.encode(rawPassword);
            User user = new User(email, name, hashed, UserRole.TUTOR);
            user.setActive(true);
            userRepository.save(user);
        });
    }

    private String currentSemester() {
        // A simple placeholder semester code for seeded courses
        return "E2E";
    }
}
