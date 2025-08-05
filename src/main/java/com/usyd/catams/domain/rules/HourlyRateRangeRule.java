
package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class HourlyRateRangeRule implements Specification<TimesheetValidationContext> {

    private static final BigDecimal MIN_HOURLY_RATE = new BigDecimal("10.00");
    private static final BigDecimal MAX_HOURLY_RATE = new BigDecimal("200.00");

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        BigDecimal hourlyRate = context.getHourlyRate();
        if (hourlyRate == null || hourlyRate.compareTo(MIN_HOURLY_RATE) < 0 || hourlyRate.compareTo(MAX_HOURLY_RATE) > 0) {
            throw new BusinessException("INVALID_HOURLY_RATE_RANGE", "Hourly rate must be between " + MIN_HOURLY_RATE + " and " + MAX_HOURLY_RATE + ". Provided: " + hourlyRate);
        }
    }
}
