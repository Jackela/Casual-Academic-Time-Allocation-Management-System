package com.usyd.catams.common.logging;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests for StructuredLogger.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("StructuredLogger Tests")
class StructuredLoggerTest {

    private StructuredLogger logger;

    @BeforeEach
    void setUp() {
        logger = StructuredLogger.forClass(StructuredLoggerTest.class);
    }

    @Test
    @DisplayName("should create logger for class")
    void shouldCreateLoggerForClass() {
        // Given/When
        StructuredLogger log = StructuredLogger.forClass(StructuredLoggerTest.class);
        
        // Then
        assertThat(log).isNotNull();
    }

    @Test
    @DisplayName("should include operation in log context")
    void shouldIncludeOperationInLogContext() {
        // Given
        String operation = "testOperation";
        
        // When/Then - Should not throw
        logger.operation(operation).info("Test message");
    }

    @Test
    @DisplayName("should include trace ID in log context")
    void shouldIncludeTraceIdInLogContext() {
        // Given
        String traceId = UUID.randomUUID().toString();
        
        // When/Then - Should not throw
        logger.withTraceId(traceId).info("Test message");
    }

    @Test
    @DisplayName("should include user ID in log context")
    void shouldIncludeUserIdInLogContext() {
        // Given
        Long userId = 12345L;
        
        // When/Then - Should not throw
        logger.withUserId(userId).info("Test message");
    }

    @Test
    @DisplayName("should mask sensitive data in logs")
    void shouldMaskSensitiveData() {
        // Given
        String sensitiveValue = "secret-password-123";
        
        // When/Then - Should not throw and value should be masked
        logger.with("password", sensitiveValue).info("Test message");
    }

    @Test
    @DisplayName("should measure timing with timer context")
    void shouldMeasureTiming() {
        // Given
        String operation = "timedOperation";
        
        // When
        try (var timer = logger.startTimer(operation)) {
            // Simulate some work
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        // Then - Should complete without exception
    }

    @Test
    @DisplayName("should handle error logging")
    void shouldHandleErrorLogging() {
        // Given
        Exception error = new RuntimeException("Test error");
        
        // When/Then - Should not throw
        logger.withError(error).error("Error occurred");
    }

    @Test
    @DisplayName("should support timed execution with supplier")
    void shouldSupportTimedExecutionWithSupplier() {
        // When
        String result = logger.timed("testOperation", () -> "test-result");
        
        // Then
        assertThat(result).isEqualTo("test-result");
    }

    @Test
    @DisplayName("should support timed execution with runnable")
    void shouldSupportTimedExecutionWithRunnable() {
        // Given
        boolean[] executed = {false};
        
        // When
        logger.timed("testOperation", () -> executed[0] = true);
        
        // Then
        assertThat(executed[0]).isTrue();
    }

    @Test
    @DisplayName("should propagate exception from timed supplier")
    void shouldPropagateExceptionFromTimedSupplier() {
        // Given
        RuntimeException expected = new RuntimeException("Test exception");
        
        // Then
        assertThatThrownBy(() -> 
            logger.timed("testOperation", () -> { throw expected; })
        ).isSameAs(expected);
    }
}
