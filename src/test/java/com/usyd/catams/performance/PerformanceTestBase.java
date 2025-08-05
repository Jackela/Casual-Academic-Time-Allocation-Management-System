package com.usyd.catams.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.integration.IntegrationTestBase;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.function.Supplier;

/**
 * Base class for API performance testing.
 * 
 * Provides utilities for:
 * - Response time measurement
 * - Load testing with concurrent requests
 * - Performance baseline validation
 * - Metrics collection and reporting
 * 
 * Uses TestContainers for realistic performance testing environment.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration-test")
public abstract class PerformanceTestBase extends IntegrationTestBase {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    // Performance thresholds from configuration
    @Value("${test.performance.response-time.auth:500}")
    protected long authResponseThreshold;

    @Value("${test.performance.response-time.crud:200}")
    protected long crudResponseThreshold;

    @Value("${test.performance.response-time.list:300}")
    protected long listResponseThreshold;

    @Value("${test.performance.response-time.search:400}")
    protected long searchResponseThreshold;

    @Value("${test.performance.concurrent-users:10}")
    protected int concurrentUsers;

    @Value("${test.performance.test-duration:30s}")
    protected Duration testDuration;

    @Value("${test.performance.warmup-duration:5s}")
    protected Duration warmupDuration;

    protected MeterRegistry meterRegistry;
    protected ExecutorService executorService;

    @BeforeEach
    void setupPerformanceTest() {
        meterRegistry = new SimpleMeterRegistry();
        executorService = Executors.newFixedThreadPool(concurrentUsers);
    }

    /**
     * Performance test result container
     */
    public static class PerformanceResult {
        private final List<Long> responseTimes;
        private final List<Exception> errors;
        private final long totalRequests;
        private final long successfulRequests;
        private final Duration testDuration;

        public PerformanceResult(List<Long> responseTimes, List<Exception> errors, 
                               long totalRequests, Duration testDuration) {
            this.responseTimes = new ArrayList<>(responseTimes);
            this.errors = new ArrayList<>(errors);
            this.totalRequests = totalRequests;
            this.successfulRequests = totalRequests - errors.size();
            this.testDuration = testDuration;
        }

        public double getAverageResponseTime() {
            return responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
        }

        public long getMinResponseTime() {
            return responseTimes.stream().mapToLong(Long::longValue).min().orElse(0L);
        }

        public long getMaxResponseTime() {
            return responseTimes.stream().mapToLong(Long::longValue).max().orElse(0L);
        }

        public long getP95ResponseTime() {
            if (responseTimes.isEmpty()) return 0L;
            var sorted = responseTimes.stream().sorted().toList();
            int index = (int) Math.ceil(0.95 * sorted.size()) - 1;
            return sorted.get(Math.max(0, index));
        }

        public long getP99ResponseTime() {
            if (responseTimes.isEmpty()) return 0L;
            var sorted = responseTimes.stream().sorted().toList();
            int index = (int) Math.ceil(0.99 * sorted.size()) - 1;
            return sorted.get(Math.max(0, index));
        }

        public double getRequestsPerSecond() {
            return (double) totalRequests / testDuration.getSeconds();
        }

        public double getSuccessRate() {
            return totalRequests > 0 ? (double) successfulRequests / totalRequests * 100.0 : 0.0;
        }

        public long getTotalRequests() { return totalRequests; }
        public long getSuccessfulRequests() { return successfulRequests; }
        public long getErrorCount() { return errors.size(); }
        public List<Exception> getErrors() { return new ArrayList<>(errors); }
        
        @Override
        public String toString() {
            return String.format(
                "PerformanceResult{" +
                "totalRequests=%d, successfulRequests=%d, errorRate=%.2f%%, " +
                "avgResponseTime=%.2fms, p95=%.2fms, p99=%.2fms, " +
                "minResponseTime=%dms, maxResponseTime=%dms, " +
                "requestsPerSecond=%.2f, testDuration=%ds}",
                totalRequests, successfulRequests, (100.0 - getSuccessRate()),
                getAverageResponseTime(), (double)getP95ResponseTime(), (double)getP99ResponseTime(),
                getMinResponseTime(), getMaxResponseTime(),
                getRequestsPerSecond(), testDuration.getSeconds()
            );
        }
    }

    /**
     * Measure response time of a single request
     */
    protected long measureResponseTime(Supplier<MvcResult> requestSupplier) {
        long startTime = System.currentTimeMillis();
        try {
            requestSupplier.get();
        } catch (Exception e) {
            // Log error but still measure time
            System.err.println("Request failed: " + e.getMessage());
        }
        return System.currentTimeMillis() - startTime;
    }

    /**
     * Run load test with concurrent users
     */
    protected PerformanceResult runLoadTest(Supplier<MvcResult> requestSupplier, 
                                          Duration duration, int concurrentUsers) {
        List<Long> responseTimes = new CopyOnWriteArrayList<>();
        List<Exception> errors = new CopyOnWriteArrayList<>();
        
        long startTime = System.currentTimeMillis();
        long endTime = startTime + duration.toMillis();
        
        // Create tasks for concurrent execution
        List<Future<Void>> futures = new ArrayList<>();
        CountDownLatch startLatch = new CountDownLatch(1);
        
        for (int i = 0; i < concurrentUsers; i++) {
            futures.add(executorService.submit(() -> {
                try {
                    // Wait for all threads to be ready
                    startLatch.await();
                    
                    while (System.currentTimeMillis() < endTime) {
                        long requestStart = System.currentTimeMillis();
                        try {
                            requestSupplier.get();
                            long responseTime = System.currentTimeMillis() - requestStart;
                            responseTimes.add(responseTime);
                        } catch (Exception e) {
                            errors.add(e);
                            long responseTime = System.currentTimeMillis() - requestStart;
                            responseTimes.add(responseTime); // Still record time for failed requests
                        }
                        
                        // Small delay to prevent overwhelming the system
                        Thread.sleep(10);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    errors.add(e);
                }
                return null;
            }));
        }
        
        // Start all concurrent requests
        startLatch.countDown();
        
        // Wait for all tasks to complete
        for (Future<Void> future : futures) {
            try {
                future.get(duration.plusSeconds(10).toMillis(), TimeUnit.MILLISECONDS);
            } catch (Exception e) {
                errors.add(e);
            }
        }
        
        long actualDuration = System.currentTimeMillis() - startTime;
        return new PerformanceResult(responseTimes, errors, responseTimes.size(), 
                                   Duration.ofMillis(actualDuration));
    }

    /**
     * Run warmup requests to prepare the system
     */
    protected void warmup(Supplier<MvcResult> requestSupplier) {
        System.out.println("Starting warmup phase...");
        runLoadTest(requestSupplier, warmupDuration, Math.min(concurrentUsers, 3));
        System.out.println("Warmup completed");
    }

    /**
     * Assert performance meets threshold
     */
    protected void assertPerformanceThreshold(PerformanceResult result, long thresholdMs, String operation) {
        double avgResponseTime = result.getAverageResponseTime();
        long p95ResponseTime = result.getP95ResponseTime();
        
        System.out.printf("%s Performance Results:%n%s%n", operation, result);
        
        if (avgResponseTime > thresholdMs) {
            throw new AssertionError(
                String.format("%s average response time %.2fms exceeds threshold %dms", 
                    operation, avgResponseTime, thresholdMs)
            );
        }
        
        if (p95ResponseTime > thresholdMs * 2) { // P95 can be 2x threshold
            throw new AssertionError(
                String.format("%s P95 response time %dms exceeds threshold %dms", 
                    operation, p95ResponseTime, thresholdMs * 2)
            );
        }
        
        if (result.getSuccessRate() < 95.0) {
            throw new AssertionError(
                String.format("%s success rate %.2f%% is below 95%%", 
                    operation, result.getSuccessRate())
            );
        }
    }

    /**
     * Create timer for specific operation
     */
    protected Timer.Sample startTimer(String operationName) {
        return Timer.start(meterRegistry);
    }

    /**
     * Record timer result
     */
    protected void recordTimer(Timer.Sample sample, String operationName) {
        sample.stop(Timer.builder("api.response.time")
            .tag("operation", operationName)
            .register(meterRegistry));
    }

    /**
     * Generate performance report
     */
    protected void generatePerformanceReport(String testName, PerformanceResult result) {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("PERFORMANCE TEST REPORT: " + testName);
        System.out.println("=".repeat(60));
        System.out.println(result);
        System.out.println("=".repeat(60) + "\n");
    }
}
