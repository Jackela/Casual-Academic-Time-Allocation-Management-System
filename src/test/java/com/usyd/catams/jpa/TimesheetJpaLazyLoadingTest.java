package com.usyd.catams.jpa;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.repository.TimesheetRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceUnitUtil;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Import(com.usyd.catams.config.ApplicationConfig.class)
@TestPropertySource(properties = {
    "spring.flyway.enabled=false"
})
public class TimesheetJpaLazyLoadingTest {

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void approvals_should_be_lazy_by_default_in_list_queries() {
        Timesheet t = new Timesheet(201L, 301L, LocalDate.now().with(java.time.DayOfWeek.MONDAY),
                new BigDecimal("2.0"), new BigDecimal("10.00"), "desc", 401L);
        t.setStatus(ApprovalStatus.DRAFT);
        timesheetRepository.saveAndFlush(t);

        // Detach all to avoid returning the same managed instance
        entityManager.clear();

        Timesheet loaded = timesheetRepository.findAll().getFirst();
        PersistenceUnitUtil util = entityManager.getEntityManagerFactory().getPersistenceUnitUtil();
        // Expect LAZY: approvals attribute should not be loaded yet
        assertFalse(util.isLoaded(loaded, "approvals"));
    }
}