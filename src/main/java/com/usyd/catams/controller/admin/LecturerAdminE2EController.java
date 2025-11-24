package com.usyd.catams.controller.admin;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import com.usyd.catams.e2e.E2EAssignmentState;
import com.usyd.catams.entity.LecturerAssignment;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Profile("e2e-local")
@RestController
@RequestMapping("/api/admin/lecturers")
public class LecturerAdminE2EController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LecturerAdminE2EController.class);
    
    private final E2EAssignmentState state;
    private final com.usyd.catams.policy.AuthenticationFacade authenticationFacade;
    private final LecturerAssignmentRepository lecturerAssignmentRepository;

    public static class AssignmentRequest {
        @NotNull public Long lecturerId;
        @NotEmpty public List<Long> courseIds;
    }

    public LecturerAdminE2EController(E2EAssignmentState state,
                                      com.usyd.catams.policy.AuthenticationFacade authenticationFacade,
                                      LecturerAssignmentRepository lecturerAssignmentRepository) {
        this.state = state;
        this.authenticationFacade = authenticationFacade;
        this.lecturerAssignmentRepository = lecturerAssignmentRepository;
    }

    @PostMapping("/assignments")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setAssignments(@RequestBody AssignmentRequest request) {
        java.util.Collection<String> roles;
        try {
            roles = authenticationFacade.getCurrentUserRoles();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(java.util.Map.of("success", false, "error", "FORBIDDEN"));
        }
        boolean isAdmin = roles.contains("ROLE_ADMIN");
        if (!isAdmin) {
            return ResponseEntity.status(403).body(java.util.Map.of("success", false, "error", "FORBIDDEN"));
        }
        java.util.List<Long> ids = new java.util.ArrayList<>(new java.util.LinkedHashSet<>(request.courseIds));
        
        // Store in E2E state for GET endpoint
        state.setLecturerCourses(request.lecturerId, ids);
        
        // ALSO persist to database so timesheet queries can find lecturer assignments
        try {
            java.util.Set<Long> requested = new java.util.LinkedHashSet<>(request.courseIds);
            var existing = lecturerAssignmentRepository.findByLecturerId(request.lecturerId);
            java.util.Set<Long> current = existing.stream().map(LecturerAssignment::getCourseId)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

            if (!requested.equals(current)) {
                java.util.Set<Long> toDelete = new java.util.LinkedHashSet<>(current);
                toDelete.removeAll(requested);
                java.util.Set<Long> toInsert = new java.util.LinkedHashSet<>(requested);
                toInsert.removeAll(current);

                for (Long courseId : toDelete) {
                    lecturerAssignmentRepository.deleteByLecturerIdAndCourseId(request.lecturerId, courseId);
                }
                for (Long courseId : toInsert) {
                    if (!lecturerAssignmentRepository.existsByLecturerIdAndCourseId(request.lecturerId, courseId)) {
                        try {
                            lecturerAssignmentRepository.save(new LecturerAssignment(request.lecturerId, courseId));
                        } catch (org.springframework.dao.DataIntegrityViolationException e) {
                            // ignore unique races
                        }
                    }
                }
                lecturerAssignmentRepository.flush();
            }
            log.debug("[E2E-Lecturer] setAssignments lecturerId={} courseIds={}", request.lecturerId, ids);
        } catch (Exception ex) {
            log.warn("[E2E-Lecturer] DB persist failed (in-memory state still set): {}", ex.getMessage());
        }
        
        return ResponseEntity.ok(java.util.Map.of("courseIds", ids));
    }

    @GetMapping("/{lecturerId}/assignments")
    @org.springframework.security.access.prepost.PreAuthorize("permitAll()")
    public ResponseEntity<?> getAssignments(@PathVariable Long lecturerId) {
        return ResponseEntity.ok(java.util.Map.of("courseIds", state.getLecturerCourses(lecturerId)));
    }
}
