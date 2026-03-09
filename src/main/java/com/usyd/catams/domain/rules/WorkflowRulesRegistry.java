package com.usyd.catams.domain.rules;

import com.usyd.catams.common.application.ApprovalStateMachine;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiPredicate;

/**
 * Single source of truth for workflow permissions and role-based action constraints.
 *
 * <p>Status transitions are defined only by {@link ApprovalStateMachine}. This registry
 * defines who can trigger which state-machine action under which context.</p>
 */
@Component
public class WorkflowRulesRegistry {

    private final ApprovalStateMachine approvalStateMachine;
    private final Map<RuleKey, WorkflowRule> rules;

    public WorkflowRulesRegistry(ApprovalStateMachine approvalStateMachine) {
        this.approvalStateMachine = approvalStateMachine;
        this.rules = initializeWorkflowRules();
    }

    private Map<RuleKey, WorkflowRule> initializeWorkflowRules() {
        Map<RuleKey, WorkflowRule> initialized = new HashMap<>();

        // Step 1: submit
        addRule(initialized, ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.LECTURER, ApprovalStatus.DRAFT,
            "Step 1: LECTURER submits draft timesheet for tutor review",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()));
        addRule(initialized, ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.TUTOR, ApprovalStatus.DRAFT,
            "Step 1 (alt): TUTOR submits their own draft timesheet for tutor review",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()));

        // Step 2: tutor review
        addRule(initialized, ApprovalAction.TUTOR_CONFIRM, UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_CONFIRMATION,
            "Step 2a: TUTOR confirms accurate timesheets (awaiting lecturer final approval)",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()));
        addRule(initialized, ApprovalAction.REQUEST_MODIFICATION, UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_CONFIRMATION,
            "Step 2b: TUTOR requests modifications for incorrect timesheets",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()));
        addRule(initialized, ApprovalAction.REJECT, UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_CONFIRMATION,
            "Step 2c: TUTOR rejects inaccurate timesheets",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()));

        // Step 3: re-submit after modification request
        addRule(initialized, ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.TUTOR, ApprovalStatus.MODIFICATION_REQUESTED,
            "Step 3: TUTOR resubmits after applying requested changes",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()));

        // Step 4: lecturer final approval
        addRule(initialized, ApprovalAction.LECTURER_CONFIRM, UserRole.LECTURER, ApprovalStatus.TUTOR_CONFIRMED,
            "Step 4: LECTURER provides final confirmation after tutor confirmation",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()));
        addRule(initialized, ApprovalAction.REQUEST_MODIFICATION, UserRole.LECTURER, ApprovalStatus.TUTOR_CONFIRMED,
            "Step 4b: LECTURER requests modifications on tutor-confirmed timesheets",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()));
        addRule(initialized, ApprovalAction.REJECT, UserRole.LECTURER, ApprovalStatus.TUTOR_CONFIRMED,
            "Step 4c: LECTURER rejects timesheet after tutor confirmation",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()));

        // Step 5: HR final review
        addRule(initialized, ApprovalAction.HR_CONFIRM, UserRole.HR, ApprovalStatus.LECTURER_CONFIRMED,
            "Step 5a: HR gives final confirmation for payroll processing",
            (user, context) -> true);
        addRule(initialized, ApprovalAction.REJECT, UserRole.HR, ApprovalStatus.LECTURER_CONFIRMED,
            "Step 5b: HR rejects timesheet with mandatory reason",
            (user, context) -> true);
        addRule(initialized, ApprovalAction.REQUEST_MODIFICATION, UserRole.HR, ApprovalStatus.LECTURER_CONFIRMED,
            "Step 5c: HR requests modifications",
            (user, context) -> true);

        // Admin override for all valid state-machine transitions
        for (ApprovalStatus status : ApprovalStatus.values()) {
            if (status.isFinal()) {
                continue;
            }
            for (ApprovalAction action : EnumSet.allOf(ApprovalAction.class)) {
                if (!approvalStateMachine.canTransition(status, action)) {
                    continue;
                }
                addRule(initialized, action, UserRole.ADMIN, status,
                    "ADMIN has override permissions for all actions",
                    (user, context) -> true);
            }
        }

        return Collections.unmodifiableMap(initialized);
    }

    private void addRule(Map<RuleKey, WorkflowRule> target,
                         ApprovalAction action,
                         UserRole role,
                         ApprovalStatus fromStatus,
                         String description,
                         BiPredicate<User, WorkflowContext> condition) {
        if (!approvalStateMachine.canTransition(fromStatus, action)) {
            throw new IllegalStateException("Cannot register workflow rule for invalid transition: "
                + fromStatus + " + " + action);
        }

        ApprovalStatus toStatus = approvalStateMachine.getNextStatus(fromStatus, action);
        RuleKey key = new RuleKey(action, role, fromStatus);
        WorkflowRule rule = new WorkflowRule(action, role, fromStatus, toStatus, description, condition);
        target.put(key, rule);
    }

    public boolean canPerformAction(ApprovalAction action,
                                    UserRole role,
                                    ApprovalStatus currentStatus,
                                    User user,
                                    WorkflowContext context) {
        RuleKey key = new RuleKey(action, role, currentStatus);
        WorkflowRule rule = rules.get(key);
        return rule != null && rule.condition().test(user, context);
    }

    public ApprovalStatus getTargetStatus(ApprovalAction action, UserRole role, ApprovalStatus currentStatus) {
        RuleKey key = new RuleKey(action, role, currentStatus);
        WorkflowRule rule = rules.get(key);
        if (rule == null || !approvalStateMachine.canTransition(currentStatus, action)) {
            return null;
        }
        return approvalStateMachine.getNextStatus(currentStatus, action);
    }

    public List<ApprovalAction> getValidActions(UserRole role,
                                                ApprovalStatus currentStatus,
                                                User user,
                                                WorkflowContext context) {
        return rules.entrySet().stream()
            .filter(entry -> entry.getKey().role() == role && entry.getKey().fromStatus() == currentStatus)
            .filter(entry -> entry.getValue().condition().test(user, context))
            .map(entry -> entry.getValue().action())
            .distinct()
            .toList();
    }

    public String getRuleDescription(ApprovalAction action, UserRole role, ApprovalStatus fromStatus) {
        RuleKey key = new RuleKey(action, role, fromStatus);
        WorkflowRule rule = rules.get(key);
        return rule != null ? rule.description() : "No rule defined";
    }

    public Map<RuleKey, WorkflowRule> getAllRules() {
        return rules;
    }

    public List<String> validateRules() {
        List<String> errors = new ArrayList<>();

        rules.forEach((key, rule) -> {
            if (!approvalStateMachine.canTransition(key.fromStatus(), key.action())) {
                errors.add("Rule transition is not defined by ApprovalStateMachine: " + key);
                return;
            }
            ApprovalStatus expected = approvalStateMachine.getNextStatus(key.fromStatus(), key.action());
            if (rule.toStatus() != expected) {
                errors.add("Rule transition mismatch for " + key + ": expected " + expected + " but got " + rule.toStatus());
            }
        });

        Set<ApprovalStatus> reachableStatuses = new HashSet<>();
        reachableStatuses.add(ApprovalStatus.DRAFT);
        for (ApprovalStatus status : ApprovalStatus.values()) {
            for (ApprovalAction action : ApprovalAction.values()) {
                if (approvalStateMachine.canTransition(status, action)) {
                    reachableStatuses.add(approvalStateMachine.getNextStatus(status, action));
                }
            }
        }

        for (ApprovalStatus status : ApprovalStatus.values()) {
            if (!reachableStatuses.contains(status)) {
                errors.add("Unreachable status in ApprovalStateMachine: " + status);
            }
        }

        return errors;
    }

    public record RuleKey(ApprovalAction action, UserRole role, ApprovalStatus fromStatus) {}

    public record WorkflowRule(
        ApprovalAction action,
        UserRole role,
        ApprovalStatus fromStatus,
        ApprovalStatus toStatus,
        String description,
        BiPredicate<User, WorkflowContext> condition
    ) {}

    public interface WorkflowContext {
        Timesheet getTimesheet();
        Course getCourse();
        User getUser();
    }

    public interface User {
        Long getId();
        UserRole getRole();
    }

    public interface Timesheet {
        Long getId();
        Long getTutorId();
        Long getCourseId();
        ApprovalStatus getStatus();
    }

    public interface Course {
        Long getId();
        Long getLecturerId();
    }
}
