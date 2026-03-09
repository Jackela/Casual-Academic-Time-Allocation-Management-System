package com.usyd.catams.common.validation.validators;

import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.common.validation.annotations.ValidHours;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;

/**
 * JSR-380 validator for hours values backed by SSOT thresholds.
 * DbC: null values are considered valid here; use @NotNull to enforce presence.
 */
public class ValidHoursValidator implements ConstraintValidator<ValidHours, BigDecimal> {

    @Autowired(required = false)
    private TimesheetValidationProperties props;

    @Override
    public boolean isValid(BigDecimal value, ConstraintValidatorContext context) {
        if (value == null) return true;
        if (props == null) return true;
        BigDecimal min = props.getMinHours();
        BigDecimal max = props.getHours().getMax();
        return (min == null || value.compareTo(min) >= 0) && (max == null || value.compareTo(max) <= 0);
    }
}
