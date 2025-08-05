
package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class HoursRangeRule implements Specification<TimesheetValidationContext> {

    private static final BigDecimal MIN_HOURS = new BigDecimal("0.1");

    @Value("${timesheet.hours.max:40}")
    private BigDecimal maxHours;

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        BigDecimal hours = context.getHours();
        if (hours == null || hours.compareTo(MIN_HOURS) < 0 || hours.compareTo(maxHours) > 0) {
            throw new BusinessException("INVALID_HOURS_RANGE", "Hours must be between " + MIN_HOURS + " and " + maxHours + ". Provided: " + hours);
        }
    }
}
