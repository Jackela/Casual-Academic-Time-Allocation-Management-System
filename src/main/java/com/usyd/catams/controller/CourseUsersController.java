package com.usyd.catams.controller;

import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.e2e.E2EAssignmentState;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.usyd.catams.policy.AuthenticationFacade;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

/**
 * REST controller for course-related user endpoints.
 *
 * <p>This controller provides endpoints for retrieving user information
 * associated with courses, such as tutor assignments. It is primarily used
 * for API-alignment E2E tests and course management functionality.</p>
 *
 * <p>Authorization is enforced at both the method level (via {@code @PreAuthorize})
 * and through additional runtime checks to ensure users can only access
 * data for courses they are assigned to.</p>
 *
 * @author CAS Team
 * @since 1.0
 */
@RestController
@RequestMapping("/api/courses")
public class CourseUsersController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CourseUsersController.class);

    private final TutorAssignmentRepository tutorAssignmentRepository;
    private final LecturerAssignmentRepository lecturerAssignmentRepository;
    private final E2EAssignmentState e2eState; // may be null outside e2e-local
    private final Environment environment; // may be null in some contexts
    private final AuthenticationFacade authenticationFacade;

    /**
     * Constructs a new CourseUsersController with required dependencies.
     *
     * @param tutorAssignmentRepository repository for tutor assignment data
     * @param lecturerAssignmentRepository repository for lecturer assignment data
     * @param authenticationFacade facade for accessing authentication context
     * @param e2eState optional E2E assignment state for deterministic testing
     * @param environment optional Spring environment for profile checks
     */
    public CourseUsersController(TutorAssignmentRepository tutorAssignmentRepository,
                                 LecturerAssignmentRepository lecturerAssignmentRepository,
                                 AuthenticationFacade authenticationFacade,
                                 @org.springframework.beans.factory.annotation.Autowired(required = false) E2EAssignmentState e2eState,
                                 @org.springframework.beans.factory.annotation.Autowired(required = false) Environment environment) {
        this.tutorAssignmentRepository = tutorAssignmentRepository;
        this.lecturerAssignmentRepository = lecturerAssignmentRepository;
        this.e2eState = e2eState;
        this.environment = environment;
        this.authenticationFacade = authenticationFacade;
    }

    /**
     * Lists all tutor IDs assigned to a specific course.
     *
     * <p>This endpoint returns the list of tutor user IDs who are assigned
     * to the specified course. Access is restricted to ADMIN and LECTURER roles,
     * with additional verification that lecturers are assigned to the course.</p>
     *
     * @param courseId the ID of the course to retrieve tutors for
     * @param request the HTTP servlet request for authorization header access
     * @return ResponseEntity containing a map with "tutorIds" key and list of tutor IDs,
     *         or 401 if unauthorized, or 403 if forbidden
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('LECTURER')")
    @GetMapping("/{courseId}/tutors")
    public ResponseEntity<Map<String, List<Long>>> listTutorIdsForCourse(@PathVariable("courseId") Long courseId, HttpServletRequest request) {
        String authz = request.getHeader("Authorization");
        if (authz == null || authz.isBlank()) {
            return ResponseEntity.status(401).build();
        }
        Long userId;
        java.util.Collection<String> roles;
        try {
            userId = authenticationFacade.getCurrentUserId();
            roles = authenticationFacade.getCurrentUserRoles();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(401).build();
        }

        boolean isAdmin = roles.contains("ROLE_ADMIN");
        boolean isLecturer = roles.contains("ROLE_LECTURER");
        boolean isTutor = roles.contains("ROLE_TUTOR");

        if (isTutor && !isAdmin) {
            return ResponseEntity.status(403).build();
        }
        if (isLecturer && !isAdmin) {
            boolean assigned = false;
            // Prefer in-memory assignment state when available to keep E2E deterministic
            if (e2eState != null) {
                try { assigned = e2eState.getLecturerCourses(userId).contains(courseId); } catch (Exception ignored) {}
            }
            if (!assigned) {
                try { assigned = lecturerAssignmentRepository.existsByLecturerIdAndCourseId(userId, courseId); } catch (Exception ignored) {}
            }
            if (!assigned) {
                return ResponseEntity.status(403).build();
            }
        }
        if (!isAdmin && !isLecturer) {
            // Any other role or anonymous should be forbidden for this endpoint
            return ResponseEntity.status(403).build();
        }

        try {
            var items = tutorAssignmentRepository.findByCourseIdIn(java.util.List.of(courseId));
            var ids = items.stream().map(com.usyd.catams.entity.TutorAssignment::getTutorId).distinct().toList();
            return ResponseEntity.ok(Map.of("tutorIds", ids));
        } catch (Exception ex) {
            log.warn("Failed to load tutors for course {}: {}", courseId, ex.toString());
            // Prefer empty list on repository issues to avoid leaking stacktraces in E2E
            return ResponseEntity.ok(Map.of("tutorIds", java.util.List.of()));
        }
    }

}
