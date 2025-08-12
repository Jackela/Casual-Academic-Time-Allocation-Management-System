
package com.usyd.catams.domain.rules;

import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class HoursRangeRule implements Specification<TimesheetValidationContext> {

    private final TimesheetValidationProperties validationProps;

    public HoursRangeRule(TimesheetValidationProperties validationProps) {
        this.validationProps = validationProps;
    }

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        BigDecimal hours = context.getHours();
        BigDecimal minHours = validationProps.getMinHours();
        BigDecimal maxHours = validationProps.getHours().getMax();
        
        if (hours == null || hours.compareTo(minHours) < 0 || hours.compareTo(maxHours) > 0) {
            throw new BusinessException("INVALID_HOURS_RANGE", "Hours must be between " + minHours + " and " + maxHours + ". Provided: " + hours);
        }
    }
}
