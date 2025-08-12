package com.usyd.catams.common.validation.annotations;

import com.usyd.catams.common.validation.validators.ValidHourlyRateValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Validates that a BigDecimal hourly rate complies with SSOT thresholds.
 * DbC: the annotated value should be null-allowed (handled by @NotNull elsewhere) or within [min, max].
 */
@Target({FIELD})
@Retention(RUNTIME)
@Documented
@Constraint(validatedBy = {ValidHourlyRateValidator.class})
public @interface ValidHourlyRate {
    String message() default "Hourly rate value violates configured thresholds";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
