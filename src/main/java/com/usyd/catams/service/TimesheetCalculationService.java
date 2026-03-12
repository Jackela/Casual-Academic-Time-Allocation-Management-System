package com.usyd.catams.service;

import com.usyd.catams.domain.service.TimesheetValidationService;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.exception.BusinessRuleException;
import com.usyd.catams.exception.ErrorCodes;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Application-level orchestration for Schedule 1 calculation inputs.
 * Keeps controllers free from business-rule and pricing orchestration logic.
 */
@Service
@Transactional(readOnly = true)
public class TimesheetCalculationService {

    private final Schedule1Calculator schedule1Calculator;
    private final TimesheetValidationService timesheetValidationService;
    private final TimesheetQueryService timesheetQueryService;

    public TimesheetCalculationService(
        Schedule1Calculator schedule1Calculator,
        TimesheetValidationService timesheetValidationService,
        TimesheetQueryService timesheetQueryService
    ) {
        this.schedule1Calculator = schedule1Calculator;
        this.timesheetValidationService = timesheetValidationService;
        this.timesheetQueryService = timesheetQueryService;
    }

    public Schedule1CalculationResult calculateForQuote(
        Long courseId,
        TimesheetTaskType taskType,
        LocalDate sessionDate,
        BigDecimal deliveryHours,
        boolean repeat,
        TutorQualification qualification
    ) {
        return calculate(courseId, taskType, sessionDate, deliveryHours, repeat, qualification, "sessionDate");
    }

    public Schedule1CalculationResult calculateForCreateOrUpdate(
        Long courseId,
        TimesheetTaskType taskType,
        LocalDate sessionDate,
        BigDecimal deliveryHours,
        boolean repeat,
        TutorQualification qualification
    ) {
        return calculate(taskType, sessionDate, deliveryHours, repeat, qualification, "sessionDate");
    }

    private Schedule1CalculationResult calculateForQuote(
        Long courseId,
        TimesheetTaskType taskType,
        LocalDate sessionDate,
        BigDecimal deliveryHours,
        boolean repeat,
        TutorQualification qualification,
        String sessionField
    ) {
        Objects.requireNonNull(taskType, "taskType");
        Objects.requireNonNull(sessionDate, "sessionDate");
        Objects.requireNonNull(deliveryHours, "deliveryHours");

        timesheetValidationService.validateMonday(sessionDate, sessionField);
        validateTutorialDeliveryHours(taskType, deliveryHours);

        boolean effectiveRepeat = repeat;
        if (taskType == TimesheetTaskType.TUTORIAL && repeat && courseId != null) {
            effectiveRepeat = timesheetQueryService.isTutorialRepeatEligible(courseId, sessionDate);
        }

        return buildCalculation(taskType, sessionDate, deliveryHours, effectiveRepeat, qualification);
    }

    private Schedule1CalculationResult calculate(
        Long courseId,
        TimesheetTaskType taskType,
        LocalDate sessionDate,
        BigDecimal deliveryHours,
        boolean repeat,
        TutorQualification qualification,
        String sessionField
    ) {
        Objects.requireNonNull(taskType, "taskType");
        Objects.requireNonNull(sessionDate, "sessionDate");
        Objects.requireNonNull(deliveryHours, "deliveryHours");

        return calculateForQuote(courseId, taskType, sessionDate, deliveryHours, repeat, qualification, sessionField);
    }

    private Schedule1CalculationResult calculate(
        TimesheetTaskType taskType,
        LocalDate sessionDate,
        BigDecimal deliveryHours,
        boolean repeat,
        TutorQualification qualification,
        String sessionField
    ) {
        Objects.requireNonNull(taskType, "taskType");
        Objects.requireNonNull(sessionDate, "sessionDate");
        Objects.requireNonNull(deliveryHours, "deliveryHours");

        timesheetValidationService.validateMonday(sessionDate, sessionField);
        validateTutorialDeliveryHours(taskType, deliveryHours);

        return buildCalculation(taskType, sessionDate, deliveryHours, repeat, qualification);
    }

    private Schedule1CalculationResult buildCalculation(
        TimesheetTaskType taskType,
        LocalDate sessionDate,
        BigDecimal deliveryHours,
        boolean repeat,
        TutorQualification qualification
    ) {
        TutorQualification resolvedQualification = qualification != null
            ? qualification
            : TutorQualification.STANDARD;

        return schedule1Calculator.calculate(
            new Schedule1Calculator.CalculationInput(
                taskType,
                sessionDate,
                deliveryHours,
                repeat,
                resolvedQualification
            )
        );
    }

    private void validateTutorialDeliveryHours(TimesheetTaskType taskType, BigDecimal deliveryHours) {
        if (taskType != TimesheetTaskType.TUTORIAL) {
            return;
        }

        BigDecimal normalized = deliveryHours.setScale(1, RoundingMode.HALF_UP);
        if (normalized.compareTo(BigDecimal.ONE.setScale(1)) != 0) {
            throw new BusinessRuleException(
                "Delivery hours for Tutorial must be exactly 1.0",
                ErrorCodes.VALIDATION_FAILED
            );
        }
    }
}
