package com.usyd.catams.service;

import com.usyd.catams.entity.RateAmount;
import com.usyd.catams.entity.RateCode;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.repository.PolicyVersionRepository;
import com.usyd.catams.repository.RateAmountRepository;
import com.usyd.catams.repository.RateCodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Provides Schedule 1 policy data to calculation services.
 *
 * <p>Fail-fast policy: provider initialization requires database-backed rate
 * configuration. Missing repository data is treated as startup/configuration
 * failure and must not silently fallback.</p>
 */
@Service
@DependsOn("schedule1TestBootstrap")
public class Schedule1PolicyProvider {

    private final RateCodeRepository rateCodeRepository;
    private final RateAmountRepository rateAmountRepository;
    private final PolicyVersionRepository policyVersionRepository;
    private final Environment environment;
    private final Clock clock;
    private final Map<PolicyKey, List<RateSnapshot>> tutorialSnapshotIndex;

    @Autowired
    public Schedule1PolicyProvider(RateCodeRepository rateCodeRepository,
                                   RateAmountRepository rateAmountRepository,
                                   PolicyVersionRepository policyVersionRepository,
                                   Environment environment) {
        this(rateCodeRepository, rateAmountRepository, policyVersionRepository, environment, Clock.systemDefaultZone());
    }

    Schedule1PolicyProvider(RateCodeRepository rateCodeRepository,
                            RateAmountRepository rateAmountRepository,
                            PolicyVersionRepository policyVersionRepository,
                            Environment environment,
                            Clock clock) {
        this.rateCodeRepository = Objects.requireNonNull(rateCodeRepository, "rateCodeRepository");
        this.rateAmountRepository = Objects.requireNonNull(rateAmountRepository, "rateAmountRepository");
        this.policyVersionRepository = Objects.requireNonNull(policyVersionRepository, "policyVersionRepository");
        this.environment = environment;
        this.clock = clock == null ? Clock.systemDefaultZone() : clock;
        this.tutorialSnapshotIndex = initialiseTutorialSnapshotIndex();
    }

    /**
     * Returns the policy applicable for tutorial entries.
     */
    public RatePolicy resolveTutorialPolicy(TutorQualification qualification,
                                            boolean repeat,
                                            LocalDate sessionDate) {
        Objects.requireNonNull(qualification, "qualification");
        LocalDate targetDate = sessionDate != null ? sessionDate : LocalDate.now(clock);
        PolicyKey key = new PolicyKey(TimesheetTaskType.TUTORIAL, qualification, repeat);

        List<RateSnapshot> snapshots = new ArrayList<>(tutorialSnapshotIndex.getOrDefault(key, Collections.emptyList()));
        if (snapshots.isEmpty()) {
            for (Map.Entry<PolicyKey, List<RateSnapshot>> entry : tutorialSnapshotIndex.entrySet()) {
                PolicyKey candidate = entry.getKey();
                if (candidate.taskType() == TimesheetTaskType.TUTORIAL && candidate.repeat() == repeat) {
                    snapshots.addAll(entry.getValue());
                }
            }
        }

        if (snapshots.isEmpty()) {
            throw new RatePolicyNotFoundException(
                "No tutorial policy configured for qualification=%s, repeat=%s".formatted(qualification, repeat)
            );
        }

        return snapshots.stream()
            .filter(snapshot -> snapshot.isEffectiveOn(targetDate))
            .findFirst()
            .map(snapshot -> snapshot.toPolicy(targetDate))
            .orElseGet(() -> snapshots.get(0).toPolicy(targetDate));
    }

    /**
     * Resolves a policy for the supplied rate code and qualification.
     */
    public RatePolicy resolvePolicyByRateCode(String rateCode,
                                              TutorQualification qualification,
                                              LocalDate sessionDate) {
        Objects.requireNonNull(rateCode, "rateCode");
        LocalDate targetDate = sessionDate != null ? sessionDate : LocalDate.now(clock);

        RateCode code = rateCodeRepository.findByCode(rateCode)
            .orElseThrow(() -> new RatePolicyNotFoundException(
                "No Schedule1 rate code found for %s".formatted(rateCode)
            ));

        List<RateSnapshot> snapshots = loadSnapshotsFor(code);
        if (snapshots.isEmpty()) {
            throw new RatePolicyNotFoundException(
                "No active Schedule1 rates configured for rate code %s".formatted(rateCode)
            );
        }

        List<RateSnapshot> matches = snapshots.stream()
            .filter(snapshot -> qualification == null || snapshot.policyKey().qualification() == qualification)
            .filter(snapshot -> snapshot.isEffectiveOn(targetDate))
            .collect(Collectors.toList());

        if (matches.isEmpty() && qualification == TutorQualification.COORDINATOR) {
            matches = snapshots.stream()
                .filter(snapshot -> snapshot.policyKey().qualification() == TutorQualification.PHD)
                .filter(snapshot -> snapshot.isEffectiveOn(targetDate))
                .collect(Collectors.toList());
        } else if (matches.isEmpty() && qualification == TutorQualification.PHD) {
            matches = snapshots.stream()
                .filter(snapshot -> snapshot.policyKey().qualification() == TutorQualification.COORDINATOR)
                .filter(snapshot -> snapshot.isEffectiveOn(targetDate))
                .collect(Collectors.toList());
        }

        RateSnapshot selected;
        if (!matches.isEmpty()) {
            selected = matches.get(0);
        } else {
            selected = snapshots.stream()
                .filter(snapshot -> snapshot.isEffectiveOn(targetDate))
                .findFirst()
                .orElse(snapshots.get(0));
        }

        return selected.toPolicy(targetDate);
    }

    public int getRepeatEligibilityWindowDays() {
        return 7;
    }

    private Map<PolicyKey, List<RateSnapshot>> initialiseTutorialSnapshotIndex() {
        List<RateCode> tutorialCodes = rateCodeRepository.findByTaskType(TimesheetTaskType.TUTORIAL);
        if (tutorialCodes.isEmpty()) {
            throw new IllegalStateException("No tutorial rate codes configured for Schedule1PolicyProvider");
        }

        Map<PolicyKey, List<RateSnapshot>> index = new HashMap<>();
        for (RateCode code : tutorialCodes) {
            for (RateSnapshot snapshot : loadSnapshotsFor(code)) {
                index.computeIfAbsent(snapshot.policyKey(), unused -> new ArrayList<>()).add(snapshot);
            }
        }

        if (index.isEmpty()) {
            throw new IllegalStateException("No active tutorial rate amounts configured for Schedule1PolicyProvider");
        }

        index.values().forEach(list -> list.sort((a, b) -> b.effectiveFrom.compareTo(a.effectiveFrom)));
        return Collections.unmodifiableMap(index);
    }

    private List<RateSnapshot> loadSnapshotsFor(RateCode rateCode) {
        List<RateSnapshot> snapshots = new ArrayList<>();
        List<RateAmount> rateAmounts = rateAmountRepository.findActiveAmounts(rateCode, LocalDate.now(clock));
        for (RateAmount amount : rateAmounts) {
            TutorQualification qualification = Optional.ofNullable(amount.getQualification())
                .orElse(TutorQualification.STANDARD);
            boolean repeat = rateCode.isRepeatable();
            snapshots.add(RateSnapshot.from(rateCode, amount, qualification, repeat));
        }
        snapshots.sort((a, b) -> b.effectiveFrom.compareTo(a.effectiveFrom));
        return snapshots;
    }

    private record PolicyKey(TimesheetTaskType taskType, TutorQualification qualification, boolean repeat) { }

    private static final class RateSnapshot {
        private final PolicyKey policyKey;
        private final String rateCode;
        private final BigDecimal deliveryHours;
        private final BigDecimal associatedHoursCap;
        private final BigDecimal payableHoursCap;
        private final BigDecimal sessionAmount;
        private final BigDecimal hourlyRate;
        private final String clauseReference;
        private final LocalDate effectiveFrom;
        private final LocalDate effectiveTo;

        private RateSnapshot(PolicyKey policyKey,
                             String rateCode,
                             BigDecimal deliveryHours,
                             BigDecimal associatedHoursCap,
                             BigDecimal payableHoursCap,
                             BigDecimal sessionAmount,
                             BigDecimal hourlyRate,
                             String clauseReference,
                             LocalDate effectiveFrom,
                             LocalDate effectiveTo) {
            this.policyKey = policyKey;
            this.rateCode = rateCode;
            this.deliveryHours = deliveryHours;
            this.associatedHoursCap = associatedHoursCap;
            this.payableHoursCap = payableHoursCap;
            this.sessionAmount = sessionAmount;
            this.hourlyRate = hourlyRate;
            this.clauseReference = clauseReference;
            this.effectiveFrom = effectiveFrom;
            this.effectiveTo = effectiveTo;
        }

        private static RateSnapshot from(RateCode code,
                                         RateAmount amount,
                                         TutorQualification qualification,
                                         boolean repeat) {
            BigDecimal deliveryHours = Optional.ofNullable(code.getDefaultDeliveryHours())
                .orElse(BigDecimal.ONE);
            BigDecimal associatedCap = Optional.ofNullable(amount.getMaxAssociatedHours())
                .orElse(Optional.ofNullable(code.getDefaultAssociatedHours()).orElse(BigDecimal.ZERO));
            BigDecimal payableCap = Optional.ofNullable(amount.getMaxPayableHours())
                .orElse(associatedCap.add(deliveryHours));
            if (payableCap == null || payableCap.signum() <= 0) {
                payableCap = associatedCap.add(deliveryHours);
            }
            if (payableCap.signum() <= 0) {
                payableCap = BigDecimal.ONE;
            }

            BigDecimal sessionAmount = amount.getHourlyAmountAud();
            BigDecimal hourlyRate = sessionAmount.divide(payableCap, 6, RoundingMode.HALF_UP);

            return new RateSnapshot(
                new PolicyKey(code.getTaskType(), qualification, repeat),
                code.getCode(),
                deliveryHours,
                associatedCap,
                payableCap,
                sessionAmount,
                hourlyRate,
                code.getEaClauseReference(),
                amount.getEffectiveFrom(),
                amount.getEffectiveTo()
            );
        }

        private PolicyKey policyKey() {
            return policyKey;
        }

        private boolean isEffectiveOn(LocalDate date) {
            boolean afterStart = !date.isBefore(effectiveFrom);
            boolean beforeEnd = effectiveTo == null || date.isBefore(effectiveTo);
            return afterStart && beforeEnd;
        }

        private RatePolicy toPolicy(LocalDate targetDate) {
            return new RatePolicy(
                policyKey.taskType,
                policyKey.qualification,
                policyKey.repeat,
                rateCode,
                deliveryHours,
                associatedHoursCap,
                payableHoursCap,
                sessionAmount,
                hourlyRate,
                clauseReference,
                targetDate
            );
        }
    }

    public static final class RatePolicy {
        private final TimesheetTaskType taskType;
        private final TutorQualification qualification;
        private final boolean repeat;
        private final String rateCode;
        private final BigDecimal deliveryHours;
        private final BigDecimal associatedHoursCap;
        private final BigDecimal payableHoursCap;
        private final BigDecimal sessionAmountAud;
        private final BigDecimal hourlyRateAud;
        private final String clauseReference;
        private final LocalDate resolvedForDate;

        private RatePolicy(TimesheetTaskType taskType,
                           TutorQualification qualification,
                           boolean repeat,
                           String rateCode,
                           BigDecimal deliveryHours,
                           BigDecimal associatedHoursCap,
                           BigDecimal payableHoursCap,
                           BigDecimal sessionAmountAud,
                           BigDecimal hourlyRateAud,
                           String clauseReference,
                           LocalDate resolvedForDate) {
            this.taskType = taskType;
            this.qualification = qualification;
            this.repeat = repeat;
            this.rateCode = rateCode;
            this.deliveryHours = deliveryHours;
            this.associatedHoursCap = associatedHoursCap;
            this.payableHoursCap = payableHoursCap;
            this.sessionAmountAud = sessionAmountAud;
            this.hourlyRateAud = hourlyRateAud;
            this.clauseReference = clauseReference;
            this.resolvedForDate = resolvedForDate;
        }

        public TimesheetTaskType getTaskType() {
            return taskType;
        }

        public TutorQualification getQualification() {
            return qualification;
        }

        public boolean isRepeat() {
            return repeat;
        }

        public String getRateCode() {
            return rateCode;
        }

        public BigDecimal getDeliveryHours() {
            return deliveryHours;
        }

        public BigDecimal getAssociatedHoursCap() {
            return associatedHoursCap;
        }

        public BigDecimal getPayableHoursCap() {
            return payableHoursCap;
        }

        public BigDecimal getSessionAmountAud() {
            return sessionAmountAud;
        }

        public BigDecimal getHourlyRateAud() {
            return hourlyRateAud;
        }

        public String getClauseReference() {
            return clauseReference;
        }

        public LocalDate getResolvedForDate() {
            return resolvedForDate;
        }

        public BigDecimal determineAssociatedHours(BigDecimal deliveryHoursRequested) {
            BigDecimal entitlement = associatedHoursCap;
            if (payableHoursCap.signum() > 0) {
                BigDecimal maxAssociatedGivenPayable = payableHoursCap.subtract(
                    deliveryHoursRequested == null ? deliveryHours : deliveryHoursRequested
                );
                entitlement = entitlement.min(maxAssociatedGivenPayable.max(BigDecimal.ZERO));
            }
            return entitlement.max(BigDecimal.ZERO).setScale(1, RoundingMode.HALF_UP);
        }
    }

    public static class RatePolicyNotFoundException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public RatePolicyNotFoundException(String message) {
            super(message);
        }
    }
}
