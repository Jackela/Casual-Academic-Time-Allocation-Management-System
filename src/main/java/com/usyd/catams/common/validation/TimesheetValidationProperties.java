package com.usyd.catams.common.validation;

import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Timesheet validation configuration bound from application properties.
 * Long-term replacement for static constants.
 * 
 * Note: This bean is registered via @EnableConfigurationProperties in ApplicationConfig.
 * Do not add @Component annotation as it would create duplicate bean definitions.
 */
@ConfigurationProperties(prefix = "timesheet")
public class TimesheetValidationProperties {

    /**
     * Holder for hours-related limits (e.g., min/max).
     */
    public static class Hours {
        /** Maximum allowed hours for a timesheet period. */
        private BigDecimal max = new BigDecimal("38.0");

        public BigDecimal getMax() {
            return max;
        }

        public void setMax(BigDecimal max) {
            this.max = max;
        }
    }

    private final Hours hours = new Hours();

    /** Minimum allowed hours for a single entry. */
    private BigDecimal minHours = new BigDecimal("0.1");
    /** Minimum hourly rate. */
    private BigDecimal minHourlyRate = new BigDecimal("10.00");
    /** Maximum hourly rate. */
    private BigDecimal maxHourlyRate = new BigDecimal("200.00");

    public Hours getHours() {
        return hours;
    }

    public BigDecimal getMinHours() {
        return minHours;
    }

    public void setMinHours(BigDecimal minHours) {
        this.minHours = minHours;
    }

    public BigDecimal getMinHourlyRate() {
        return minHourlyRate;
    }

    public void setMinHourlyRate(BigDecimal minHourlyRate) {
        this.minHourlyRate = minHourlyRate;
    }

    public BigDecimal getMaxHourlyRate() {
        return maxHourlyRate;
    }

    public void setMaxHourlyRate(BigDecimal maxHourlyRate) {
        this.maxHourlyRate = maxHourlyRate;
    }
}


