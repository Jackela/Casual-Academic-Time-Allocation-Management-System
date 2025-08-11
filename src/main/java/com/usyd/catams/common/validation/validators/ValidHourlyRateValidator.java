package com.usyd.catams.common.validation.validators;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.common.validation.ValidationSSOT;
import com.usyd.catams.common.validation.annotations.ValidHourlyRate;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * JSR-380 validator for hourly rate values backed by SSOT thresholds.
 * DbC: null values are considered valid here; use @NotNull to enforce presence.
 */
public class ValidHourlyRateValidator implements ConstraintValidator<ValidHourlyRate, Money> {

    @Autowired(required = false)
    private TimesheetValidationProperties props;

    @Override
    public boolean isValid(Money value, ConstraintValidatorContext context) {
        if (value == null || value.getAmount() == null) return true;
        TimesheetValidationProperties ssot = (props != null) ? props : ValidationSSOT.get();
        if (ssot == null) return true; // no SSOT available in context; skip
        var amount = value.getAmount();
        var min = ssot.getMinHourlyRate();
        var max = ssot.getMaxHourlyRate();
        return (min == null || amount.compareTo(min) >= 0) && (max == null || amount.compareTo(max) <= 0);
    }
}