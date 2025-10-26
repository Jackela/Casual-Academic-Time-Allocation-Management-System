package com.usyd.catams.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
        ResponseEntity<com.usyd.catams.dto.response.ErrorResponse> resp = handler.handleBusinessException(ex, req);

        assertThat(resp.getStatusCode().is4xxClientError()).isTrue();
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getTimestamp()).isEqualTo("2025-08-12T00:00:00Z");
        assertThat(resp.getBody().getPath()).isEqualTo("/api/test");
    }
}

