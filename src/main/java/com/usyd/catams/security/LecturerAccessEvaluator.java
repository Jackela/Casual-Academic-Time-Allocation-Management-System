package com.usyd.catams.security;

import com.usyd.catams.e2e.E2EAssignmentState;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import org.springframework.core.env.Environment;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("lecturerAccessEvaluator")
public class LecturerAccessEvaluator {

    private final LecturerAssignmentRepository lecturerAssignmentRepository;
    private final Environment environment;
    private final E2EAssignmentState e2eState; // may be null outside e2e-local

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public LecturerAccessEvaluator(LecturerAssignmentRepository lecturerAssignmentRepository,
                                   Environment environment,
                                   E2EAssignmentState e2eState) {
        this.lecturerAssignmentRepository = lecturerAssignmentRepository;
        this.environment = environment;
        this.e2eState = e2eState;
    }

    /**
     * Returns true if the authenticated user is a lecturer assigned to the given course.
     * In e2e-local profile, also consults in-memory E2EAssignmentState.
     */
    public boolean isAssigned(Authentication authentication, Long courseId) {
        if (authentication == null || courseId == null) {
            return false;
        }
        Long userId = extractUserId(authentication);
        if (userId == null) {
            return false;
        }
        try {
            if (isE2ELocal() && e2eState != null) {
                var courses = e2eState.getLecturerCourses(userId);
                // If e2e state has an entry, treat it as SSOT during e2e-local
                if (courses != null && !courses.isEmpty()) {
                    return courses.contains(courseId);
                }
            }
            // Fallback to DB
            return lecturerAssignmentRepository.existsByLecturerIdAndCourseId(userId, courseId);
        } catch (Exception ex) {
            if (isE2ELocal() && e2eState != null) {
                var courses = e2eState.getLecturerCourses(userId);
                return courses.contains(courseId);
            }
            return false;
        }
    }

    private boolean isE2ELocal() {
        if (environment == null) return false;
        for (String p : environment.getActiveProfiles()) {
            if (p != null && p.equalsIgnoreCase("e2e-local")) return true;
        }
        return false;
    }

    private Long extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.usyd.catams.entity.User user) {
            return user.getId();
        }
        try {
            return Long.parseLong(authentication.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
