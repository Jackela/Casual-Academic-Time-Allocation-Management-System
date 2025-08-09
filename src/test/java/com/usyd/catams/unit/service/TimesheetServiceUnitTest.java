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
import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.usyd.catams.test.config.TestConfigurationLoader;
import com.usyd.catams.common.validation.TimesheetValidationConstants;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Pure unit tests for TimesheetApplicationService business logic.
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
@DisplayName("TimesheetApplicationService Unit Tests")
class TimesheetServiceUnitTest {

    @Mock
    private TimesheetRepository timesheetRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;
    
    @Mock
    private TimesheetDomainService timesheetDomainService;

    @Mock
    private TimesheetMapper timesheetMapper;
    @InjectMocks
    private TimesheetApplicationService timesheetService;

    private User lecturer;
    private User tutor;
    private User admin;
    private Course course;
    private Timesheet timesheet;

    @BeforeEach
    void setUp() {
        // Ensure unique IDs for each user to avoid ID collisions
        lecturer = TestDataBuilder.aLecturer()
            .withId(1L)
            .withEmail("lecturer@test.com")
            .build();
        tutor = TestDataBuilder.aTutor()
            .withId(2L)
            .withEmail("tutor@test.com")
            .build();
        admin = TestDataBuilder.anAdmin()
            .withId(3L)
            .withEmail("admin@test.com")
            .build();
        course = TestDataBuilder.aCourse()
            .withId(100L)
            .withLecturer(lecturer)
            .withLecturerId(lecturer.getId())
            .build();
        timesheet = TestDataBuilder.aDraftTimesheet()
            .withId(200L)
            .withTutor(tutor)
            .withTutorId(tutor.getId())
            .withCourseId(course.getId())
            .build();
            
        // Set the maxHours configuration value for testing
        // Following DDD: validation constants belong in the domain layer
        TimesheetValidationConstants.setMaxHoursForTesting(TestConfigurationLoader.getMaxHours());
    }

    @Test
    @DisplayName("createTimesheet - Lecturer can create timesheet for tutor in their course")
    void createTimesheet_LecturerForOwnCourse_ShouldSucceed() {
        // Arrange - Mock repository calls for validation
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        // Mock domain service authorization check
        lenient().when(timesheetDomainService.hasLecturerAuthorityOverCourse(lecturer, course))
            .thenReturn(true);
        
        // Mock timesheet existence check - first call for uniqueness validation, second call for postcondition
        when(timesheetRepository.existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(
            tutor.getId(), course.getId(), timesheet.getWeekStartDate()))
            .thenReturn(false)   // First call: uniqueness validation - doesn't exist
            .thenReturn(true);   // Second call: postcondition validation - now exists
            
        // No need to mock budget validation - it will be computed within the service
            
        // Mock save operation - following DbC: repository should return what was saved
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(invocation -> {
            Timesheet savedTimesheet = invocation.getArgument(0);
            // Simulate repository setting ID (as would happen in real persistence)
            savedTimesheet.setId(1L);
            return savedTimesheet;
        });

        // Mock domain service validation (following DDD: domain logic in domain service)
        when(timesheetDomainService.validateTimesheetCreation(
            any(User.class), any(User.class), any(Course.class), 
            any(), any(BigDecimal.class), any(BigDecimal.class), 
            any(String.class)))
            .thenReturn(timesheet.getDescription()); // Return sanitized description
        // Act
        Timesheet result = timesheetService.createTimesheet(
            tutor.getId(),
            course.getId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            lecturer.getId()  // This is the creator ID
        );

        // Assert - Validate DbC postconditions are met
        assertThat(result).isNotNull();
        assertThat(result.getTutorId()).isEqualTo(tutor.getId());
        assertThat(result.getCourseId()).isEqualTo(course.getId());
        assertThat(result.getCreatedBy()).isEqualTo(lecturer.getId()); // DbC postcondition
        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        assertThat(result.getWeekStartDate()).isEqualTo(timesheet.getWeekStartDate());
        assertThat(result.getHours()).isEqualByComparingTo(timesheet.getHours());
        assertThat(result.getHourlyRate()).isEqualByComparingTo(timesheet.getHourlyRate());

        // Verify proper delegation to domain service (DDD principle)
        verify(timesheetDomainService).validateTimesheetCreation(
            any(User.class), any(User.class), any(Course.class),
            any(), any(BigDecimal.class), any(BigDecimal.class),
            any(String.class)
        );
        
        verify(timesheetRepository).save(any(Timesheet.class));    }

    @Test
    @DisplayName("createTimesheet - Lecturer cannot create timesheet for other lecturer's course")
    void createTimesheet_LecturerForOtherCourse_ShouldThrowSecurityException() {
        // Arrange
        User otherLecturer = TestDataBuilder.aLecturer()
            .withId(999L)
            .withEmail("other@lecturer.com")
            .build();
        Course otherCourse = TestDataBuilder.aCourse()
            .withId(2000L)
            .withLecturer(otherLecturer)
            .build();

        // Mock repository calls for validation
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(otherCourse.getId())).thenReturn(Optional.of(otherCourse));
        // Mock domain service authorization check - lecturer doesn't have authority over other course
        lenient().when(timesheetDomainService.hasLecturerAuthorityOverCourse(lecturer, otherCourse))
            .thenReturn(false);
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
        .hasMessageContaining("LECTURER can only create timesheets for courses they are assigned to");    }

    @Test
    @DisplayName("createTimesheet - Admin cannot create timesheet (only LECTURER allowed)")
    void createTimesheet_Admin_ShouldThrowSecurityException() {
        // Arrange - Mock repository calls for validation
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
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
        // Arrange - Mock repository calls for validation
        when(userRepository.findById(tutor.getId())).thenReturn(Optional.of(tutor));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
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
        // Following DDD: Application service validates requester exists
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(timesheetRepository.findById(timesheet.getId()))
            .thenReturn(Optional.of(timesheet));
        when(courseRepository.findById(timesheet.getCourseId())).thenReturn(Optional.of(course));
        // Mock domain service authorization check
        when(timesheetDomainService.hasLecturerAuthorityOverCourse(lecturer, course))
            .thenReturn(true);
        // Act
        Optional<Timesheet> result = timesheetService.getTimesheetById(timesheet.getId(), lecturer.getId());

        // Assert
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(timesheet);

        verify(userRepository).findById(lecturer.getId());
        verify(timesheetRepository).findById(timesheet.getId());    }

    @Test
    @DisplayName("getTimesheetById - Should return empty when not found")
    void getTimesheetById_NonExistentTimesheet_ShouldReturnEmpty() {
        // Arrange
        Long nonExistentId = 99999L;
        // Following DDD: Application service validates requester exists
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(timesheetRepository.findById(nonExistentId))            .thenReturn(Optional.empty());

        // Act
        Optional<Timesheet> result = timesheetService.getTimesheetById(nonExistentId, lecturer.getId());

        // Assert
        assertThat(result).isEmpty();

        verify(userRepository).findById(lecturer.getId());
        verify(timesheetRepository).findById(nonExistentId);    }

    @Test
    @DisplayName("canUserModifyTimesheet - Lecturer can modify timesheet for their course")
    void canUserModifyTimesheet_LecturerOwnCourse_ShouldReturnTrue() {
        // Arrange
        when(userRepository.findById(lecturer.getId())).thenReturn(Optional.of(lecturer));
        when(courseRepository.findById(timesheet.getCourseId())).thenReturn(Optional.of(course));
        // Mock domain service authorization check
        when(timesheetDomainService.hasLecturerAuthorityOverCourse(lecturer, course))            .thenReturn(true);

        // Act
        boolean result = timesheetService.canUserModifyTimesheet(timesheet, lecturer.getId());

        // Assert
        assertThat(result).isTrue();
        verify(userRepository).findById(lecturer.getId());
        verify(courseRepository).findById(timesheet.getCourseId());    }

    @Test
    @DisplayName("canUserModifyTimesheet - Admin can modify any timesheet")
    void canUserModifyTimesheet_Admin_ShouldReturnTrue() {
        // Arrange
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        // Act
        boolean result = timesheetService.canUserModifyTimesheet(timesheet, admin.getId());

        // Assert
        assertThat(result).isTrue();
        verify(userRepository).findById(admin.getId());    }
}
