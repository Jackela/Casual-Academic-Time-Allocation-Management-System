
package com.usyd.catams.domain.rules;

import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class HourlyRateRangeRule implements Specification<TimesheetValidationContext> {

    private final TimesheetValidationProperties validationProps;

    public HourlyRateRangeRule(TimesheetValidationProperties validationProps) {
        this.validationProps = validationProps;
    }

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        BigDecimal hourlyRate = context.getHourlyRate();
        BigDecimal minRate = validationProps.getMinHourlyRate();
        BigDecimal maxRate = validationProps.getMaxHourlyRate();
        
        if (hourlyRate == null || hourlyRate.compareTo(minRate) < 0 || hourlyRate.compareTo(maxRate) > 0) {
            throw new BusinessException("INVALID_HOURLY_RATE_RANGE", "Hourly rate must be between " + minRate + " and " + maxRate + ". Provided: " + hourlyRate);
        }
    }
}
