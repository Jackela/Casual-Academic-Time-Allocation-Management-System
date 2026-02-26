package com.usyd.catams.common.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Structured logging utility providing consistent log formatting across CATAMS.
 * 
 * <p>Features:</p>
 * <ul>
 *   <li>Structured key-value logging</li>
 *   <li>Trace ID propagation</li>
 *   <li>Performance timing helpers</li>
 *   <li>Security-aware logging (sensitive data masking)</li>
 * </ul>
 * 
 * <p>Usage example:</p>
 * <pre>{@code
 * private static final StructuredLogger log = StructuredLogger.forClass(MyService.class);
 * 
 * public void processTimesheet(Long timesheetId, Long userId) {
 *     log.info("Processing timesheet")
 *         .with("timesheetId", timesheetId)
 *         .with("userId", userId)
 *         .log();
 * }
 * }</pre>
 * 
 * @author Development Team
 * @since 1.0
 */
public final class StructuredLogger {

    private static final String TRACE_ID_KEY = "traceId";
    private static final String SPAN_ID_KEY = "spanId";
    private static final String USER_ID_KEY = "userId";
    private static final String CORRELATION_ID_KEY = "correlationId";
    
    private static final Clock clock = Clock.systemUTC();

    private final Logger delegate;
    private final Map<String, Object> context;
    private String operation;
    private Throwable error;

    private StructuredLogger(Logger delegate) {
        this.delegate = delegate;
        this.context = new ConcurrentHashMap<>();
    }

    /**
     * Creates a StructuredLogger for the specified class.
     * 
     * @param clazz the class to create a logger for
     * @return a new StructuredLogger instance
     */
    public static StructuredLogger forClass(Class<?> clazz) {
        return new StructuredLogger(LoggerFactory.getLogger(clazz));
    }

    /**
     * Sets the operation name for this log entry.
     * 
     * @param operation the operation being performed
     * @return this logger instance for chaining
     */
    public StructuredLogger operation(String operation) {
        this.operation = operation;
        return this;
    }

    /**
     * Adds a key-value pair to the log context.
     * 
     * @param key the key name
     * @param value the value
     * @return this logger instance for chaining
     */
    public StructuredLogger with(String key, Object value) {
        if (key != null && value != null) {
            context.put(key, maskIfNeeded(key, value));
        }
        return this;
    }

    /**
     * Adds the trace ID to the log context.
     * 
     * @param traceId the trace ID
     * @return this logger instance for chaining
     */
    public StructuredLogger withTraceId(String traceId) {
        if (traceId != null) {
            MDC.put(TRACE_ID_KEY, traceId);
            context.put(TRACE_ID_KEY, traceId);
        }
        return this;
    }

    /**
     * Adds the user ID to the log context.
     * 
     * @param userId the user ID
     * @return this logger instance for chaining
     */
    public StructuredLogger withUserId(Long userId) {
        if (userId != null) {
            MDC.put(USER_ID_KEY, String.valueOf(userId));
            context.put(USER_ID_KEY, userId);
        }
        return this;
    }

    /**
     * Adds an error to the log context.
     * 
     * @param throwable the error
     * @return this logger instance for chaining
     */
    public StructuredLogger withError(Throwable throwable) {
        this.error = throwable;
        return this;
    }

    /**
     * Adds timing information to the log context.
     * 
     * @param startTimeMs the start time in milliseconds
     * @return this logger instance for chaining
     */
    public StructuredLogger withTiming(long startTimeMs) {
        long duration = System.currentTimeMillis() - startTimeMs;
        context.put("durationMs", duration);
        return this;
    }

    /**
     * Logs at INFO level.
     */
    public void info(String message) {
        if (delegate.isInfoEnabled()) {
            delegate.info(formatMessage(message));
        }
        cleanup();
    }

    /**
     * Logs at WARN level.
     */
    public void warn(String message) {
        if (delegate.isWarnEnabled()) {
            delegate.warn(formatMessage(message));
        }
        cleanup();
    }

    /**
     * Logs at WARN level with exception.
     */
    public void warn(String message, Throwable throwable) {
        if (delegate.isWarnEnabled()) {
            delegate.warn(formatMessage(message), throwable);
        }
        cleanup();
    }

    /**
     * Logs at ERROR level.
     */
    public void error(String message) {
        if (delegate.isErrorEnabled()) {
            delegate.error(formatMessage(message));
        }
        cleanup();
    }

    /**
     * Logs at ERROR level with exception.
     */
    public void error(String message, Throwable throwable) {
        if (delegate.isErrorEnabled()) {
            delegate.error(formatMessage(message), throwable);
        }
        cleanup();
    }

    /**
     * Logs at DEBUG level.
     */
    public void debug(String message) {
        if (delegate.isDebugEnabled()) {
            delegate.debug(formatMessage(message));
        }
        cleanup();
    }

    /**
     * Logs at TRACE level.
     */
    public void trace(String message) {
        if (delegate.isTraceEnabled()) {
            delegate.trace(formatMessage(message));
        }
        cleanup();
    }

    /**
     * Creates a timing context for measuring operation duration.
     * 
     * @param operationName the name of the operation
     * @return a TimingContext that logs duration when closed
     */
    public TimingContext startTimer(String operationName) {
        return new TimingContext(this, operationName, System.currentTimeMillis());
    }

    private String formatMessage(String message) {
        StringBuilder sb = new StringBuilder();
        sb.append("[").append(Instant.now(clock)).append("] ");
        sb.append(message);
        
        if (operation != null) {
            sb.append(" | op=").append(operation);
        }
        
        if (!context.isEmpty()) {
            context.forEach((key, value) -> {
                sb.append(" | ").append(key).append("=").append(value);
            });
        }
        
        return sb.toString();
    }

    private void cleanup() {
        MDC.remove(TRACE_ID_KEY);
        MDC.remove(SPAN_ID_KEY);
        MDC.remove(USER_ID_KEY);
        MDC.remove(CORRELATION_ID_KEY);
        context.clear();
        operation = null;
        error = null;
    }

    private static Object maskIfNeeded(String key, Object value) {
        String keyLower = key.toLowerCase();
        if (keyLower.contains("password") || keyLower.contains("secret") 
                || keyLower.contains("token") || keyLower.contains("key")) {
            return "***MASKED***";
        }
        return value;
    }

    /**
     * Timing context for measuring and logging operation duration.
     */
    public static final class TimingContext implements AutoCloseable {
        private final StructuredLogger logger;
        private final String operationName;
        private final long startTime;
        private boolean logged = false;

        private TimingContext(StructuredLogger logger, String operationName, long startTime) {
            this.logger = logger;
            this.operationName = operationName;
            this.startTime = startTime;
        }

        /**
         * Logs the timing result and closes the context.
         */
        @Override
        public void close() {
            if (!logged) {
                logged = true;
                long duration = System.currentTimeMillis() - startTime;
                logger.operation(operationName)
                      .with("durationMs", duration)
                      .debug("Operation completed");
            }
        }

        /**
         * Logs a successful completion message.
         */
        public void success() {
            logged = true;
            long duration = System.currentTimeMillis() - startTime;
            logger.operation(operationName)
                  .with("durationMs", duration)
                  .with("status", "success")
                  .info("Operation completed successfully");
        }

        /**
         * Logs a failure completion message.
         */
        public void failure(String errorMessage) {
            logged = true;
            long duration = System.currentTimeMillis() - startTime;
            logger.operation(operationName)
                  .with("durationMs", duration)
                  .with("status", "failure")
                  .with("error", errorMessage)
                  .warn("Operation failed");
        }

        /**
         * Logs a failure completion message with exception.
         */
        public void failure(Throwable throwable) {
            logged = true;
            long duration = System.currentTimeMillis() - startTime;
            logger.operation(operationName)
                  .with("durationMs", duration)
                  .with("status", "failure")
                  .withError(throwable)
                  .error("Operation failed");
        }
    }

    /**
     * Executes a supplier with timing and logging.
     * 
     * @param <T> the return type
     * @param operationName the operation name
     * @param supplier the operation to execute
     * @return the result of the operation
     */
    public <T> T timed(String operationName, Supplier<T> supplier) {
        try (TimingContext timer = startTimer(operationName)) {
            try {
                T result = supplier.get();
                timer.success();
                return result;
            } catch (Exception e) {
                timer.failure(e);
                throw e;
            }
        }
    }

    /**
     * Executes a runnable with timing and logging.
     * 
     * @param operationName the operation name
     * @param runnable the operation to execute
     */
    public void timed(String operationName, Runnable runnable) {
        try (TimingContext timer = startTimer(operationName)) {
            try {
                runnable.run();
                timer.success();
            } catch (Exception e) {
                timer.failure(e);
                throw e;
            }
        }
    }
}
