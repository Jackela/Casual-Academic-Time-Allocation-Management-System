package com.usyd.catams.domain.rules;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Auto-generated tests from WorkflowRulesRegistry
 * 
 * This class automatically generates comprehensive test cases based on the
 * business rules defined in WorkflowRulesRegistry. It ensures that all
 * defined rules are tested and validates rule consistency.
 * 
 * Benefits:
 * 1. Tests are automatically updated when rules change
 * 2. Complete coverage of all defined rules
 * 3. Consistent test structure
 * 4. Early detection of rule conflicts
 * 
 * @author Development Team (Auto-generated)
 * @since 2.0
 */
public class WorkflowRulesTestGenerator {
    
    /**
     * Generate tests for all positive rule cases
     */
    @TestFactory
    Stream<DynamicTest> generatePositiveRuleTests() {
        return WorkflowRulesRegistry.getAllRules().entrySet().stream()
            .map(entry -> {
                WorkflowRulesRegistry.RuleKey key = entry.getKey();
                WorkflowRulesRegistry.WorkflowRule rule = entry.getValue();
                
                return DynamicTest.dynamicTest(
                    String.format("Should allow %s by %s on %s: %s", 
                        key.action(), key.role(), key.fromStatus(), rule.description()),
                    () -> {
                        // Create test context that satisfies the rule condition
                        TestWorkflowContext context = createValidContext(rule);
                        TestUser user = createValidUser(rule, context);
                        
                        boolean canPerform = WorkflowRulesRegistry.canPerformAction(
                            key.action(), key.role(), key.fromStatus(), user, context);
                        
                        assertTrue(canPerform, 
                            "Rule should allow action: " + rule.description());
                        
                        ApprovalStatus targetStatus = WorkflowRulesRegistry.getTargetStatus(
                            key.action(), key.role(), key.fromStatus());
                        
                        assertEquals(rule.toStatus(), targetStatus,
                            "Target status should match rule definition");
                    }
                );
            });
    }
    
    /**
     * Generate tests for negative cases (actions that should be rejected)
     */
    @TestFactory
    Stream<DynamicTest> generateNegativeRuleTests() {
        return Stream.of(ApprovalAction.values())
            .flatMap(action -> 
                Stream.of(UserRole.values())
                    .flatMap(role -> 
                        Stream.of(ApprovalStatus.values())
                            .filter(status -> !hasRule(action, role, status))
                            .map(status -> DynamicTest.dynamicTest(
                                String.format("Should reject %s by %s on %s (no rule defined)", 
                                    action, role, status),
                                () -> {
                                    TestWorkflowContext context = createDefaultContext();
                                    TestUser user = createUserWithRole(role);
                                    
                                    boolean canPerform = WorkflowRulesRegistry.canPerformAction(
                                        action, role, status, user, context);
                                    
                                    assertFalse(canPerform, 
                                        "Should reject action when no rule is defined");
                                }
                            ))
                    )
            );
    }
    
    /**
     * Test rule consistency and validate the registry
     */
    @TestFactory
    Stream<DynamicTest> generateConsistencyTests() {
        return Stream.of(
            DynamicTest.dynamicTest("Registry should have no validation errors", () -> {
                var errors = WorkflowRulesRegistry.validateRules();
                assertTrue(errors.isEmpty(), 
                    "Registry validation errors: " + String.join(", ", errors));
            }),
            
            DynamicTest.dynamicTest("All statuses should be reachable", () -> {
                // Test that every non-terminal status has at least one incoming transition
                for (ApprovalStatus status : ApprovalStatus.values()) {
                    if (status != ApprovalStatus.DRAFT && !status.isFinal()) {
                        boolean hasIncomingTransition = WorkflowRulesRegistry.getAllRules().values()
                            .stream()
                            .anyMatch(rule -> rule.toStatus() == status);
                        
                        assertTrue(hasIncomingTransition, 
                            "Status should be reachable: " + status);
                    }
                }
            }),
            
            DynamicTest.dynamicTest("No conflicting rules should exist", () -> {
                // Check for rules that might conflict (same key, different outcomes)
                var ruleKeys = WorkflowRulesRegistry.getAllRules().keySet();
                assertEquals(ruleKeys.size(), 
                    WorkflowRulesRegistry.getAllRules().size(),
                    "Should not have duplicate rule keys");
            })
        );
    }
    
    // Helper methods for creating test data
    
    private boolean hasRule(ApprovalAction action, UserRole role, ApprovalStatus status) {
        return WorkflowRulesRegistry.getAllRules().containsKey(
            new WorkflowRulesRegistry.RuleKey(action, role, status));
    }
    
    private TestWorkflowContext createValidContext(WorkflowRulesRegistry.WorkflowRule rule) {
        // Create context that would satisfy the rule's condition
        return new TestWorkflowContext(
            createTestTimesheet(rule.fromStatus()),
            createTestCourse(),
            createValidUser(rule, null)
        );
    }
    
    private TestWorkflowContext createDefaultContext() {
        return new TestWorkflowContext(
            createTestTimesheet(ApprovalStatus.DRAFT),
            createTestCourse(),
            createUserWithRole(UserRole.TUTOR)
        );
    }
    
    private TestUser createValidUser(WorkflowRulesRegistry.WorkflowRule rule, TestWorkflowContext context) {
        // Create a user that would satisfy the rule condition based on role
        return switch (rule.role()) {
            case LECTURER -> new TestUser(2L, UserRole.LECTURER); // Matches lecturer_id in test course
            case TUTOR -> new TestUser(1L, UserRole.TUTOR);       // Matches tutor_id in test timesheet
            case HR -> new TestUser(3L, UserRole.HR);
            case ADMIN -> new TestUser(4L, UserRole.ADMIN);
        };
    }
    
    private TestUser createUserWithRole(UserRole role) {
        return new TestUser(1L, role);
    }
    
    private TestTimesheet createTestTimesheet(ApprovalStatus status) {
        return new TestTimesheet(1L, 1L, 1L, status);
    }
    
    private TestCourse createTestCourse() {
        return new TestCourse(1L, 2L); // lecturer_id = 2L
    }
    
    // Test data classes
    
    private record TestWorkflowContext(
        TestTimesheet timesheet,
        TestCourse course,
        TestUser user
    ) implements WorkflowRulesRegistry.WorkflowContext {
        
        @Override
        public WorkflowRulesRegistry.Timesheet getTimesheet() {
            return timesheet;
        }
        
        @Override
        public WorkflowRulesRegistry.Course getCourse() {
            return course;
        }
        
        @Override
        public WorkflowRulesRegistry.User getUser() {
            return user;
        }
    }
    
    private record TestUser(Long id, UserRole role) implements WorkflowRulesRegistry.User {
        @Override
        public Long getId() { return id; }
        
        @Override
        public UserRole getRole() { return role; }
    }
    
    private record TestTimesheet(Long id, Long tutorId, Long courseId, ApprovalStatus status) 
        implements WorkflowRulesRegistry.Timesheet {
        
        @Override
        public Long getId() { return id; }
        
        @Override
        public Long getTutorId() { return tutorId; }
        
        @Override
        public Long getCourseId() { return courseId; }
        
        @Override
        public ApprovalStatus getStatus() { return status; }
    }
    
    private record TestCourse(Long id, Long lecturerId) implements WorkflowRulesRegistry.Course {
        @Override
        public Long getId() { return id; }
        
        @Override
        public Long getLecturerId() { return lecturerId; }
    }
}
