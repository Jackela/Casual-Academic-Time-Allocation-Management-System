package com.usyd.catams.domain.service.impl;

import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.domain.service.TimesheetValidationService;
import com.usyd.catams.entity.Timesheet;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

/**
 * Default implementation of TimesheetValidationService.
 */
@Service
public class TimesheetValidationServiceImpl implements TimesheetValidationService {

    private final TimesheetValidationProperties properties;

    public TimesheetValidationServiceImpl(TimesheetValidationProperties properties) {
        if (properties == null) {
            throw new IllegalArgumentException("TimesheetValidationProperties must not be null");
        }
        this.properties = properties;
    }

    @Override
    public BigDecimal getMinHours() {
        return properties.getMinHours();
    }

    @Override
    public BigDecimal getMaxHours() {
        return properties.getHours().getMax();
    }

    @Override
    public BigDecimal getMinHourlyRate() {
        return properties.getMinHourlyRate();
    }

    @Override
    public BigDecimal getMaxHourlyRate() {
        return properties.getMaxHourlyRate();
    }

    @Override
    public void validateInputs(BigDecimal hours, BigDecimal hourlyRate) {
        if (hours == null) throw new IllegalArgumentException("hours must not be null");
        if (hourlyRate == null) throw new IllegalArgumentException("hourlyRate must not be null");

        if (hours.compareTo(getMinHours()) < 0 || hours.compareTo(getMaxHours()) > 0) {
            throw new IllegalArgumentException(String.format("Hours must be between %s and %s", getMinHours(), getMaxHours()));
        }
        if (hourlyRate.compareTo(getMinHourlyRate()) < 0 || hourlyRate.compareTo(getMaxHourlyRate()) > 0) {
            throw new IllegalArgumentException(String.format("Hourly rate must be between %s and %s", getMinHourlyRate(), getMaxHourlyRate()));
        }
    }

    @Override
    public void validateTimesheet(Timesheet timesheet) {
        if (timesheet == null) throw new IllegalArgumentException("timesheet must not be null");
        validateInputs(timesheet.getHours(), timesheet.getHourlyRate());
    }
}


