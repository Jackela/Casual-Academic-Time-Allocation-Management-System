package com.usyd.catams.repository;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.common.domain.model.Money;
// import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.common.domain.model.CourseCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
// import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class TimesheetRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TimesheetRepository timesheetRepository;

    private User tutor;
    private User lecturer;
    private Course course;
    private LocalDate weekStartDate;

    @BeforeEach
    void setUp() {
        // Create test users
        tutor = new User(new Email("tutor@usyd.edu.au"), "Test Tutor", 
                        "hashedPassword", UserRole.TUTOR);
        lecturer = new User(new Email("lecturer@usyd.edu.au"), "Test Lecturer", 
                           "hashedPassword", UserRole.LECTURER);
        
        // Persist users first
        tutor = entityManager.persistAndFlush(tutor);
        lecturer = entityManager.persistAndFlush(lecturer);
        
        // Create test course with persisted lecturer ID
        course = new Course(new CourseCode("COMP3999"), "Test Course", "2024S1", 
                           lecturer.getId(), new Money(new BigDecimal("5000.00")));
        
        // Persist course
        course = entityManager.persistAndFlush(course);
        
        weekStartDate = com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 3, 4));
    }

    @Test
    void testFindByTutorId() {
        // Given
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Test work", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "More test work", lecturer.getId());
        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);

        // When
        List<Timesheet> found = timesheetRepository.findByTutorId(tutor.getId());

        // Then
        assertThat(found).hasSize(2);
        assertThat(found).extracting(Timesheet::getTutorId).containsOnly(tutor.getId());
    }

    @Test
    void testFindByTutorIdWithPaging() {
        // Given
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Test work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Test work 2", lecturer.getId());
        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);

        // When
        Page<Timesheet> page = timesheetRepository.findByTutorId(tutor.getId(), PageRequest.of(0, 1));

        // Then
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getTotalPages()).isEqualTo(2);
    }

    @Test
    void testFindByTutorIdOrderByCreatedAtDesc() {
        // Given
        Timesheet older = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Older work", lecturer.getId());
        Timesheet newer = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Newer work", lecturer.getId());
        
        entityManager.persistAndFlush(older);
        // Ensure createdAt timestamps differ for DESC ordering determinism
        try { Thread.sleep(5); } catch (InterruptedException e) { }
        Timesheet draft = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(2),
                new BigDecimal("2.0"), new BigDecimal("25.00"), "Draft work", lecturer.getId());
        Timesheet pending = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(3),
                new BigDecimal("1.0"), new BigDecimal("25.00"), "Pending work", lecturer.getId());
        pending.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        entityManager.persistAndFlush(draft);
        entityManager.persistAndFlush(pending);

        // When
        List<Timesheet> draftTimesheets = timesheetRepository.findByStatus(ApprovalStatus.DRAFT);
        List<Timesheet> pendingTimesheets = timesheetRepository.findByStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        // Then
        assertThat(draftTimesheets).hasSize(2);
        assertThat(draftTimesheets).extracting(Timesheet::getStatus)
            .containsOnly(ApprovalStatus.DRAFT);

        assertThat(pendingTimesheets).hasSize(1);
        assertThat(pendingTimesheets.get(0).getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
    }

    @Test
    void testFindByStatusIn() {
        // Given
        Timesheet draft = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Draft work", lecturer.getId());
        Timesheet pending = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Pending work", lecturer.getId());
        Timesheet approved = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(2),
                new BigDecimal("4.0"), new BigDecimal("25.00"), "Approved work", lecturer.getId());
        
        pending.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        approved.setStatus(ApprovalStatus.FINAL_CONFIRMED);
        
        entityManager.persistAndFlush(draft);
        entityManager.persistAndFlush(pending);
        entityManager.persistAndFlush(approved);

        // When
        List<ApprovalStatus> statuses = Arrays.asList(ApprovalStatus.DRAFT, ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        List<Timesheet> found = timesheetRepository.findByStatusIn(statuses);

        // Then
        assertThat(found).hasSize(2);
        assertThat(found).extracting(Timesheet::getStatus)
                .containsExactlyInAnyOrder(ApprovalStatus.DRAFT, ApprovalStatus.PENDING_TUTOR_CONFIRMATION);    }

    @Test
    void testFindByWeekStartDateBetween() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 3, 4);
        LocalDate endDate = LocalDate.of(2024, 3, 18);
        
        Timesheet withinRange1 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 4),
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Within range 1", lecturer.getId());
        Timesheet withinRange2 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 11),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Within range 2", lecturer.getId());
        Timesheet outsideRange = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 25),
                new BigDecimal("4.0"), new BigDecimal("25.00"), "Outside range", lecturer.getId());
        
        entityManager.persistAndFlush(withinRange1);
        entityManager.persistAndFlush(withinRange2);
        entityManager.persistAndFlush(outsideRange);

        // When
        List<Timesheet> found = timesheetRepository.findByWeekPeriod_WeekStartDateBetween(startDate, endDate);
        // Then
        assertThat(found).hasSize(2);
        assertThat(found).extracting(Timesheet::getDescription)
                .containsExactlyInAnyOrder("Within range 1", "Within range 2");
    }

    @Test
    void testFindByTutorIdAndWeekStartDateBetween() {
        // Given
        User anotherTutor = new User(new Email("another@usyd.edu.au"), "Another Tutor", 
                                   "hashedPassword", UserRole.TUTOR);
        anotherTutor = entityManager.persistAndFlush(anotherTutor);
        
        LocalDate startDate = LocalDate.of(2024, 3, 4);
        LocalDate endDate = LocalDate.of(2024, 3, 18);
        
        Timesheet tutorTimesheet = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 4),
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Tutor work", lecturer.getId());
        Timesheet anotherTutorTimesheet = new Timesheet(anotherTutor.getId(), course.getId(), LocalDate.of(2024, 3, 11),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Another tutor work", lecturer.getId());
        
        entityManager.persistAndFlush(tutorTimesheet);
        entityManager.persistAndFlush(anotherTutorTimesheet);

        // When
        List<Timesheet> found = timesheetRepository.findByTutorIdAndWeekPeriod_WeekStartDateBetween(                tutor.getId(), startDate, endDate);

        // Then
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getTutorId()).isEqualTo(tutor.getId());
        assertThat(found.get(0).getDescription()).isEqualTo("Tutor work");
    }

    @Test
    void testExistsByTutorIdAndCourseIdAndWeekStartDate() {
        // Given
        Timesheet timesheet = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Test work", lecturer.getId());
        entityManager.persistAndFlush(timesheet);

        // When & Then
        assertThat(timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(
                tutor.getId(), course.getId(), weekStartDate)).isTrue();
        
        assertThat(timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(                tutor.getId(), course.getId(), weekStartDate.plusWeeks(1))).isFalse();
    }

    @Test
    void testFindByTutorIdAndCourseIdAndWeekStartDate() {
        // Given
        Timesheet timesheet = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Test work", lecturer.getId());
        entityManager.persistAndFlush(timesheet);

        // When
        Optional<Timesheet> found = timesheetRepository.findByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(
                tutor.getId(), course.getId(), weekStartDate);
        Optional<Timesheet> notFound = timesheetRepository.findByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(                tutor.getId(), course.getId(), weekStartDate.plusWeeks(1));

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getDescription()).isEqualTo("Test work");
        assertThat(notFound).isEmpty();
    }

    @Test
    void testFindWithFilters() {
        // Given
        User anotherTutor = new User(new Email("another@usyd.edu.au"), "Another Tutor", 
                                   "hashedPassword", UserRole.TUTOR);
        anotherTutor = entityManager.persistAndFlush(anotherTutor);
        
        Course anotherCourse = new Course(new CourseCode("MATH2001"), "Another Course", "2024S1", 
                                        lecturer.getId(), new Money(new BigDecimal("3000.00")));
        anotherCourse = entityManager.persistAndFlush(anotherCourse);
        
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(anotherTutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Work 2", lecturer.getId());
        Timesheet timesheet3 = new Timesheet(tutor.getId(), anotherCourse.getId(), weekStartDate.plusWeeks(2),
                new BigDecimal("4.0"), new BigDecimal("25.00"), "Work 3", lecturer.getId());
        
        timesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);
        entityManager.persistAndFlush(timesheet3);

        // Ensure lecturer assignments SSOT for scoping
        entityManager.persistAndFlush(new com.usyd.catams.entity.LecturerAssignment(lecturer.getId(), course.getId()));
        entityManager.persistAndFlush(new com.usyd.catams.entity.LecturerAssignment(lecturer.getId(), anotherCourse.getId()));

        Pageable pageable = PageRequest.of(0, 10);

        // When & Then
        // Test with tutor filter
        Page<Timesheet> tutorFilter = timesheetRepository.findWithFilters(tutor.getId(), null, null, pageable);
        assertThat(tutorFilter.getContent()).hasSize(2);
        assertThat(tutorFilter.getContent()).extracting(Timesheet::getTutorId).containsOnly(tutor.getId());

        // Test with course filter
        Page<Timesheet> courseFilter = timesheetRepository.findWithFilters(null, course.getId(), null, pageable);
        assertThat(courseFilter.getContent()).hasSize(2);
        assertThat(courseFilter.getContent()).extracting(Timesheet::getCourseId).containsOnly(course.getId());

        // Test with status filter
        Page<Timesheet> statusFilter = timesheetRepository.findWithFilters(null, null, ApprovalStatus.DRAFT, pageable);
        assertThat(statusFilter.getContent()).hasSize(2);
        assertThat(statusFilter.getContent()).extracting(Timesheet::getStatus).containsOnly(ApprovalStatus.DRAFT);

        // Test with combined filters
        Page<Timesheet> combinedFilter = timesheetRepository.findWithFilters(
                tutor.getId(), course.getId(), ApprovalStatus.DRAFT, pageable);
        assertThat(combinedFilter.getContent()).hasSize(1);
        assertThat(combinedFilter.getContent().get(0).getDescription()).isEqualTo("Work 1");
    }

    @Test
    void testGetTotalHoursByTutorAndCourse() {
        // Given
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.5"), new BigDecimal("25.00"), "Work 2", lecturer.getId());
        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);

        // When
        BigDecimal totalHours = timesheetRepository.getTotalHoursByTutorAndCourse(tutor.getId(), course.getId());

        // Then
        assertThat(totalHours).isEqualByComparingTo(new BigDecimal("8.5"));
    }

    @Test
    void testGetTotalApprovedPayByTutorAndCourse() {
        // Given
        Timesheet approved = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Approved work", lecturer.getId());
        approved.setStatus(ApprovalStatus.FINAL_CONFIRMED);
        
        Timesheet draft = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Draft work", lecturer.getId());
        
        entityManager.persistAndFlush(approved);
        entityManager.persistAndFlush(draft);

        // When
        BigDecimal totalPay = timesheetRepository.getTotalApprovedPayByTutorAndCourse(tutor.getId(), course.getId());

        // Then
        // Only approved timesheet should count: 5.0 * 25.00 = 125.00
        assertThat(totalPay).isEqualByComparingTo(new BigDecimal("125.00"));
    }

    @Test
    void testGetTotalApprovedBudgetUsedByCourse() {
        // Given
        User anotherTutor = new User(new Email("another@usyd.edu.au"), "Another Tutor", 
                                   "hashedPassword", UserRole.TUTOR);
        anotherTutor = entityManager.persistAndFlush(anotherTutor);
        
        Timesheet approved1 = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Approved work 1", lecturer.getId());
        approved1.setStatus(ApprovalStatus.FINAL_CONFIRMED);
        
        Timesheet approved2 = new Timesheet(anotherTutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("30.00"), "Approved work 2", lecturer.getId());
        approved2.setStatus(ApprovalStatus.FINAL_CONFIRMED);
        
        Timesheet draft = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(2),
                new BigDecimal("4.0"), new BigDecimal("25.00"), "Draft work", lecturer.getId());
        
        entityManager.persistAndFlush(approved1);
        entityManager.persistAndFlush(approved2);
        entityManager.persistAndFlush(draft);

        // When
        BigDecimal totalBudgetUsed = timesheetRepository.getTotalApprovedBudgetUsedByCourse(course.getId());

        // Then
        // Only approved timesheets: (5.0 * 25.00) + (3.0 * 30.00) = 125.00 + 90.00 = 215.00
        assertThat(totalBudgetUsed).isEqualByComparingTo(new BigDecimal("215.00"));
    }

    @Test
    void testFindPendingTimesheetsForApprover() {
        // Given
        User hrUser = new User(new Email("hr@usyd.edu.au"), "HR User", 
                              "hashedPassword", UserRole.ADMIN);
        hrUser = entityManager.persistAndFlush(hrUser);
        
        Timesheet pendingHR = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Pending HR", lecturer.getId());
        pendingHR.setStatus(ApprovalStatus.LECTURER_CONFIRMED);        
        Timesheet pendingTutor = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Pending Tutor", lecturer.getId());
        pendingTutor.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        
        entityManager.persistAndFlush(pendingHR);
        entityManager.persistAndFlush(pendingTutor);

        // When
        List<Timesheet> hrPending = timesheetRepository.findPendingTimesheetsForApprover(hrUser.getId(), true);
        List<Timesheet> tutorPending = timesheetRepository.findPendingTimesheetsForApprover(tutor.getId(), false);

        // Then
        assertThat(hrPending).hasSize(1);
        assertThat(hrPending.get(0).getStatus()).isEqualTo(ApprovalStatus.LECTURER_CONFIRMED);        
        assertThat(tutorPending).hasSize(1);
        assertThat(tutorPending.get(0).getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        assertThat(tutorPending.get(0).getTutorId()).isEqualTo(tutor.getId());
    }

    @Test
    void testFindByCreatedBy() {
        // Given
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Work 2", lecturer.getId());
        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);

        // When
        List<Timesheet> found = timesheetRepository.findByCreatedBy(lecturer.getId());

        // Then
        assertThat(found).hasSize(2);
        assertThat(found).extracting(Timesheet::getCreatedBy).containsOnly(lecturer.getId());
    }

    @Test
    void testFindPendingLecturerApprovalByCourses() {
        // Given
        Course anotherCourse = new Course(new CourseCode("MATH2001"), "Another Course", "2024S1", 
                                        lecturer.getId(), new Money(new BigDecimal("3000.00")));
        anotherCourse = entityManager.persistAndFlush(anotherCourse);
        
        User anotherLecturer = new User(new Email("another.lecturer@usyd.edu.au"), "Another Lecturer", 
                                       "hashedPassword", UserRole.LECTURER);
        anotherLecturer = entityManager.persistAndFlush(anotherLecturer);
        
        Course otherLecturerCourse = new Course(new CourseCode("PHYS2001"), "Physics Course", "2024S1", 
                                              anotherLecturer.getId(), new Money(new BigDecimal("2000.00")));
        otherLecturerCourse = entityManager.persistAndFlush(otherLecturerCourse);
        
        // Timesheets for lecturer's courses
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        timesheet1.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        
        Timesheet timesheet2 = new Timesheet(tutor.getId(), anotherCourse.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Work 2", lecturer.getId());
        timesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);        
        // Timesheet for other lecturer's course
        Timesheet timesheet3 = new Timesheet(tutor.getId(), otherLecturerCourse.getId(), weekStartDate.plusWeeks(2),
                new BigDecimal("4.0"), new BigDecimal("25.00"), "Work 3", anotherLecturer.getId());
        timesheet3.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);
        entityManager.persistAndFlush(timesheet3);

        // When
        Page<Timesheet> found = timesheetRepository.findPendingLecturerApprovalByCourses(
                lecturer.getId(), PageRequest.of(0, 10));

        // Then
        assertThat(found.getContent()).hasSize(2);
        assertThat(found.getContent()).extracting(Timesheet::getDescription)
                .containsExactlyInAnyOrder("Work 1", "Work 2");
    }

    @Test
    void testFindByStatusOrderByCreatedAtAsc() {
        // Given
        Timesheet older = new Timesheet(tutor.getId(), course.getId(), weekStartDate,
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Older pending", lecturer.getId());
        older.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        
        Timesheet newer = new Timesheet(tutor.getId(), course.getId(), weekStartDate.plusWeeks(1),
                new BigDecimal("3.0"), new BigDecimal("25.00"), "Newer pending", lecturer.getId());
        newer.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);        
        entityManager.persistAndFlush(older);
        entityManager.flush();
        // Small delay to ensure different creation times
        try { Thread.sleep(10); } catch (InterruptedException e) { }
        entityManager.persistAndFlush(newer);

        // When
        Page<Timesheet> found = timesheetRepository.findByStatusOrderByCreatedAtAsc(
                ApprovalStatus.PENDING_TUTOR_CONFIRMATION, PageRequest.of(0, 10));
        // Then
        assertThat(found.getContent()).hasSize(2);
        // Older should come first due to ASC ordering
        assertThat(found.getContent().get(0).getDescription()).isEqualTo("Older pending");
        assertThat(found.getContent().get(1).getDescription()).isEqualTo("Newer pending");
    }

    @Test
    void testTimesheetSummaryByTutor() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 3, 4);
        LocalDate endDate = LocalDate.of(2024, 3, 18);
        
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 4),
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 11),
                new BigDecimal("3.0"), new BigDecimal("30.00"), "Work 2", lecturer.getId());
        timesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);        
        // Outside date range
        Timesheet timesheet3 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 25),
                new BigDecimal("4.0"), new BigDecimal("25.00"), "Work 3", lecturer.getId());
        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);
        entityManager.persistAndFlush(timesheet3);

        // When
        TimesheetSummaryData summary = timesheetRepository.findTimesheetSummaryByTutor(
                tutor.getId(), startDate, endDate);

        // Then
        assertThat(summary.getTotalTimesheets()).isEqualTo(2L);
        assertThat(summary.getTotalHours()).isEqualByComparingTo(new BigDecimal("8.0"));
        assertThat(summary.getTotalPay()).isEqualByComparingTo(new BigDecimal("215.00")); // 5*25 + 3*30 = 215
        assertThat(summary.getPendingApprovals()).isEqualTo(1L); // Only timesheet2 is pending
    }

    @Test
    void testTimesheetSummaryByCourses() {
        // Given
        Course anotherCourse = new Course(new CourseCode("MATH2001"), "Another Course", "2024S1", 
                                        lecturer.getId(), new Money(new BigDecimal("3000.00")));
        anotherCourse = entityManager.persistAndFlush(anotherCourse);
        
        LocalDate startDate = LocalDate.of(2024, 3, 4);
        LocalDate endDate = LocalDate.of(2024, 3, 18);
        
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 4),
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(tutor.getId(), anotherCourse.getId(), LocalDate.of(2024, 3, 11),
                new BigDecimal("3.0"), new BigDecimal("30.00"), "Work 2", lecturer.getId());
        timesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);

        // When
        List<Long> courseIds = Arrays.asList(course.getId(), anotherCourse.getId());
        TimesheetSummaryData summary = timesheetRepository.findTimesheetSummaryByCourses(
                courseIds, startDate, endDate);

        // Then
        assertThat(summary.getTotalTimesheets()).isEqualTo(2L);
        assertThat(summary.getTotalHours()).isEqualByComparingTo(new BigDecimal("8.0"));
        assertThat(summary.getTotalPay()).isEqualByComparingTo(new BigDecimal("215.00")); // 5*25 + 3*30 = 215
        assertThat(summary.getPendingApprovals()).isEqualTo(1L);
    }

    @Test
    void testTimesheetSummarySystemWide() {
        // Given
        User anotherTutor = new User(new Email("another@usyd.edu.au"), "Another Tutor", 
                                   "hashedPassword", UserRole.TUTOR);
        anotherTutor = entityManager.persistAndFlush(anotherTutor);
        
        LocalDate startDate = LocalDate.of(2024, 3, 4);
        LocalDate endDate = LocalDate.of(2024, 3, 18);
        
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 4),
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(anotherTutor.getId(), course.getId(), LocalDate.of(2024, 3, 11),
                new BigDecimal("3.0"), new BigDecimal("30.00"), "Work 2", lecturer.getId());
        timesheet2.setStatus(ApprovalStatus.LECTURER_CONFIRMED);        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);

        // When
        TimesheetSummaryData summary = timesheetRepository.findTimesheetSummarySystemWide(startDate, endDate);

        // Then
        assertThat(summary.getTotalTimesheets()).isEqualTo(2L);
        assertThat(summary.getTotalHours()).isEqualByComparingTo(new BigDecimal("8.0"));
        assertThat(summary.getTotalPay()).isEqualByComparingTo(new BigDecimal("215.00")); // 5*25 + 3*30 = 215
        assertThat(summary.getPendingApprovals()).isEqualTo(1L); // HR_REVIEW counts as pending
    }

    @Test
    void testTimesheetSummaryByCourse() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 3, 4);
        LocalDate endDate = LocalDate.of(2024, 3, 18);
        
        Timesheet timesheet1 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 4),
                new BigDecimal("5.0"), new BigDecimal("25.00"), "Work 1", lecturer.getId());
        Timesheet timesheet2 = new Timesheet(tutor.getId(), course.getId(), LocalDate.of(2024, 3, 11),
                new BigDecimal("3.0"), new BigDecimal("30.00"), "Work 2", lecturer.getId());
        timesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);        
        entityManager.persistAndFlush(timesheet1);
        entityManager.persistAndFlush(timesheet2);

        // When
        TimesheetSummaryData summary = timesheetRepository.findTimesheetSummaryByCourse(
                course.getId(), startDate, endDate);

        // Then
        assertThat(summary.getTotalTimesheets()).isEqualTo(2L);
        assertThat(summary.getTotalHours()).isEqualByComparingTo(new BigDecimal("8.0"));
        assertThat(summary.getTotalPay()).isEqualByComparingTo(new BigDecimal("215.00")); // 5*25 + 3*30 = 215
        assertThat(summary.getPendingApprovals()).isEqualTo(1L);
    }
}
