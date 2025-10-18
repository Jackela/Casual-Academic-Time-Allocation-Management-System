package com.usyd.catams.entity;

import com.usyd.catams.enums.TutorQualification;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * JPA entity mapping of the {@code rate_amount} table holding year-specific EA rates.
 */
@Entity
@Table(name = "rate_amount")
public class RateAmount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rate_code_id", nullable = false)
    private RateCode rateCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_version_id", nullable = false)
    private PolicyVersion policyVersion;

    @Column(name = "year_label", nullable = false, length = 16)
    private String yearLabel;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "hourly_amount_aud", nullable = false, precision = 10, scale = 2)
    private BigDecimal hourlyAmountAud;

    @Column(name = "max_associated_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxAssociatedHours;

    @Column(name = "max_payable_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxPayableHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "qualification", length = 20)
    private TutorQualification qualification;

    @Column(name = "notes")
    private String notes;

    public Long getId() {
        return id;
    }

    public RateCode getRateCode() {
        return rateCode;
    }

    public void setRateCode(RateCode rateCode) {
        this.rateCode = rateCode;
    }

    public PolicyVersion getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(PolicyVersion policyVersion) {
        this.policyVersion = policyVersion;
    }

    public String getYearLabel() {
        return yearLabel;
    }

    public void setYearLabel(String yearLabel) {
        this.yearLabel = yearLabel;
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

    public BigDecimal getHourlyAmountAud() {
        return hourlyAmountAud;
    }

    public void setHourlyAmountAud(BigDecimal hourlyAmountAud) {
        this.hourlyAmountAud = hourlyAmountAud;
    }

    public BigDecimal getMaxAssociatedHours() {
        return maxAssociatedHours;
    }

    public void setMaxAssociatedHours(BigDecimal maxAssociatedHours) {
        this.maxAssociatedHours = maxAssociatedHours;
    }

    public BigDecimal getMaxPayableHours() {
        return maxPayableHours;
    }

    public void setMaxPayableHours(BigDecimal maxPayableHours) {
        this.maxPayableHours = maxPayableHours;
    }

    public TutorQualification getQualification() {
        return qualification;
    }

    public void setQualification(TutorQualification qualification) {
        this.qualification = qualification;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public boolean isEffectiveOn(LocalDate targetDate) {
        if (targetDate == null) {
            return false;
        }
        boolean starts = !targetDate.isBefore(effectiveFrom);
        boolean ends = effectiveTo == null || targetDate.isBefore(effectiveTo);
        return starts && ends;
    }
}
