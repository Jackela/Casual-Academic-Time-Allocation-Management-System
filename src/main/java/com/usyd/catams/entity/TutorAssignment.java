package com.usyd.catams.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Entity representing the assignment of a tutor to a course.
 *
 * <p>This is a join entity that establishes the many-to-many relationship
 * between tutors (users with TUTOR role) and courses. A tutor can be assigned
 * to multiple courses, and a course can have multiple tutors assigned.</p>
 *
 * <p>Tutor assignments are used to:</p>
 * <ul>
 *   <li>Control which courses a tutor can create timesheets for</li>
 *   <li>Filter timesheet views to show only assigned courses</li>
 *   <li>Enforce authorization rules for timesheet operations</li>
 * </ul>
 *
 * @author CAS Team
 * @since 1.0
 * @see User
 * @see Course
 */
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

    /**
     * The ID of the tutor (user) assigned to the course.
     */
    @Column(name = "tutor_id", nullable = false)
    private Long tutorId;

    /**
     * The ID of the course the tutor is assigned to.
     */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /**
     * Timestamp when this assignment was created.
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Protected constructor for JPA.
     */
    protected TutorAssignment() {}

    /**
     * Creates a new tutor assignment.
     *
     * @param tutorId the ID of the tutor to assign
     * @param courseId the ID of the course to assign the tutor to
     */
    public TutorAssignment(Long tutorId, Long courseId) {
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getTutorId() { return tutorId; }
    public Long getCourseId() { return courseId; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TutorAssignment that = (TutorAssignment) o;
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

