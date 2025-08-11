package com.usyd.catams.common.validation.validators;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.common.validation.annotations.ValidHourlyRate;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * JSR-380 validator for hourly rate values backed by SSOT thresholds.
 * DbC: null values are considered valid here; use @NotNull to enforce presence.
 */
public class ValidHourlyRateValidator implements ConstraintValidator<ValidHourlyRate, Money> {

    @Autowired
    private TimesheetValidationProperties props;

    @Override
    public boolean isValid(Money value, ConstraintValidatorContext context) {
        if (value == null || value.getAmount() == null) return true;
        var amount = value.getAmount();
        var min = props.getMinHourlyRate();
        var max = props.getMaxHourlyRate();
        return (min == null || amount.compareTo(min) >= 0) && (max == null || amount.compareTo(max) <= 0);
    }
}