package com.usyd.catams.common.validation;

/**
 * Static SSOT holder for validation properties when validators are not Spring-managed.
 * DbC: properties must be set during application bootstrap.
 */
public final class ValidationSSOT {

    private static volatile TimesheetValidationProperties props;

    private ValidationSSOT() {}

    /**
     * Set global validation properties.
     */
    public static void set(TimesheetValidationProperties properties) {
        props = properties;
    }

    /**
     * Get global validation properties.
     */
    public static TimesheetValidationProperties get() {
        return props;
    }
}
