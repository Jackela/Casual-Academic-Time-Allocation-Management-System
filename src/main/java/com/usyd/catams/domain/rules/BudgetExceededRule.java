
package com.usyd.catams.domain.rules;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.springframework.stereotype.Component;

@Component
public class BudgetExceededRule implements Specification<TimesheetValidationContext> {

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        // Pre-condition validation (rule-level, business semantics only)
        if (context.getHours() == null) {
            throw new BusinessException("VALIDATION_FAILED", "Hours cannot be null for budget calculation");
        }
        if (context.getHourlyRate() == null) {
            throw new BusinessException("VALIDATION_FAILED", "Hourly rate cannot be null for budget calculation");
        }

        // Domain-driven calculation using Money value object
        Money used = context.getCourse().getBudgetUsedMoney();
        Money allocated = context.getCourse().getBudgetAllocatedMoney();
        Money rate = Money.aud(context.getHourlyRate());
        Money newPay = rate.multiply(context.getHours());
        Money projectedUsed = used.add(newPay);

        if (projectedUsed.isGreaterThan(allocated)) {
            throw new BusinessException(
                "BUDGET_EXCEEDED",
                "Creating this timesheet would exceed the course budget. " +
                    "Current Used: " + used + ", " +
                    "New Pay: " + newPay + ", " +
                    "Allocated: " + allocated
            );
        }
    }
}
