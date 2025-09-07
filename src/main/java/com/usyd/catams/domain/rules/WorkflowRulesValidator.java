package com.usyd.catams.domain.rules;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;

import java.util.List;
import java.util.Map;

/**
 * Simple validator to test the WorkflowRulesRegistry
 */
public class WorkflowRulesValidator {
    
    public static void main(String[] args) {
        System.out.println("=== CATAMS Workflow Rules Validation ===\n");
        
        // 1. Validate rule consistency
        System.out.println("1. Validating rule consistency...");
        List<String> errors = WorkflowRulesRegistry.validateRules();
        if (errors.isEmpty()) {
            System.out.println("✓ All rules are consistent");
        } else {
            System.out.println("✗ Found validation errors:");
            errors.forEach(error -> System.out.println("  - " + error));
        }
        
        // 2. Print all defined rules
        System.out.println("\n2. All defined workflow rules:");
        Map<WorkflowRulesRegistry.RuleKey, WorkflowRulesRegistry.WorkflowRule> rules = 
            WorkflowRulesRegistry.getAllRules();
        
        System.out.println("Total rules: " + rules.size());
        rules.forEach((key, rule) -> {
            System.out.printf("  %s by %s on %s → %s (%s)\n",
                key.action(), key.role(), key.fromStatus(), rule.toStatus(), rule.description());
        });
        
        // 3. Test specific workflow scenarios
        System.out.println("\n3. Testing key workflow scenarios:");
        
        // Test LECTURER creating and submitting timesheet
        testScenario("LECTURER submits DRAFT timesheet", 
            ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.LECTURER, ApprovalStatus.DRAFT, ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        
        // Test TUTOR reviewing timesheet
        testScenario("TUTOR confirms timesheet", 
            ApprovalAction.TUTOR_CONFIRM, UserRole.TUTOR, ApprovalStatus.PENDING_TUTOR_CONFIRMATION, ApprovalStatus.TUTOR_CONFIRMED);
        
        // Test LECTURER final confirmation
        testScenario("LECTURER gives final confirmation", 
            ApprovalAction.LECTURER_CONFIRM, UserRole.LECTURER, ApprovalStatus.TUTOR_CONFIRMED, ApprovalStatus.LECTURER_CONFIRMED);
        
        // Test HR final confirmation
        testScenario("HR confirms for payroll", 
            ApprovalAction.HR_CONFIRM, UserRole.HR, ApprovalStatus.LECTURER_CONFIRMED, ApprovalStatus.FINAL_CONFIRMED);
        
        // Test HR rejection
        testScenario("HR rejects timesheet", 
            ApprovalAction.REJECT, UserRole.HR, ApprovalStatus.LECTURER_CONFIRMED, ApprovalStatus.REJECTED);
        
        // Test TUTOR resubmitting rejected timesheet
        testScenario("TUTOR resubmits rejected timesheet", 
            ApprovalAction.SUBMIT_FOR_APPROVAL, UserRole.TUTOR, ApprovalStatus.REJECTED, ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        
        System.out.println("\n=== Validation Complete ===");
    }
    
    private static void testScenario(String description, ApprovalAction action, UserRole role, 
                                   ApprovalStatus fromStatus, ApprovalStatus expectedToStatus) {
        ApprovalStatus actualToStatus = WorkflowRulesRegistry.getTargetStatus(action, role, fromStatus);
        
        if (expectedToStatus.equals(actualToStatus)) {
            System.out.println("✓ " + description + ": " + fromStatus + " → " + actualToStatus);
        } else {
            System.out.println("✗ " + description + ": Expected " + fromStatus + " → " + expectedToStatus + 
                             ", but got " + actualToStatus);
        }
    }
}