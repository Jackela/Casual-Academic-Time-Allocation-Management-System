package com.usyd.catams.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tutor_assignments",
       uniqueConstraints = @UniqueConstraint(name = "ux_tutor_assignments_tutor_course", columnNames = {"tutor_id", "course_id"}),
       indexes = {
           @Index(name = "ix_tutor_assignments_tutor_id", columnList = "tutor_id"),
           @Index(name = "ix_tutor_assignments_course_id", columnList = "course_id")
       })
public class TutorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tutor_id", nullable = false)
    private Long tutorId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected TutorAssignment() {}

    public TutorAssignment(Long tutorId, Long courseId) {
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getTutorId() { return tutorId; }
    public Long getCourseId() { return courseId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

