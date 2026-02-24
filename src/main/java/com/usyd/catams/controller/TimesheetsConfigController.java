package com.usyd.catams.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for providing timesheet configuration to the frontend.
 *
 * <p>This controller exposes configuration values that the UI needs to
 * enforce validation rules consistently with the backend. The configuration
 * includes constraints for hours entry, week start date validation, and
 * currency settings.</p>
 *
 * @author CAS Team
 * @since 1.0
 */
@RestController
public class TimesheetsConfigController {

    /**
     * Returns UI constraint configuration for timesheet entry forms.
     *
     * <p>This endpoint provides validation constraints that the frontend
     * should enforce to match backend validation rules. The configuration
     * includes:</p>
     * <ul>
     *   <li>{@code hours} - Constraints for hours entry (min, max, step)</li>
     *   <li>{@code weekStart} - Rules for week start date selection</li>
     *   <li>{@code currency} - The currency code for monetary values</li>
     * </ul>
     *
     * @return a map containing UI constraint configuration
     */
    @GetMapping(path = "/api/timesheets/config", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getUiConstraints() {
        Map<String, Object> root = new HashMap<>();

        Map<String, Object> hours = new HashMap<>();
        hours.put("min", 0.1d);
        hours.put("max", 10.0d);
        hours.put("step", 0.1d);

        Map<String, Object> weekStart = new HashMap<>();
        weekStart.put("mondayOnly", true);

        root.put("hours", hours);
        root.put("weekStart", weekStart);
        root.put("currency", "AUD");

        return root;
    }
}

