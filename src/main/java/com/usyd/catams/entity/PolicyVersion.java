package com.usyd.catams.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * JPA projection of the {@code policy_version} table introduced for EA compliance.
 * The entity keeps the mapping lightweight so higher level services can compose the data.
 */
@Entity
@Table(name = "policy_version")
public class PolicyVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ea_reference", nullable = false, length = 150)
    private String eaReference;

    @Column(name = "major_version", nullable = false)
    private int majorVersion;

    @Column(name = "minor_version", nullable = false)
    private int minorVersion;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "source_document_url", nullable = false)
    private String sourceDocumentUrl;

    @Column(name = "notes")
    private String notes;

    public Long getId() {
        return id;
    }

    public String getEaReference() {
        return eaReference;
    }

    public void setEaReference(String eaReference) {
        this.eaReference = eaReference;
    }

    public int getMajorVersion() {
        return majorVersion;
    }

    public void setMajorVersion(int majorVersion) {
        this.majorVersion = majorVersion;
    }

    public int getMinorVersion() {
        return minorVersion;
    }

    public void setMinorVersion(int minorVersion) {
        this.minorVersion = minorVersion;
    }

    public LocalDate getEffectiveFrom() {
        return effectiveFrom;
    }

    public void setEffectiveFrom(LocalDate effectiveFrom) {
        this.effectiveFrom = effectiveFrom;
    }

    public LocalDate getEffectiveTo() {
        return effectiveTo;
    }

    public void setEffectiveTo(LocalDate effectiveTo) {
        this.effectiveTo = effectiveTo;
    }

    public String getSourceDocumentUrl() {
        return sourceDocumentUrl;
    }

    public void setSourceDocumentUrl(String sourceDocumentUrl) {
        this.sourceDocumentUrl = sourceDocumentUrl;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public boolean isActiveOn(LocalDate targetDate) {
        if (targetDate == null) {
            return false;
        }
        boolean starts = !targetDate.isBefore(effectiveFrom);
        boolean ends = effectiveTo == null || targetDate.isBefore(effectiveTo);
        return starts && ends;
    }
}
