package com.usyd.catams.controller;

import com.usyd.catams.service.TestDataSeedService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
        // Normalize to the canonical lecturer user id to avoid mismatched ownership
        Long resolvedLecturerId = seedService.resolveLecturerId(lecturerId);
        if (resolvedLecturerId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Unable to resolve lecturer id for seeding"
            ));
        }
        if (lecturerId == null || lecturerId <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "lecturerId must be provided and > 0"
            ));
        }

        seedService.ensureLecturerCourses(resolvedLecturerId);
        if (body != null && body.seedTutors()) {
            seedService.ensureBasicTutors();
        }
        // Ensure tutors are assigned to lecturer's courses for deterministic approval flows
        seedService.ensureTutorAssignmentsForLecturerCourses(resolvedLecturerId);
        // Seed minimal approval samples so queues/pages are usable in E2E
        seedService.ensureMinimalApprovalSamples(resolvedLecturerId);
        // Ensure baseline admin/lecturer exist for UAT
        seedService.ensureBasicAdmin();
        seedService.ensureBasicLecturer();
        List<Map<String, Object>> accounts = seedService.buildAccountManifest();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "seeded", true,
                "lecturerId", resolvedLecturerId,
                "accounts", accounts
        ));
    }

    /**
     * Returns a manifest of baseline test accounts (role, email, id, password hint).
     */
    @GetMapping("/accounts")
    public ResponseEntity<Map<String, Object>> getAccounts(
            @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Invalid or missing reset token"
            ));
        }
        List<Map<String, Object>> accounts = seedService.buildAccountManifest();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "accounts", accounts
        ));
    }
}

