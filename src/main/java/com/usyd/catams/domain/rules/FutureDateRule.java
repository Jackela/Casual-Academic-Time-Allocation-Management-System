
package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class FutureDateRule implements Specification<TimesheetValidationContext> {

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        // Pre-condition validation
        if (context.getWeekStartDate() == null) {
            throw new BusinessException("VALIDATION_FAILED", "Week start date cannot be null for future date validation");
        }

        // Business rule: Week start date cannot be in the future
        if (context.getWeekStartDate().isAfter(LocalDate.now())) {
            throw new BusinessException("VALIDATION_FAILED", "Week start date cannot be in the future");
        }
    }
}
