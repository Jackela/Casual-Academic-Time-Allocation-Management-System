package com.usyd.catams.repository;

import com.usyd.catams.entity.TutorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TutorAssignmentRepository extends JpaRepository<TutorAssignment, Long> {
    boolean existsByTutorIdAndCourseId(Long tutorId, Long courseId);
    void deleteByTutorId(Long tutorId);
    java.util.List<TutorAssignment> findByCourseIdIn(java.util.List<Long> courseIds);
}
