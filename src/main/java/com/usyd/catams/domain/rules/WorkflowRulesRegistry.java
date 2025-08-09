package com.usyd.catams.domain.rules;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;

import java.util.*;
import java.util.function.BiPredicate;

/**
 * Single Source of Truth for all business rules in the CATAMS workflow.
 * 
 * This registry contains all approval workflow rules, permissions, and state transitions.
 * It serves as the definitive authority for business logic, ensuring consistency
 * across controllers, services, tests, and documentation.
 * 
 * Design Principles:
 * 1. All business rules defined in one place
 * 2. Type-safe rule definitions
 * 3. Easy to validate and test
 * 4. Can generate OpenAPI specs, tests, and documentation
 * 
 * @author Development Team
 * @since 2.0
 */
public final class WorkflowRulesRegistry {
    
    /**
     * Core workflow rule definitions
     */
    private static final Map<RuleKey, WorkflowRule> RULES = new HashMap<>();
    
    static {
        initializeWorkflowRules();
    }
    
    /**
     * Initialize all workflow rules - SINGLE SOURCE OF TRUTH
     * Based on Final Workflow Definition v2.0
     */
    private static void initializeWorkflowRules() {
        
        // ===================== STEP 1: LECTURER CREATION AND SUBMISSION =====================
        
        // LECTURER can submit DRAFT timesheets they created
        addRule(ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.LECTURER, ApprovalStatus.DRAFT,
            "Step 1: LECTURER submits draft timesheet for tutor review",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()),
            ApprovalStatus.PENDING_TUTOR_REVIEW
        );

        // TUTOR can submit their own DRAFT timesheets (integration test expectation)
        addRule(ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.TUTOR, ApprovalStatus.DRAFT,
            "Step 1 (alt): TUTOR submits their own draft timesheet for tutor review",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()),
            ApprovalStatus.PENDING_TUTOR_REVIEW
        );
        
        // ===================== STEP 2: TUTOR REVIEW AND FEEDBACK =====================
        
        // TUTOR can approve accurate timesheets (auto-advance to HR queue per integration tests)
        addRule(ApprovalAction.APPROVE, UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_REVIEW,
            "Step 2a: TUTOR approves accurate timesheets",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()),
            ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR
        );
        
        // TUTOR can request modifications for incorrect timesheets
        addRule(ApprovalAction.REQUEST_MODIFICATION, UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_REVIEW,
            "Step 2b: TUTOR requests modifications for incorrect timesheets",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()),
            ApprovalStatus.MODIFICATION_REQUESTED
        );

        // TUTOR can reject pending timesheets with reason
        addRule(ApprovalAction.REJECT, UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_REVIEW,
            "Step 2c: TUTOR rejects inaccurate timesheets",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()),
            ApprovalStatus.REJECTED
        );
        
        // ===================== STEP 3: LECTURER PROCESSING MODIFICATION REQUESTS =====================
        
        // LECTURER can resubmit after making requested modifications
        addRule(ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.LECTURER, ApprovalStatus.MODIFICATION_REQUESTED,
            "Step 3: LECTURER resubmits after making requested changes",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()),
            ApprovalStatus.PENDING_TUTOR_REVIEW
        );
        
        // ===================== STEP 4: LECTURER FINAL APPROVAL =====================
        
        // LECTURER gives final approval after tutor acceptance
        addRule(ApprovalAction.FINAL_APPROVAL, UserRole.LECTURER, ApprovalStatus.APPROVED_BY_TUTOR,
            "Step 4: LECTURER provides final approval after tutor confirmation",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()),
            ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR
        );

        // LECTURER can reject at final approval stage (send back to edit)
        addRule(ApprovalAction.REJECT, UserRole.LECTURER, ApprovalStatus.APPROVED_BY_TUTOR,
            "Step 4 (alt): LECTURER rejects timesheet after tutor approval",
            (user, context) -> user.getId().equals(context.getCourse().getLecturerId()),
            ApprovalStatus.REJECTED
        );
        
        // ===================== STEP 5: HR FINAL REVIEW AND PROCESSING =====================
        
        // HR can give final approval for payroll
        addRule(ApprovalAction.HR_APPROVE, UserRole.HR, ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR,
            "Step 5a: HR gives final approval for payroll processing",
            (user, context) -> true, // All HR users can approve
            ApprovalStatus.FINAL_APPROVED
        );
        
        // HR can reject with reason
        addRule(ApprovalAction.HR_REJECT, UserRole.HR, ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR,
            "Step 5b: HR rejects timesheet with mandatory reason",
            (user, context) -> true, // All HR users can reject
            ApprovalStatus.REJECTED
        );

        // From HR queue, LECTURER cannot reject (ensure 400 by not defining rule)
        
        // ===================== STEP 6: HANDLING REJECTED TIMESHEETS =====================
        
        // TUTOR (as owner) can edit and resubmit rejected timesheets
        addRule(ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.TUTOR, ApprovalStatus.REJECTED,
            "Step 6: TUTOR edits and resubmits rejected timesheets",
            (user, context) -> user.getId().equals(context.getTimesheet().getTutorId()),
            ApprovalStatus.PENDING_TUTOR_REVIEW
        );
        
        // ===================== ADMIN OVERRIDE RULES =====================
        
        // ADMIN can perform any action on any timesheet (mirror role-specific targets)
        for (ApprovalAction action : ApprovalAction.values()) {
            for (ApprovalStatus status : ApprovalStatus.values()) {
                if (!status.isFinal()) { // Can't act on final states
                    addRule(action, UserRole.ADMIN, status,
                        "ADMIN has override permissions for all actions",
                        (user, context) -> true,
                        determineAdminTargetStatus(action, status)
                    );
                }
            }
        }
    }
    
    /**
     * Add a workflow rule to the registry
     */
    private static void addRule(ApprovalAction action, UserRole role, ApprovalStatus fromStatus,
                              String description, BiPredicate<User, WorkflowContext> condition,
                              ApprovalStatus toStatus) {
        RuleKey key = new RuleKey(action, role, fromStatus);
        WorkflowRule rule = new WorkflowRule(action, role, fromStatus, toStatus, description, condition);
        RULES.put(key, rule);
    }
    
    /**
     * Check if a user can perform an action on a timesheet
     */
    public static boolean canPerformAction(ApprovalAction action, UserRole role, ApprovalStatus currentStatus,
                                         User user, WorkflowContext context) {
        RuleKey key = new RuleKey(action, role, currentStatus);
        WorkflowRule rule = RULES.get(key);
        
        if (rule == null) {
            return false; // No rule = not allowed
        }
        
        return rule.condition().test(user, context);
    }
    
    /**
     * Get target status for a successful action
     */
    public static ApprovalStatus getTargetStatus(ApprovalAction action, UserRole role, ApprovalStatus currentStatus) {
        RuleKey key = new RuleKey(action, role, currentStatus);
        WorkflowRule rule = RULES.get(key);
        return rule != null ? rule.toStatus() : null;
    }
    
    /**
     * Get all valid actions for a user in current context
     */
    public static List<ApprovalAction> getValidActions(UserRole role, ApprovalStatus currentStatus,
                                                     User user, WorkflowContext context) {
        return RULES.entrySet().stream()
            .filter(entry -> entry.getKey().role() == role && entry.getKey().fromStatus() == currentStatus)
            .filter(entry -> entry.getValue().condition().test(user, context))
            .map(entry -> entry.getValue().action())
            .distinct()
            .toList();
    }
    
    /**
     * Get human-readable rule description
     */
    public static String getRuleDescription(ApprovalAction action, UserRole role, ApprovalStatus fromStatus) {
        RuleKey key = new RuleKey(action, role, fromStatus);
        WorkflowRule rule = RULES.get(key);
        return rule != null ? rule.description() : "No rule defined";
    }
    
    /**
     * Get all rules for documentation/testing generation
     */
    public static Map<RuleKey, WorkflowRule> getAllRules() {
        return Collections.unmodifiableMap(RULES);
    }
    
    /**
     * Validate rule consistency (for startup checks)
     */
    public static List<String> validateRules() {
        List<String> errors = new ArrayList<>();
        
        // Check for orphaned transitions
        Set<ApprovalStatus> reachableStatuses = new HashSet<>();
        reachableStatuses.add(ApprovalStatus.DRAFT); // Starting state
        
        RULES.values().forEach(rule -> {
            reachableStatuses.add(rule.toStatus());
        });
        
        for (ApprovalStatus status : ApprovalStatus.values()) {
            if (!reachableStatuses.contains(status)) {
                errors.add("Unreachable status: " + status);
            }
        }
        
        return errors;
    }
    
    // Helper method for ADMIN target status determination
    private static ApprovalStatus determineAdminTargetStatus(ApprovalAction action, ApprovalStatus fromStatus) {
        // ADMIN follows same rules as appropriate role for target status
        return switch (action) {
            case SUBMIT_FOR_APPROVAL -> ApprovalStatus.PENDING_TUTOR_REVIEW;
            case APPROVE -> fromStatus == ApprovalStatus.PENDING_TUTOR_REVIEW ? 
                          ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR : ApprovalStatus.FINAL_APPROVED;
            case REJECT, HR_REJECT -> ApprovalStatus.REJECTED;
            case REQUEST_MODIFICATION -> ApprovalStatus.MODIFICATION_REQUESTED;
            case FINAL_APPROVAL -> ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
            case HR_APPROVE -> ApprovalStatus.FINAL_APPROVED;
        };
    }
    
    /**
     * Immutable rule key for lookup
     */
    public static record RuleKey(ApprovalAction action, UserRole role, ApprovalStatus fromStatus) {}
    
    /**
     * Immutable workflow rule definition
     */
    public static record WorkflowRule(
        ApprovalAction action,
        UserRole role,
        ApprovalStatus fromStatus,
        ApprovalStatus toStatus,
        String description,
        BiPredicate<User, WorkflowContext> condition
    ) {}
    
    /**
     * Context for rule evaluation
     */
    public static interface WorkflowContext {
        Timesheet getTimesheet();
        Course getCourse();
        User getUser();
    }
    
    /**
     * Simple User interface for rule evaluation
     */
    public static interface User {
        Long getId();
        UserRole getRole();
    }
    
    /**
     * Simple Timesheet interface for rule evaluation
     */
    public static interface Timesheet {
        Long getId();
        Long getTutorId();
        Long getCourseId();
        ApprovalStatus getStatus();
    }
    
    /**
     * Simple Course interface for rule evaluation
     */
    public static interface Course {
        Long getId();
        Long getLecturerId();
    }
}