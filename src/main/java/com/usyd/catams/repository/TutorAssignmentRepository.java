package com.usyd.catams.repository;

import com.usyd.catams.entity.TutorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

@Repository
public interface TutorAssignmentRepository extends JpaRepository<TutorAssignment, Long> {
    boolean existsByTutorIdAndCourseId(Long tutorId, Long courseId);
    void deleteByTutorId(Long tutorId);
    @Modifying
    @Transactional
    void deleteByTutorIdAndCourseId(Long tutorId, Long courseId);
    java.util.List<TutorAssignment> findByCourseIdIn(java.util.List<Long> courseIds);
    java.util.List<TutorAssignment> findByTutorId(Long tutorId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO tutor_assignments (tutor_id, course_id, created_at) VALUES (?1, ?2, CURRENT_TIMESTAMP) ON CONFLICT (tutor_id, course_id) DO NOTHING", nativeQuery = true)
    void upsert(Long tutorId, Long courseId);
}
