package com.usyd.catams.repository;

import com.usyd.catams.entity.PolicyVersion;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PolicyVersionRepository extends JpaRepository<PolicyVersion, Long> {

    List<PolicyVersion> findByEffectiveFromLessThanEqualAndEffectiveToGreaterThan(LocalDate startInclusive, LocalDate endExclusive);

    List<PolicyVersion> findByEffectiveFromLessThanEqualAndEffectiveToIsNull(LocalDate date);

    Optional<PolicyVersion> findByEaReferenceAndMajorVersionAndMinorVersion(String eaReference, int majorVersion, int minorVersion);
}
