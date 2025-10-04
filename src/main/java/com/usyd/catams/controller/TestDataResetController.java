package com.usyd.catams.controller;

import com.usyd.catams.service.TestDataResetService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Test-only controller that exposes a deterministic database reset hook.
 *
 * Active exclusively for test and E2E Spring profiles so automated suites can
 * clear state between runs without manual intervention.
 */
@RestController
@RequestMapping("/api/test-data")
@Profile({"test", "e2e", "e2e-local"})
public class TestDataResetController {

    private final TestDataResetService resetService;
    private final String resetToken;

    public TestDataResetController(TestDataResetService resetService,
                                   @Value("${app.testing.reset-token}") String resetToken) {
        this.resetService = resetService;
        this.resetToken = resetToken;
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetTestData(
        @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Invalid or missing reset token"
            ));
        }

        resetService.resetDatabase();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "resetAt", Instant.now().toString()
        ));
    }
}
