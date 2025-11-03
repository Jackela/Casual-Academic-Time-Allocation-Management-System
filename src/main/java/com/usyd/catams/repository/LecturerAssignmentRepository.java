package com.usyd.catams.repository;

import com.usyd.catams.entity.LecturerAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LecturerAssignmentRepository extends JpaRepository<LecturerAssignment, Long> {
    List<LecturerAssignment> findByLecturerId(Long lecturerId);
    boolean existsByLecturerIdAndCourseId(Long lecturerId, Long courseId);
    @Transactional
    void deleteByLecturerId(Long lecturerId);
    @Transactional
    void deleteByLecturerIdAndCourseId(Long lecturerId, Long courseId);
}

