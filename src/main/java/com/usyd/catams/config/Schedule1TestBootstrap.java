package com.usyd.catams.config;

import com.usyd.catams.entity.PolicyVersion;
import com.usyd.catams.entity.RateAmount;
import com.usyd.catams.entity.RateCode;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.repository.PolicyVersionRepository;
import com.usyd.catams.repository.RateAmountRepository;
import com.usyd.catams.repository.RateCodeRepository;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds minimum Schedule 1 catalog data for the H2-backed test profile.
 *
 * <p>This is not a runtime fallback. It is deterministic test bootstrap data so
 * strict policy-provider startup checks can remain enabled.</p>
 */
@Component("schedule1TestBootstrap")
@Profile("test")
public class Schedule1TestBootstrap {

    private final RateCodeRepository rateCodeRepository;
    private final RateAmountRepository rateAmountRepository;
    private final PolicyVersionRepository policyVersionRepository;

    public Schedule1TestBootstrap(RateCodeRepository rateCodeRepository,
                                  RateAmountRepository rateAmountRepository,
                                  PolicyVersionRepository policyVersionRepository) {
        this.rateCodeRepository = rateCodeRepository;
        this.rateAmountRepository = rateAmountRepository;
        this.policyVersionRepository = policyVersionRepository;
    }

    @PostConstruct
    @Transactional
    public void seed() {
        PolicyVersion policy = policyVersionRepository
            .findByEaReferenceAndMajorVersionAndMinorVersion("EA-2023-2026-Schedule-1", 2023, 0)
            .orElseGet(() -> {
                PolicyVersion version = new PolicyVersion();
                version.setEaReference("EA-2023-2026-Schedule-1");
                version.setMajorVersion(2023);
                version.setMinorVersion(0);
                version.setEffectiveFrom(LocalDate.of(2025, 7, 1));
                version.setEffectiveTo(null);
                version.setSourceDocumentUrl("test://schedule1");
                version.setNotes("Seeded for test profile strict startup");
                return policyVersionRepository.save(version);
            });

        RateCode tu1 = ensureRateCode("TU1", TimesheetTaskType.TUTORIAL, false, true, "Schedule 1 – Tutoring");
        RateCode tu2 = ensureRateCode("TU2", TimesheetTaskType.TUTORIAL, false, false, "Schedule 1 – Tutoring");
        RateCode tu3 = ensureRateCode("TU3", TimesheetTaskType.TUTORIAL, true, true, "Schedule 1 – Tutoring");
        RateCode tu4 = ensureRateCode("TU4", TimesheetTaskType.TUTORIAL, true, false, "Schedule 1 – Tutoring");

        RateCode p02 = ensureRateCode("P02", TimesheetTaskType.LECTURE, false, true, "Schedule 1 – Lecturing");
        RateCode p03 = ensureRateCode("P03", TimesheetTaskType.LECTURE, false, false, "Schedule 1 – Lecturing");
        RateCode p04 = ensureRateCode("P04", TimesheetTaskType.LECTURE, true, false, "Schedule 1 – Lecturing");

        RateCode ao1de1 = ensureRateCode("AO1_DE1", TimesheetTaskType.ORAA, false, true, "Schedule 1 – ORAA");
        RateCode ao2de2 = ensureRateCode("AO2_DE2", TimesheetTaskType.ORAA, false, false, "Schedule 1 – ORAA");
        RateCode de1 = ensureRateCode("DE1", TimesheetTaskType.DEMO, false, true, "Schedule 1 – Demonstrations");
        RateCode de2 = ensureRateCode("DE2", TimesheetTaskType.DEMO, false, false, "Schedule 1 – Demonstrations");
        RateCode m04 = ensureRateCode("M04", TimesheetTaskType.MARKING, false, true, "Schedule 1 – Marking");
        RateCode m05 = ensureRateCode("M05", TimesheetTaskType.MARKING, false, false, "Schedule 1 – Marking");

        LocalDate effectiveFrom = LocalDate.of(2025, 7, 1);
        ensureRateAmount(tu1, policy, effectiveFrom, TutorQualification.PHD, "218.07", "2.0", "3.0");
        ensureRateAmount(tu1, policy, effectiveFrom, TutorQualification.COORDINATOR, "218.07", "2.0", "3.0");
        ensureRateAmount(tu2, policy, effectiveFrom, TutorQualification.STANDARD, "182.54", "2.0", "3.0");
        ensureRateAmount(tu3, policy, effectiveFrom, TutorQualification.PHD, "145.38", "1.0", "2.0");
        ensureRateAmount(tu3, policy, effectiveFrom, TutorQualification.COORDINATOR, "145.38", "1.0", "2.0");
        ensureRateAmount(tu4, policy, effectiveFrom, TutorQualification.STANDARD, "121.69", "1.0", "2.0");

        ensureRateAmount(p02, policy, effectiveFrom, TutorQualification.COORDINATOR, "326.78", "3.0", "4.0");
        ensureRateAmount(p03, policy, effectiveFrom, TutorQualification.STANDARD, "245.08", "2.0", "3.0");
        ensureRateAmount(p04, policy, effectiveFrom, TutorQualification.STANDARD, "163.41", "1.0", "2.0");

        ensureRateAmount(ao1de1, policy, effectiveFrom, TutorQualification.PHD, "69.72", "0.0", "1.0");
        ensureRateAmount(ao2de2, policy, effectiveFrom, TutorQualification.STANDARD, "58.32", "0.0", "1.0");
        ensureRateAmount(de1, policy, effectiveFrom, TutorQualification.PHD, "69.72", "0.0", "1.0");
        ensureRateAmount(de2, policy, effectiveFrom, TutorQualification.STANDARD, "58.32", "0.0", "1.0");
        ensureRateAmount(m04, policy, effectiveFrom, TutorQualification.PHD, "69.72", "0.0", "1.0");
        ensureRateAmount(m05, policy, effectiveFrom, TutorQualification.STANDARD, "58.32", "0.0", "1.0");
    }

    private RateCode ensureRateCode(String code,
                                    TimesheetTaskType taskType,
                                    boolean repeatable,
                                    boolean requiresPhd,
                                    String clause) {
        return rateCodeRepository.findByCode(code).orElseGet(() -> {
            RateCode rateCode = new RateCode();
            rateCode.setCode(code);
            rateCode.setTaskType(taskType);
            rateCode.setDescription("Test seeded rate code " + code);
            rateCode.setDefaultAssociatedHours(BigDecimal.ZERO);
            rateCode.setDefaultDeliveryHours(BigDecimal.ONE);
            rateCode.setRepeatable(repeatable);
            rateCode.setRequiresPhd(requiresPhd);
            rateCode.setEaClauseReference(clause);
            return rateCodeRepository.save(rateCode);
        });
    }

    private void ensureRateAmount(RateCode rateCode,
                                  PolicyVersion policyVersion,
                                  LocalDate effectiveFrom,
                                  TutorQualification qualification,
                                  String hourlyAmount,
                                  String maxAssociatedHours,
                                  String maxPayableHours) {
        if (rateAmountRepository.findByRateCodeAndPolicyVersionAndQualification(rateCode, policyVersion, qualification).isPresent()) {
            return;
        }
        RateAmount rateAmount = new RateAmount();
        rateAmount.setRateCode(rateCode);
        rateAmount.setPolicyVersion(policyVersion);
        rateAmount.setYearLabel("2025-07");
        rateAmount.setEffectiveFrom(effectiveFrom);
        rateAmount.setEffectiveTo(null);
        rateAmount.setHourlyAmountAud(new BigDecimal(hourlyAmount));
        rateAmount.setQualification(qualification);
        rateAmount.setMaxAssociatedHours(new BigDecimal(maxAssociatedHours));
        rateAmount.setMaxPayableHours(new BigDecimal(maxPayableHours));
        rateAmount.setNotes("Seeded for test profile strict startup");
        rateAmountRepository.save(rateAmount);
    }
}
