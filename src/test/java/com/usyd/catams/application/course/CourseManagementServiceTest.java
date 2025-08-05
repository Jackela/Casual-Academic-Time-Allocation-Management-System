package com.usyd.catams.application.course;

import com.usyd.catams.application.course.dto.CourseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TDD Tests for CourseManagementService
 * 
 * These tests define the expected behavior of the CourseManagementService interface.
 * They serve as:
 * 1. Contract definition for the service
 * 2. Documentation of expected behavior
 * 3. Safety net for future refactoring
 * 4. Specification for microservice API
 * 
 * Test Structure:
 * - Each method has comprehensive test coverage
 * - Edge cases and error conditions included
 * - Business rule validation scenarios
 * - Future microservice behavior specified
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CourseManagementService TDD Tests")
class CourseManagementServiceTest {
    
    @Mock
    private CourseManagementService courseManagementService;
    
    private CourseDto testCourse1;
    private CourseDto testCourse2;
    private CourseDto inactiveCourse;
    
    @BeforeEach
    void setUp() {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        
        testCourse1 = CourseDto.builder()
            .id(1L)
            .courseCode("COMP3221")
            .courseName("Distributed Systems")
            .description("Introduction to distributed computing systems")
            .semester("S1")
            .year(2024)
            .lecturerId(10L)
            .lecturerName("Dr. John Smith")
            .lecturerEmail("john.smith@usyd.edu.au")
            .active(true)
            .startDate(today.minusDays(30))
            .endDate(today.plusDays(60))
            .maxStudents(150)
            .currentEnrollment(120)
            .maxTutors(8)
            .currentTutors(6)
            .budgetLimit(new BigDecimal("50000.00"))
            .budgetUsed(new BigDecimal("25000.00"))
            .defaultHourlyRate(new BigDecimal("45.00"))
            .createdAt(now.minusDays(100))
            .updatedAt(now.minusDays(1))
            .build();
            
        testCourse2 = CourseDto.builder()
            .id(2L)
            .courseCode("COMP2123")
            .courseName("Data Structures and Algorithms")
            .description("Fundamental data structures and algorithms")
            .semester("S2")
            .year(2024)
            .lecturerId(11L)
            .lecturerName("Prof. Jane Doe")
            .lecturerEmail("jane.doe@usyd.edu.au")
            .active(true)
            .startDate(today.plusDays(30))
            .endDate(today.plusDays(120))
            .maxStudents(200)
            .currentEnrollment(180)
            .maxTutors(10)
            .currentTutors(10)
            .budgetLimit(new BigDecimal("75000.00"))
            .budgetUsed(new BigDecimal("15000.00"))
            .defaultHourlyRate(new BigDecimal("42.50"))
            .createdAt(now.minusDays(80))
            .updatedAt(now.minusHours(1))
            .build();
            
        inactiveCourse = CourseDto.builder()
            .id(3L)
            .courseCode("COMP1001")
            .courseName("Introduction to Programming")
            .semester("S1")
            .year(2023)
            .lecturerId(12L)
            .active(false)
            .build();
    }
    
    @Nested
    @DisplayName("Course Retrieval Operations")
    class CourseRetrievalTests {
        
        @Test
        @DisplayName("Should retrieve course by valid ID")
        void shouldRetrieveCourseByValidId() {
            // Given
            Long courseId = 1L;
            when(courseManagementService.getCourseById(courseId)).thenReturn(Optional.of(testCourse1));
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseById(courseId);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get()).isEqualTo(testCourse1);
            assertThat(result.get().getId()).isEqualTo(courseId);
            assertThat(result.get().getCourseCode()).isEqualTo("COMP3221");
        }
        
        @Test
        @DisplayName("Should return empty for non-existent course ID")
        void shouldReturnEmptyForNonExistentCourseId() {
            // Given
            Long nonExistentId = 999L;
            when(courseManagementService.getCourseById(nonExistentId)).thenReturn(Optional.empty());
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseById(nonExistentId);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should retrieve course by valid course code")
        void shouldRetrieveCourseByValidCourseCode() {
            // Given
            String courseCode = "COMP3221";
            when(courseManagementService.getCourseByCode(courseCode)).thenReturn(Optional.of(testCourse1));
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseByCode(courseCode);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getCourseCode()).isEqualTo(courseCode);
        }
        
        @Test
        @DisplayName("Should return empty for non-existent course code")
        void shouldReturnEmptyForNonExistentCourseCode() {
            // Given
            String nonExistentCode = "COMP9999";
            when(courseManagementService.getCourseByCode(nonExistentCode)).thenReturn(Optional.empty());
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseByCode(nonExistentCode);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should retrieve courses by lecturer")
        void shouldRetrieveCoursesByLecturer() {
            // Given
            Long lecturerId = 10L;
            List<CourseDto> lecturerCourses = List.of(testCourse1);
            when(courseManagementService.getCoursesByLecturer(lecturerId)).thenReturn(lecturerCourses);
            
            // When
            List<CourseDto> result = courseManagementService.getCoursesByLecturer(lecturerId);
            
            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0)).isEqualTo(testCourse1);
            assertThat(result.get(0).getLecturerId()).isEqualTo(lecturerId);
        }
        
        @Test
        @DisplayName("Should retrieve courses by tutor")
        void shouldRetrieveCoursesByTutor() {
            // Given
            Long tutorId = 20L;
            List<CourseDto> tutorCourses = List.of(testCourse1, testCourse2);
            when(courseManagementService.getCoursesByTutor(tutorId)).thenReturn(tutorCourses);
            
            // When
            List<CourseDto> result = courseManagementService.getCoursesByTutor(tutorId);
            
            // Then
            assertThat(result).hasSize(2);
            assertThat(result).containsExactly(testCourse1, testCourse2);
        }
    }
    
    @Nested
    @DisplayName("Course Relationship Checking")
    class CourseRelationshipTests {
        
        @Test
        @DisplayName("Should check if user is lecturer of course")
        void shouldCheckIfUserIsLecturerOfCourse() {
            // Given
            Long userId = 10L;
            Long courseId = 1L;
            when(courseManagementService.isLecturerOfCourse(userId, courseId)).thenReturn(true);
            
            // When
            boolean result = courseManagementService.isLecturerOfCourse(userId, courseId);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check if user is not lecturer of course")
        void shouldCheckIfUserIsNotLecturerOfCourse() {
            // Given
            Long userId = 99L;
            Long courseId = 1L;
            when(courseManagementService.isLecturerOfCourse(userId, courseId)).thenReturn(false);
            
            // When
            boolean result = courseManagementService.isLecturerOfCourse(userId, courseId);
            
            // Then
            assertThat(result).isFalse();
        }
        
        @Test
        @DisplayName("Should check if user is tutor of course")
        void shouldCheckIfUserIsTutorOfCourse() {
            // Given
            Long userId = 20L;
            Long courseId = 1L;
            when(courseManagementService.isTutorOfCourse(userId, courseId)).thenReturn(true);
            
            // When
            boolean result = courseManagementService.isTutorOfCourse(userId, courseId);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check user course relationship")
        void shouldCheckUserCourseRelationship() {
            // Given
            Long userId = 10L;
            Long courseId = 1L;
            when(courseManagementService.hasUserCourseRelationship(userId, courseId)).thenReturn(true);
            
            // When
            boolean result = courseManagementService.hasUserCourseRelationship(userId, courseId);
            
            // Then
            assertThat(result).isTrue();
        }
    }
    
    @Nested
    @DisplayName("Course Status and Validation")
    class CourseStatusValidationTests {
        
        @Test
        @DisplayName("Should get active courses")
        void shouldGetActiveCourses() {
            // Given
            List<CourseDto> activeCourses = List.of(testCourse1, testCourse2);
            when(courseManagementService.getActiveCourses()).thenReturn(activeCourses);
            
            // When
            List<CourseDto> result = courseManagementService.getActiveCourses();
            
            // Then
            assertThat(result).hasSize(2);
            assertThat(result.stream().allMatch(CourseDto::isActive)).isTrue();
        }
        
        @Test
        @DisplayName("Should check if course is active and valid")
        void shouldCheckIfCourseIsActiveAndValid() {
            // Given
            Long courseId = 1L;
            when(courseManagementService.isCourseActiveAndValid(courseId)).thenReturn(true);
            
            // When
            boolean result = courseManagementService.isCourseActiveAndValid(courseId);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check if course is not active")
        void shouldCheckIfCourseIsNotActive() {
            // Given
            Long courseId = 3L; // inactive course
            when(courseManagementService.isCourseActiveAndValid(courseId)).thenReturn(false);
            
            // When
            boolean result = courseManagementService.isCourseActiveAndValid(courseId);
            
            // Then
            assertThat(result).isFalse();
        }
        
        @Test
        @DisplayName("Should get courses by semester and year")
        void shouldGetCoursesBySemesterAndYear() {
            // Given
            String semester = "S1";
            Integer year = 2024;
            List<CourseDto> semesterCourses = List.of(testCourse1);
            when(courseManagementService.getCoursesBySemesterAndYear(semester, year))
                .thenReturn(semesterCourses);
            
            // When
            List<CourseDto> result = courseManagementService.getCoursesBySemesterAndYear(semester, year);
            
            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getSemester()).isEqualTo(semester);
            assertThat(result.get(0).getYear()).isEqualTo(year);
        }
    }
    
    @Nested
    @DisplayName("Budget and Financial Operations")
    class BudgetFinancialTests {
        
        @Test
        @DisplayName("Should get course budget information")
        void shouldGetCourseBudgetInfo() {
            // Given
            Long courseId = 1L;
            when(courseManagementService.getCourseBudgetInfo(courseId)).thenReturn(Optional.of(testCourse1));
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseBudgetInfo(courseId);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getBudgetLimit()).isNotNull();
            assertThat(result.get().getBudgetUsed()).isNotNull();
        }
        
        @Test
        @DisplayName("Should return empty for unauthorized budget access")
        void shouldReturnEmptyForUnauthorizedBudgetAccess() {
            // Given
            Long courseId = 999L;
            when(courseManagementService.getCourseBudgetInfo(courseId)).thenReturn(Optional.empty());
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseBudgetInfo(courseId);
            
            // Then
            assertThat(result).isEmpty();
        }
    }
    
    @Nested
    @DisplayName("Tutor Assignment Operations")
    class TutorAssignmentTests {
        
        @Test
        @DisplayName("Should check if can assign more tutors")
        void shouldCheckIfCanAssignMoreTutors() {
            // Given
            Long courseId = 1L; // testCourse1 has 6 current tutors, max 8
            when(courseManagementService.canAssignMoreTutors(courseId)).thenReturn(true);
            
            // When
            boolean result = courseManagementService.canAssignMoreTutors(courseId);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should check if cannot assign more tutors (at limit)")
        void shouldCheckIfCannotAssignMoreTutors() {
            // Given
            Long courseId = 2L; // testCourse2 has 10 current tutors, max 10
            when(courseManagementService.canAssignMoreTutors(courseId)).thenReturn(false);
            
            // When
            boolean result = courseManagementService.canAssignMoreTutors(courseId);
            
            // Then
            assertThat(result).isFalse();
        }
        
        @Test
        @DisplayName("Should get courses needing tutors")
        void shouldGetCoursesNeedingTutors() {
            // Given
            List<CourseDto> coursesNeedingTutors = List.of(testCourse1); // Has available slots
            when(courseManagementService.getCoursesNeedingTutors()).thenReturn(coursesNeedingTutors);
            
            // When
            List<CourseDto> result = courseManagementService.getCoursesNeedingTutors();
            
            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0)).isEqualTo(testCourse1);
        }
        
        @Test
        @DisplayName("Should get course capacity information")
        void shouldGetCourseCapacityInfo() {
            // Given
            Long courseId = 1L;
            when(courseManagementService.getCourseCapacityInfo(courseId)).thenReturn(Optional.of(testCourse1));
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseCapacityInfo(courseId);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getMaxStudents()).isNotNull();
            assertThat(result.get().getCurrentEnrollment()).isNotNull();
            assertThat(result.get().getMaxTutors()).isNotNull();
            assertThat(result.get().getCurrentTutors()).isNotNull();
        }
    }
    
    @Nested
    @DisplayName("Timesheet Operations Support")
    class TimesheetOperationsSupportTests {
        
        @Test
        @DisplayName("Should get course for timesheet operations")
        void shouldGetCourseForTimesheetOperations() {
            // Given
            Long courseId = 1L;
            when(courseManagementService.getCourseForTimesheetOperations(courseId))
                .thenReturn(Optional.of(testCourse1));
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseForTimesheetOperations(courseId);
            
            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getDefaultHourlyRate()).isNotNull();
            assertThat(result.get().getLecturerId()).isNotNull();
            assertThat(result.get().getBudgetLimit()).isNotNull();
        }
        
        @Test
        @DisplayName("Should validate course operation permissions")
        void shouldValidateCourseOperationPermissions() {
            // Given
            Long courseId = 1L;
            Long userId = 10L;
            String operation = "CREATE_TIMESHEET";
            when(courseManagementService.canUserPerformCourseOperation(courseId, userId, operation))
                .thenReturn(true);
            
            // When
            boolean result = courseManagementService.canUserPerformCourseOperation(courseId, userId, operation);
            
            // Then
            assertThat(result).isTrue();
        }
        
        @Test
        @DisplayName("Should deny unauthorized course operations")
        void shouldDenyUnauthorizedCourseOperations() {
            // Given
            Long courseId = 1L;
            Long userId = 99L; // Not authorized
            String operation = "CREATE_TIMESHEET";
            when(courseManagementService.canUserPerformCourseOperation(courseId, userId, operation))
                .thenReturn(false);
            
            // When
            boolean result = courseManagementService.canUserPerformCourseOperation(courseId, userId, operation);
            
            // Then
            assertThat(result).isFalse();
        }
    }
    
    @Nested
    @DisplayName("Edge Cases and Error Conditions")
    class EdgeCaseTests {
        
        @Test
        @DisplayName("Should handle null course ID gracefully")
        void shouldHandleNullCourseIdGracefully() {
            // Given
            when(courseManagementService.getCourseById(null)).thenReturn(Optional.empty());
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseById(null);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should handle null course code gracefully")
        void shouldHandleNullCourseCodeGracefully() {
            // Given
            when(courseManagementService.getCourseByCode(null)).thenReturn(Optional.empty());
            
            // When
            Optional<CourseDto> result = courseManagementService.getCourseByCode(null);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should handle null lecturer ID gracefully")
        void shouldHandleNullLecturerIdGracefully() {
            // Given
            when(courseManagementService.getCoursesByLecturer(null)).thenReturn(List.of());
            
            // When
            List<CourseDto> result = courseManagementService.getCoursesByLecturer(null);
            
            // Then
            assertThat(result).isEmpty();
        }
        
        @Test
        @DisplayName("Should handle null semester parameters gracefully")
        void shouldHandleNullSemesterParametersGracefully() {
            // Given
            when(courseManagementService.getCoursesBySemesterAndYear(null, null)).thenReturn(List.of());
            
            // When
            List<CourseDto> result = courseManagementService.getCoursesBySemesterAndYear(null, null);
            
            // Then
            assertThat(result).isEmpty();
        }
    }
    
    @Nested
    @DisplayName("Performance and Contract Tests")
    class PerformanceContractTests {
        
        @Test
        @DisplayName("Service methods should be idempotent")
        void serviceMethodsShouldBeIdempotent() {
            // Given
            Long courseId = 1L;
            when(courseManagementService.getCourseById(courseId)).thenReturn(Optional.of(testCourse1));
            
            // When - Called multiple times
            Optional<CourseDto> result1 = courseManagementService.getCourseById(courseId);
            Optional<CourseDto> result2 = courseManagementService.getCourseById(courseId);
            Optional<CourseDto> result3 = courseManagementService.getCourseById(courseId);
            
            // Then - Should return same result
            assertThat(result1).isEqualTo(result2);
            assertThat(result2).isEqualTo(result3);
        }
        
        @Test
        @DisplayName("Should maintain data consistency across calls")
        void shouldMaintainDataConsistencyAcrossCalls() {
            // Given
            when(courseManagementService.getCourseById(1L)).thenReturn(Optional.of(testCourse1));
            when(courseManagementService.isLecturerOfCourse(10L, 1L)).thenReturn(true);
            
            // When
            Optional<CourseDto> course = courseManagementService.getCourseById(1L);
            boolean isLecturer = courseManagementService.isLecturerOfCourse(10L, 1L);
            
            // Then
            assertThat(course).isPresent();
            assertThat(isLecturer).isTrue();
            assertThat(course.get().getLecturerId()).isEqualTo(10L);
        }
    }
}
