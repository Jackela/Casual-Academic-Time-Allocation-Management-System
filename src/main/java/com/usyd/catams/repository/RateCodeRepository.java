package com.usyd.catams.repository;

import com.usyd.catams.entity.RateCode;
import com.usyd.catams.enums.TimesheetTaskType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateCodeRepository extends JpaRepository<RateCode, Long> {

    List<RateCode> findByTaskType(TimesheetTaskType taskType);

    Optional<RateCode> findByCode(String code);
}
