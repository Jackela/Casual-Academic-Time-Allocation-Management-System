package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Factory for creating and retrieving task calculation strategies.
 * 
 * This factory uses Spring's dependency injection to collect all strategy implementations
 * and provides lookup by task type.
 * 
 * Design Patterns:
 * - Factory Pattern: Creates/retrieves appropriate strategy for task type
 * - Registry Pattern: Maintains registry of strategies by task type
 * 
 * Thread Safety: Immutable after construction, thread-safe
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class TaskCalculationStrategyFactory {
    
    private final Map<TimesheetTaskType, TaskCalculationStrategy> strategies;
    
    /**
     * Constructs factory with list of available strategies.
     * Spring automatically injects all TaskCalculationStrategy beans.
     * 
     * @param strategyList list of available strategies
     */
    public TaskCalculationStrategyFactory(List<TaskCalculationStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                this::getSupportedTaskType,
                Function.identity(),
                (existing, replacement) -> {
                    throw new IllegalStateException(
                        "Duplicate strategy for task type: " + getSupportedTaskType(existing));
                }
            ));
    }
    
    /**
     * Get strategy for the given task type.
     * 
     * @param taskType the task type
     * @return the strategy for the task type
     * @throws IllegalArgumentException if no strategy found
     */
    public TaskCalculationStrategy getStrategy(TimesheetTaskType taskType) {
        return Optional.ofNullable(strategies.get(taskType))
            .orElseThrow(() -> new IllegalArgumentException(
                "No strategy found for task type: " + taskType));
    }
    
    /**
     * Check if a strategy exists for the given task type.
     * 
     * @param taskType the task type
     * @return true if strategy exists
     */
    public boolean hasStrategy(TimesheetTaskType taskType) {
        return strategies.containsKey(taskType);
    }
    
    /**
     * Get all registered task types.
     * 
     * @return set of registered task types
     */
    public java.util.Set<TimesheetTaskType> getRegisteredTaskTypes() {
        return strategies.keySet();
    }
    
    private TimesheetTaskType getSupportedTaskType(TaskCalculationStrategy strategy) {
        // Find which task type this strategy supports
        for (TimesheetTaskType type : TimesheetTaskType.values()) {
            if (strategy.supports(type)) {
                return type;
            }
        }
        throw new IllegalStateException(
            "Strategy " + strategy.getClass().getSimpleName() + " does not support any task type");
    }
}
