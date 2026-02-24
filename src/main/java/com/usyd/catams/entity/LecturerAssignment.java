package com.usyd.catams.entity;

import jakarta.persistence.*;
import java.util.Objects;

/**
 * Entity representing the assignment of a lecturer to a course.
 *
 * <p>This is a join entity that establishes the many-to-many relationship
 * between lecturers (users with LECTURER role) and courses. A lecturer can
 * be assigned to multiple courses, and a course can have multiple lecturers
 * assigned (e.g., for team-taught courses).</p>
 *
 * <p>Lecturer assignments are used to:</p>
 * <ul>
 *   <li>Control which courses a lecturer can approve timesheets for</li>
 *   <li>Filter timesheet views to show only assigned courses</li>
 *   <li>Enforce authorization rules for lecturer-level approval workflows</li>
 *   <li>Track course ownership for budget and reporting purposes</li>
 * </ul>
 *
 * @author CAS Team
 * @since 1.0
 * @see User
 * @see Course
 */
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

    /**
     * The ID of the lecturer (user) assigned to the course.
     */
    @Column(name = "lecturer_id", nullable = false)
    private Long lecturerId;

    /**
     * The ID of the course the lecturer is assigned to.
     */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /**
     * Protected constructor for JPA.
     */
    protected LecturerAssignment() {}

    /**
     * Creates a new lecturer assignment.
     *
     * @param lecturerId the ID of the lecturer to assign
     * @param courseId the ID of the course to assign the lecturer to
     */
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

