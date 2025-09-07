package com.usyd.catams.integration;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

/**
 * Repository-focused TestDataBuilder validation test using @DataJpaTest.
 * 
 * This test validates the core functionality needed:
 * - TestDataBuilder creates valid entities that can be persisted
 * - Repository operations work with TestDataBuilder entities
 * - Create-drop DDL strategy works correctly
 * - Data isolation between tests
 * 
 * @author Backend-Data Agent
 */
@DataJpaTest
@ActiveProfiles("test")
class TestDataBuilderRepositoryTest {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CourseRepository courseRepository;
    
    @Autowired
    private TimesheetRepository timesheetRepository;

    @BeforeEach
    void clearDatabase() {
        // Clean up in dependency order
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Should create and persist User entities via TestDataBuilder")
    void shouldCreateAndPersistUserEntities() {
        // Given
        User tutor = TestDataBuilder.aTutor()
            .withEmail("test.tutor@repository.test")
            .withName("Test Tutor")
            .build();

        User lecturer = TestDataBuilder.aLecturer()
            .withEmail("test.lecturer@repository.test")
            .withName("Test Lecturer")
            .build();

        // When
        User savedTutor = userRepository.save(tutor);
        User savedLecturer = userRepository.save(lecturer);

        // Then
        assertThat(savedTutor.getId()).isNotNull();
        assertThat(savedTutor.getRole()).isEqualTo(UserRole.TUTOR);
        assertThat(savedTutor.getEmail()).isEqualTo("test.tutor@repository.test");
        assertThat(savedTutor.isActive()).isTrue();

        assertThat(savedLecturer.getId()).isNotNull();
        assertThat(savedLecturer.getRole()).isEqualTo(UserRole.LECTURER);
        assertThat(savedLecturer.getEmail()).isEqualTo("test.lecturer@repository.test");
        assertThat(savedLecturer.isActive()).isTrue();

        // Repository queries should work
        assertThat(userRepository.findByEmail("test.tutor@repository.test")).isPresent();
        assertThat(userRepository.findByRole(UserRole.TUTOR)).hasSize(1);
        assertThat(userRepository.findByRole(UserRole.LECTURER)).hasSize(1);
    }

    @Test
    @DisplayName("Should create and persist Course entities via TestDataBuilder")
    void shouldCreateAndPersistCourseEntities() {
        // Given - Create lecturer first
        User lecturer = TestDataBuilder.aLecturer()
            .withEmail("course.lecturer@repository.test")
            .withName("Course Test Lecturer")
            .build();
        User savedLecturer = userRepository.save(lecturer);

        Course course = TestDataBuilder.aCourse()
            .withCode("REPO2001")
            .withName("Repository Testing Course")
            .withSemester("2025S1")
            .withLecturer(savedLecturer)
            .withBudgetAllocated(new BigDecimal("15000.00"))
            .withBudgetUsed(new BigDecimal("3000.00"))
            .build();

        // When
        Course savedCourse = courseRepository.save(course);

        // Then
        assertThat(savedCourse.getId()).isNotNull();
        assertThat(savedCourse.getCode()).isEqualTo("REPO2001");
        assertThat(savedCourse.getName()).isEqualTo("Repository Testing Course");
        assertThat(savedCourse.getSemester()).isEqualTo("2025S1");
        assertThat(savedCourse.getLecturerId()).isEqualTo(savedLecturer.getId());
        assertThat(savedCourse.getBudgetAllocated()).isEqualTo(new BigDecimal("15000.00"));
        assertThat(savedCourse.getBudgetUsed()).isEqualTo(new BigDecimal("3000.00"));
        assertThat(savedCourse.getIsActive()).isTrue();

        // Repository queries should work
        assertThat(courseRepository.findById(savedCourse.getId())).isPresent();
        assertThat(courseRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should create and persist Timesheet entities via TestDataBuilder")
    void shouldCreateAndPersistTimesheetEntities() {
        // Given - Create dependencies
        User lecturer = TestDataBuilder.aLecturer()
            .withEmail("timesheet.lecturer@repository.test")
            .build();
        User savedLecturer = userRepository.save(lecturer);

        User tutor = TestDataBuilder.aTutor()
            .withEmail("timesheet.tutor@repository.test")
            .build();
        User savedTutor = userRepository.save(tutor);

        Course course = TestDataBuilder.aCourse()
            .withCode("TIME2001")
            .withLecturer(savedLecturer)
            .build();
        Course savedCourse = courseRepository.save(course);

        Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
            .withTutor(savedTutor)
            .withCourseId(savedCourse.getId())
            .withWeekStartDate(LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY))
            .withHours(new BigDecimal("12.0"))
            .withHourlyRate(new BigDecimal("50.00"))
            .withDescription("Test timesheet for repository validation")
            .withCreatedBy(savedTutor.getId())
            .build();

        // When
        Timesheet savedTimesheet = timesheetRepository.save(timesheet);

        // Then
        assertThat(savedTimesheet.getId()).isNotNull();
        assertThat(savedTimesheet.getTutorId()).isEqualTo(savedTutor.getId());
        assertThat(savedTimesheet.getCourseId()).isEqualTo(savedCourse.getId());
        assertThat(savedTimesheet.getWeekStartDate().getDayOfWeek()).isEqualTo(java.time.DayOfWeek.MONDAY);
        assertThat(savedTimesheet.getHours()).isEqualTo(new BigDecimal("12.0"));
        assertThat(savedTimesheet.getHourlyRate()).isEqualTo(new BigDecimal("50.00"));
        assertThat(savedTimesheet.getDescription()).isEqualTo("Test timesheet for repository validation");
        assertThat(savedTimesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        assertThat(savedTimesheet.getCreatedBy()).isEqualTo(savedTutor.getId());

        // Repository queries should work
        assertThat(timesheetRepository.findById(savedTimesheet.getId())).isPresent();
        assertThat(timesheetRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should maintain data isolation between tests")
    void shouldMaintainDataIsolationBetweenTests() {
        // This test should start with clean database
        assertThat(userRepository.count()).isZero();
        assertThat(courseRepository.count()).isZero();
        assertThat(timesheetRepository.count()).isZero();

        // Create some test data
        User testUser = TestDataBuilder.aTutor()
            .withEmail("isolation.test@repository.test")
            .build();
        userRepository.save(testUser);

        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should handle domain invariant validation through TestDataBuilder")
    void shouldHandleDomainInvariantValidation() {
        // Test that TestDataBuilder enforces domain rules
        User validUser = TestDataBuilder.aUser()
            .withEmail("valid@domain.test")
            .withName("Valid User")
            .withRole(UserRole.ADMIN)
            .build();

        // Should be able to save valid entity
        User savedUser = userRepository.save(validUser);
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.hasValidName()).isTrue();
        assertThat(savedUser.getEmailValue()).isEqualTo("valid@domain.test");
        assertThat(savedUser.isActive()).isTrue();
    }

    @Test
    @DisplayName("Should enforce unique constraints properly")
    void shouldEnforceUniqueConstraintsProperly() {
        // Given - Create first user
        User firstUser = TestDataBuilder.aTutor()
            .withEmail("unique@constraint.test")
            .withName("First User")
            .build();
        userRepository.save(firstUser);

        // When/Then - Try to create second user with same email
        User duplicateUser = TestDataBuilder.aLecturer()
            .withEmail("unique@constraint.test")  // Same email
            .withName("Duplicate User")
            .build();

        assertThatThrownBy(() -> {
            userRepository.save(duplicateUser);
            userRepository.flush(); // Force constraint check
        }).isInstanceOf(Exception.class); // DataIntegrityViolationException or similar
    }

    @Test
    @DisplayName("Should support complex entity relationships")
    void shouldSupportComplexEntityRelationships() {
        // Given - Create full entity graph
        User lecturer = TestDataBuilder.aLecturer()
            .withEmail("complex.lecturer@repository.test")
            .build();
        User savedLecturer = userRepository.save(lecturer);

        User tutor = TestDataBuilder.aTutor()
            .withEmail("complex.tutor@repository.test")
            .build();
        User savedTutor = userRepository.save(tutor);

        Course course = TestDataBuilder.aCourse()
            .withCode("COMP9999")
            .withName("Complex Relationships Course")
            .withLecturer(savedLecturer)
            .build();
        Course savedCourse = courseRepository.save(course);

        Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
            .withTutor(savedTutor)
            .withCourseId(savedCourse.getId())
            .withCreatedBy(savedTutor.getId())
            .build();
        Timesheet savedTimesheet = timesheetRepository.save(timesheet);

        // Then - Verify all relationships work
        assertThat(savedTimesheet.getTutorId()).isEqualTo(savedTutor.getId());
        assertThat(savedTimesheet.getCourseId()).isEqualTo(savedCourse.getId());
        assertThat(savedCourse.getLecturerId()).isEqualTo(savedLecturer.getId());

        // Check that all entities are persisted
        assertThat(userRepository.count()).isEqualTo(2);
        assertThat(courseRepository.count()).isEqualTo(1);
        assertThat(timesheetRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should handle approval status transitions properly")
    void shouldHandleApprovalStatusTransitionsProperly() {
        // Given - Create dependencies
        User lecturer = TestDataBuilder.aLecturer()
            .withEmail("approval.lecturer@repository.test")
            .build();
        User savedLecturer = userRepository.save(lecturer);

        User tutor = TestDataBuilder.aTutor()
            .withEmail("approval.tutor@repository.test")
            .build();
        User savedTutor = userRepository.save(tutor);

        Course course = TestDataBuilder.aCourse()
            .withCode("APPR1001")
            .withLecturer(savedLecturer)
            .build();
        Course savedCourse = courseRepository.save(course);

        // Create timesheets in different states
        Timesheet draftTimesheet = TestDataBuilder.aDraftTimesheet()
            .withTutor(savedTutor)
            .withCourseId(savedCourse.getId())
            .withCreatedBy(savedTutor.getId())
            .build();

        Timesheet pendingTimesheet = TestDataBuilder.aDraftTimesheet()
            .withTutor(savedTutor)
            .withCourseId(savedCourse.getId())
            // Ensure a distinct (tutor, course, week_start_date) to avoid unique constraint conflict
            .withWeekStartDate(LocalDate.now().minusWeeks(2).with(java.time.DayOfWeek.MONDAY))
            .withCreatedBy(savedTutor.getId())
            .asPendingTutorConfirmation()
            .build();

        // When
        Timesheet savedDraft = timesheetRepository.save(draftTimesheet);
        Timesheet savedPending = timesheetRepository.save(pendingTimesheet);

        // Then
        assertThat(savedDraft.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        assertThat(savedPending.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        assertThat(timesheetRepository.count()).isEqualTo(2);
    }
}