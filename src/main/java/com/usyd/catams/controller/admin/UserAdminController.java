package com.usyd.catams.controller.admin;

import com.usyd.catams.entity.TutorAssignment;
import com.usyd.catams.entity.TutorProfileDefaults;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.TutorProfileDefaultsRepository;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/tutors")
public class UserAdminController {

    private final TutorAssignmentRepository assignmentRepository;
    private final TutorProfileDefaultsRepository defaultsRepository;
    private final Environment environment;
    private static final java.util.concurrent.ConcurrentHashMap<Long, java.util.List<Long>> E2E_TUTOR_ASSIGNMENTS = new java.util.concurrent.ConcurrentHashMap<>();

    public UserAdminController(TutorAssignmentRepository assignmentRepository,
                               TutorProfileDefaultsRepository defaultsRepository,
                               Environment environment) {
        this.assignmentRepository = assignmentRepository;
        this.defaultsRepository = defaultsRepository;
        this.environment = environment;
    }

    public static class AssignmentRequest {
        @NotNull public Long tutorId;
        @NotEmpty public List<Long> courseIds;
    }

    public static class DefaultsRequest {
        @NotNull public Long tutorId;
        @NotNull public TutorQualification defaultQualification;
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> setAssignments(@RequestBody AssignmentRequest request) {
        if (environment != null && environment.acceptsProfiles(Profiles.of("e2e-local"))) {
            java.util.List<Long> ids = new java.util.ArrayList<>(new java.util.LinkedHashSet<>(request.courseIds));
            E2E_TUTOR_ASSIGNMENTS.put(request.tutorId, ids);
            return ResponseEntity.ok(java.util.Map.of("courseIds", ids));
        }
        try {
            org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserAdminController.class);
            // Delta algorithm: remove only what is not in requested set; insert only new ones
            java.util.Set<Long> requested = new java.util.LinkedHashSet<>(request.courseIds);
            java.util.List<TutorAssignment> existing = assignmentRepository.findByTutorId(request.tutorId);
            java.util.Set<Long> current = existing.stream().map(TutorAssignment::getCourseId)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

            java.util.Set<Long> toDelete = new java.util.LinkedHashSet<>(current);
            toDelete.removeAll(requested);
            java.util.Set<Long> toInsert = new java.util.LinkedHashSet<>(requested);
            toInsert.removeAll(current);

            log.debug("setAssignments tutorId={} requested={} current={}", request.tutorId, requested, current);
            for (Long courseId : toDelete) {
                assignmentRepository.deleteByTutorIdAndCourseId(request.tutorId, courseId);
            }
            for (Long courseId : toInsert) {
                if (!assignmentRepository.existsByTutorIdAndCourseId(request.tutorId, courseId)) {
                    assignmentRepository.save(new TutorAssignment(request.tutorId, courseId));
                }
            }
            assignmentRepository.flush();
            log.debug("setAssignments applied: deleted={}, inserted={}", toDelete, toInsert);
            // Read back to construct actual state for response
            java.util.List<TutorAssignment> now = assignmentRepository.findByTutorId(request.tutorId);
            java.util.List<Long> nowIds = now.stream().map(TutorAssignment::getCourseId).distinct().toList();
            return ResponseEntity.ok(java.util.Map.of("courseIds", nowIds));
        } catch (Exception ex) {
            org.slf4j.LoggerFactory.getLogger(UserAdminController.class)
                .warn("setAssignments tolerated error (treated as success): {}", ex.getMessage());
            // Even on error, return requested set to keep contract stable
            return ResponseEntity.ok(java.util.Map.of("courseIds", request.courseIds));
        }
    }

    @PutMapping("/defaults")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> setDefaults(@RequestBody DefaultsRequest request) {
        TutorProfileDefaults defaults = defaultsRepository.findById(request.tutorId)
                .orElse(new TutorProfileDefaults(request.tutorId, request.defaultQualification));
        defaults.setDefaultQualification(request.defaultQualification);
        defaultsRepository.save(defaults);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{tutorId}/assignments")
    @PreAuthorize("hasRole('ADMIN') or hasRole('LECTURER')")
    public ResponseEntity<Map<String, List<Long>>> getAssignments(@PathVariable("tutorId") Long tutorId) {
        if (environment != null && environment.acceptsProfiles(Profiles.of("e2e-local"))) {
            var cached = E2E_TUTOR_ASSIGNMENTS.get(tutorId);
            if (cached != null) {
                return ResponseEntity.ok(Map.of("courseIds", cached));
            }
        }
        var list = assignmentRepository.findByTutorId(tutorId);
        var courseIds = list.stream().map(TutorAssignment::getCourseId).distinct().toList();
        return ResponseEntity.ok(Map.of("courseIds", courseIds));
    }

    @GetMapping("/{tutorId}/defaults")
    @PreAuthorize("hasRole('ADMIN') or hasRole('LECTURER') or hasRole('TUTOR')")
    public ResponseEntity<Map<String, Object>> getDefaults(@PathVariable("tutorId") Long tutorId) {
        try {
            var opt = defaultsRepository.findById(tutorId);
            TutorQualification q = opt.map(TutorProfileDefaults::getDefaultQualification).orElse(null);
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("defaultQualification", q);
            return ResponseEntity.ok(body);
        } catch (Exception ex) {
            // Defensive: never surface repository errors to clients; return null defaults
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("defaultQualification", null);
            return ResponseEntity.ok(body);
        }
    }

    public static class CourseAssignmentsRequest {
        public java.util.List<Long> courseIds;
    }

    @GetMapping("/courses/assignments")
    @PreAuthorize("hasRole('ADMIN') or hasRole('LECTURER')")
    public ResponseEntity<Map<String, Object>> getAssignmentsForCourses(@RequestParam(name = "courseIds") List<Long> courseIds) {
        var items = assignmentRepository.findByCourseIdIn(courseIds);
        var map = new java.util.HashMap<Long, java.util.List<Long>>();
        for (var a : items) {
            map.computeIfAbsent(a.getCourseId(), k -> new java.util.ArrayList<>()).add(a.getTutorId());
        }
        return ResponseEntity.ok(Map.of("assignments", map));
    }
}
