package com.usyd.catams.application.course.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CourseDto contract tests")
class CourseDtoTest {

    @Test
    @DisplayName("Builder should enforce required fields")
    void builderShouldEnforceRequiredFields() {
        assertThatThrownBy(() -> CourseDto.builder()
            .courseCode("COMP3221")
            .courseName("Distributed Systems")
            .lecturerId(10L)
            .build())
            .isInstanceOf(NullPointerException.class)
            .hasMessageContaining("Course ID is required");
    }

    @Test
    @DisplayName("Builder should apply defaults and expose display name")
    void builderShouldApplyDefaultsAndExposeDisplayName() {
        CourseDto dto = CourseDto.builder()
            .id(1L)
            .courseCode("COMP3221")
            .courseName("Distributed Systems")
            .lecturerId(10L)
            .build();

        assertThat(dto.isActive()).isTrue();
        assertThat(dto.getCurrentEnrollment()).isEqualTo(0);
        assertThat(dto.getCurrentTutors()).isEqualTo(0);
        assertThat(dto.getFullCourseName()).isEqualTo("COMP3221 - Distributed Systems");
    }

    @Test
    @DisplayName("Budget helpers should be consistent")
    void budgetHelpersShouldBeConsistent() {
        CourseDto dto = CourseDto.builder()
            .id(1L)
            .courseCode("COMP3221")
            .courseName("Distributed Systems")
            .lecturerId(10L)
            .budgetLimit(new BigDecimal("50000.00"))
            .budgetUsed(new BigDecimal("12500.00"))
            .build();

        assertThat(dto.getRemainingBudget()).isEqualByComparingTo("37500.00");
        assertThat(dto.hasSufficientBudget(new BigDecimal("1000.00"))).isTrue();
        assertThat(dto.hasSufficientBudget(new BigDecimal("40000.00"))).isFalse();
        assertThat(dto.getBudgetUtilizationPercentage()).isEqualByComparingTo("25.0000");
    }

    @Test
    @DisplayName("Equality should use id and courseCode")
    void equalityShouldUseIdAndCourseCode() {
        CourseDto left = CourseDto.builder()
            .id(1L)
            .courseCode("COMP3221")
            .courseName("Distributed Systems")
            .lecturerId(10L)
            .build();
        CourseDto right = CourseDto.builder()
            .id(1L)
            .courseCode("COMP3221")
            .courseName("Different Name")
            .lecturerId(99L)
            .build();

        assertThat(left).isEqualTo(right);
        assertThat(left.hashCode()).isEqualTo(right.hashCode());
    }
}
