package com.usyd.catams.unit.service;

import com.usyd.catams.application.TimesheetApplicationService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.BusinessException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.impl.TimesheetServiceImpl;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Pure unit tests for TimesheetService business logic.
 * 
 * Tests focus on:
 * - Business rule validation
 * - Service layer logic
 * - Error handling
 * - Repository interactions
 * 
 * Does NOT test HTTP layer, database, or Spring context.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TimesheetService Unit Tests")
class TimesheetServiceUnitTest {

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
    private Timesheet timesheet;

    @BeforeEach
    void setUp() {
        lecturer = TestDataBuilder.aLecturer().build();
        tutor = TestDataBuilder.aTutor().build();
        admin = TestDataBuilder.anAdmin().build();
        course = TestDataBuilder.aCourse().lecturer(lecturer).build();
        timesheet = TestDataBuilder.aDraftTimesheet()
            .tutor(tutor)
            .course(course)
            .build();
    }

    @Test
    @DisplayName("createTimesheet - Lecturer can create timesheet for tutor in their course")
    void createTimesheet_LecturerForOwnCourse_ShouldSucceed() {
        // Arrange
        when(timesheetApplicationService.createTimesheet(
            tutor.getId(),
            course.getId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            lecturer.getId()
        )).thenReturn(timesheet);

        // Act
        Timesheet result = timesheetService.createTimesheet(
            tutor.getId(),
            course.getId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            lecturer.getId()
        );

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTutorId()).isEqualTo(tutor.getId());
        assertThat(result.getCourseId()).isEqualTo(course.getId());
        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.DRAFT);

        verify(timesheetApplicationService).createTimesheet(
            tutor.getId(),
            course.getId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            lecturer.getId()
        );
    }

    @Test
    @DisplayName("createTimesheet - Lecturer cannot create timesheet for other lecturer's course")
    void createTimesheet_LecturerForOtherCourse_ShouldThrowSecurityException() {
        // Arrange
        User otherLecturer = TestDataBuilder.aLecturer()
            .id(999L)
            .email("other@lecturer.com")
            .build();
        Course otherCourse = TestDataBuilder.aCourse()
            .id(2000L)
            .lecturer(otherLecturer)
            .build();

        when(timesheetApplicationService.createTimesheet(
            tutor.getId(),
            otherCourse.getId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            lecturer.getId()
        )).thenThrow(new SecurityException("LECTURER is not assigned to this course"));

        // Act & Assert
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                otherCourse.getId(),
                timesheet.getWeekStartDate(),
                timesheet.getHours(),
                timesheet.getHourlyRate(),
                timesheet.getDescription(),
                lecturer.getId()
            )
        )
        .isInstanceOf(SecurityException.class)
        .hasMessageContaining("LECTURER is not assigned to this course");
    }

    @Test
    @DisplayName("createTimesheet - Admin cannot create timesheet (only LECTURER allowed)")
    void createTimesheet_Admin_ShouldThrowSecurityException() {
        // Arrange
        when(timesheetApplicationService.createTimesheet(
            tutor.getId(),
            course.getId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            admin.getId()
        )).thenThrow(new SecurityException("Only LECTURER users can create timesheets"));

        // Act & Assert
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                timesheet.getWeekStartDate(),
                timesheet.getHours(),
                timesheet.getHourlyRate(),
                timesheet.getDescription(),
                admin.getId()
            )
        )
        .isInstanceOf(SecurityException.class)
        .hasMessageContaining("Only LECTURER users can create timesheets");
    }

    @Test
    @DisplayName("createTimesheet - Tutor cannot create timesheet")
    void createTimesheet_Tutor_ShouldThrowSecurityException() {
        // Arrange
        when(timesheetApplicationService.createTimesheet(
            tutor.getId(),
            course.getId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            tutor.getId()
        )).thenThrow(new SecurityException("Only LECTURER users can create timesheets"));

        // Act & Assert
        assertThatThrownBy(() -> 
            timesheetService.createTimesheet(
                tutor.getId(),
                course.getId(),
                timesheet.getWeekStartDate(),
                timesheet.getHours(),
                timesheet.getHourlyRate(),
                timesheet.getDescription(),
                tutor.getId()
            )
        )
        .isInstanceOf(SecurityException.class)
        .hasMessageContaining("Only LECTURER users can create timesheets");
    }

    @Test
    @DisplayName("getTimesheetById - Should return timesheet when found")
    void getTimesheetById_ExistingTimesheet_ShouldReturnTimesheet() {
        // Arrange
        when(timesheetApplicationService.getTimesheetById(timesheet.getId(), lecturer.getId()))
            .thenReturn(Optional.of(timesheet));

        // Act
        Optional<Timesheet> result = timesheetService.getTimesheetById(timesheet.getId(), lecturer.getId());

        // Assert
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(timesheet);

        verify(timesheetApplicationService).getTimesheetById(timesheet.getId(), lecturer.getId());
    }

    @Test
    @DisplayName("getTimesheetById - Should return empty when not found")
    void getTimesheetById_NonExistentTimesheet_ShouldReturnEmpty() {
        // Arrange
        Long nonExistentId = 99999L;
        when(timesheetApplicationService.getTimesheetById(nonExistentId, lecturer.getId()))
            .thenReturn(Optional.empty());

        // Act
        Optional<Timesheet> result = timesheetService.getTimesheetById(nonExistentId, lecturer.getId());

        // Assert
        assertThat(result).isEmpty();

        verify(timesheetApplicationService).getTimesheetById(nonExistentId, lecturer.getId());
    }

    @Test
    @DisplayName("canUserModifyTimesheet - Lecturer can modify timesheet for their course")
    void canUserModifyTimesheet_LecturerOwnCourse_ShouldReturnTrue() {
        // Arrange
        when(timesheetApplicationService.canUserModifyTimesheet(timesheet, lecturer.getId()))
            .thenReturn(true);

        // Act
        boolean result = timesheetService.canUserModifyTimesheet(timesheet, lecturer.getId());

        // Assert
        assertThat(result).isTrue();
        verify(timesheetApplicationService).canUserModifyTimesheet(timesheet, lecturer.getId());
    }

    @Test
    @DisplayName("canUserModifyTimesheet - Admin can modify any timesheet")
    void canUserModifyTimesheet_Admin_ShouldReturnTrue() {
        // Arrange
        when(timesheetApplicationService.canUserModifyTimesheet(timesheet, admin.getId()))
            .thenReturn(true);

        // Act
        boolean result = timesheetService.canUserModifyTimesheet(timesheet, admin.getId());

        // Assert
        assertThat(result).isTrue();
        verify(timesheetApplicationService).canUserModifyTimesheet(timesheet, admin.getId());
    }
}