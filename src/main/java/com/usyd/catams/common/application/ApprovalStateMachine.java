package com.usyd.catams.common.application;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Centralized state machine for approval workflow management.
 * 
 * This service serves as the single source of truth for all approval status transitions,
 * replacing scattered hardcoded logic throughout the codebase. It ensures consistency
 * and makes workflow modifications easier to implement and maintain.
 * 
 * Key benefits:
 * - Single configuration point for all workflow changes
 * - Reduced change risk through centralized validation
 * - Improved maintainability and testing coverage
 * - Clear separation of workflow logic from business entities
 * 
 * @author Development Team
 * @since 1.1
 */
@Component
public class ApprovalStateMachine {
    
    /**
     * Immutable map defining all valid state transitions.
     * Key: StateTransition(fromStatus, action)
     * Value: Target ApprovalStatus
     */
    private final Map<StateTransition, ApprovalStatus> transitionMap;
    
    /**
     * Map defining valid actions for each status.
     * Key: ApprovalStatus
     * Value: Set of valid ApprovalActions
     */
    private final Map<ApprovalStatus, Set<ApprovalAction>> validActionsMap;
    
    public ApprovalStateMachine() {
        this.transitionMap = buildTransitionMap();
        this.validActionsMap = buildValidActionsMap();
    }
    
    /**
     * Check if a transition from current status using given action is valid.
     * 
     * @param fromStatus the current approval status
     * @param action the action to be performed
     * @return true if transition is valid, false otherwise
     * @throws IllegalArgumentException if fromStatus or action is null
     */
    public boolean canTransition(ApprovalStatus fromStatus, ApprovalAction action) {
        validateParameters(fromStatus, action);
        return transitionMap.containsKey(new StateTransition(fromStatus, action));
    }
    
    /**
     * Get the target status after performing an action from current status.
     * 
     * @param fromStatus the current approval status
     * @param action the action to be performed
     * @return the target ApprovalStatus after transition
     * @throws IllegalStateException if transition is not valid
     * @throws IllegalArgumentException if fromStatus or action is null
     */
    public ApprovalStatus getNextStatus(ApprovalStatus fromStatus, ApprovalAction action) {
        validateParameters(fromStatus, action);
        
        StateTransition transition = new StateTransition(fromStatus, action);
        ApprovalStatus nextStatus = transitionMap.get(transition);
        
        if (nextStatus == null) {
            throw new IllegalStateException(
                String.format("Invalid transition: Cannot perform action %s from status %s", 
                    action, fromStatus));
        }
        
        return nextStatus;
    }
    
    /**
     * Get all valid actions that can be performed from the given status.
     * 
     * @param status the current approval status
     * @return set of valid ApprovalActions, empty set if no actions available
     * @throws IllegalArgumentException if status is null
     */
    public Set<ApprovalAction> getValidActions(ApprovalStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        
        return validActionsMap.getOrDefault(status, Collections.emptySet());
    }
    
    /**
     * Get all possible next statuses that can be reached from current status.
     * 
     * @param status the current approval status
     * @return array of possible next ApprovalStatuses
     * @throws IllegalArgumentException if status is null
     */
    public ApprovalStatus[] getNextPossibleStatuses(ApprovalStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        
        return transitionMap.entrySet().stream()
            .filter(entry -> entry.getKey().fromStatus.equals(status))
            .map(Map.Entry::getValue)
            .distinct()
            .toArray(ApprovalStatus[]::new);
    }
    
    /**
     * Check if the given status allows editing of the timesheet.
     * 
     * @param status the approval status to check
     * @return true if timesheet can be edited in this status
     * @throws IllegalArgumentException if status is null
     */
    public boolean isEditable(ApprovalStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        
        return status == ApprovalStatus.DRAFT || 
               status == ApprovalStatus.MODIFICATION_REQUESTED;
    }
    
    /**
     * Check if the given status is a pending state requiring action.
     * 
     * @param status the approval status to check
     * @return true if status is pending some action
     * @throws IllegalArgumentException if status is null
     */
    public boolean isPending(ApprovalStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        
        // Pending classifications include tutor review and HR queue
        return status == ApprovalStatus.PENDING_TUTOR_REVIEW ||
               status == ApprovalStatus.APPROVED_BY_TUTOR ||
               status == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
    }
    
    /**
     * Check if the given status represents a final state (no further workflow).
     * 
     * @param status the approval status to check
     * @return true if status is final
     * @throws IllegalArgumentException if status is null
     */
    public boolean isFinal(ApprovalStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        
        return status == ApprovalStatus.FINAL_APPROVED || 
               status == ApprovalStatus.REJECTED;
    }
    
    /**
     * Build the complete state transition map based on documented business requirements.
     * 
     * Business workflow (from docs/timesheet-approval-workflow-ssot.md):
     * DRAFT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED
     * 
     * This is the single source of truth for approval state transitions.
     */
    private Map<StateTransition, ApprovalStatus> buildTransitionMap() {
        Map<StateTransition, ApprovalStatus> map = new HashMap<>();
        
        // Step 1: DRAFT can only be submitted for review
        map.put(new StateTransition(ApprovalStatus.DRAFT, ApprovalAction.SUBMIT_FOR_APPROVAL), 
                ApprovalStatus.PENDING_TUTOR_REVIEW);
        
        // Step 2: PENDING_TUTOR_REVIEW - tutor can approve, reject, or request modifications
        map.put(new StateTransition(ApprovalStatus.PENDING_TUTOR_REVIEW, ApprovalAction.APPROVE), 
                ApprovalStatus.APPROVED_BY_TUTOR);
        map.put(new StateTransition(ApprovalStatus.PENDING_TUTOR_REVIEW, ApprovalAction.REJECT), 
                ApprovalStatus.REJECTED);
        map.put(new StateTransition(ApprovalStatus.PENDING_TUTOR_REVIEW, ApprovalAction.REQUEST_MODIFICATION), 
                ApprovalStatus.MODIFICATION_REQUESTED);
        
        // Step 3: From APPROVED_BY_TUTOR, lecturer performs FINAL_APPROVAL to move to HR queue
        map.put(new StateTransition(ApprovalStatus.APPROVED_BY_TUTOR, ApprovalAction.FINAL_APPROVAL),
                ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);

        // Step 3 (alternative): LECTURER can reject at final review stage per SSOT v2.0
        map.put(new StateTransition(ApprovalStatus.APPROVED_BY_TUTOR, ApprovalAction.REJECT),
                ApprovalStatus.REJECTED);

        // Step 3B: APPROVED_BY_LECTURER_AND_TUTOR - HR can approve, reject, or request modifications
        map.put(new StateTransition(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR, ApprovalAction.APPROVE),
                ApprovalStatus.FINAL_APPROVED);
        map.put(new StateTransition(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR, ApprovalAction.REJECT),
                ApprovalStatus.REJECTED);
        map.put(new StateTransition(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR, ApprovalAction.REQUEST_MODIFICATION),
                ApprovalStatus.MODIFICATION_REQUESTED);

        // Recovery workflows: MODIFICATION_REQUESTED can be resubmitted
        map.put(new StateTransition(ApprovalStatus.MODIFICATION_REQUESTED, ApprovalAction.SUBMIT_FOR_APPROVAL), 
                ApprovalStatus.PENDING_TUTOR_REVIEW);
        
        
        // FINAL_APPROVED is terminal state - no transitions
        
        return Collections.unmodifiableMap(map);
    }
    
    /**
     * Get the automatic transition target for states that require system-level transitions.
     * 
     * @param status the current approval status
     * @return the target status for automatic transition, null if no automatic transition
     * @throws IllegalArgumentException if status is null
     */
    public ApprovalStatus getAutoTransition(ApprovalStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        
        // SSOT workflow has no automatic transitions. All transitions require explicit actions.
        return null;
    }
    
    /**
     * Build the map of valid actions for each status.
     */
    private Map<ApprovalStatus, Set<ApprovalAction>> buildValidActionsMap() {
        Map<ApprovalStatus, Set<ApprovalAction>> map = new HashMap<>();
        
        // Group transitions by fromStatus to build valid actions
        for (StateTransition transition : transitionMap.keySet()) {
            map.computeIfAbsent(transition.fromStatus, k -> new HashSet<>())
               .add(transition.action);
        }
        
        // Add terminal states with empty action sets
        map.put(ApprovalStatus.FINAL_APPROVED, Collections.emptySet());
        map.put(ApprovalStatus.REJECTED, Collections.emptySet());
        
        // Make all sets immutable
        map.replaceAll((status, actions) -> Collections.unmodifiableSet(actions));
        
        return Collections.unmodifiableMap(map);
    }
    
    private void validateParameters(ApprovalStatus fromStatus, ApprovalAction action) {
        if (fromStatus == null) {
            throw new IllegalArgumentException("From status cannot be null");
        }
        if (action == null) {
            throw new IllegalArgumentException("Action cannot be null");
        }
    }
    
    /**
     * Immutable value class representing a state transition.
     * Used as a key in the transition map.
     */
    private static class StateTransition {
        private final ApprovalStatus fromStatus;
        private final ApprovalAction action;
        
        public StateTransition(ApprovalStatus fromStatus, ApprovalAction action) {
            this.fromStatus = fromStatus;
            this.action = action;
        }
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            StateTransition that = (StateTransition) o;
            return Objects.equals(fromStatus, that.fromStatus) && 
                   Objects.equals(action, that.action);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(fromStatus, action);
        }
        
        @Override
        public String toString() {
            return String.format("StateTransition{%s -> %s}", fromStatus, action);
        }
    }
}

// Holder moved to its own file: ApprovalStateMachineHolder.java