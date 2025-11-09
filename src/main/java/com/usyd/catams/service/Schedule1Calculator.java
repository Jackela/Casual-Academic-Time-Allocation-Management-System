package com.usyd.catams.service;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

/**
 * Core Schedule 1 calculator encapsulating EA-compliant logic across key casual academic activities.
 */
@Service
public class Schedule1Calculator {

    private final Schedule1PolicyProvider policyProvider;

    public Schedule1Calculator(@Nullable Schedule1PolicyProvider policyProvider) {
        this.policyProvider = policyProvider != null ? policyProvider : new Schedule1PolicyProvider(null, null);
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
        TimesheetTaskType taskType = input.getTaskType();
        TutorQualification qualification = normaliseQualification(input.getQualification());
        LocalDate sessionDate = input.getSessionDate();

        return switch (taskType) {
            case TUTORIAL -> {
                boolean highBand = isHighBand(qualification);
                String rateCode = input.isRepeat()
                        ? (highBand ? "TU3" : "TU4")
                        : (highBand ? "TU1" : "TU2");
                TutorQualification policyQualification = highBand
                        ? resolveHighBandQualification(qualification)
                        : TutorQualification.STANDARD;
                TutorQualification fallbackQualification = highBand && qualification == TutorQualification.COORDINATOR
                        ? TutorQualification.PHD
                        : policyQualification;
                try {
                    yield policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, sessionDate);
                } catch (Schedule1PolicyProvider.RatePolicyNotFoundException ex) {
                    try {
                        yield policyProvider.resolveTutorialPolicy(
                                policyQualification,
                                input.isRepeat(),
                                sessionDate
                        );
                    } catch (Schedule1PolicyProvider.RatePolicyNotFoundException nested) {
                        if (policyQualification != fallbackQualification) {
                            yield policyProvider.resolveTutorialPolicy(
                                    fallbackQualification,
                                    input.isRepeat(),
                                    sessionDate
                            );
                        }
                        throw nested;
                    }
                }
            }
            case LECTURE -> {
                BigDecimal deliveryHours = normaliseHours(input.getDeliveryHours());
                String rateCode;
                if (input.isRepeat()) {
                    rateCode = "P04";
                } else if (isDevelopedLecture(deliveryHours, qualification)) {
                    rateCode = "P02";
                } else {
                    rateCode = "P03";
                }
                yield policyProvider.resolvePolicyByRateCode(rateCode, null, sessionDate);
            }
            case ORAA -> {
                boolean highBand = isHighBand(qualification);
                String rateCode = highBand ? "AO1_DE1" : "AO2_DE2";
                TutorQualification policyQualification = highBand
                        ? resolveHighBandQualification(qualification)
                        : TutorQualification.STANDARD;
                yield policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, sessionDate);
            }
            case DEMO -> {
                boolean highBand = isHighBand(qualification);
                String rateCode = highBand ? "DE1" : "DE2";
                TutorQualification policyQualification = highBand
                        ? resolveHighBandQualification(qualification)
                        : TutorQualification.STANDARD;
                yield policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, sessionDate);
            }
            case MARKING -> {
                boolean highBand = isHighBand(qualification);
                String rateCode = highBand ? "M04" : "M05";
                TutorQualification policyQualification = highBand
                        ? resolveHighBandQualification(qualification)
                        : TutorQualification.STANDARD;
                yield policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, sessionDate);
            }
            case OTHER -> {
                // OTHER task type maps to standard ORAA rate as a fallback for miscellaneous academic activities
                boolean highBand = isHighBand(qualification);
                String rateCode = highBand ? "AO1_DE1" : "AO2_DE2";
                TutorQualification policyQualification = highBand
                        ? resolveHighBandQualification(qualification)
                        : TutorQualification.STANDARD;
                yield policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, sessionDate);
            }
        };
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
        if (taskType == TimesheetTaskType.ORAA) {
            if ("AO1_DE1".equals(rawRateCode)) {
                return "AO1";
            }
            if ("AO2_DE2".equals(rawRateCode)) {
                return "AO2";
            }
        }
        return rawRateCode;
    }

    private TutorQualification resolveHighBandQualification(TutorQualification qualification) {
        return qualification == TutorQualification.COORDINATOR ? TutorQualification.COORDINATOR : TutorQualification.PHD;
    }

    private TutorQualification normaliseQualification(TutorQualification qualification) {
        return qualification == null ? TutorQualification.STANDARD : qualification;
    }

    private boolean isHighBand(TutorQualification qualification) {
        TutorQualification normalised = normaliseQualification(qualification);
        return normalised == TutorQualification.PHD || normalised == TutorQualification.COORDINATOR;
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
