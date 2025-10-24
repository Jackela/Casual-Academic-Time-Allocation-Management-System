package com.usyd.catams.controller;

import com.usyd.catams.dto.response.CourseResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.repository.CourseRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Minimal read-only courses endpoint for E2E/test profiles.
 */
@RestController
@RequestMapping("/api/courses")
@Profile({"test", "e2e", "e2e-local"})
public class CourseController {

    private final CourseRepository courseRepository;

    public CourseController(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ResponseEntity<List<CourseResponse>> getCourses(
            @RequestParam(value = "lecturerId", required = false) Long lecturerId,
            @RequestParam(value = "active", required = false) Boolean active,
            @RequestParam(value = "includeTutors", required = false) Boolean includeTutors) {

        List<Course> courses;
        if (lecturerId != null && active != null) {
            courses = courseRepository.findByLecturerIdAndIsActive(lecturerId, active);
        } else if (lecturerId != null) {
            courses = courseRepository.findByLecturerId(lecturerId);
        } else if (active != null) {
            courses = courseRepository.findByIsActive(active);
        } else {
            courses = courseRepository.findAll();
        }

        List<CourseResponse> body = courses.stream()
                .map(c -> new CourseResponse(c.getId(), c.getCode(), c.getName(), c.getLecturerId(), c.getIsActive()))
                .toList();

        return ResponseEntity.ok(body);
    }
}

