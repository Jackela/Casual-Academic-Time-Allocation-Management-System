package com.usyd.catams.performance;

import com.usyd.catams.dto.request.AuthenticationRequest;
import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Performance tests for key API endpoints.
 * 
 * Tests response times and throughput under load for:
 * - Authentication endpoints
 * - CRUD operations (Create, Read, Update, Delete)
 * - List operations with pagination
 * - Search and filtering operations
 * 
 * Establishes performance baselines and validates SLA compliance.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("API Performance Tests")
class ApiPerformanceTest extends PerformanceTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testLecturer;
    private User testTutor;
    private Course testCourse;
    private List<Long> createdTimesheetIds;

    @BeforeEach
    void setupPerformanceTestData() {
        // Clear existing data
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();
        createdTimesheetIds = new ArrayList<>();

        // Create test users
        testLecturer = TestDataBuilder.aLecturer()
            .email("perf.lecturer@test.com")
            .password(passwordEncoder.encode("password123"))
            .name("Performance Test Lecturer")
            .build();
        testLecturer = userRepository.save(testLecturer);

        testTutor = TestDataBuilder.aTutor()
            .email("perf.tutor@test.com")
            .password(passwordEncoder.encode("password123"))
            .name("Performance Test Tutor")
            .build();
        testTutor = userRepository.save(testTutor);

        // Create test course
        testCourse = TestDataBuilder.aCourse()
            .code("PERF101")
            .name("Performance Testing Course")
            .lecturer(testLecturer)
            .build();
        testCourse = courseRepository.save(testCourse);

        // Update auth tokens
        lecturerToken = "Bearer " + jwtTokenProvider.generateToken(
            testLecturer.getId(), testLecturer.getEmail(), testLecturer.getRole().name()
        );
        tutorToken = "Bearer " + jwtTokenProvider.generateToken(
            testTutor.getId(), testTutor.getEmail(), testTutor.getRole().name()
        );

        System.out.println("Performance test setup completed - Database: " + getDatabaseUrl());
    }

    @Test
    @Order(1)
    @DisplayName("Authentication Performance - Login endpoint")
    void testAuthenticationPerformance() throws Exception {
        // Arrange
        AuthenticationRequest authRequest = TestDataBuilder.anAuthRequest()
            .email(testLecturer.getEmail())
            .password("password123")
            .build();

        Supplier<MvcResult> authRequestSupplier = () -> {
            try {
                return performPost("/api/auth/login", authRequest)
                    .andExpect(status().isOk())
                    .andReturn();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // Warmup
        warmup(authRequestSupplier);

        // Act - Load test
        PerformanceResult result = runLoadTest(
            authRequestSupplier, 
            Duration.ofSeconds(15), 
            concurrentUsers
        );

        // Assert
        generatePerformanceReport("Authentication Performance", result);
        assertPerformanceThreshold(result, authResponseThreshold, "Authentication");
    }

    @Test
    @Order(2)
    @DisplayName("CRUD Performance - Timesheet creation")
    void testTimesheetCreationPerformance() throws Exception {
        // Arrange
        LocalDate baseDate = LocalDate.now().with(DayOfWeek.MONDAY);
        
        Supplier<MvcResult> createRequestSupplier = () -> {
            try {
                // Create unique timesheet for each request
                LocalDate weekDate = baseDate.plusWeeks(createdTimesheetIds.size() % 52);
                TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
                    .tutorId(testTutor.getId())
                    .courseId(testCourse.getId())
                    .weekCommencing(weekDate)
                    .hours(new BigDecimal("10.0"))
                    .hourlyRate(new BigDecimal("35.00"))
                    .description("Performance test timesheet #" + System.nanoTime())
                    .build();

                return performPost("/api/timesheets", request, lecturerToken)
                    .andExpect(status().isCreated())
                    .andReturn();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // Warmup
        warmup(createRequestSupplier);

        // Act - Load test
        PerformanceResult result = runLoadTest(
            createRequestSupplier, 
            Duration.ofSeconds(20), 
            Math.min(concurrentUsers, 5) // Limit for creation to avoid constraint violations
        );

        // Assert
        generatePerformanceReport("Timesheet Creation Performance", result);
        assertPerformanceThreshold(result, crudResponseThreshold, "Timesheet Creation");
    }

    @Test
    @Order(3)
    @DisplayName("Read Performance - Single timesheet retrieval")
    void testTimesheetReadPerformance() throws Exception {
        // Arrange - Create test timesheet first
        TimesheetCreateRequest createRequest = TestDataBuilder.aTimesheetRequest()
            .tutorId(testTutor.getId())
            .courseId(testCourse.getId())
            .build();

        MvcResult createResult = performPost("/api/timesheets", createRequest, lecturerToken)
            .andExpect(status().isCreated())
            .andReturn();

        String responseContent = createResult.getResponse().getContentAsString();
        var responseNode = objectMapper.readTree(responseContent);
        Long timesheetId = responseNode.get("id").asLong();

        Supplier<MvcResult> readRequestSupplier = () -> {
            try {
                return performGet("/api/timesheets/" + timesheetId, lecturerToken)
                    .andExpect(status().isOk())
                    .andReturn();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // Warmup
        warmup(readRequestSupplier);

        // Act - Load test
        PerformanceResult result = runLoadTest(
            readRequestSupplier, 
            Duration.ofSeconds(15), 
            concurrentUsers
        );

        // Assert
        generatePerformanceReport("Timesheet Read Performance", result);
        assertPerformanceThreshold(result, crudResponseThreshold, "Timesheet Read");
    }

    @Test
    @Order(4)
    @DisplayName("List Performance - Timesheet pagination")
    void testTimesheetListPerformance() throws Exception {
        // Arrange - Create multiple timesheets for realistic pagination test
        createTestTimesheets(20);

        Supplier<MvcResult> listRequestSupplier = () -> {
            try {
                // Vary page parameters to test different data sets
                int page = (int) (System.nanoTime() % 5);
                int size = 5 + (int) (System.nanoTime() % 10);
                
                return performGet("/api/timesheets?page=" + page + "&size=" + size, lecturerToken)
                    .andExpect(status().isOk())
                    .andReturn();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // Warmup
        warmup(listRequestSupplier);

        // Act - Load test
        PerformanceResult result = runLoadTest(
            listRequestSupplier, 
            Duration.ofSeconds(15), 
            concurrentUsers
        );

        // Assert
        generatePerformanceReport("Timesheet List Performance", result);
        assertPerformanceThreshold(result, listResponseThreshold, "Timesheet List");
    }

    @Test
    @Order(5)
    @DisplayName("Search Performance - Filtered timesheet queries")
    void testTimesheetSearchPerformance() throws Exception {
        // Arrange - Create test data with various states
        createTestTimesheets(30);

        Supplier<MvcResult> searchRequestSupplier = () -> {
            try {
                // Vary search parameters to test different queries
                String[] statuses = {"DRAFT", "PENDING_LECTURER_APPROVAL", "FINAL_APPROVED"};
                String status = statuses[(int) (System.nanoTime() % statuses.length)];
                
                return performGet("/api/timesheets?status=" + status + "&tutorId=" + testTutor.getId(), 
                                lecturerToken)
                    .andExpect(status().isOk())
                    .andReturn();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // Warmup
        warmup(searchRequestSupplier);

        // Act - Load test
        PerformanceResult result = runLoadTest(
            searchRequestSupplier, 
            Duration.ofSeconds(15), 
            concurrentUsers
        );

        // Assert
        generatePerformanceReport("Timesheet Search Performance", result);
        assertPerformanceThreshold(result, searchResponseThreshold, "Timesheet Search");
    }

    @Test
    @Order(6)
    @DisplayName("Mixed Workload Performance - Realistic usage pattern")
    void testMixedWorkloadPerformance() throws Exception {
        // Arrange - Create base data
        createTestTimesheets(10);

        // Define realistic workload mix (based on typical usage patterns)
        Supplier<MvcResult> mixedWorkloadSupplier = () -> {
            try {
                double random = Math.random();
                
                if (random < 0.4) {
                    // 40% - List/Read operations (most common)
                    return performGet("/api/timesheets?page=0&size=10", lecturerToken)
                        .andReturn();
                        
                } else if (random < 0.7) {
                    // 30% - Single timesheet reads
                    Long timesheetId = createdTimesheetIds.get(
                        (int) (Math.random() * createdTimesheetIds.size())
                    );
                    return performGet("/api/timesheets/" + timesheetId, lecturerToken)
                        .andReturn();
                        
                } else if (random < 0.9) {
                    // 20% - Search/filter operations
                    return performGet("/api/timesheets?tutorId=" + testTutor.getId(), lecturerToken)
                        .andReturn();
                        
                } else {
                    // 10% - Create operations
                    LocalDate weekDate = LocalDate.now().with(DayOfWeek.MONDAY)
                        .plusWeeks((long) (Math.random() * 52));
                    TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
                        .tutorId(testTutor.getId())
                        .courseId(testCourse.getId())
                        .weekCommencing(weekDate)
                        .description("Mixed workload test #" + System.nanoTime())
                        .build();
                    
                    return performPost("/api/timesheets", request, lecturerToken)
                        .andReturn();
                }
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // Warmup
        warmup(mixedWorkloadSupplier);

        // Act - Extended load test with mixed operations
        PerformanceResult result = runLoadTest(
            mixedWorkloadSupplier, 
            Duration.ofSeconds(30), 
            concurrentUsers
        );

        // Assert - Use average threshold for mixed workload
        long mixedThreshold = (crudResponseThreshold + listResponseThreshold + searchResponseThreshold) / 3;
        generatePerformanceReport("Mixed Workload Performance", result);
        assertPerformanceThreshold(result, mixedThreshold, "Mixed Workload");
    }

    /**
     * Helper method to create test timesheets for list/search performance tests
     */
    private void createTestTimesheets(int count) throws Exception {
        LocalDate baseDate = LocalDate.now().with(DayOfWeek.MONDAY);
        
        for (int i = 0; i < count; i++) {
            TimesheetCreateRequest request = TestDataBuilder.aTimesheetRequest()
                .tutorId(testTutor.getId())
                .courseId(testCourse.getId())
                .weekCommencing(baseDate.plusWeeks(i))
                .hours(new BigDecimal("8.0").add(new BigDecimal(i % 10)))
                .hourlyRate(new BigDecimal("30.00").add(new BigDecimal(i % 20)))
                .description("Test timesheet for performance testing #" + i)
                .build();

            MvcResult result = performPost("/api/timesheets", request, lecturerToken)
                .andExpect(status().isCreated())
                .andReturn();

            String responseContent = result.getResponse().getContentAsString();
            var responseNode = objectMapper.readTree(responseContent);
            Long timesheetId = responseNode.get("id").asLong();
            createdTimesheetIds.add(timesheetId);
            
            // Small delay to avoid overwhelming database
            Thread.sleep(10);
        }
        
        System.out.println("Created " + count + " test timesheets for performance testing");
    }

    @AfterEach
    void cleanupPerformanceTest() {
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
}