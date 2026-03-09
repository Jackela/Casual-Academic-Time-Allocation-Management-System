package com.usyd.catams.domain.service.impl;

import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.domain.service.TimesheetValidationService;
import com.usyd.catams.entity.Timesheet;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

/**
 * Default implementation of TimesheetValidationService.
 */
@Service
public class TimesheetValidationServiceImpl implements TimesheetValidationService {

    private static final int MAX_DESCRIPTION_LENGTH = 1000;

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
        if (hours == null) throw validationFailure("hours must not be null");
        if (hourlyRate == null) throw validationFailure("hourlyRate must not be null");

        if (hours.compareTo(getMinHours()) < 0 || hours.compareTo(getMaxHours()) > 0) {
            throw validationFailure(String.format("Hours must be between %s and %s", getMinHours(), getMaxHours()));
        }
        if (hourlyRate.compareTo(getMinHourlyRate()) < 0 || hourlyRate.compareTo(getMaxHourlyRate()) > 0) {
            throw validationFailure(String.format("Hourly rate must be between %s and %s", getMinHourlyRate(), getMaxHourlyRate()));
        }
    }

    @Override
    public void validateTimesheet(Timesheet timesheet) {
        if (timesheet == null) throw validationFailure("timesheet must not be null");
        validateInputs(timesheet.getHours(), timesheet.getHourlyRate());
        validateMonday(timesheet.getWeekStartDate(), "weekStartDate");
        validateDescription(timesheet.getDescription());
    }

    @Override
    public void validateMonday(LocalDate date, String fieldName) {
        String resolvedFieldName = (fieldName == null || fieldName.isBlank()) ? "date" : fieldName;
        if (date == null) {
            throw validationFailure(resolvedFieldName + " must not be null");
        }
        if (date.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw validationFailure(resolvedFieldName + " must be a Monday");
        }
    }

    @Override
    public void validateDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            throw validationFailure("Description cannot be empty");
        }
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            throw validationFailure("Description cannot exceed " + MAX_DESCRIPTION_LENGTH + " characters");
        }
    }

    private IllegalArgumentException validationFailure(String message) {
        return new IllegalArgumentException(message);
    }
}
