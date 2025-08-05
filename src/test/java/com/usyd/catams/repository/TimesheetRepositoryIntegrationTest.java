package com.usyd.catams.repository;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class TimesheetRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:13")
            .withDatabaseName("catams_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

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
        timesheet1.setStatus(ApprovalStatus.PENDING_LECTURER_APPROVAL);

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
        timesheet2.setStatus(ApprovalStatus.APPROVED);

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

    @Test
    void findByCasualStaffId_ShouldReturnTimesheetsForSpecificCasualStaff() {
        // When: Repository searches for timesheets by casual staff member ID
        List<Timesheet> result = timesheetRepository.findByTutorId(1L);

        // Then: Should return all timesheets for that casual staff member across different courses
        assertThat(result).hasSize(2);
        assertThat(result).extracting(Timesheet::getTutorId).containsOnly(1L);
        assertThat(result).extracting(Timesheet::getCourseId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void findByTutorIdWithPaging_ShouldReturnPagedResults() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Timesheet> result = timesheetRepository.findByTutorId(1L, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getTotalPages()).isEqualTo(2);
        assertThat(result.getContent().get(0).getTutorId()).isEqualTo(1L);
    }

    @Test
    void findByTutorIdOrderByCreatedAtDesc_ShouldReturnOrderedResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> result = timesheetRepository.findByTutorIdOrderByCreatedAtDesc(1L, pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getCreatedAt())
            .isAfterOrEqualTo(result.getContent().get(1).getCreatedAt());
    }

    @Test
    void findByCourseId_ShouldReturnTimesheetsForSpecificCourse() {
        List<Timesheet> result = timesheetRepository.findByCourseId(1L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Timesheet::getCourseId).containsOnly(1L);
        assertThat(result).extracting(Timesheet::getTutorId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void findByTutorIdAndCourseId_ShouldReturnSpecificTutorCourseTimesheets() {
        List<Timesheet> result = timesheetRepository.findByTutorIdAndCourseId(1L, 1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTutorId()).isEqualTo(1L);
        assertThat(result.get(0).getCourseId()).isEqualTo(1L);
    }

    @Test
    void findByStatus_ShouldReturnTimesheetsWithSpecificStatus() {
        List<Timesheet> result = timesheetRepository.findByStatus(ApprovalStatus.PENDING_LECTURER_APPROVAL);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(ApprovalStatus.PENDING_LECTURER_APPROVAL);
    }

    @Test
    void findByStatusIn_ShouldReturnTimesheetsWithMultipleStatuses() {
        List<ApprovalStatus> statuses = List.of(ApprovalStatus.DRAFT, ApprovalStatus.APPROVED);
        List<Timesheet> result = timesheetRepository.findByStatusIn(statuses);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Timesheet::getStatus)
            .containsExactlyInAnyOrder(ApprovalStatus.DRAFT, ApprovalStatus.APPROVED);
    }

    @Test
    void findByTutorIdAndStatus_ShouldReturnFilteredResults() {
        List<Timesheet> result = timesheetRepository.findByTutorIdAndStatus(1L, ApprovalStatus.DRAFT);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTutorId()).isEqualTo(1L);
        assertThat(result.get(0).getStatus()).isEqualTo(ApprovalStatus.DRAFT);
    }

    @Test
    void findByCourseIdAndStatus_ShouldReturnFilteredResults() {
        List<Timesheet> result = timesheetRepository.findByCourseIdAndStatus(1L, ApprovalStatus.APPROVED);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCourseId()).isEqualTo(1L);
        assertThat(result.get(0).getStatus()).isEqualTo(ApprovalStatus.APPROVED);
    }

    @Test
    void findByWeekStartDateBetween_ShouldReturnTimesheetsInDateRange() {
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);

        List<Timesheet> result = timesheetRepository.findByWeekStartDateBetween(startDate, endDate);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(t -> 
            !t.getWeekStartDate().isBefore(startDate) && !t.getWeekStartDate().isAfter(endDate));
    }

    @Test
    void findByTutorIdAndWeekStartDateBetween_ShouldReturnFilteredDateRange() {
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 20);

        List<Timesheet> result = timesheetRepository.findByTutorIdAndWeekStartDateBetween(1L, startDate, endDate);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(t -> t.getTutorId().equals(1L));
        assertThat(result).allMatch(t -> 
            !t.getWeekStartDate().isBefore(startDate) && !t.getWeekStartDate().isAfter(endDate));
    }

    @Test
    void existsByTutorIdAndCourseIdAndWeekStartDate_ShouldReturnTrueWhenExists() {
        boolean exists = timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(
            1L, 1L, LocalDate.of(2024, 1, 1));

        assertThat(exists).isTrue();
    }

    @Test
    void existsByTutorIdAndCourseIdAndWeekStartDate_ShouldReturnFalseWhenNotExists() {
        boolean exists = timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(
            1L, 1L, LocalDate.of(2024, 2, 1));

        assertThat(exists).isFalse();
    }

    @Test
    void findByTutorIdAndCourseIdAndWeekStartDate_ShouldReturnTimesheetWhenExists() {
        Optional<Timesheet> result = timesheetRepository.findByTutorIdAndCourseIdAndWeekStartDate(
            1L, 1L, LocalDate.of(2024, 1, 1));

        assertThat(result).isPresent();
        assertThat(result.get().getTutorId()).isEqualTo(1L);
        assertThat(result.get().getCourseId()).isEqualTo(1L);
        assertThat(result.get().getWeekStartDate()).isEqualTo(LocalDate.of(2024, 1, 1));
    }

    @Test
    void findByTutorIdAndCourseIdAndWeekStartDate_ShouldReturnEmptyWhenNotExists() {
        Optional<Timesheet> result = timesheetRepository.findByTutorIdAndCourseIdAndWeekStartDate(
            1L, 1L, LocalDate.of(2024, 2, 1));

        assertThat(result).isEmpty();
    }

    @Test
    void findWithFilters_ShouldReturnAllWhenNoFilters() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> result = timesheetRepository.findWithFilters(null, null, null, pageable);

        assertThat(result.getContent()).hasSize(3);
    }

    @Test
    void findWithFilters_ShouldFilterByTutorId() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> result = timesheetRepository.findWithFilters(1L, null, null, pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).allMatch(t -> t.getTutorId().equals(1L));
    }

    @Test
    void findWithFilters_ShouldFilterByCourseId() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> result = timesheetRepository.findWithFilters(null, 1L, null, pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).allMatch(t -> t.getCourseId().equals(1L));
    }

    @Test
    void findWithFilters_ShouldFilterByStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> result = timesheetRepository.findWithFilters(null, null, ApprovalStatus.APPROVED, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent()).allMatch(t -> t.getStatus().equals(ApprovalStatus.APPROVED));
    }

    @Test
    void findWithFilters_ShouldCombineMultipleFilters() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> result = timesheetRepository.findWithFilters(1L, 1L, ApprovalStatus.PENDING_LECTURER_APPROVAL, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTutorId()).isEqualTo(1L);
        assertThat(result.getContent().get(0).getCourseId()).isEqualTo(1L);
        assertThat(result.getContent().get(0).getStatus()).isEqualTo(ApprovalStatus.PENDING_LECTURER_APPROVAL);
    }

    @Test
    void getTotalHoursByTutorAndCourse_ShouldReturnCorrectSum() {
        BigDecimal result = timesheetRepository.getTotalHoursByTutorAndCourse(1L, 1L);

        assertThat(result).isEqualByComparingTo(new BigDecimal("10.5"));
    }

    @Test
    void getTotalHoursByTutorAndCourse_ShouldReturnZeroWhenNoTimesheets() {
        BigDecimal result = timesheetRepository.getTotalHoursByTutorAndCourse(999L, 999L);

        assertThat(result).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void getTotalApprovedPayByTutorAndCourse_ShouldReturnCorrectSum() {
        // Change timesheet2 status to FINAL_APPROVED for this test
        timesheet2.setStatus(ApprovalStatus.FINAL_APPROVED);
        entityManager.merge(timesheet2);
        entityManager.flush();

        BigDecimal result = timesheetRepository.getTotalApprovedPayByTutorAndCourse(2L, 1L);

        // 8.0 hours * $30.00 = $240.00
        assertThat(result).isEqualByComparingTo(new BigDecimal("240.00"));
    }

    @Test
    void getTotalApprovedBudgetUsedByCourse_ShouldReturnCorrectSum() {
        // Change timesheet2 status to FINAL_APPROVED for this test
        timesheet2.setStatus(ApprovalStatus.FINAL_APPROVED);
        entityManager.merge(timesheet2);
        entityManager.flush();

        BigDecimal result = timesheetRepository.getTotalApprovedBudgetUsedByCourse(1L);

        // Only timesheet2 is FINAL_APPROVED: 8.0 hours * $30.00 = $240.00
        assertThat(result).isEqualByComparingTo(new BigDecimal("240.00"));
    }

    @Test
    void findPendingTimesheetsForApprover_ShouldReturnHRTimesheets() {
        // Create timesheet with PENDING_HR_REVIEW status
        Timesheet hrTimesheet = new Timesheet(
            3L, 3L, new WeekPeriod(LocalDate.of(2024, 1, 22)),
            new BigDecimal("6.0"), new Money(new BigDecimal("28.00")),
            "HR review needed", 3L
        );
        hrTimesheet.setStatus(ApprovalStatus.PENDING_HR_REVIEW);
        entityManager.persistAndFlush(hrTimesheet);

        List<Timesheet> result = timesheetRepository.findPendingTimesheetsForApprover(1L, true);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(ApprovalStatus.PENDING_HR_REVIEW);
    }

    @Test
    void findPendingTimesheetsForApprover_ShouldReturnTutorTimesheets() {
        // Create timesheet with PENDING_TUTOR_REVIEW status
        Timesheet tutorTimesheet = new Timesheet(
            1L, 3L, new WeekPeriod(LocalDate.of(2024, 1, 22)),
            new BigDecimal("7.0"), new Money(new BigDecimal("26.00")),
            "Tutor review needed", 3L
        );
        tutorTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        entityManager.persistAndFlush(tutorTimesheet);

        List<Timesheet> result = timesheetRepository.findPendingTimesheetsForApprover(1L, false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(result.get(0).getTutorId()).isEqualTo(1L);
    }

    @Test
    void findByCreatedBy_ShouldReturnTimesheetsCreatedByUser() {
        List<Timesheet> result = timesheetRepository.findByCreatedBy(1L);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(t -> t.getCreatedBy().equals(1L));
    }

    @Test
    void findByCreatedByWithPaging_ShouldReturnPagedResults() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Timesheet> result = timesheetRepository.findByCreatedBy(1L, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent().get(0).getCreatedBy()).isEqualTo(1L);
    }

    @Test
    void findByStatusOrderByCreatedAtAsc_ShouldReturnOrderedResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Timesheet> result = timesheetRepository.findByStatusOrderByCreatedAtAsc(ApprovalStatus.PENDING_LECTURER_APPROVAL, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getStatus()).isEqualTo(ApprovalStatus.PENDING_LECTURER_APPROVAL);
    }

    @Test
    void findCasualStaffPayrollSummary_ShouldReturnCorrectAggregationForPayment() {
        // When: University payroll system requests summary for specific casual staff member
        TimesheetSummaryData result = timesheetRepository.findTimesheetSummaryByTutor(
            1L, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31));

        // Then: Should return accurate payment summary for casual academic staff
        assertThat(result.getTotalTimesheets()).isEqualTo(2L); // Two pay periods
        assertThat(result.getTotalHours()).isEqualByComparingTo(new BigDecimal("16.0")); // 10.5 + 5.5 total hours
        assertThat(result.getTotalPay()).isEqualByComparingTo(new BigDecimal("400.0")); // (10.5*25) + (5.5*25) total payment
        assertThat(result.getPendingApprovals()).isEqualTo(1L); // One timesheet still awaiting approval
    }

    @Test
    void findTimesheetSummarySystemWide_ShouldReturnCorrectAggregation() {
        TimesheetSummaryData result = timesheetRepository.findTimesheetSummarySystemWide(
            LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31));

        assertThat(result.getTotalTimesheets()).isEqualTo(3L);
        assertThat(result.getTotalHours()).isEqualByComparingTo(new BigDecimal("24.0")); // 10.5 + 8.0 + 5.5
        assertThat(result.getTotalPay()).isEqualByComparingTo(new BigDecimal("640.0")); // (10.5*25) + (8.0*30) + (5.5*25)
        assertThat(result.getPendingApprovals()).isEqualTo(1L); // Only timesheet1 is pending
    }

    @Test
    void findTimesheetSummaryByCourse_ShouldReturnCorrectAggregation() {
        TimesheetSummaryData result = timesheetRepository.findTimesheetSummaryByCourse(
            1L, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31));

        assertThat(result.getTotalTimesheets()).isEqualTo(2L);
        assertThat(result.getTotalHours()).isEqualByComparingTo(new BigDecimal("18.5")); // 10.5 + 8.0
        assertThat(result.getTotalPay()).isEqualByComparingTo(new BigDecimal("502.5")); // (10.5*25) + (8.0*30)
        assertThat(result.getPendingApprovals()).isEqualTo(1L); // Only timesheet1 is pending
    }
}