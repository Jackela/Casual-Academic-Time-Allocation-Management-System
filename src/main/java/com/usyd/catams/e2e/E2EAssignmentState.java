package com.usyd.catams.e2e;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Profile("e2e-local")
@Component
public class E2EAssignmentState {

    private final Map<Long, List<Long>> lecturerAssignments = new ConcurrentHashMap<>();

    public void setLecturerCourses(Long lecturerId, List<Long> courseIds) {
        if (lecturerId == null) return;
        lecturerAssignments.put(lecturerId, List.copyOf(courseIds == null ? List.of() : courseIds));
    }

    public List<Long> getLecturerCourses(Long lecturerId) {
        if (lecturerId == null) return List.of();
        return lecturerAssignments.getOrDefault(lecturerId, List.of());
    }
}

