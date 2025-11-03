package com.usyd.catams.controller.admin;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import com.usyd.catams.e2e.E2EAssignmentState;
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

    private final E2EAssignmentState state;

    public static class AssignmentRequest {
        @NotNull public Long lecturerId;
        @NotEmpty public List<Long> courseIds;
    }

    public LecturerAdminE2EController(E2EAssignmentState state) {
        this.state = state;
    }

    @PostMapping("/assignments")
    public ResponseEntity<?> setAssignments(@RequestBody AssignmentRequest request) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            return ResponseEntity.status(403).body(java.util.Map.of("success", false, "error", "FORBIDDEN"));
        }
        java.util.List<Long> ids = new java.util.ArrayList<>(new java.util.LinkedHashSet<>(request.courseIds));
        state.setLecturerCourses(request.lecturerId, ids);
        return ResponseEntity.ok(java.util.Map.of("courseIds", ids));
    }

    @GetMapping("/{lecturerId}/assignments")
    public ResponseEntity<?> getAssignments(@PathVariable Long lecturerId) {
        return ResponseEntity.ok(java.util.Map.of("courseIds", state.getLecturerCourses(lecturerId)));
    }
}
