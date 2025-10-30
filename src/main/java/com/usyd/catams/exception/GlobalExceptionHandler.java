package com.usyd.catams.exception;

import com.usyd.catams.config.TelemetryConfig;
import com.usyd.catams.service.Schedule1PolicyProvider;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Global exception handler for centralized error handling.
 *
 * Produces RFC-7807 compliant Problem Details responses with CATAMS-specific metadata.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final Clock clock;

    public GlobalExceptionHandler(Clock clock) {
        this.clock = (clock != null ? clock : Clock.systemUTC());
    }

    private record TraceContextIds(String traceId, String spanId) {}

    private TraceContextIds resolveTraceContext(HttpServletRequest request) {
        String header = request.getHeader("X-Request-Id");
        Object requestTrace = request.getAttribute(TelemetryConfig.TRACE_ID_REQUEST_ATTRIBUTE);
        Object requestSpan = request.getAttribute(TelemetryConfig.SPAN_ID_REQUEST_ATTRIBUTE);
        SpanContext context = Span.current().getSpanContext();

        String spanId = null;
        if (requestSpan instanceof String s && !s.isBlank()) {
            spanId = s;
        } else if (context != null && context.isValid()) {
            spanId = context.getSpanId();
        }

        if (header != null && !header.isBlank()) {
            return new TraceContextIds(header, spanId);
        }

        if (requestTrace instanceof String trace && !trace.isBlank()) {
            return new TraceContextIds(trace, spanId);
        }

        if (context != null && context.isValid()) {
            return new TraceContextIds(context.getTraceId(), context.getSpanId());
        }

        return new TraceContextIds(UUID.randomUUID().toString(), spanId);
    }

    private ProblemDetail buildProblemDetail(HttpStatus status, String errorCode, String detail, HttpServletRequest request) {
        TraceContextIds traceIds = resolveTraceContext(request);
        String resolvedDetail = (detail == null || detail.isBlank()) ? status.getReasonPhrase() : detail;
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, resolvedDetail);
        problem.setTitle(status.getReasonPhrase());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setType(URI.create("urn:catams:error:" + errorCode.toLowerCase()));
        problem.setProperty("timestamp", Instant.now(clock).toString());
        problem.setProperty("path", request.getRequestURI());
        problem.setProperty("error", errorCode);
        problem.setProperty("success", false);
        problem.setProperty("traceId", traceIds.traceId());
        if (traceIds.spanId() != null && !traceIds.spanId().isBlank()) {
            problem.setProperty("spanId", traceIds.spanId());
        }
        problem.setProperty("message", resolvedDetail);
        return problem;
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ProblemDetail> handleBusinessException(BusinessException e, HttpServletRequest request) {
        logger.warn("Business exception: {} - {}", e.getErrorCode(), e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.BAD_REQUEST, e.getErrorCode(), e.getMessage(), request);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthenticationException(AuthenticationException e, HttpServletRequest request) {
        logger.warn("Authentication exception: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.UNAUTHORIZED, ErrorCodes.AUTH_FAILED, "Authentication failed", request);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDeniedException(AccessDeniedException e, HttpServletRequest request) {
        logger.warn("Access denied exception: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.FORBIDDEN, ErrorCodes.ACCESS_DENIED, "Access denied", request);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(BusinessConflictException.class)
    public ResponseEntity<ProblemDetail> handleBusinessConflict(BusinessConflictException e, HttpServletRequest request) {
        logger.warn("Business conflict: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.CONFLICT, e.getErrorCode(), e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(AuthorizationException.class)
    public ResponseEntity<ProblemDetail> handleAuthorizationException(AuthorizationException e, HttpServletRequest request) {
        logger.warn("Authorization failure: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.FORBIDDEN, e.getErrorCode(), e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ProblemDetail> handleSecurityException(SecurityException e, HttpServletRequest request) {
        logger.warn("Security exception: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.FORBIDDEN, ErrorCodes.ACCESS_DENIED, e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> handleIllegalArgumentException(IllegalArgumentException e, HttpServletRequest request) {
        logger.warn("Illegal argument exception: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ProblemDetail> handleBusinessRuleException(BusinessRuleException e, HttpServletRequest request) {
        logger.warn("Business rule violation: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.BAD_REQUEST, e.getErrorCode(), e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ProblemDetail> handleIllegalStateException(IllegalStateException e, HttpServletRequest request) {
        logger.warn("Illegal state exception: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationException(MethodArgumentNotValidException e, HttpServletRequest request) {
        List<String> errors = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.toList());

        String message = "Validation failed: " + String.join(", ", errors);
        logger.warn("Validation exception: {}", message);
        ProblemDetail problem = buildProblemDetail(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, message, request);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolationException(ConstraintViolationException e, HttpServletRequest request) {
        String message = "Validation failed: " + e.getMessage();
        logger.warn("Constraint violation: {}", message);
        ProblemDetail problem = buildProblemDetail(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, message, request);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleHttpMessageNotReadableException(HttpMessageNotReadableException e, HttpServletRequest request) {
        String message = "Invalid request body";
        logger.warn("Message not readable: {}", message);
        ProblemDetail problem = buildProblemDetail(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, message, request);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFoundException(ResourceNotFoundException e, HttpServletRequest request) {
        logger.warn("Resource not found: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.NOT_FOUND, ErrorCodes.RESOURCE_NOT_FOUND, e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(Schedule1PolicyProvider.RatePolicyNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleRatePolicyMissing(Schedule1PolicyProvider.RatePolicyNotFoundException e, HttpServletRequest request) {
        logger.error("Schedule 1 policy lookup failed: {}", e.getMessage());
        ProblemDetail problem = buildProblemDetail(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR, e.getMessage(), request);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGenericException(Exception e, HttpServletRequest request) {
        logger.error("System exception: {}", e.getMessage(), e);
        ProblemDetail problem = buildProblemDetail(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR, "Internal server error, please try again later", request);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}
