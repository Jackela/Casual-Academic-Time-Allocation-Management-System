package com.usyd.catams.jpa;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.repository.TimesheetRepository;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Import(com.usyd.catams.config.ApplicationConfig.class)
public class TimesheetJpaLazyLoadingTest {

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Test
    void approvals_should_be_lazy_by_default_in_list_queries() {
        Timesheet t = new Timesheet(201L, 301L, LocalDate.now().with(java.time.DayOfWeek.MONDAY),
                new BigDecimal("2.0"), new BigDecimal("10.00"), "desc", 401L);
        t.setStatus(ApprovalStatus.DRAFT);
        timesheetRepository.saveAndFlush(t);

        Timesheet loaded = timesheetRepository.findAll().getFirst();
        // Expect LAZY: approvals should not be initialized here (red initially if EAGER)
        assertFalse(Hibernate.isInitialized(loaded.getApprovals()));
    }
}