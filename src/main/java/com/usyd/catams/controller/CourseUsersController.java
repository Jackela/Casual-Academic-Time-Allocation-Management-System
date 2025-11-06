package com.usyd.catams.controller;

import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.e2e.E2EAssignmentState;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

/**
 * Course-related user endpoints used for API-alignment E2E tests.
 */
@RestController
@RequestMapping("/api/courses")
public class CourseUsersController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CourseUsersController.class);

    private final TutorAssignmentRepository tutorAssignmentRepository;
    private final LecturerAssignmentRepository lecturerAssignmentRepository;
    private final E2EAssignmentState e2eState; // may be null outside e2e-local
    private final Environment environment; // may be null in some contexts

    public CourseUsersController(TutorAssignmentRepository tutorAssignmentRepository,
                                 LecturerAssignmentRepository lecturerAssignmentRepository,
                                 E2EAssignmentState e2eState,
                                 Environment environment) {
        this.tutorAssignmentRepository = tutorAssignmentRepository;
        this.lecturerAssignmentRepository = lecturerAssignmentRepository;
        this.e2eState = e2eState;
        this.environment = environment;
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('LECTURER')")
    @GetMapping("/{courseId}/tutors")
    public ResponseEntity<Map<String, List<Long>>> listTutorIdsForCourse(@PathVariable("courseId") Long courseId, HttpServletRequest request) {
        String authz = request.getHeader("Authorization");
        if (authz == null || authz.isBlank()) {
            return ResponseEntity.status(401).build();
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return ResponseEntity.status(401).build();
        }
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        boolean isLecturer = auth.getAuthorities().stream().anyMatch(a -> "ROLE_LECTURER".equals(a.getAuthority()));
        boolean isTutor = auth.getAuthorities().stream().anyMatch(a -> "ROLE_TUTOR".equals(a.getAuthority()));

        if (isTutor && !isAdmin) {
            return ResponseEntity.status(403).build();
        }
        if (isLecturer && !isAdmin) {
            Long userId = extractUserId(auth);
            if (userId == null) {
                return ResponseEntity.status(403).build();
            }
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

    private Long extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.usyd.catams.entity.User u) {
            return u.getId();
        }
        try {
            return Long.parseLong(authentication.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
