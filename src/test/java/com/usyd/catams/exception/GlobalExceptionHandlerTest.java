package com.usyd.catams.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2025-08-12T00:00:00Z"), ZoneOffset.UTC);
    private static final String EXPECTED_TIMESTAMP = "2025-08-12T00:00:00Z";

    private GlobalExceptionHandler handler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler(FIXED_CLOCK);
        request = new MockHttpServletRequest("GET", "/api/test");
    }

    @Test
    @DisplayName("timestamps use injected Clock")
    void timestampsUseInjectedClock() {
        BusinessException ex = new BusinessException("VALIDATION_FAILED", "bad state");
        ResponseEntity<ProblemDetail> resp = handler.handleBusinessException(ex, request);

        assertThat(resp.getStatusCode().is4xxClientError()).isTrue();
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getProperties().get("timestamp")).isEqualTo(EXPECTED_TIMESTAMP);
        assertThat(resp.getBody().getProperties().get("path")).isEqualTo("/api/test");
        assertThat(resp.getBody().getProperties().get("error")).isEqualTo("VALIDATION_FAILED");
        assertThat(resp.getBody().getDetail()).isEqualTo("bad state");
    }

    @Nested
    @DisplayName("ResourceNotFoundException handling")
    class ResourceNotFoundExceptionTests {

        @Test
        @DisplayName("should return 404 NOT_FOUND for ResourceNotFoundException")
        void shouldReturn404ForResourceNotFoundException() {
            ResourceNotFoundException ex = new ResourceNotFoundException("Timesheet", "123");
            ResponseEntity<ProblemDetail> resp = handler.handleResourceNotFoundException(ex, request);

            assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }

        @Test
        @DisplayName("should include error code RESOURCE_NOT_FOUND in ProblemDetail")
        void shouldIncludeResourceNotFoundErrorCode() {
            ResourceNotFoundException ex = new ResourceNotFoundException("User", "456");
            ResponseEntity<ProblemDetail> resp = handler.handleResourceNotFoundException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getProperties().get("error")).isEqualTo("RESOURCE_NOT_FOUND");
        }

        @Test
        @DisplayName("should include exception message in ProblemDetail detail")
        void shouldIncludeExceptionMessageInDetail() {
            ResourceNotFoundException ex = new ResourceNotFoundException("Course", "789", "Custom not found message");
            ResponseEntity<ProblemDetail> resp = handler.handleResourceNotFoundException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getDetail()).isEqualTo("Custom not found message");
        }

        @Test
        @DisplayName("should verify RFC-7807 ProblemDetail format")
        void shouldVerifyRfc7807Format() {
            ResourceNotFoundException ex = new ResourceNotFoundException("Timesheet", "123");
            ResponseEntity<ProblemDetail> resp = handler.handleResourceNotFoundException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            ProblemDetail problem = resp.getBody();

            // RFC-7807 required fields
            assertThat(problem.getStatus()).isEqualTo(404);
            assertThat(problem.getDetail()).isNotNull();
            assertThat(problem.getType()).isNotNull();
            assertThat(problem.getType().toString()).startsWith("urn:catams:error:");

            // CATAMS-specific properties
            assertThat(problem.getProperties().get("timestamp")).isEqualTo(EXPECTED_TIMESTAMP);
            assertThat(problem.getProperties().get("path")).isEqualTo("/api/test");
            assertThat(problem.getProperties().get("traceId")).isNotNull();
            assertThat(problem.getProperties().get("success")).isEqualTo(false);
        }

        @Test
        @DisplayName("should set correct Content-Type header")
        void shouldSetCorrectContentType() {
            ResourceNotFoundException ex = new ResourceNotFoundException("Timesheet", "123");
            ResponseEntity<ProblemDetail> resp = handler.handleResourceNotFoundException(ex, request);

            assertThat(resp.getHeaders().getContentType()).isNotNull();
            assertThat(resp.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)).isTrue();
        }
    }

    @Nested
    @DisplayName("BusinessRuleException handling")
    class BusinessRuleExceptionTests {

        @Test
        @DisplayName("should return 400 BAD_REQUEST for BusinessRuleException")
        void shouldReturn400ForBusinessRuleException() {
            BusinessRuleException ex = new BusinessRuleException("Cannot modify approved timesheet");
            ResponseEntity<ProblemDetail> resp = handler.handleBusinessRuleException(ex, request);

            assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @Test
        @DisplayName("should include error code in ProblemDetail")
        void shouldIncludeErrorCodeInProblemDetail() {
            BusinessRuleException ex = new BusinessRuleException("Invalid status transition", "INVALID_STATUS_TRANSITION");
            ResponseEntity<ProblemDetail> resp = handler.handleBusinessRuleException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getProperties().get("error")).isEqualTo("INVALID_STATUS_TRANSITION");
        }

        @Test
        @DisplayName("should use default error code when not specified")
        void shouldUseDefaultErrorCode() {
            BusinessRuleException ex = new BusinessRuleException("Business rule violated");
            ResponseEntity<ProblemDetail> resp = handler.handleBusinessRuleException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getProperties().get("error")).isEqualTo("BUSINESS_RULE_VIOLATION");
        }

        @Test
        @DisplayName("should include exception message in ProblemDetail detail")
        void shouldIncludeExceptionMessageInDetail() {
            BusinessRuleException ex = new BusinessRuleException("Timesheet cannot be edited in APPROVED status");
            ResponseEntity<ProblemDetail> resp = handler.handleBusinessRuleException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getDetail()).isEqualTo("Timesheet cannot be edited in APPROVED status");
        }

        @Test
        @DisplayName("should verify RFC-7807 ProblemDetail format")
        void shouldVerifyRfc7807Format() {
            BusinessRuleException ex = new BusinessRuleException("Test business rule", "TEST_ERROR");
            ResponseEntity<ProblemDetail> resp = handler.handleBusinessRuleException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            ProblemDetail problem = resp.getBody();

            // RFC-7807 required fields
            assertThat(problem.getStatus()).isEqualTo(400);
            assertThat(problem.getDetail()).isNotNull();
            assertThat(problem.getType()).isNotNull();
            assertThat(problem.getType().toString()).startsWith("urn:catams:error:");

            // CATAMS-specific properties
            assertThat(problem.getProperties().get("timestamp")).isEqualTo(EXPECTED_TIMESTAMP);
            assertThat(problem.getProperties().get("path")).isEqualTo("/api/test");
            assertThat(problem.getProperties().get("traceId")).isNotNull();
            assertThat(problem.getProperties().get("success")).isEqualTo(false);
        }

        @Test
        @DisplayName("should set correct Content-Type header")
        void shouldSetCorrectContentType() {
            BusinessRuleException ex = new BusinessRuleException("Test rule");
            ResponseEntity<ProblemDetail> resp = handler.handleBusinessRuleException(ex, request);

            assertThat(resp.getHeaders().getContentType()).isNotNull();
            assertThat(resp.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)).isTrue();
        }
    }

    @Nested
    @DisplayName("AuthorizationException handling")
    class AuthorizationExceptionTests {

        @Test
        @DisplayName("should return 403 FORBIDDEN for AuthorizationException")
        void shouldReturn403ForAuthorizationException() {
            AuthorizationException ex = new AuthorizationException("User not authorized to access this resource");
            ResponseEntity<ProblemDetail> resp = handler.handleAuthorizationException(ex, request);

            assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }

        @Test
        @DisplayName("should include error code in ProblemDetail")
        void shouldIncludeErrorCodeInProblemDetail() {
            AuthorizationException ex = new AuthorizationException("Access denied", "CROSS_COURSE_ACCESS_DENIED");
            ResponseEntity<ProblemDetail> resp = handler.handleAuthorizationException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getProperties().get("error")).isEqualTo("CROSS_COURSE_ACCESS_DENIED");
        }

        @Test
        @DisplayName("should use default error code when not specified")
        void shouldUseDefaultErrorCode() {
            AuthorizationException ex = new AuthorizationException("Permission denied");
            ResponseEntity<ProblemDetail> resp = handler.handleAuthorizationException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getProperties().get("error")).isEqualTo("AUTHORIZATION_FAILED");
        }

        @Test
        @DisplayName("should include exception message in ProblemDetail detail")
        void shouldIncludeExceptionMessageInDetail() {
            AuthorizationException ex = new AuthorizationException("Tutor cannot access other tutor's timesheet");
            ResponseEntity<ProblemDetail> resp = handler.handleAuthorizationException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            assertThat(resp.getBody().getDetail()).isEqualTo("Tutor cannot access other tutor's timesheet");
        }

        @Test
        @DisplayName("should verify RFC-7807 ProblemDetail format")
        void shouldVerifyRfc7807Format() {
            AuthorizationException ex = new AuthorizationException("Test authorization failure", "TEST_AUTH_ERROR");
            ResponseEntity<ProblemDetail> resp = handler.handleAuthorizationException(ex, request);

            assertThat(resp.getBody()).isNotNull();
            ProblemDetail problem = resp.getBody();

            // RFC-7807 required fields
            assertThat(problem.getStatus()).isEqualTo(403);
            assertThat(problem.getDetail()).isNotNull();
            assertThat(problem.getType()).isNotNull();
            assertThat(problem.getType().toString()).startsWith("urn:catams:error:");

            // CATAMS-specific properties
            assertThat(problem.getProperties().get("timestamp")).isEqualTo(EXPECTED_TIMESTAMP);
            assertThat(problem.getProperties().get("path")).isEqualTo("/api/test");
            assertThat(problem.getProperties().get("traceId")).isNotNull();
            assertThat(problem.getProperties().get("success")).isEqualTo(false);
        }

        @Test
        @DisplayName("should set correct Content-Type header")
        void shouldSetCorrectContentType() {
            AuthorizationException ex = new AuthorizationException("Test authorization");
            ResponseEntity<ProblemDetail> resp = handler.handleAuthorizationException(ex, request);

            assertThat(resp.getHeaders().getContentType()).isNotNull();
            assertThat(resp.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)).isTrue();
        }
    }
}

