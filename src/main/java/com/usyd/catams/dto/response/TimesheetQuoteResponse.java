package com.usyd.catams.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1CalculationResult;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Response payload representing an EA-compliant quote for a timesheet entry.
 */
public class TimesheetQuoteResponse {

    @JsonProperty("taskType")
    private TimesheetTaskType taskType;

    @JsonProperty("rateCode")
    private String rateCode;

    @JsonProperty("qualification")
    private TutorQualification qualification;

    @JsonProperty("isRepeat")
    private boolean repeat;

    @JsonProperty("deliveryHours")
    private BigDecimal deliveryHours;

    @JsonProperty("associatedHours")
    private BigDecimal associatedHours;

    @JsonProperty("payableHours")
    private BigDecimal payableHours;

    @JsonProperty("hourlyRate")
    private BigDecimal hourlyRate;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("formula")
    private String formula;

    @JsonProperty("clauseReference")
    private String clauseReference;

    @JsonProperty("sessionDate")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate sessionDate;

    public static TimesheetQuoteResponse from(TimesheetTaskType taskType, Schedule1CalculationResult calculation) {
        TimesheetQuoteResponse response = new TimesheetQuoteResponse();
        response.taskType = taskType;
        response.rateCode = calculation.getRateCode();
        response.qualification = calculation.getQualification();
        response.repeat = calculation.isRepeat();
        response.deliveryHours = calculation.getDeliveryHours();
        response.associatedHours = calculation.getAssociatedHours();
        response.payableHours = calculation.getPayableHours();
        response.hourlyRate = calculation.getHourlyRate();
        response.amount = calculation.getAmount();
        response.formula = calculation.getFormula();
        response.clauseReference = calculation.getClauseReference();
        response.sessionDate = calculation.getSessionDate();
        return response;
    }

    public TimesheetTaskType getTaskType() {
        return taskType;
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

    public LocalDate getSessionDate() {
        return sessionDate;
    }
}
