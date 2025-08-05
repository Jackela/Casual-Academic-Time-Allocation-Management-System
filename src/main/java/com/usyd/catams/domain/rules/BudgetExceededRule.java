
package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class BudgetExceededRule implements Specification<TimesheetValidationContext> {

    @Override
    public void isSatisfiedBy(TimesheetValidationContext context) throws BusinessException {
        // Pre-condition validation
        if (context.getHours() == null) {
            throw new BusinessException("VALIDATION_FAILED", "Hours cannot be null for budget calculation");
        }
        if (context.getHourlyRate() == null) {
            throw new BusinessException("VALIDATION_FAILED", "Hourly rate cannot be null for budget calculation");
        }

        // Existing business logic
        BigDecimal newPay = context.getHours().multiply(context.getHourlyRate());
        BigDecimal projectedBudget = context.getCourse().getBudgetUsed().add(newPay);

        if (projectedBudget.compareTo(context.getCourse().getBudgetAllocated()) > 0) {
            throw new BusinessException("BUDGET_EXCEEDED", "Creating this timesheet would exceed the course budget. " +
                "Current Used: " + context.getCourse().getBudgetUsed() + ", " +
                "New Pay: " + newPay + ", " +
                "Allocated: " + context.getCourse().getBudgetAllocated());
        }
    }
}
