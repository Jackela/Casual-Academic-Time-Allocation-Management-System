package com.usyd.catams.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    @DisplayName("timestamps use injected Clock")
    void timestampsUseInjectedClock() {
        Clock fixed = Clock.fixed(Instant.parse("2025-08-12T00:00:00Z"), ZoneOffset.UTC);
        GlobalExceptionHandler handler = new GlobalExceptionHandler(fixed);
        HttpServletRequest req = new MockHttpServletRequest("GET", "/api/test");

        BusinessException ex = new BusinessException("VALIDATION_FAILED", "bad state");
        ResponseEntity<ProblemDetail> resp = handler.handleBusinessException(ex, req);

        assertThat(resp.getStatusCode().is4xxClientError()).isTrue();
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getProperties().get("timestamp")).isEqualTo("2025-08-12T00:00:00Z");
        assertThat(resp.getBody().getProperties().get("path")).isEqualTo("/api/test");
        assertThat(resp.getBody().getProperties().get("error")).isEqualTo("VALIDATION_FAILED");
        assertThat(resp.getBody().getDetail()).isEqualTo("bad state");
    }
}

