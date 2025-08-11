package com.usyd.catams.common.validation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Centralized validation service for timesheet business rules.
 * 
 * This service provides a single source of truth for validation rules,
 * using configuration values where appropriate.
 */
@Service
public class TimesheetValidationService {

    @Value("${timesheet.hours.max}")
    private BigDecimal maxHours;
    
    // Constants for non-configurable business rules
    private static final BigDecimal MIN_HOURS = new BigDecimal("0.1");
    private static final BigDecimal MIN_HOURLY_RATE = new BigDecimal("10.00");
    private static final BigDecimal MAX_HOURLY_RATE = new BigDecimal("200.00");
    
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
        
        if (hours.compareTo(MIN_HOURS) < 0 || hours.compareTo(maxHours) > 0) {
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
        
        if (hourlyRate.compareTo(MIN_HOURLY_RATE) < 0 || hourlyRate.compareTo(MAX_HOURLY_RATE) > 0) {
            throw new IllegalArgumentException(String.format(
                "Hourly rate must be between %s and %s", MIN_HOURLY_RATE, MAX_HOURLY_RATE));
        }
    }
    
    /**
     * Get the hours validation message.
     *
     * @return the validation message for hours
     */
    public String getHoursValidationMessage() {
        return String.format("Hours must be between %s and %s", MIN_HOURS, maxHours);
    }
    
    /**
     * Get the minimum hours value.
     *
     * @return minimum hours
     */
    public BigDecimal getMinHours() {
        return MIN_HOURS;
    }
    
    /**
     * Get the maximum hours value.
     *
     * @return maximum hours (from configuration)
     */
    public BigDecimal getMaxHours() {
        return maxHours;
    }

    // duplicate accessors removed; keep single definitions below
    
    /**
     * Get the minimum hourly rate value.
     *
     * @return minimum hourly rate
     */
    public BigDecimal getMinHourlyRate() {
        return MIN_HOURLY_RATE;
    }
    
    /**
     * Get the maximum hourly rate value.
     *
     * @return maximum hourly rate
     */
    public BigDecimal getMaxHourlyRate() {
        return MAX_HOURLY_RATE;
    }
}