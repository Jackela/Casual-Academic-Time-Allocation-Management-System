package com.usyd.catams.service;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.BusinessException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.application.TimesheetApplicationService;
import com.usyd.catams.service.impl.TimesheetServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TimesheetService implementation.
 * Following TDD approach - starting with failing tests.
 */
@ExtendWith(MockitoExtension.class)
public class TimesheetServiceTest {

    @Mock
    private TimesheetRepository timesheetRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private TimesheetApplicationService timesheetApplicationService;

    @InjectMocks
    private TimesheetServiceImpl timesheetService;

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private LocalDate mondayDate;

    @BeforeEach
    void setUp() {
        // Create test users
        lecturer = new User("lecturer@test.com", "Dr. Smith", "hashedPass", UserRole.LECTURER);
        lecturer.setId(1L);

        tutor = new User("tutor@test.com", "Jane Doe", "hashedPass", UserRole.TUTOR);
        tutor.setId(2L);

        admin = new User("admin@test.com", "Admin User", "hashedPass", UserRole.ADMIN);
        admin.setId(3L);

        // Create test course
        course = new Course("COMP5349", "Cloud Computing", "2025S1", lecturer.getId(), BigDecimal.valueOf(10000.00));
        course.setId(100L);

        // Get next Monday date
        mondayDate = getNextMonday();
    }

    @Test
    void createTimesheet_WhenCreatorIsNotLecturer_ShouldThrowSecurityException() {
        // ARRANGE: Setup for non-lecturer user trying to create timesheet
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        // ACT & ASSERT: Should throw SecurityException when TUTOR tries to create timesheet
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(), 
                course.getId(), 
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                tutor.getId() // TUTOR trying to create timesheet - should fail
            ))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only LECTURER users can create timesheets");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenCreatorIsAdmin_ShouldThrowSecurityException() {
        // ARRANGE: Setup for admin user trying to create timesheet
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        // ACT & ASSERT: Should throw SecurityException when ADMIN tries to create timesheet
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(), 
                course.getId(), 
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                admin.getId() // ADMIN trying to create timesheet - should fail
            ))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("Only LECTURER users can create timesheets");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenCreatorNotFound_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup for non-existent creator
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // ACT & ASSERT: Should throw IllegalArgumentException when creator doesn't exist
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(), 
                course.getId(), 
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                999L // Non-existent creator ID
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Creator user not found");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenTutorNotFound_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup valid lecturer but non-existent tutor
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // ACT & ASSERT: Should throw IllegalArgumentException when tutor doesn't exist
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                999L, // Non-existent tutor ID
                course.getId(), 
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Tutor user not found");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenTutorIsNotTutorRole_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup lecturer trying to create timesheet for another lecturer
        User anotherLecturer = new User("lecturer2@test.com", "Dr. Jones", "hashedPass", UserRole.LECTURER);
        anotherLecturer.setId(4L);

        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(anotherLecturer.getId())).thenReturn(Optional.of(anotherLecturer));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        // ACT & ASSERT: Should throw IllegalArgumentException when target user is not TUTOR
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                anotherLecturer.getId(), // LECTURER instead of TUTOR
                course.getId(), 
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("User assigned as tutor must have TUTOR role");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenCourseNotFound_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup valid users but non-existent course
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(999L)).thenReturn(Optional.empty());

        // ACT & ASSERT: Should throw IllegalArgumentException when course doesn't exist
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                999L, // Non-existent course ID
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Course not found");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenLecturerNotAssignedToCourse_ShouldThrowSecurityException() {
        // ARRANGE: Setup course assigned to different lecturer
        User otherLecturer = new User("other@test.com", "Dr. Other", "hashedPass", UserRole.LECTURER);
        otherLecturer.setId(5L);

        Course courseForOtherLecturer = new Course("COMP1000", "Intro", "2025S1", otherLecturer.getId(), BigDecimal.valueOf(5000.00));
        courseForOtherLecturer.setId(200L);

        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(courseForOtherLecturer.getId())).thenReturn(Optional.of(courseForOtherLecturer));

        // ACT & ASSERT: Should throw SecurityException when lecturer not assigned to course
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                courseForOtherLecturer.getId(), // Course not assigned to this lecturer
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("LECTURER can only create timesheets for courses they are assigned to");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenWeekStartDateNotMonday_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup valid scenario but with Tuesday date
        LocalDate tuesdayDate = mondayDate.plusDays(1);

        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        // ACT & ASSERT: Should throw IllegalArgumentException for non-Monday date
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                tuesdayDate, // Tuesday instead of Monday
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Week start date must be a Monday");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenDuplicateTimesheetExists_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup valid scenario but duplicate timesheet exists
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutor.getId(), course.getId(), mondayDate))
            .thenReturn(true);

        // ACT & ASSERT: Should throw IllegalArgumentException for duplicate timesheet
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Timesheet already exists for this tutor, course, and week");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenAllValidationsPassed_ShouldCreateTimesheet() {
        // ARRANGE: Setup completely valid scenario
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutor.getId(), course.getId(), mondayDate))
            .thenReturn(false);
        
        // Mock that there's enough budget available
        when(timesheetApplicationService.getTotalApprovedBudgetUsedByCourse(course.getId(), lecturer.getId()))
            .thenReturn(BigDecimal.valueOf(1000.00)); // Course has 10000.00 budget, only 1000.00 used
        
        Timesheet expectedTimesheet = new Timesheet(tutor.getId(), course.getId(), mondayDate,
            BigDecimal.valueOf(10.0), BigDecimal.valueOf(45.00), "Tutorial work", lecturer.getId());
        expectedTimesheet.setId(1L);
        
        when(timesheetRepository.save(any(Timesheet.class))).thenReturn(expectedTimesheet);

        // ACT: Create timesheet with valid data
        Timesheet result = timesheetService.createTimesheet(
            tutor.getId(),
            course.getId(),
            mondayDate,
            BigDecimal.valueOf(10.0),
            BigDecimal.valueOf(45.00),
            "Tutorial work",
            lecturer.getId()
        );

        // ASSERT: Verify timesheet was created successfully
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTutorId()).isEqualTo(tutor.getId());
        assertThat(result.getCourseId()).isEqualTo(course.getId());
        assertThat(result.getWeekStartDate()).isEqualTo(mondayDate);
        assertThat(result.getHours()).isEqualByComparingTo(BigDecimal.valueOf(10.0));
        assertThat(result.getHourlyRate()).isEqualByComparingTo(BigDecimal.valueOf(45.00));
        assertThat(result.getDescription()).isEqualTo("Tutorial work");
        assertThat(result.getCreatedBy()).isEqualTo(lecturer.getId());

        // Verify repository save was called
        verify(timesheetRepository).save(any(Timesheet.class));
    }

    // NEW BUSINESS LOGIC VALIDATION TESTS - Currently failing, need implementation

    @Test
    void createTimesheet_WhenHoursOutOfValidRange_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup valid scenario but with invalid hours (below minimum)
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        // ACT & ASSERT: Should throw IllegalArgumentException for hours below 0.1
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(0.05), // Below minimum 0.1
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hours must be between 0.1 and 40.0");

        // ACT & ASSERT: Should throw IllegalArgumentException for hours above 40
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(45.0), // Above maximum 40
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hours must be between 0.1 and 40.0");

        // ACT & ASSERT: Should throw IllegalArgumentException for zero hours
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.ZERO, // Zero hours
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hours must be between 0.1 and 40.0");

        // ACT & ASSERT: Should throw IllegalArgumentException for negative hours
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(-5.0), // Negative hours
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hours must be between 0.1 and 40.0");

        // Verify no timesheet was saved for any invalid hours
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenHourlyRateNotPositive_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup valid scenario but with invalid hourly rate
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        // ACT & ASSERT: Should throw IllegalArgumentException for zero hourly rate
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.ZERO, // Zero hourly rate
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hourly rate must be positive");

        // ACT & ASSERT: Should throw IllegalArgumentException for negative hourly rate
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(-25.00), // Negative hourly rate
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hourly rate must be positive");

        // Verify no timesheet was saved for any invalid hourly rate
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenWeekStartDateInFuture_ShouldThrowIllegalArgumentException() {
        // ARRANGE: Setup valid scenario but with future date
        LocalDate tempDate = LocalDate.now().plusWeeks(2);
        // Ensure it's a Monday
        while (tempDate.getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            tempDate = tempDate.plusDays(1);
        }
        final LocalDate futureMonday = tempDate;

        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        // ACT & ASSERT: Should throw IllegalArgumentException for future date
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                futureMonday, // Future Monday date
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(45.00),
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Week start date cannot be in the future");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void createTimesheet_WhenBudgetExceeded_ShouldThrowBusinessException() {
        // ARRANGE: Setup scenario where creating timesheet would exceed course budget
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekStartDate(tutor.getId(), course.getId(), mondayDate))
            .thenReturn(false);

        // Mock that course already has 9950.00 approved budget used (out of 10000.00 total)
        when(timesheetApplicationService.getTotalApprovedBudgetUsedByCourse(course.getId(), lecturer.getId()))
            .thenReturn(BigDecimal.valueOf(9950.00));

        // ACT & ASSERT: Should throw BusinessException when new timesheet would exceed budget
        // New timesheet cost: 10.0 hours * 45.00 rate = 450.00
        // Total would be: 9950.00 + 450.00 = 10400.00 > 10000.00 budget
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                mondayDate,
                BigDecimal.valueOf(10.0), // 10 hours
                BigDecimal.valueOf(45.00), // $45/hour = $450 total
                "Tutorial work",
                lecturer.getId()
            ))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Creating this timesheet would exceed the course budget");

        // Verify no timesheet was saved
        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    // Helper method
    private LocalDate getNextMonday() {
        LocalDate today = LocalDate.now();
        int daysSinceMonday = today.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue();
        if (daysSinceMonday == 0) {
            // Today is Monday, use it
            return today;
        } else if (daysSinceMonday > 0) {
            // We're past Monday, use the previous Monday
            return today.minusDays(daysSinceMonday);
        } else {
            // We're before Monday (shouldn't happen), use last week's Monday
            return today.minusDays(daysSinceMonday + 7);
        }
    }
}