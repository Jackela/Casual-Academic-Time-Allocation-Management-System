package com.usyd.catams.controller;

import com.usyd.catams.service.TestDataSeedService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test-data/seed")
@Profile({"test", "e2e", "e2e-local"})
public class TestDataSeedController {

    private final TestDataSeedService seedService;
    private final String resetToken;

    public TestDataSeedController(TestDataSeedService seedService,
                                  @Value("${app.testing.reset-token:}") String resetToken) {
        this.seedService = seedService;
        if (!StringUtils.hasText(resetToken)) {
            throw new IllegalStateException("Missing app.testing.reset-token configuration for test seed endpoint");
        }
        this.resetToken = resetToken;
    }

    public record LecturerSeedRequest(Long lecturerId, boolean seedTutors) {}

    @PostMapping("/lecturer-resources")
    public ResponseEntity<Map<String, Object>> seedLecturerResources(
            @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken,
            @RequestBody LecturerSeedRequest body
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Invalid or missing reset token"
            ));
        }

        Long lecturerId = body != null ? body.lecturerId() : null;
        if (lecturerId == null || lecturerId <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "lecturerId must be provided and > 0"
            ));
        }

        seedService.ensureLecturerCourses(lecturerId);
        if (body != null && body.seedTutors()) {
            seedService.ensureBasicTutors();
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "seeded", true,
                "lecturerId", lecturerId
        ));
    }
}

