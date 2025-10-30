package com.usyd.catams.controller.admin;

import com.usyd.catams.entity.TutorAssignment;
import com.usyd.catams.entity.TutorProfileDefaults;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.TutorProfileDefaultsRepository;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/tutors")
public class UserAdminController {

    private final TutorAssignmentRepository assignmentRepository;
    private final TutorProfileDefaultsRepository defaultsRepository;

    public UserAdminController(TutorAssignmentRepository assignmentRepository,
                               TutorProfileDefaultsRepository defaultsRepository) {
        this.assignmentRepository = assignmentRepository;
        this.defaultsRepository = defaultsRepository;
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
    @org.springframework.transaction.annotation.Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> setAssignments(@RequestBody AssignmentRequest request) {
        assignmentRepository.deleteByTutorId(request.tutorId);
        for (Long courseId : request.courseIds) {
            assignmentRepository.save(new TutorAssignment(request.tutorId, courseId));
        }
        return ResponseEntity.noContent().build();
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
        // Simple return via JPQL would be nicer; using repository + stream keeps it minimal
        var all = assignmentRepository.findAll();
        var courseIds = all.stream()
                .filter(a -> a.getTutorId().equals(tutorId))
                .map(TutorAssignment::getCourseId)
                .distinct()
                .toList();
        return ResponseEntity.ok(Map.of("courseIds", courseIds));
    }

    @GetMapping("/{tutorId}/defaults")
    @PreAuthorize("hasRole('ADMIN') or hasRole('LECTURER') or hasRole('TUTOR')")
    public ResponseEntity<Map<String, Object>> getDefaults(@PathVariable("tutorId") Long tutorId) {
        var opt = defaultsRepository.findById(tutorId);
        TutorQualification q = opt.map(TutorProfileDefaults::getDefaultQualification).orElse(null);
        return ResponseEntity.ok(Map.of("defaultQualification", q));
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
