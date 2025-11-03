package com.usyd.catams.controller.admin;

import com.usyd.catams.entity.LecturerAssignment;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/lecturers")
public class LecturerAdminController {

    private final LecturerAssignmentRepository lecturerAssignmentRepository;

    public LecturerAdminController(LecturerAssignmentRepository lecturerAssignmentRepository) {
        this.lecturerAssignmentRepository = lecturerAssignmentRepository;
    }

    public static class AssignmentRequest {
        @NotNull public Long lecturerId;
        @NotEmpty public List<Long> courseIds;
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setAssignments(@RequestBody AssignmentRequest request) {
        // Replace set: delete removed, insert new
        var requested = new java.util.LinkedHashSet<>(request.courseIds);
        var existing = lecturerAssignmentRepository.findByLecturerId(request.lecturerId);
        var current = existing.stream().map(LecturerAssignment::getCourseId)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

        var toDelete = new java.util.LinkedHashSet<>(current); toDelete.removeAll(requested);
        var toInsert = new java.util.LinkedHashSet<>(requested); toInsert.removeAll(current);

        for (Long courseId : toDelete) {
            lecturerAssignmentRepository.deleteByLecturerIdAndCourseId(request.lecturerId, courseId);
        }
        for (Long courseId : toInsert) {
            if (!lecturerAssignmentRepository.existsByLecturerIdAndCourseId(request.lecturerId, courseId)) {
                lecturerAssignmentRepository.save(new LecturerAssignment(request.lecturerId, courseId));
            }
        }

        var now = lecturerAssignmentRepository.findByLecturerId(request.lecturerId);
        var ids = now.stream().map(LecturerAssignment::getCourseId).distinct().toList();
        return ResponseEntity.ok(Map.of("courseIds", ids));
    }

    @GetMapping("/{lecturerId}/assignments")
    @PreAuthorize("hasRole('ADMIN') or hasRole('LECTURER')")
    public ResponseEntity<Map<String, List<Long>>> getAssignments(@PathVariable("lecturerId") Long lecturerId) {
        var list = lecturerAssignmentRepository.findByLecturerId(lecturerId);
        var ids = list.stream().map(LecturerAssignment::getCourseId).distinct().toList();
        return ResponseEntity.ok(Map.of("courseIds", ids));
    }
}

