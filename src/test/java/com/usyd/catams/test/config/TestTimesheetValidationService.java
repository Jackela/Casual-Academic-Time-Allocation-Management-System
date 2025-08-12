package com.usyd.catams.test.config;

import com.usyd.catams.common.validation.TimesheetValidationService;
import com.usyd.catams.common.validation.TimesheetValidationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.math.BigDecimal;

/**
 * Test configuration that provides a TimesheetValidationService with known values.
 * 
 * This ensures test predictability while maintaining the configuration-driven approach.
 */
@TestConfiguration
public class TestTimesheetValidationService {
    
    public static final BigDecimal TEST_MAX_HOURS = new BigDecimal("38.0");
    public static final BigDecimal TEST_MIN_HOURS = new BigDecimal("0.1");
    public static final BigDecimal TEST_MIN_HOURLY_RATE = new BigDecimal("10.00");
    public static final BigDecimal TEST_MAX_HOURLY_RATE = new BigDecimal("200.00");
    
    @Bean
    @Primary
    public TimesheetValidationService testTimesheetValidationService() {
        // Create test properties with known values
        TimesheetValidationProperties testProps = new TimesheetValidationProperties();
        testProps.getHours().setMax(TEST_MAX_HOURS);
        testProps.setMinHours(TEST_MIN_HOURS);
        testProps.setMinHourlyRate(TEST_MIN_HOURLY_RATE);
        testProps.setMaxHourlyRate(TEST_MAX_HOURLY_RATE);
        
        return new TimesheetValidationService(testProps);
    }
    
    /**
     * Get expected hours validation message for tests.
     */
    public static String getExpectedHoursValidationMessage() {
        return String.format("Hours must be between %s and %s", TEST_MIN_HOURS, TEST_MAX_HOURS);
    }
}
