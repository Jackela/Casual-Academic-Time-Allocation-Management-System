package com.usyd.catams.test.config;

import java.math.BigDecimal;

/**
 * Test utility that provides configuration values for tests.
 * 
 * This uses known test constants to ensure test predictability
 * while maintaining the configuration-driven approach.
 */
public class TestConfigurationLoader {
    
    /**
     * Get the maximum hours configuration value for tests.
     * 
     * @return the maximum hours allowed for timesheets
     */
    public static BigDecimal getMaxHours() {
        return TestTimesheetValidationService.TEST_MAX_HOURS;
    }
    
    /**
     * Get the minimum hours configuration value.
     * 
     * @return the minimum hours allowed for timesheets
     */
    public static BigDecimal getMinHours() {
        return TestTimesheetValidationService.TEST_MIN_HOURS;
    }
    
    /**
     * Get the maximum hourly rate configuration value.
     * 
     * @return the maximum hourly rate allowed
     */
    public static BigDecimal getMaxHourlyRate() {
        return TestTimesheetValidationService.TEST_MAX_HOURLY_RATE;
    }
    
    /**
     * Get the minimum hourly rate configuration value.
     * 
     * @return the minimum hourly rate allowed
     */
    public static BigDecimal getMinHourlyRate() {
        return TestTimesheetValidationService.TEST_MIN_HOURLY_RATE;
    }
    
    /**
     * Generate expected validation message for hours range.
     * 
     * @return the expected validation message
     */
    public static String getExpectedHoursValidationMessage() {
        return TestTimesheetValidationService.getExpectedHoursValidationMessage();
    }
}
