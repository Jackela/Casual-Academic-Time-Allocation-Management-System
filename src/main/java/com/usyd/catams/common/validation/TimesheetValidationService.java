package com.usyd.catams.common.validation;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Centralized validation service for timesheet business rules.
 * 
 * This service provides a single source of truth for validation rules,
 * using SSOT configuration properties.
 */
@Service
public class TimesheetValidationService {

    private final TimesheetValidationProperties validationProps;

    public TimesheetValidationService(TimesheetValidationProperties validationProps) {
        this.validationProps = validationProps;
    }
    
    /**
     * Validate hours value.
     *
     * @param hours the hours to validate
     * @throws IllegalArgumentException if hours are invalid
     */
    public void validateHours(BigDecimal hours) {
        if (hours == null) {
            return;
        }
        
        BigDecimal minHours = validationProps.getMinHours();
        BigDecimal maxHours = validationProps.getHours().getMax();
        
        if (hours.compareTo(minHours) < 0 || hours.compareTo(maxHours) > 0) {
            throw new IllegalArgumentException(getHoursValidationMessage());
        }
    }
    
    /**
     * Validate hourly rate value.
     *
     * @param hourlyRate the hourly rate to validate
     * @throws IllegalArgumentException if hourly rate is invalid
     */
    public void validateHourlyRate(BigDecimal hourlyRate) {
        if (hourlyRate == null) {
            return;
        }
        
        BigDecimal minRate = validationProps.getMinHourlyRate();
        BigDecimal maxRate = validationProps.getMaxHourlyRate();
        
        if (hourlyRate.compareTo(minRate) < 0 || hourlyRate.compareTo(maxRate) > 0) {
            throw new IllegalArgumentException(String.format(
                "Hourly rate must be between %s and %s", minRate, maxRate));
        }
    }
    
    /**
     * Get the hours validation message.
     *
     * @return the validation message for hours
     */
    public String getHoursValidationMessage() {
        return String.format("Hours must be between %s and %s", 
            validationProps.getMinHours(), validationProps.getHours().getMax());
    }
    
    /**
     * Get the minimum hours value.
     *
     * @return minimum hours
     */
    public BigDecimal getMinHours() {
        return validationProps.getMinHours();
    }
    
    /**
     * Get the maximum hours value.
     *
     * @return maximum hours (from configuration)
     */
    public BigDecimal getMaxHours() {
        return validationProps.getHours().getMax();
    }

    // duplicate accessors removed; keep single definitions below
    
    /**
     * Get the minimum hourly rate value.
     *
     * @return minimum hourly rate
     */
    public BigDecimal getMinHourlyRate() {
        return validationProps.getMinHourlyRate();
    }
    
    /**
     * Get the maximum hourly rate value.
     *
     * @return maximum hourly rate
     */
    public BigDecimal getMaxHourlyRate() {
        return validationProps.getMaxHourlyRate();
    }
}