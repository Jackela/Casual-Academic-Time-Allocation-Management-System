package com.usyd.catams.controller;

import com.usyd.catams.service.TestDataSeedService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

/**
 * Test-only controller for seeding test data.
 *
 * <p><strong>WARNING:</strong> This controller is for testing purposes only and is
 * active exclusively for test and E2E Spring profiles. It should NEVER be enabled
 * in production environments.</p>
 *
 * <p>This controller provides endpoints for seeding test data including lecturer
 * resources, tutor assignments, and test accounts for deterministic E2E testing.</p>
 *
 * @author CAS Team
 * @since 1.0
 * @see TestDataSeedService
 */
@RestController
@RequestMapping("/api/test-data/seed")
@Profile({"test", "e2e"})
public class TestDataSeedController {

    private static final Logger logger = LoggerFactory.getLogger(TestDataSeedController.class);
    private final TestDataSeedService seedService;
    private final String resetToken;

    /**
     * Constructs a new TestDataSeedController.
     *
     * @param seedService the service for seeding test data
     * @param resetToken the token required for authorization (from app.testing.reset-token)
     * @throws IllegalStateException if resetToken is not configured
     */
    public TestDataSeedController(TestDataSeedService seedService,
                                  @Value("${app.testing.reset-token:}") String resetToken) {
        this.seedService = seedService;
        if (!StringUtils.hasText(resetToken)) {
            throw new IllegalStateException("Missing app.testing.reset-token configuration for test seed endpoint");
        }
        this.resetToken = resetToken;
    }

    /**
     * Request record for seeding lecturer resources.
     *
     * @param lecturerId the ID of the lecturer to seed resources for
     * @param seedTutors whether to also seed basic tutor accounts
     */
    public record LecturerSeedRequest(Long lecturerId, boolean seedTutors) {}

    /**
     * Seeds test resources for a lecturer including courses, tutors, and approval samples.
     *
     * <p>This endpoint creates a deterministic set of test data including:</p>
     * <ul>
     *   <li>Courses owned by the specified lecturer</li>
     *   <li>Basic tutor accounts (if seedTutors is true)</li>
     *   <li>Tutor assignments to the lecturer's courses</li>
     *   <li>Sample approval records for testing approval workflows</li>
     * </ul>
     *
     * @param providedToken the authorization token from the request header
     * @param body the seed request containing lecturerId and seedTutors flag
     * @return ResponseEntity with success status, seeded lecturer ID, and account manifest
     */
    @PostMapping("/lecturer-resources")
    public ResponseEntity<Map<String, Object>> seedLecturerResources(
            @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken,
            @RequestBody LecturerSeedRequest body
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            logger.warn("Rejected /api/test-data/seed/lecturer-resources due to invalid or missing reset token");
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

        logger.info("Accepted /api/test-data/seed/lecturer-resources for lecturerId={}", lecturerId);
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
     *
     * @param providedToken the authorization token from the request header
     * @return ResponseEntity with success status and list of test accounts
     */
    @GetMapping("/accounts")
    public ResponseEntity<Map<String, Object>> getAccounts(
            @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            logger.warn("Rejected /api/test-data/seed/accounts due to invalid or missing reset token");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Invalid or missing reset token"
            ));
        }
        logger.info("Accepted /api/test-data/seed/accounts request");
        List<Map<String, Object>> accounts = seedService.buildAccountManifest();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "accounts", accounts
        ));
    }

    /**
     * Request record for updating course ownership.
     *
     * @param courseCode the code of the course to update
     * @param lecturerId the ID of the lecturer to transfer ownership to
     */
    public record CourseOwnershipRequest(String courseCode, Long lecturerId) {}

    /**
     * Updates a course's lecturerId to transfer ownership to a different lecturer.
     *
     * <p>Used in E2E tests to set up proper course ownership for approval workflows.
     * This allows tests to dynamically assign course ownership without modifying
     * the database directly.</p>
     *
     * @param providedToken the authorization token from the request header
     * @param body the request containing courseCode and lecturerId
     * @return ResponseEntity with success status and updated ownership details
     */
    @PostMapping("/course-ownership")
    public ResponseEntity<Map<String, Object>> updateCourseOwnership(
            @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken,
            @RequestBody CourseOwnershipRequest body
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            logger.warn("Rejected /api/test-data/seed/course-ownership due to invalid or missing reset token");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Invalid or missing reset token"
            ));
        }

        if (body == null || body.courseCode() == null || body.lecturerId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "courseCode and lecturerId are required"
            ));
        }

        logger.info("Accepted /api/test-data/seed/course-ownership for courseCode={} lecturerId={}",
            body.courseCode(), body.lecturerId());
        boolean updated = seedService.updateCourseOwnership(body.courseCode(), body.lecturerId());
        if (!updated) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Course not found: " + body.courseCode()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "courseCode", body.courseCode(),
                "lecturerId", body.lecturerId()
        ));
    }
}

