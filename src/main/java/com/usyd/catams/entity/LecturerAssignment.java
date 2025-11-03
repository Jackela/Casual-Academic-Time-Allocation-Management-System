package com.usyd.catams.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "lecturer_assignments",
       uniqueConstraints = @UniqueConstraint(name = "ux_lecturer_assignments_lecturer_course", columnNames = {"lecturer_id", "course_id"}),
       indexes = {
           @Index(name = "ix_lecturer_assignments_lecturer_id", columnList = "lecturer_id"),
           @Index(name = "ix_lecturer_assignments_course_id", columnList = "course_id")
       })
public class LecturerAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lecturer_id", nullable = false)
    private Long lecturerId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    protected LecturerAssignment() {}

    public LecturerAssignment(Long lecturerId, Long courseId) {
        this.lecturerId = lecturerId;
        this.courseId = courseId;
    }

    public Long getId() { return id; }
    public Long getLecturerId() { return lecturerId; }
    public Long getCourseId() { return courseId; }
}

