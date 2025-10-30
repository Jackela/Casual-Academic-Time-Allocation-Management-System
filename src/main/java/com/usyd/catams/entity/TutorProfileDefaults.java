package com.usyd.catams.entity;

import com.usyd.catams.enums.TutorQualification;
import jakarta.persistence.*;

@Entity
@Table(name = "tutor_profile_defaults")
public class TutorProfileDefaults {

    @Id
    @Column(name = "tutor_id")
    private Long tutorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_qualification", nullable = false, length = 32)
    private TutorQualification defaultQualification = TutorQualification.STANDARD;

    protected TutorProfileDefaults() {}

    public TutorProfileDefaults(Long tutorId, TutorQualification defaultQualification) {
        this.tutorId = tutorId;
        this.defaultQualification = defaultQualification != null ? defaultQualification : TutorQualification.STANDARD;
    }

    public Long getTutorId() { return tutorId; }
    public TutorQualification getDefaultQualification() { return defaultQualification; }
    public void setDefaultQualification(TutorQualification q) { this.defaultQualification = q; }
}

