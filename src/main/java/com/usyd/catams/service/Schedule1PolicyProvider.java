package com.usyd.catams.service;

import com.usyd.catams.entity.RateAmount;
import com.usyd.catams.entity.RateCode;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.repository.RateAmountRepository;
import com.usyd.catams.repository.RateCodeRepository;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

/**
 * Provides EA Schedule 1 policy data to calculation services. The provider
 * prefers database-backed rate configuration but transparently falls back to a
 * conservative in-memory catalogue so that the calculator can operate while the
 * seed data is being prepared.
 */
@Service
public class Schedule1PolicyProvider {

    private static final Logger log = LoggerFactory.getLogger(Schedule1PolicyProvider.class);

    private final RateCodeRepository rateCodeRepository;
    private final RateAmountRepository rateAmountRepository;
    private final Clock clock;
    private final Map<PolicyKey, List<RateSnapshot>> tutorialSnapshotIndex;

    @Autowired
    public Schedule1PolicyProvider(@Nullable RateCodeRepository rateCodeRepository,
                                   @Nullable RateAmountRepository rateAmountRepository) {
        this(rateCodeRepository, rateAmountRepository, Clock.systemDefaultZone());
    }

    private Schedule1PolicyProvider(@Nullable RateCodeRepository rateCodeRepository,
                                    @Nullable RateAmountRepository rateAmountRepository,
                                    Clock clock) {
        this.rateCodeRepository = rateCodeRepository;
        this.rateAmountRepository = rateAmountRepository;
        this.clock = clock == null ? Clock.systemDefaultZone() : clock;
        this.tutorialSnapshotIndex = initialiseTutorialSnapshotIndex();
    }

    /**
     * Returns the EA rule applicable for a tutorial entry given the tutor's
     * qualification, repeat status, and session date.
     */
    public RatePolicy resolveTutorialPolicy(TutorQualification qualification,
                                            boolean repeat,
                                            LocalDate sessionDate) {
        Objects.requireNonNull(qualification, "qualification");
        LocalDate targetDate = sessionDate != null ? sessionDate : LocalDate.now(clock);
        TimesheetTaskType taskType = TimesheetTaskType.TUTORIAL;
        PolicyKey key = new PolicyKey(taskType, qualification, repeat);
        List<RateSnapshot> snapshots = new ArrayList<>(tutorialSnapshotIndex.getOrDefault(key, Collections.emptyList()));
        if (snapshots.isEmpty()) {
            for (Map.Entry<PolicyKey, List<RateSnapshot>> entry : tutorialSnapshotIndex.entrySet()) {
                PolicyKey candidate = entry.getKey();
                if (candidate.taskType() == taskType && candidate.repeat() == repeat) {
                    snapshots.addAll(entry.getValue());
                }
            }
        }

        if (snapshots.isEmpty()) {
            throw new RatePolicyNotFoundException(
                    "No tutorial policy configured for task %s (qualification=%s, repeat=%s)"
                            .formatted(taskType, qualification, repeat)
            );
        }

        return snapshots.stream()
                .filter(snapshot -> snapshot.isEffectiveOn(targetDate))
                .findFirst()
                .map(snapshot -> snapshot.toPolicy(targetDate))
                .orElseGet(() -> snapshots.get(0).toPolicy(targetDate));
    }

    /**
     * Resolves a policy for the supplied rate code and qualification combination.
     */
    public RatePolicy resolvePolicyByRateCode(String rateCode,
                                              @Nullable TutorQualification qualification,
                                              LocalDate sessionDate) {
        Objects.requireNonNull(rateCode, "rateCode");
        LocalDate targetDate = sessionDate != null ? sessionDate : LocalDate.now(clock);
        List<RateSnapshot> snapshots = new ArrayList<>();
        if (rateCodeRepository != null && rateAmountRepository != null) {
            Optional<RateCode> maybeCode = rateCodeRepository.findByCode(rateCode);
            if (maybeCode.isPresent()) {
                snapshots.addAll(loadSnapshotsFor(maybeCode.get()));
            }
        }
        if (snapshots.isEmpty()) {
            snapshots.addAll(fallbackSnapshotsByRateCode(rateCode));
        }
        if (snapshots.isEmpty()) {
            throw new RatePolicyNotFoundException(
                    "No Schedule1 policy found for rate code %s".formatted(rateCode)
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

    private List<RateSnapshot> fallbackSnapshotsByRateCode(String rateCode) {
        return tutorialSnapshotIndex.values().stream()
                .flatMap(List::stream)
                .filter(snapshot -> snapshot.hasRateCode(rateCode))
                .collect(Collectors.toList());
    }

    /**
     * EA Schedule 1 tutorial repeat eligibility window (7 days).
     */
    public int getRepeatEligibilityWindowDays() {
        return 7;
    }

    private Map<PolicyKey, List<RateSnapshot>> initialiseTutorialSnapshotIndex() {
        Map<PolicyKey, List<RateSnapshot>> index = new HashMap<>();
        if (rateCodeRepository != null && rateAmountRepository != null) {
            List<RateCode> tutorialCodes = rateCodeRepository.findByTaskType(TimesheetTaskType.TUTORIAL);
            if (!tutorialCodes.isEmpty()) {
                index = tutorialCodes.stream()
                        .flatMap(code -> loadSnapshotsFor(code).stream())
                        .collect(Collectors.groupingBy(RateSnapshot::policyKey));
            }
        }

        if (index.isEmpty()) {
            log.warn("Falling back to built-in EA tutorial catalogue. Seed database tables for full coverage.");
            index = defaultTutorialCatalogue();
        } else {
            index.values().forEach(list -> list.sort((a, b) -> b.effectiveFrom.compareTo(a.effectiveFrom)));
        }
        return index;
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
        return snapshots;
    }

    private Map<PolicyKey, List<RateSnapshot>> defaultTutorialCatalogue() {
        Map<PolicyKey, List<RateSnapshot>> index = new HashMap<>();
        LocalDate effectiveDate = LocalDate.of(2024, 7, 1);

        // Tutorials
        addSnapshot(index, TimesheetTaskType.TUTORIAL, TutorQualification.STANDARD, false,
                "TU2", BigDecimal.ONE, new BigDecimal("2.0"), new BigDecimal("3.0"), new BigDecimal("175.94"),
                "Schedule 1 Clause 2.1", effectiveDate);
        addSnapshot(index, TimesheetTaskType.TUTORIAL, TutorQualification.STANDARD, true,
                "TU4", BigDecimal.ONE, BigDecimal.ONE, new BigDecimal("2.0"), new BigDecimal("117.29"),
                "Schedule 1 Clause 2.2", effectiveDate);
        addSnapshot(index, TimesheetTaskType.TUTORIAL, TutorQualification.PHD, false,
                "TU1", BigDecimal.ONE, new BigDecimal("2.0"), new BigDecimal("3.0"), new BigDecimal("210.19"),
                "Schedule 1 Clause 2.1", effectiveDate);
        addSnapshot(index, TimesheetTaskType.TUTORIAL, TutorQualification.PHD, true,
                "TU3", BigDecimal.ONE, BigDecimal.ONE, new BigDecimal("2.0"), new BigDecimal("140.14"),
                "Schedule 1 Clause 2.2", effectiveDate);

        // Lectures
        addSnapshot(index, TimesheetTaskType.LECTURE, TutorQualification.STANDARD, false,
                "P03", BigDecimal.ONE, new BigDecimal("2.0"), new BigDecimal("3.0"), new BigDecimal("245.08"),
                "Schedule 1 – Lecturing", effectiveDate);
        addSnapshot(index, TimesheetTaskType.LECTURE, TutorQualification.COORDINATOR, false,
                "P02", BigDecimal.ONE, new BigDecimal("3.0"), new BigDecimal("4.0"), new BigDecimal("326.78"),
                "Schedule 1 – Lecturing", effectiveDate);
        addSnapshot(index, TimesheetTaskType.LECTURE, TutorQualification.STANDARD, true,
                "P04", BigDecimal.ONE, BigDecimal.ONE, new BigDecimal("2.0"), new BigDecimal("163.41"),
                "Schedule 1 – Lecturing", effectiveDate);

        // ORAA
        addSnapshot(index, TimesheetTaskType.ORAA, TutorQualification.PHD, false,
                "AO1_DE1", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ONE, new BigDecimal("69.72"),
                "Schedule 1 Clause 3.1(a)", effectiveDate);
        addSnapshot(index, TimesheetTaskType.ORAA, TutorQualification.STANDARD, false,
                "AO2_DE2", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ONE, new BigDecimal("58.32"),
                "Schedule 1 Clause 3.1(a)", effectiveDate);

        // Demonstrations
        addSnapshot(index, TimesheetTaskType.DEMO, TutorQualification.PHD, false,
                "DE1", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ONE, new BigDecimal("69.72"),
                "Schedule 1 Clause 3.1(a)", effectiveDate);
        addSnapshot(index, TimesheetTaskType.DEMO, TutorQualification.STANDARD, false,
                "DE2", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ONE, new BigDecimal("58.32"),
                "Schedule 1 Clause 3.1(a)", effectiveDate);

        // Marking
        addSnapshot(index, TimesheetTaskType.MARKING, TutorQualification.PHD, false,
                "M04", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ONE, new BigDecimal("69.72"),
                "Schedule 1 – Marking", effectiveDate);
        addSnapshot(index, TimesheetTaskType.MARKING, TutorQualification.STANDARD, false,
                "M05", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ONE, new BigDecimal("58.32"),
                "Schedule 1 – Marking", effectiveDate);

        index.values().forEach(list -> list.sort((a, b) -> b.effectiveFrom.compareTo(a.effectiveFrom)));
        return index;
    }

    private void addSnapshot(Map<PolicyKey, List<RateSnapshot>> index,
                             TimesheetTaskType taskType,
                             TutorQualification qualification,
                             boolean repeat,
                             String rateCode,
                             BigDecimal deliveryHours,
                             BigDecimal associatedHours,
                             BigDecimal payableHours,
                             BigDecimal sessionAmount,
                             String clause,
                             LocalDate effectiveFrom) {

        BigDecimal hourlyRate = payableHours.signum() > 0
                ? sessionAmount.divide(payableHours, 6, RoundingMode.HALF_UP)
                : sessionAmount;

        PolicyKey key = new PolicyKey(taskType, qualification, repeat);
        RateSnapshot snapshot = new RateSnapshot(
                key,
                rateCode,
                deliveryHours,
                associatedHours,
                payableHours,
                sessionAmount,
                hourlyRate,
                clause,
                effectiveFrom,
                null
        );

        index.computeIfAbsent(key, unused -> new ArrayList<>()).add(snapshot);
    }

    /**
     * Identifier for policy lookup, scoped by task type, qualification and repeat status.
     */
    private record PolicyKey(TimesheetTaskType taskType, TutorQualification qualification, boolean repeat) { }

    /**
     * Internal snapshot representing a policy row.
     */
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

        private boolean hasRateCode(String code) {
            return rateCode.equals(code);
        }
    }

    /**
     * Public data structure returned to calculators.
     */
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

        /**
         * Determines the associated hours entitlement for a requested delivery portion.
         * Tutorials receive a flat entitlement up to the EA cap, so we clamp the
         * requested value accordingly.
         */
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
