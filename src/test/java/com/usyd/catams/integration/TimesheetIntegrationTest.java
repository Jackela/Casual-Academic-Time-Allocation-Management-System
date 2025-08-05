package com.usyd.catams.integration;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

/**
 * Integration tests for Timesheet entity and repository functionality.
 * This is our first TDD failing test to establish the basic CRUD operations.
 */
@SpringBootTest
@ActiveProfiles("integration-test")
@Transactional
public class TimesheetIntegrationTest extends IntegrationTestBase {

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    private User lecturer;
    private User tutor;
    private Course course;
    private LocalDate mondayDate;

    @BeforeEach
    void setUp() {
        // Clean up any existing data
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        // Create test lecturer
        lecturer = new User("lecturer@university.edu.au", "Dr. John Smith", "hashedPassword123", UserRole.LECTURER);
        lecturer = userRepository.save(lecturer);

        // Create test tutor
        tutor = new User("tutor@university.edu.au", "Jane Doe", "hashedPassword456", UserRole.TUTOR);
        tutor = userRepository.save(tutor);

        // Create test course
        course = new Course("COMP5349", "Cloud Computing", "2025S1", lecturer.getId(), BigDecimal.valueOf(10000.00));
        course = courseRepository.save(course);

        // Get next Monday date
        mondayDate = getNextMonday();
    }

    @Test
    void testTimesheetCRUD_ShouldFailInitially() {
        // This test should fail initially as we haven't implemented the entities yet
        // TDD Red Phase: Write failing test first

        // ARRANGE: Create a timesheet
        Timesheet timesheet = new Timesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(10.5),
                BigDecimal.valueOf(45.00),
                "Tutorial assistance and marking",
                lecturer.getId()
        );

        // ACT & ASSERT: Save timesheet
        Timesheet savedTimesheet = timesheetRepository.save(timesheet);
        
        assertThat(savedTimesheet).isNotNull();
        assertThat(savedTimesheet.getId()).isNotNull();
        assertThat(savedTimesheet.getTutorId()).isEqualTo(tutor.getId());
        assertThat(savedTimesheet.getCourseId()).isEqualTo(course.getId());
        assertThat(savedTimesheet.getWeekStartDate()).isEqualTo(mondayDate);
        assertThat(savedTimesheet.getHours()).isEqualTo(BigDecimal.valueOf(10.5));
        assertThat(savedTimesheet.getHourlyRate()).isEqualTo(BigDecimal.valueOf(45.00));
        assertThat(savedTimesheet.getDescription()).isEqualTo("Tutorial assistance and marking");
        assertThat(savedTimesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        assertThat(savedTimesheet.getCreatedBy()).isEqualTo(lecturer.getId());
        assertThat(savedTimesheet.getCreatedAt()).isNotNull();
        assertThat(savedTimesheet.getUpdatedAt()).isNotNull();
    }

    @Test
    void testTimesheetRepository_FindByTutorId() {
        // ARRANGE: Create and save timesheet
        Timesheet timesheet = createTestTimesheet();
        timesheetRepository.save(timesheet);

        // ACT: Find by tutor ID
        List<Timesheet> timesheets = timesheetRepository.findByTutorId(tutor.getId());

        // ASSERT
        assertThat(timesheets).hasSize(1);
        assertThat(timesheets.get(0).getTutorId()).isEqualTo(tutor.getId());
    }

    @Test
    void testTimesheetRepository_FindByCourseId() {
        // ARRANGE: Create and save timesheet
        Timesheet timesheet = createTestTimesheet();
        timesheetRepository.save(timesheet);

        // ACT: Find by course ID
        List<Timesheet> timesheets = timesheetRepository.findByCourseId(course.getId());

        // ASSERT
        assertThat(timesheets).hasSize(1);
        assertThat(timesheets.get(0).getCourseId()).isEqualTo(course.getId());
    }

    @Test
    void testTimesheetRepository_FindByTutorAndCourseAndWeek() {
        // ARRANGE: Create and save timesheet
        Timesheet timesheet = createTestTimesheet();
        timesheetRepository.save(timesheet);

        // ACT: Find by unique combination
        Optional<Timesheet> found = timesheetRepository.findByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(
                tutor.getId(), course.getId(), mondayDate);

        // ASSERT
        assertThat(found).isPresent();
        assertThat(found.get().getTutorId()).isEqualTo(tutor.getId());
        assertThat(found.get().getCourseId()).isEqualTo(course.getId());
        assertThat(found.get().getWeekStartDate()).isEqualTo(mondayDate);
    }

    @Test
    void testTimesheetRepository_ExistsCheck() {
        // ARRANGE: Create and save timesheet
        Timesheet timesheet = createTestTimesheet();
        timesheetRepository.save(timesheet);

        // ACT & ASSERT: Check existence
        boolean exists = timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(
                tutor.getId(), course.getId(), mondayDate);
        
        assertThat(exists).isTrue();

        // Check non-existence
        LocalDate differentMonday = mondayDate.plusWeeks(1);
        boolean notExists = timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(
                tutor.getId(), course.getId(), differentMonday);
        
        assertThat(notExists).isFalse();
    }

    @Test
    void testTimesheetValidation_MondayConstraint() {
        // ARRANGE: Try to create timesheet with non-Monday date
        LocalDate tuesday = mondayDate.plusDays(1);
        
        Timesheet timesheet = new Timesheet(
                tutor.getId(),
                course.getId(),
                tuesday, // This should fail validation
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
        );

        // ACT & ASSERT: Should throw exception
        assertThatThrownBy(() -> timesheetRepository.save(timesheet))
                .isInstanceOf(Exception.class)
                .hasMessageContaining("Monday");
    }

    @Test
    void testTimesheetValidation_HoursRange() {
        // Test hours below minimum (0.1)
        Timesheet invalidLowHours = new Timesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(0.05), // Below minimum
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
        );

        assertThatThrownBy(() -> timesheetRepository.save(invalidLowHours))
                .isInstanceOf(Exception.class);

        // Test hours above maximum (38.0)
        Timesheet invalidHighHours = new Timesheet(
                tutor.getId(),
                course.getId(),
                mondayDate.plusWeeks(1),
                BigDecimal.valueOf(45.0), // Above maximum
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
        );

        assertThatThrownBy(() -> timesheetRepository.save(invalidHighHours))
                .isInstanceOf(Exception.class);
    }

    @Test
    void testTimesheetValidation_HourlyRateRange() {
        // Test rate below minimum (10.00)
        Timesheet invalidLowRate = new Timesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(5.00), // Below minimum
                "Tutorial work",
                lecturer.getId()
        );

        assertThatThrownBy(() -> timesheetRepository.save(invalidLowRate))
                .isInstanceOf(Exception.class);

        // Test rate above maximum (200.00)
        Timesheet invalidHighRate = new Timesheet(
                tutor.getId(),
                course.getId(),
                mondayDate.plusWeeks(1),
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(250.00), // Above maximum
                "Tutorial work",
                lecturer.getId()
        );

        assertThatThrownBy(() -> timesheetRepository.save(invalidHighRate))
                .isInstanceOf(Exception.class);
    }

    @Test
    void testTimesheetBusinessMethods() {
        // ARRANGE: Create timesheet
        Timesheet timesheet = createTestTimesheet();
        timesheet = timesheetRepository.save(timesheet);

        // ACT & ASSERT: Test business methods
        BigDecimal expectedPay = BigDecimal.valueOf(10.5).multiply(BigDecimal.valueOf(45.00));
        assertThat(timesheet.calculateTotalPayAmount()).isEqualTo(expectedPay);

        assertThat(timesheet.isEditable()).isTrue(); // DRAFT status should be editable
        assertThat(timesheet.canBeApproved()).isFalse(); // DRAFT status cannot be approved yet

        // Change status to pending
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        timesheet = timesheetRepository.save(timesheet);

        assertThat(timesheet.isEditable()).isFalse(); // PENDING should not be editable
        assertThat(timesheet.canBeApproved()).isTrue(); // PENDING can be approved
    }

    // Helper methods
    private Timesheet createTestTimesheet() {
        return new Timesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(10.5),
                BigDecimal.valueOf(45.00),
                "Tutorial assistance and marking",
                lecturer.getId()
        );
    }

    private LocalDate getNextMonday() {
        LocalDate today = LocalDate.now();
        int daysUntilMonday = DayOfWeek.MONDAY.getValue() - today.getDayOfWeek().getValue();
        if (daysUntilMonday <= 0) {
            daysUntilMonday += 7; // Next Monday
        }
        return today.plusDays(daysUntilMonday);
    }
}
