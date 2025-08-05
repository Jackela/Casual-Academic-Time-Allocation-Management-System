package com.usyd.catams.test.config;

import com.usyd.catams.common.validation.TimesheetValidationService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.util.ReflectionTestUtils;

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
        TimesheetValidationService service = new TimesheetValidationService();
        // Inject the test configuration value
        ReflectionTestUtils.setField(service, "maxHours", TEST_MAX_HOURS);
        return service;
    }
    
    /**
     * Get expected hours validation message for tests.
     */
    public static String getExpectedHoursValidationMessage() {
        return String.format("Hours must be between %s and %s", TEST_MIN_HOURS, TEST_MAX_HOURS);
    }
}
