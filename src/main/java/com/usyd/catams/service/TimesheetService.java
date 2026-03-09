package com.usyd.catams.service;

/**
 * Backward-compatible aggregate interface.
 *
 * <p>Prefer {@link TimesheetCommandService}, {@link TimesheetQueryService},
 * and {@link TimesheetAuthorizationService} for single-responsibility wiring.</p>
 */
@Deprecated(forRemoval = true)
public interface TimesheetService
        extends TimesheetCommandService, TimesheetQueryService, TimesheetAuthorizationService {
}
