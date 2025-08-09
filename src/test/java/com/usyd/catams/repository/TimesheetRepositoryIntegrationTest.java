package com.usyd.catams.repository;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
=======
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

<<<<<<< HEAD
class TimesheetRepositoryIntegrationTest extends IntegrationTestBase {
    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Timesheet timesheet1;
    private Timesheet timesheet2;
    private Timesheet timesheet3;

    @BeforeEach
    void setUp() {
        // Timesheet created by Lecturer for casual staff payment - awaiting lecturer approval
        timesheet1 = new Timesheet(
            1L, // casualStaffId (tutor/teaching assistant)
            1L, // courseId
            new WeekPeriod(LocalDate.of(2024, 1, 1)),
            new BigDecimal("10.5"), // hours worked
            new Money(new BigDecimal("25.00")), // hourly rate for casual academic staff
            "Tutorial preparation and delivery for COMP2022",
            1L // createdBy (lecturer who manages this course)
        );
        timesheet1.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        // Timesheet for different casual staff member - already HR approved for payment
        timesheet2 = new Timesheet(
            2L, // casualStaffId (different tutor)
            1L, // courseId (same course)
            new WeekPeriod(LocalDate.of(2024, 1, 8)),
            new BigDecimal("8.0"), // hours worked
            new Money(new BigDecimal("30.00")), // higher rate for senior tutor
            "Lab supervision and student assistance",
            2L // createdBy (lecturer)
        );
        timesheet2.setStatus(ApprovalStatus.FINAL_APPROVED);
        // Draft timesheet not yet submitted for approval
        timesheet3 = new Timesheet(
            1L, // casualStaffId (same tutor as timesheet1)
            2L, // courseId (different course)
            new WeekPeriod(LocalDate.of(2024, 1, 15)),
            new BigDecimal("5.5"), // hours for marking work
            new Money(new BigDecimal("25.00")), // standard marking rate
            "Assignment marking and feedback provision",
            1L // createdBy (lecturer)
        );
        timesheet3.setStatus(ApprovalStatus.DRAFT);

        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);
        entityManager.persistAndFlush(timesheet3);
    }

    // ... all other test methods from the original file
}
