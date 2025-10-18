package com.usyd.catams.repository;

import com.usyd.catams.entity.RateAmount;
import com.usyd.catams.entity.RateCode;
import com.usyd.catams.enums.TutorQualification;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RateAmountRepository extends JpaRepository<RateAmount, Long> {

    @Query("""
        SELECT ra FROM RateAmount ra
        WHERE ra.rateCode = :rateCode
          AND ra.effectiveFrom <= :targetDate
          AND (ra.effectiveTo IS NULL OR ra.effectiveTo > :targetDate)
        ORDER BY ra.effectiveFrom DESC
    """)
    List<RateAmount> findActiveAmounts(@Param("rateCode") RateCode rateCode, @Param("targetDate") LocalDate targetDate);

    @Query("""
        SELECT ra FROM RateAmount ra
        WHERE ra.rateCode = :rateCode
          AND ra.qualification = :qualification
          AND ra.effectiveFrom <= :targetDate
          AND (ra.effectiveTo IS NULL OR ra.effectiveTo > :targetDate)
        ORDER BY ra.effectiveFrom DESC
    """)
    List<RateAmount> findActiveAmountsForQualification(
            @Param("rateCode") RateCode rateCode,
            @Param("qualification") TutorQualification qualification,
            @Param("targetDate") LocalDate targetDate);
}
