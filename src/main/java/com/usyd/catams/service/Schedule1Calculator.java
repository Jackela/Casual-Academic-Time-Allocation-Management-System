package com.usyd.catams.service;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.strategy.TaskCalculationStrategy;
import com.usyd.catams.service.strategy.TaskCalculationStrategyFactory;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

/**
 * Core Schedule 1 calculator encapsulating EA-compliant logic across key casual academic activities.
 * 
 * Uses Strategy Pattern to delegate task-specific calculation logic to appropriate strategies.
 * 
 * @author Development Team
 * @since 1.0
 */
@Service
public class Schedule1Calculator {

    private final Schedule1PolicyProvider policyProvider;
    private final TaskCalculationStrategyFactory strategyFactory;

    public Schedule1Calculator(@Nullable Schedule1PolicyProvider policyProvider,
                               TaskCalculationStrategyFactory strategyFactory) {
        this.policyProvider = policyProvider != null ? policyProvider : new Schedule1PolicyProvider(null, null);
        this.strategyFactory = Objects.requireNonNull(strategyFactory, "strategyFactory");
    }

    /**
     * Legacy tutorial-specific calculation entry point retained temporarily while clients migrate.
     */
    public Schedule1CalculationResult calculateTutorial(TutorialInput input) {
        Objects.requireNonNull(input, "input");
        return calculate(input.toCalculationInput());
    }

    /**
     * Calculates the EA compliant outcome for the supplied Schedule 1 task.
     */
    public Schedule1CalculationResult calculate(CalculationInput input) {
        Objects.requireNonNull(input, "input");
        Objects.requireNonNull(input.getTaskType(), "taskType");
        Objects.requireNonNull(input.getSessionDate(), "sessionDate");
        Objects.requireNonNull(input.getDeliveryHours(), "deliveryHours");

        TimesheetTaskType taskType = input.getTaskType();
        Schedule1PolicyProvider.RatePolicy policy = resolvePolicy(input);

        BigDecimal normalisedDelivery = normaliseHours(input.getDeliveryHours());
        BigDecimal associatedEntitlement = policy.determineAssociatedHours(normalisedDelivery);
        BigDecimal payableHours = normalisedDelivery.add(associatedEntitlement);
        if (policy.getPayableHoursCap().signum() > 0) {
            payableHours = payableHours.min(policy.getPayableHoursCap());
        }
        payableHours = payableHours.setScale(1, RoundingMode.HALF_UP);

        BigDecimal amount = policy.getHourlyRateAud()
                .multiply(payableHours)
                .setScale(2, RoundingMode.HALF_UP);

        String clause = policy.getClauseReference() == null ? "Schedule 1" : policy.getClauseReference();
        String formula = "%s delivery + %s associated (EA %s)".formatted(
                formatHours(normalisedDelivery),
                formatHours(associatedEntitlement),
                clause
        );

        String displayRateCode = normaliseRateCode(taskType, policy.getRateCode(), input.isRepeat(), policy.getQualification());

        return new Schedule1CalculationResult(
                input.getSessionDate(),
                displayRateCode,
                policy.getQualification(),
                policy.isRepeat(),
                normalisedDelivery,
                associatedEntitlement,
                payableHours,
                policy.getHourlyRateAud(),
                amount,
                formula,
                policy.getClauseReference()
        );
    }

    private Schedule1PolicyProvider.RatePolicy resolvePolicy(CalculationInput input) {
        TaskCalculationStrategy strategy = strategyFactory.getStrategy(input.getTaskType());
        return strategy.resolvePolicy(input, policyProvider);
    }

    private boolean isDevelopedLecture(BigDecimal deliveryHours, TutorQualification qualification) {
        if (deliveryHours == null) {
            return false;
        }
        if (deliveryHours.compareTo(BigDecimal.ONE) > 0) {
            return true;
        }
        return qualification == TutorQualification.COORDINATOR;
    }

    private String normaliseRateCode(TimesheetTaskType taskType,
                                     String rawRateCode,
                                     boolean repeat,
                                     TutorQualification qualification) {
        // Delegate to strategy for task-specific normalization
        TaskCalculationStrategy strategy = strategyFactory.getStrategy(taskType);
        CalculationInput tempInput = new CalculationInput(
            taskType, null, null, repeat, qualification
        );
        return strategy.normalizeRateCode(rawRateCode, tempInput);
    }

    private BigDecimal normaliseHours(BigDecimal hours) {
        BigDecimal value = hours == null ? BigDecimal.ZERO : hours;
        return value.max(BigDecimal.ZERO).setScale(1, RoundingMode.HALF_UP);
    }

    private String formatHours(BigDecimal hours) {
        return hours.stripTrailingZeros().toPlainString() + "h";
    }

    /**
     * Normalised calculation input used by the calculator for any Schedule 1 task.
     */
    public static final class CalculationInput {
        private final TimesheetTaskType taskType;
        private final LocalDate sessionDate;
        private final BigDecimal deliveryHours;
        private final boolean repeat;
        private final TutorQualification qualification;

        public CalculationInput(TimesheetTaskType taskType,
                                LocalDate sessionDate,
                                BigDecimal deliveryHours,
                                boolean repeat,
                                TutorQualification qualification) {
            this.taskType = Objects.requireNonNull(taskType, "taskType");
            this.sessionDate = sessionDate;
            this.deliveryHours = deliveryHours;
            this.repeat = repeat;
            this.qualification = qualification == null ? TutorQualification.STANDARD : qualification;
        }

        public TimesheetTaskType getTaskType() {
            return taskType;
        }

        public LocalDate getSessionDate() {
            return sessionDate;
        }

        public BigDecimal getDeliveryHours() {
            return deliveryHours;
        }

        public boolean isRepeat() {
            return repeat;
        }

        public TutorQualification getQualification() {
            return qualification;
        }
    }

    /**
     * Input wrapper used to describe tutorial calculation requests.
     */
    public static final class TutorialInput {
        private final LocalDate sessionDate;
        private final BigDecimal deliveryHours;
        private final boolean repeat;
        private final TutorQualification qualification;

        public TutorialInput(LocalDate sessionDate,
                             BigDecimal deliveryHours,
                             boolean repeat,
                             TutorQualification qualification) {
            this.sessionDate = sessionDate;
            this.deliveryHours = deliveryHours;
            this.repeat = repeat;
            this.qualification = qualification == null ? TutorQualification.STANDARD : qualification;
        }

        public TutorialInput(LocalDate sessionDate,
                             BigDecimal deliveryHours,
                             boolean repeat,
                             String qualificationCode) {
            this(sessionDate, deliveryHours, repeat, parseQualification(qualificationCode));
        }

        public LocalDate getSessionDate() {
            return sessionDate;
        }

        public BigDecimal getDeliveryHours() {
            return deliveryHours;
        }

        public boolean isRepeat() {
            return repeat;
        }

        public TutorQualification getQualification() {
            return qualification;
        }

        private CalculationInput toCalculationInput() {
            return new CalculationInput(
                    TimesheetTaskType.TUTORIAL,
                    sessionDate,
                    deliveryHours,
                    repeat,
                    qualification
            );
        }

        private static TutorQualification parseQualification(String code) {
            if (code == null || code.trim().isEmpty()) {
                return TutorQualification.STANDARD;
            }
            try {
                return TutorQualification.valueOf(code.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Unsupported tutor qualification code: " + code, ex);
            }
        }
    }
}
