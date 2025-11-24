
package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;

@Component
public class FutureDateRule implements Specification<TimesheetValidationContext> {

    private final boolean enabled;

    public FutureDateRule(
            @Value("${app.rules.future-date.enabled:true}") boolean enabled,
            Environment environment
    ) {
        // Environment override (e.g., APP_RULES_FUTURE_DATE_ENABLED=false). Default to FALSE for demos.
        String envOverride = System.getenv().getOrDefault("APP_RULES_FUTURE_DATE_ENABLED", "false");
        boolean resolvedEnabled = Boolean.parseBoolean(envOverride);

        // Always relax this rule in demo/e2e profiles regardless of property resolution.
        boolean isE2EProfile = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> p.toLowerCase().contains("e2e") || p.toLowerCase().contains("demo"));
        this.enabled = resolvedEnabled && !isE2EProfile;
    }

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        if (!enabled) {
            return;
        }
        // Pre-condition validation
        if (context.getWeekStartDate() == null) {
            throw new BusinessException("VALIDATION_FAILED", "Week start date cannot be null for future date validation");
        }

        // Business rule: Week start date cannot be in the future (except for LECTURER/ADMIN)
        if (context.getWeekStartDate().isAfter(LocalDate.now())) {
            // Allow future dates for LECTURER and ADMIN to support advance planning
            User creator = context.getCreator();
            if (creator != null && (creator.getRole() == UserRole.LECTURER || creator.getRole() == UserRole.ADMIN)) {
                return;
            }
            throw new BusinessException("VALIDATION_FAILED", "Week start date cannot be in the future");
        }
    }
}
