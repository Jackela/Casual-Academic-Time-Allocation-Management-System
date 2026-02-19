package com.usyd.catams.entity;

import jakarta.persistence.*;
import java.util.Objects;

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

    public void setLecturerId(Long lecturerId) { this.lecturerId = lecturerId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        LecturerAssignment that = (LecturerAssignment) o;
        // If both have IDs, compare by ID; otherwise use identity
        if (this.id != null && that.id != null) {
            return Objects.equals(this.id, that.id);
        }
        return false;
    }

    @Override
    public int hashCode() {
        // If entity is new (no ID), use identity-based hash (System.identityHashCode)
        // This ensures consistency: equal objects have same hash
        return id != null ? Objects.hash(id) : System.identityHashCode(this);
    }
}

