package com.usyd.catams.repository;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.testdata.TestDataBuilder;
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

import com.usyd.catams.repository.LecturerAssignmentRepository;

import static org.assertj.core.api.Assertions.assertThat;

public class TimesheetRepositoryIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LecturerAssignmentRepository lecturerAssignmentRepository;

    @Autowired
    private EntityManager entityManager;

    private Timesheet timesheet1;
    private Timesheet timesheet2;
    private Timesheet timesheet3;
    private Long tutor1Id;
    private Long tutor2Id;
    private Long lecturerId;
    private Long course1Id;
    private Long course2Id;

    @BeforeEach
    void setUp() {
        timesheetRepository.deleteAll();
        timesheetRepository.flush();
        lecturerAssignmentRepository.deleteAll();
        lecturerAssignmentRepository.flush();
        courseRepository.deleteAll();
        courseRepository.flush();
        userRepository.deleteAll();
        userRepository.flush();

        User tutor1 = userRepository.save(
            TestDataBuilder.aTutor()
                .withEmail("timesheet-repo+tutor1@test.com")
                .withName("Timesheet Repo Tutor 1")
                .withHashedPassword("hashedPassword123")
                .build()
        );
        User tutor2 = userRepository.save(
            TestDataBuilder.aTutor()
                .withEmail("timesheet-repo+tutor2@test.com")
                .withName("Timesheet Repo Tutor 2")
                .withHashedPassword("hashedPassword123")
                .build()
        );
        User lecturer = userRepository.save(
            TestDataBuilder.aLecturer()
                .withEmail("timesheet-repo+lecturer@test.com")
                .withName("Timesheet Repo Lecturer")
                .withHashedPassword("hashedPassword123")
                .build()
        );
        userRepository.flush();
        tutor1Id = tutor1.getId();
        tutor2Id = tutor2.getId();
        lecturerId = lecturer.getId();

        Course course1 = courseRepository.save(new Course("TSR101", "Timesheet Repo Course 1", "2024S1", lecturerId, new BigDecimal("10000.00")));
        Course course2 = courseRepository.save(new Course("TSR102", "Timesheet Repo Course 2", "2024S1", lecturerId, new BigDecimal("12000.00")));
        courseRepository.flush();
        course1Id = course1.getId();
        course2Id = course2.getId();

        // Timesheet created by Lecturer for casual staff payment - awaiting lecturer approval
        timesheet1 = new Timesheet(
            tutor1Id,
            course1Id,
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 1, 1))),
            new BigDecimal("10.5"),
            new Money(new BigDecimal("25.00")),
            "Tutorial preparation and delivery for COMP2022",
            lecturerId
        );
        timesheet1.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        // Timesheet for different casual staff member - already HR approved for payment
        timesheet2 = new Timesheet(
            tutor2Id,
            course1Id,
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 1, 8))),
            new BigDecimal("8.0"),
            new Money(new BigDecimal("30.00")),
            "Lab supervision and student assistance",
            lecturerId
        );
        timesheet2.setStatus(ApprovalStatus.FINAL_CONFIRMED);
        // Draft timesheet not yet submitted for approval
        timesheet3 = new Timesheet(
            tutor1Id,
            course2Id,
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 1, 15))),
            new BigDecimal("5.5"),
            new Money(new BigDecimal("25.00")),
            "Assignment marking and feedback provision",
            lecturerId
        );
        timesheet3.setStatus(ApprovalStatus.DRAFT);

        entityManager.persist(timesheet1);
        entityManager.persist(timesheet2);
        entityManager.persist(timesheet3);
        entityManager.flush();
    }

    @Test
    void findByTutorId_ShouldReturnAllForTutor() {
        List<Timesheet> found = timesheetRepository.findByTutorId(tutor1Id);
        assertThat(found).extracting(Timesheet::getTutorId).containsOnly(tutor1Id);
        assertThat(found).hasSize(2);
    }

    @Test
    void findByCourseId_ShouldReturnAllForCourse() {
        List<Timesheet> found = timesheetRepository.findByCourseId(course1Id);
        assertThat(found).hasSize(2);
        assertThat(found).extracting(Timesheet::getCourseId).containsOnly(course1Id);
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
        Page<Timesheet> byTutor = timesheetRepository.findByTutorId(tutor1Id, pageable);
        assertThat(byTutor.getTotalElements()).isEqualTo(2);
        Page<Timesheet> filtered = timesheetRepository.findWithFilters(tutor1Id, course1Id, ApprovalStatus.PENDING_TUTOR_CONFIRMATION, pageable);
        assertThat(filtered.getTotalElements()).isEqualTo(1);
    }

    @Test
    void countTutorialsForRepeatRule_inclusiveSevenDayWindow_countsPriorTutorial() {
        // Arrange: create a TUTORIAL entry on 2024-06-17 for course 1
        Timesheet tutorial = new Timesheet(
            tutor2Id,
            course1Id,
            new WeekPeriod(com.usyd.catams.testutils.TestDates.mondayOf(LocalDate.of(2024, 6, 17))),
            new BigDecimal("1.0"),
            new Money(new BigDecimal("42.00")),
            "EA Tutorial",
            lecturerId
        );
        tutorial.setTaskType(com.usyd.catams.enums.TimesheetTaskType.TUTORIAL);
        tutorial.setStatus(ApprovalStatus.DRAFT);
        tutorial.setSessionDate(LocalDate.of(2024, 6, 17));
        entityManager.persist(tutorial);
        entityManager.flush();

        // Act: count between 2024-06-17 and 2024-06-24 inclusive
        long count = timesheetRepository.countTutorialsForRepeatRule(
            course1Id,
            LocalDate.of(2024, 6, 17),
            LocalDate.of(2024, 6, 24),
            null
        );

        // Assert
        assertThat(count).isGreaterThanOrEqualTo(1L);
    }
}
