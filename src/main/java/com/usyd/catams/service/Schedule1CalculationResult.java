package com.usyd.catams.service;

import com.usyd.catams.enums.TutorQualification;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Immutable data transfer object representing the outcome of a Schedule 1 calculation.
 */
public final class Schedule1CalculationResult {

    private final LocalDate sessionDate;
    private final String rateCode;
    private final TutorQualification qualification;
    private final boolean repeat;
    private final BigDecimal deliveryHours;
    private final BigDecimal associatedHours;
    private final BigDecimal payableHours;
    private final BigDecimal hourlyRate;
    private final BigDecimal amount;
    private final String formula;
    private final String clauseReference;

    public Schedule1CalculationResult(LocalDate sessionDate,
                                      String rateCode,
                                      TutorQualification qualification,
                                      boolean repeat,
                                      BigDecimal deliveryHours,
                                      BigDecimal associatedHours,
                                      BigDecimal payableHours,
                                      BigDecimal hourlyRate,
                                      BigDecimal amount,
                                      String formula,
                                      String clauseReference) {
        this.sessionDate = sessionDate;
        this.rateCode = rateCode;
        this.qualification = qualification;
        this.repeat = repeat;
        this.deliveryHours = deliveryHours;
        this.associatedHours = associatedHours;
        this.payableHours = payableHours;
        this.hourlyRate = hourlyRate;
        this.amount = amount;
        this.formula = formula;
        this.clauseReference = clauseReference;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public String getRateCode() {
        return rateCode;
    }

    public TutorQualification getQualification() {
        return qualification;
    }

    public boolean isRepeat() {
        return repeat;
    }

    public BigDecimal getDeliveryHours() {
        return deliveryHours;
    }

    public BigDecimal getAssociatedHours() {
        return associatedHours;
    }

    public BigDecimal getPayableHours() {
        return payableHours;
    }

    public BigDecimal getHourlyRate() {
        return hourlyRate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getFormula() {
        return formula;
    }

    public String getClauseReference() {
        return clauseReference;
    }
}
