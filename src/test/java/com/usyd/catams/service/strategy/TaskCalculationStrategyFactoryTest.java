package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Tests for TaskCalculationStrategyFactory.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("TaskCalculationStrategyFactory Tests")
class TaskCalculationStrategyFactoryTest {

    @Test
    @DisplayName("should create factory with list of strategies")
    void shouldCreateFactoryWithListOfStrategies() {
        // Given
        TaskCalculationStrategy tutorialStrategy = createMockStrategy(TimesheetTaskType.TUTORIAL);
        TaskCalculationStrategy lectureStrategy = createMockStrategy(TimesheetTaskType.LECTURE);
        List<TaskCalculationStrategy> strategies = Arrays.asList(tutorialStrategy, lectureStrategy);

        // When
        TaskCalculationStrategyFactory factory = new TaskCalculationStrategyFactory(strategies);

        // Then
        assertThat(factory).isNotNull();
    }

    @Test
    @DisplayName("should return correct strategy for task type")
    void shouldReturnCorrectStrategyForTaskType() {
        // Given
        TaskCalculationStrategy tutorialStrategy = createMockStrategy(TimesheetTaskType.TUTORIAL);
        TaskCalculationStrategy lectureStrategy = createMockStrategy(TimesheetTaskType.LECTURE);
        List<TaskCalculationStrategy> strategies = Arrays.asList(tutorialStrategy, lectureStrategy);
        TaskCalculationStrategyFactory factory = new TaskCalculationStrategyFactory(strategies);

        // When
        TaskCalculationStrategy result = factory.getStrategy(TimesheetTaskType.TUTORIAL);

        // Then
        assertThat(result).isEqualTo(tutorialStrategy);
    }

    @Test
    @DisplayName("should return different strategies for different task types")
    void shouldReturnDifferentStrategiesForDifferentTaskTypes() {
        // Given
        TaskCalculationStrategy tutorialStrategy = createMockStrategy(TimesheetTaskType.TUTORIAL);
        TaskCalculationStrategy lectureStrategy = createMockStrategy(TimesheetTaskType.LECTURE);
        List<TaskCalculationStrategy> strategies = Arrays.asList(tutorialStrategy, lectureStrategy);
        TaskCalculationStrategyFactory factory = new TaskCalculationStrategyFactory(strategies);

        // When
        TaskCalculationStrategy tutorialResult = factory.getStrategy(TimesheetTaskType.TUTORIAL);
        TaskCalculationStrategy lectureResult = factory.getStrategy(TimesheetTaskType.LECTURE);

        // Then
        assertThat(tutorialResult).isEqualTo(tutorialStrategy);
        assertThat(lectureResult).isEqualTo(lectureStrategy);
        assertThat(tutorialResult).isNotEqualTo(lectureResult);
    }

    @Test
    @DisplayName("should throw exception when no strategy found for task type")
    void shouldThrowExceptionWhenNoStrategyFoundForTaskType() {
        // Given
        TaskCalculationStrategy tutorialStrategy = createMockStrategy(TimesheetTaskType.TUTORIAL);
        List<TaskCalculationStrategy> strategies = Collections.singletonList(tutorialStrategy);
        TaskCalculationStrategyFactory factory = new TaskCalculationStrategyFactory(strategies);

        // Then
        assertThatThrownBy(() -> factory.getStrategy(TimesheetTaskType.ORAA))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("No strategy found")
            .hasMessageContaining("ORAA");
    }

    @Test
    @DisplayName("should throw exception for empty strategy list")
    void shouldThrowExceptionForEmptyStrategyList() {
        // Given
        List<TaskCalculationStrategy> strategies = Collections.emptyList();

        // When
        TaskCalculationStrategyFactory factory = new TaskCalculationStrategyFactory(strategies);

        // Then
        assertThatThrownBy(() -> factory.getStrategy(TimesheetTaskType.TUTORIAL))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("No strategy found");
    }

    @Test
    @DisplayName("should handle single strategy")
    void shouldHandleSingleStrategy() {
        // Given
        TaskCalculationStrategy tutorialStrategy = createMockStrategy(TimesheetTaskType.TUTORIAL);
        List<TaskCalculationStrategy> strategies = Collections.singletonList(tutorialStrategy);
        TaskCalculationStrategyFactory factory = new TaskCalculationStrategyFactory(strategies);

        // When
        TaskCalculationStrategy result = factory.getStrategy(TimesheetTaskType.TUTORIAL);

        // Then
        assertThat(result).isEqualTo(tutorialStrategy);
    }

    private TaskCalculationStrategy createMockStrategy(TimesheetTaskType taskType) {
        TaskCalculationStrategy mock = mock(TaskCalculationStrategy.class);
        when(mock.supports(taskType)).thenReturn(true);
        return mock;
    }
}
