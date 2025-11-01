package com.usyd.catams.repository;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

public class TimesheetRepositoryIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private EntityManager entityManager;

    private Timesheet timesheet1;
    private Timesheet timesheet2;
    private Timesheet timesheet3;

    @BeforeEach
    void setUp() {
        // Ensure clean state
        timesheetRepository.deleteAll();
        // Timesheet created by Lecturer for casual staff payment - awaiting lecturer approval
        timesheet1 = new Timesheet(
            1L, // casualStaffId (tutor/teaching assistant)
            1L, // courseId
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 1, 1))),
            new BigDecimal("10.5"), // hours worked
            new Money(new BigDecimal("25.00")), // hourly rate for casual academic staff
            "Tutorial preparation and delivery for COMP2022",
            1L // createdBy (lecturer who manages this course)
        );
        timesheet1.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        // Timesheet for different casual staff member - already HR approved for payment
        timesheet2 = new Timesheet(
            2L, // casualStaffId (different tutor)
            1L, // courseId (same course)
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 1, 8))),
            new BigDecimal("8.0"), // hours worked
            new Money(new BigDecimal("30.00")), // higher rate for senior tutor
            "Lab supervision and student assistance",
            2L // createdBy (lecturer)
        );
        timesheet2.setStatus(ApprovalStatus.FINAL_CONFIRMED);
        // Draft timesheet not yet submitted for approval
        timesheet3 = new Timesheet(
            1L, // casualStaffId (same tutor as timesheet1)
            2L, // courseId (different course)
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 1, 15))),
            new BigDecimal("5.5"), // hours for marking work
            new Money(new BigDecimal("25.00")), // standard marking rate
            "Assignment marking and feedback provision",
            1L // createdBy (lecturer)
        );
        timesheet3.setStatus(ApprovalStatus.DRAFT);

        entityManager.persist(timesheet1);
        entityManager.persist(timesheet2);
        entityManager.persist(timesheet3);
        entityManager.flush();
    }

    @Test
    void findByTutorId_ShouldReturnAllForTutor() {
        List<Timesheet> found = timesheetRepository.findByTutorId(1L);
        assertThat(found).extracting(Timesheet::getTutorId).containsOnly(1L);
        assertThat(found).hasSize(2);
    }

    @Test
    void findByCourseId_ShouldReturnAllForCourse() {
        List<Timesheet> found = timesheetRepository.findByCourseId(1L);
        assertThat(found).hasSize(2);
        assertThat(found).extracting(Timesheet::getCourseId).containsOnly(1L);
    }

    @Test
    void findByStatus_ShouldReturnByStatus() {
        List<Timesheet> drafts = timesheetRepository.findByStatus(ApprovalStatus.DRAFT);
        List<Timesheet> pending = timesheetRepository.findByStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        List<Timesheet> finalApproved = timesheetRepository.findByStatus(ApprovalStatus.FINAL_CONFIRMED);
        assertThat(drafts).hasSize(1);
        assertThat(pending).hasSize(1);
        assertThat(finalApproved).hasSize(1);
    }

    @Test
    void pagingAndFilters_ShouldWork() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> byTutor = timesheetRepository.findByTutorId(1L, pageable);
        assertThat(byTutor.getTotalElements()).isEqualTo(2);
        Page<Timesheet> filtered = timesheetRepository.findWithFilters(1L, 1L, ApprovalStatus.PENDING_TUTOR_CONFIRMATION, pageable);
        assertThat(filtered.getTotalElements()).isEqualTo(1);
    }

    @Test
    void countTutorialsForRepeatRule_inclusiveSevenDayWindow_countsPriorTutorial() {
        // Arrange: create a TUTORIAL entry on 2024-06-17 for course 1
        Timesheet tutorial = new Timesheet(
            3L,
            1L,
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 6, 17))),
            new BigDecimal("1.0"),
            new Money(new BigDecimal("42.00")),
            "EA Tutorial",
            10L
        );
        tutorial.setTaskType(com.usyd.catams.enums.TimesheetTaskType.TUTORIAL);
        tutorial.setStatus(ApprovalStatus.DRAFT);
        tutorial.setSessionDate(LocalDate.of(2024, 6, 17));
        entityManager.persist(tutorial);
        entityManager.flush();

        // Act: count between 2024-06-17 and 2024-06-24 inclusive
        long count = timesheetRepository.countTutorialsForRepeatRule(
            1L,
            LocalDate.of(2024, 6, 17),
            LocalDate.of(2024, 6, 24),
            null
        );

        // Assert
        assertThat(count).isGreaterThanOrEqualTo(1L);
    }
}
