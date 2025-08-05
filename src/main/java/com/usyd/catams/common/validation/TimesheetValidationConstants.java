package com.usyd.catams.common.validation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;

/**
 * Validation constants holder that can be accessed statically by entities.
 * 
 * This class bridges the gap between Spring's dependency injection
 * and JPA entities that cannot have dependencies injected.
 */
@Component
public class TimesheetValidationConstants {

    @Value("${timesheet.hours.max}")
    private BigDecimal configuredMaxHours;
    
    // Static holders for runtime access
    private static BigDecimal maxHours;
    private static final BigDecimal MIN_HOURS = new BigDecimal("0.1");
    private static final BigDecimal MIN_HOURLY_RATE = new BigDecimal("10.00");
    private static final BigDecimal MAX_HOURLY_RATE = new BigDecimal("200.00");
    
    @PostConstruct
    public void initializeConstants() {
        maxHours = configuredMaxHours;
    }
    
    /**
     * Get maximum hours value (configuration-driven).
     */
    public static BigDecimal getMaxHours() {
        return maxHours != null ? maxHours : new BigDecimal("40.0"); // fallback for tests
    }
    
    /**
     * Get minimum hours value.
     */
    public static BigDecimal getMinHours() {
        return MIN_HOURS;
    }
    
    /**
     * Get minimum hourly rate value.
     */
    public static BigDecimal getMinHourlyRate() {
        return MIN_HOURLY_RATE;
    }
    
    /**
     * Get maximum hourly rate value.
     */
    public static BigDecimal getMaxHourlyRate() {
        return MAX_HOURLY_RATE;
    }
    
    /**
     * Get hours validation message.
     */
    public static String getHoursValidationMessage() {
        return String.format("Hours must be between %s and %s", MIN_HOURS, getMaxHours());
    }
    
    /**
     * Get hourly rate validation message.
     */
    public static String getHourlyRateValidationMessage() {
        return String.format("Hourly rate must be between %s and %s", MIN_HOURLY_RATE, MAX_HOURLY_RATE);
    }
    
    /**
     * For testing - allow setting max hours statically.
     */
    public static void setMaxHoursForTesting(BigDecimal testMaxHours) {
        maxHours = testMaxHours;
    }
}