package com.usyd.catams.domain.service;

import com.usyd.catams.entity.Timesheet;
import java.math.BigDecimal;

/**
 * Timesheet validation service (SSOT for thresholds and checks).
 * Design by Contract (DbC):
 * - All public methods validate non-null mandatory inputs and throw IllegalArgumentException on violations.
 */
public interface TimesheetValidationService {

    /**
     * Returns configured minimum hours.
     */
    BigDecimal getMinHours();

    /**
     * Returns configured maximum hours.
     */
    BigDecimal getMaxHours();

    /**
     * Returns configured minimum hourly rate.
     */
    BigDecimal getMinHourlyRate();

    /**
     * Returns configured maximum hourly rate.
     */
    BigDecimal getMaxHourlyRate();

    /**
     * Validates primitive inputs for hours and hourly rate.
     * Preconditions: hours != null, hourlyRate != null.
     * Throws IllegalArgumentException with contextual message if out of range.
     */
    void validateInputs(BigDecimal hours, BigDecimal hourlyRate);

    /**
     * Validates a timesheet instance.
     * Preconditions: timesheet != null.
     */
    void validateTimesheet(Timesheet timesheet);
}


