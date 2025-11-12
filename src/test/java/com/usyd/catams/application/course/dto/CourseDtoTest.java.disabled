package com.usyd.catams.application.course.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

/**
 * TDD Tests for CourseDto
 * 
 * These tests ensure the CourseDto is properly designed for:
 * 1. Future JSON serialization/deserialization
 * 2. Immutability and thread safety
 * 3. Proper equals/hashCode contracts
 * 4. Builder pattern functionality
 * 5. Business logic methods for course operations
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@DisplayName("CourseDto TDD Tests")
class CourseDtoTest {
    
    @Nested
    @DisplayName("Builder Pattern Tests")
    class BuilderPatternTests {
        
        @Test
        @DisplayName("Should build CourseDto with all required fields")
        void shouldBuildCourseDtoWithAllRequiredFields() {
            // Given
            LocalDateTime now = LocalDateTime.now();
            LocalDate today = LocalDate.now();
            
            // When
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .description("Introduction to distributed systems")
                .semester("S1")
                .year(2024)
                .lecturerId(10L)
                .lecturerName("Dr. John Smith")
                .lecturerEmail("john.smith@usyd.edu.au")
                .active(true)
                .startDate(today)
                .endDate(today.plusMonths(4))
                .maxStudents(150)
                .currentEnrollment(120)
                .maxTutors(8)
                .currentTutors(6)
                .budgetLimit(new BigDecimal("50000.00"))
                .budgetUsed(new BigDecimal("25000.00"))
                .defaultHourlyRate(new BigDecimal("45.00"))
                .createdAt(now)
                .updatedAt(now)
                .build();
            
            // Then
            assertThat(course.getId()).isEqualTo(1L);
            assertThat(course.getCourseCode()).isEqualTo("COMP3221");
            assertThat(course.getCourseName()).isEqualTo("Distributed Systems");
            assertThat(course.getLecturerId()).isEqualTo(10L);
            assertThat(course.isActive()).isTrue();
            assertThat(course.getMaxTutors()).isEqualTo(8);
            assertThat(course.getCurrentTutors()).isEqualTo(6);
        }
        
        @Test
        @DisplayName("Should build CourseDto with minimal required fields")
        void shouldBuildCourseDtoWithMinimalRequiredFields() {
            // When
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
            
            // Then
            assertThat(course.getId()).isEqualTo(1L);
            assertThat(course.getCourseCode()).isEqualTo("COMP3221");
            assertThat(course.getCourseName()).isEqualTo("Distributed Systems");
            assertThat(course.getLecturerId()).isEqualTo(10L);
            assertThat(course.isActive()).isTrue(); // Default value
            assertThat(course.getCurrentEnrollment()).isEqualTo(0); // Default value
            assertThat(course.getCurrentTutors()).isEqualTo(0); // Default value
        }
        
        @Test
        @DisplayName("Should fail to build without required ID")
        void shouldFailToBuildWithoutRequiredId() {
            // When & Then
            assertThatThrownBy(() -> CourseDto.builder()
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Course ID is required");
        }
        
        @Test
        @DisplayName("Should fail to build without required course code")
        void shouldFailToBuildWithoutRequiredCourseCode() {
            // When & Then
            assertThatThrownBy(() -> CourseDto.builder()
                .id(1L)
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Course code is required");
        }
        
        @Test
        @DisplayName("Should fail to build without required course name")
        void shouldFailToBuildWithoutRequiredCourseName() {
            // When & Then
            assertThatThrownBy(() -> CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .lecturerId(10L)
                .build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Course name is required");
        }
        
        @Test
        @DisplayName("Should fail to build without required lecturer ID")
        void shouldFailToBuildWithoutRequiredLecturerId() {
            // When & Then
            assertThatThrownBy(() -> CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Lecturer ID is required");
        }
    }
    
    @Nested
    @DisplayName("Business Logic Methods Tests")
    class BusinessLogicMethodsTests {
        
        @Test
        @DisplayName("Should return full course name correctly")
        void shouldReturnFullCourseNameCorrectly() {
            // Given
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
            
            // When
            String fullName = course.getFullCourseName();
            
            // Then
            assertThat(fullName).isEqualTo("COMP3221 - Distributed Systems");
        }
        
        @Test
        @DisplayName("Should check if course is currently active")
        void shouldCheckIfCourseIsCurrentlyActive() {
            // Given - Active course within date range
            LocalDate today = LocalDate.now();
            CourseDto activeCourse = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .active(true)
                .startDate(today.minusDays(30))
                .endDate(today.plusDays(30))
                .build();
            
            // Given - Inactive course
            CourseDto inactiveCourse = CourseDto.builder()
                .id(2L)
                .courseCode("COMP3222")
                .courseName("Another Course")
                .lecturerId(10L)
                .active(false)
                .build();
            
            // When & Then
            assertThat(activeCourse.isCurrentlyActive()).isTrue();
            assertThat(inactiveCourse.isCurrentlyActive()).isFalse();
        }
        
        @Test
        @DisplayName("Should check if course has tutor slots")
        void shouldCheckIfCourseHasTutorSlots() {
            // Given - Course with available slots
            CourseDto courseWithSlots = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .maxTutors(8)
                .currentTutors(6)
                .build();
                
            // Given - Course at capacity
            CourseDto courseAtCapacity = CourseDto.builder()
                .id(2L)
                .courseCode("COMP3222")
                .courseName("Another Course")
                .lecturerId(10L)
                .maxTutors(5)
                .currentTutors(5)
                .build();
                
            // Given - Course with no limit
            CourseDto courseNoLimit = CourseDto.builder()
                .id(3L)
                .courseCode("COMP3223")
                .courseName("Third Course")
                .lecturerId(10L)
                .currentTutors(10)
                .build();
            
            // When & Then
            assertThat(courseWithSlots.hasTutorSlots()).isTrue();
            assertThat(courseAtCapacity.hasTutorSlots()).isFalse();
            assertThat(courseNoLimit.hasTutorSlots()).isTrue(); // No limit set
        }
        
        @Test
        @DisplayName("Should check if course is at student capacity")
        void shouldCheckIfCourseIsAtStudentCapacity() {
            // Given - Course at capacity
            CourseDto courseAtCapacity = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .maxStudents(150)
                .currentEnrollment(150)
                .build();
                
            // Given - Course with space
            CourseDto courseWithSpace = CourseDto.builder()
                .id(2L)
                .courseCode("COMP3222")
                .courseName("Another Course")
                .lecturerId(10L)
                .maxStudents(200)
                .currentEnrollment(180)
                .build();
            
            // When & Then
            assertThat(courseAtCapacity.isAtStudentCapacity()).isTrue();
            assertThat(courseWithSpace.isAtStudentCapacity()).isFalse();
        }
        
        @Test
        @DisplayName("Should calculate remaining budget correctly")
        void shouldCalculateRemainingBudgetCorrectly() {
            // Given - Course with budget
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .budgetLimit(new BigDecimal("50000.00"))
                .budgetUsed(new BigDecimal("25000.00"))
                .build();
                
            // Given - Course with no budget limit
            CourseDto courseNoBudget = CourseDto.builder()
                .id(2L)
                .courseCode("COMP3222")
                .courseName("Another Course")
                .lecturerId(10L)
                .build();
            
            // When
            BigDecimal remaining = course.getRemainingBudget();
            BigDecimal remainingNoBudget = courseNoBudget.getRemainingBudget();
            
            // Then
            assertThat(remaining).isEqualTo(new BigDecimal("25000.00"));
            assertThat(remainingNoBudget).isNull(); // No limit set
        }
        
        @Test
        @DisplayName("Should check if course has sufficient budget")
        void shouldCheckIfCourseHasSufficientBudget() {
            // Given
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .budgetLimit(new BigDecimal("50000.00"))
                .budgetUsed(new BigDecimal("25000.00"))
                .build();
            
            // When & Then
            assertThat(course.hasSufficientBudget(new BigDecimal("10000.00"))).isTrue();
            assertThat(course.hasSufficientBudget(new BigDecimal("30000.00"))).isFalse();
        }
        
        @Test
        @DisplayName("Should calculate budget utilization percentage")
        void shouldCalculateBudgetUtilizationPercentage() {
            // Given
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .budgetLimit(new BigDecimal("50000.00"))
                .budgetUsed(new BigDecimal("25000.00"))
                .build();
            
            // When
            BigDecimal utilization = course.getBudgetUtilizationPercentage();
            
            // Then
            assertThat(utilization).isEqualTo(new BigDecimal("50.0000"));
        }
        
        @Test
        @DisplayName("Should return semester year display string")
        void shouldReturnSemesterYearDisplayString() {
            // Given - Both semester and year
            CourseDto courseWithBoth = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .semester("S1")
                .year(2024)
                .build();
                
            // Given - Only year
            CourseDto courseOnlyYear = CourseDto.builder()
                .id(2L)
                .courseCode("COMP3222")
                .courseName("Another Course")
                .lecturerId(10L)
                .year(2024)
                .build();
                
            // Given - Neither
            CourseDto courseNeither = CourseDto.builder()
                .id(3L)
                .courseCode("COMP3223")
                .courseName("Third Course")
                .lecturerId(10L)
                .build();
            
            // When & Then
            assertThat(courseWithBoth.getSemesterYear()).isEqualTo("S1 2024");
            assertThat(courseOnlyYear.getSemesterYear()).isEqualTo("2024");
            assertThat(courseNeither.getSemesterYear()).isEqualTo("Not specified");
        }
        
        @Test
        @DisplayName("Should check if course is current semester")
        void shouldCheckIfCourseIsCurrentSemester() {
            // Given
            int currentYear = LocalDate.now().getYear();
            
            CourseDto currentCourse = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .year(currentYear)
                .build();
                
            CourseDto pastCourse = CourseDto.builder()
                .id(2L)
                .courseCode("COMP3222")
                .courseName("Past Course")
                .lecturerId(10L)
                .year(currentYear - 1)
                .build();
            
            // When & Then
            assertThat(currentCourse.isCurrentSemester()).isTrue();
            assertThat(pastCourse.isCurrentSemester()).isFalse();
        }
    }
    
    @Nested
    @DisplayName("Equals and HashCode Contract Tests")
    class EqualsHashCodeTests {
        
        @Test
        @DisplayName("Should be equal when ID and course code are same")
        void shouldBeEqualWhenIdAndCourseCodeAreSame() {
            // Given
            CourseDto course1 = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
                
            CourseDto course2 = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Different Name") // Different name
                .lecturerId(11L) // Different lecturer
                .build();
            
            // When & Then
            assertThat(course1).isEqualTo(course2);
            assertThat(course1.hashCode()).isEqualTo(course2.hashCode());
        }
        
        @Test
        @DisplayName("Should not be equal when ID is different")
        void shouldNotBeEqualWhenIdIsDifferent() {
            // Given
            CourseDto course1 = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
                
            CourseDto course2 = CourseDto.builder()
                .id(2L)
                .courseCode("COMP3221") // Same code
                .courseName("Distributed Systems") // Same name
                .lecturerId(10L) // Same lecturer
                .build();
            
            // When & Then
            assertThat(course1).isNotEqualTo(course2);
        }
        
        @Test
        @DisplayName("Should not be equal when course code is different")
        void shouldNotBeEqualWhenCourseCodeIsDifferent() {
            // Given
            CourseDto course1 = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
                
            CourseDto course2 = CourseDto.builder()
                .id(1L) // Same ID
                .courseCode("COMP3222")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
            
            // When & Then
            assertThat(course1).isNotEqualTo(course2);
        }
        
        @Test
        @DisplayName("Should handle null comparison correctly")
        void shouldHandleNullComparisonCorrectly() {
            // Given
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
            
            // When & Then
            assertThat(course).isNotEqualTo(null);
            assertThat(course.equals(null)).isFalse();
        }
    }
    
    @Nested
    @DisplayName("String Representation Tests")
    class StringRepresentationTests {
        
        @Test
        @DisplayName("Should provide meaningful toString representation")
        void shouldProvideMeaningfulToStringRepresentation() {
            // Given
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .lecturerName("Dr. John Smith")
                .active(true)
                .build();
            
            // When
            String toString = course.toString();
            
            // Then
            assertThat(toString).contains("CourseDto");
            assertThat(toString).contains("id=1");
            assertThat(toString).contains("courseCode='COMP3221'");
            assertThat(toString).contains("courseName='Distributed Systems'");
            assertThat(toString).contains("lecturer=Dr. John Smith");
            assertThat(toString).contains("active=true");
        }
    }
    
    @Nested
    @DisplayName("Edge Cases Tests")
    class EdgeCasesTests {
        
        @Test
        @DisplayName("Should handle null budget values gracefully")
        void shouldHandleNullBudgetValuesGracefully() {
            // Given
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .build();
            
            // When & Then - Should not throw exceptions
            assertThat(course.getRemainingBudget()).isNull();
            assertThat(course.getBudgetUtilizationPercentage()).isEqualTo(BigDecimal.ZERO);
            assertThat(course.hasSufficientBudget(new BigDecimal("1000"))).isTrue(); // No limit = sufficient
        }
        
        @Test
        @DisplayName("Should handle null date values gracefully")
        void shouldHandleNullDateValuesGracefully() {
            // Given
            CourseDto course = CourseDto.builder()
                .id(1L)
                .courseCode("COMP3221")
                .courseName("Distributed Systems")
                .lecturerId(10L)
                .active(true)
                .build();
            
            // When & Then - Should not throw exceptions
            assertThat(course.isCurrentlyActive()).isTrue(); // Active with no date restrictions
        }
    }
}
