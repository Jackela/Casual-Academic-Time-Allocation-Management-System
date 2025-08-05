package com.usyd.catams.performance;

import com.usyd.catams.dto.request.AuthenticationRequest;
import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("API Performance Tests")
@Transactional
@Rollback
class ApiPerformanceTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    private User testLecturer;
    private User testTutor;
    private Course testCourse;
    private List<Long> createdTimesheetIds;
    private ExecutorService executorService;
    private final int concurrentUsers = 10;
    private final long authResponseThreshold = 500; // ms
    private final long crudResponseThreshold = 800; // ms
    private final long listResponseThreshold = 1000; // ms
    private final long searchResponseThreshold = 1200; // ms

    @BeforeEach
    void setupPerformanceTestData() {
        entityManager.clear();
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();
        createdTimesheetIds = new ArrayList<>();
        entityManager.flush();
        entityManager.clear();

        testLecturer = TestDataBuilder.aLecturer()
            .withEmail("perf.lecturer@test.com")
            .withHashedPassword(passwordEncoder.encode("password123"))
            .withName("Performance Test Lecturer")
            .build();
        testLecturer = userRepository.save(testLecturer);

        testTutor = TestDataBuilder.aTutor()
            .withEmail("perf.tutor@test.com")
            .withHashedPassword(passwordEncoder.encode("password123"))
            .withName("Performance Test Tutor")
            .build();
        testTutor = userRepository.save(testTutor);

        testCourse = TestDataBuilder.aCourse()
            .withCode("PERF3999")
            .withName("Performance Testing Course")
            .withLecturer(testLecturer)
            .build();
        testCourse = courseRepository.save(testCourse);

        lecturerToken = "Bearer " + jwtTokenProvider.generateToken(
            testLecturer.getId(), testLecturer.getEmail(), testLecturer.getRole().name()
        );
        tutorToken = "Bearer " + jwtTokenProvider.generateToken(
            testTutor.getId(), testTutor.getEmail(), testTutor.getRole().name()
        );
    }

    // ... all other test methods from the original file
}

