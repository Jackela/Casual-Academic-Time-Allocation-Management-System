package com.usyd.catams.entity;

import com.usyd.catams.enums.TutorQualification;
import jakarta.persistence.*;

/**
 * Entity storing default profile settings for tutors.
 *
 * <p>This entity holds user-specific default values that are applied when
 * creating new timesheets, reducing repetitive data entry for tutors who
 * consistently work with the same qualification level.</p>
 *
 * <p>The defaults are used to pre-populate timesheet forms:</p>
 * <ul>
 *   <li>{@code defaultQualification} - The tutor's typical qualification level
 *       (e.g., STANDARD, MARKER, SENIOR) which affects pay rates</li>
 * </ul>
 *
 * <p>Each tutor can have at most one TutorProfileDefaults record, linked by
 * the tutor's user ID as the primary key.</p>
 *
 * @author CAS Team
 * @since 1.0
 * @see User
 * @see TutorQualification
 */
@Entity
@Table(name = "tutor_profile_defaults")
public class TutorProfileDefaults {

    /**
     * The tutor's user ID, serving as both primary key and foreign key reference.
     */
    @Id
    @Column(name = "tutor_id")
    private Long tutorId;

    /**
     * The default qualification level to use when creating new timesheets.
     * This affects the pay rate calculation for the tutor's work.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "default_qualification", nullable = false, length = 32)
    private TutorQualification defaultQualification = TutorQualification.STANDARD;

    /**
     * Protected constructor for JPA.
     */
    protected TutorProfileDefaults() {}

    /**
     * Creates a new TutorProfileDefaults with the specified settings.
     *
     * @param tutorId the ID of the tutor user
     * @param defaultQualification the default qualification level for timesheets;
     *        if null, defaults to STANDARD
     */
    public TutorProfileDefaults(Long tutorId, TutorQualification defaultQualification) {
        this.tutorId = tutorId;
        this.defaultQualification = defaultQualification != null ? defaultQualification : TutorQualification.STANDARD;
    }

    public Long getTutorId() { return tutorId; }
    public TutorQualification getDefaultQualification() { return defaultQualification; }
    public void setDefaultQualification(TutorQualification q) { this.defaultQualification = q; }
}

