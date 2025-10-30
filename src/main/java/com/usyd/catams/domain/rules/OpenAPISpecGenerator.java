package com.usyd.catams.domain.rules;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Generates OpenAPI specifications from WorkflowRulesRegistry
 * 
 * This class automatically generates/updates OpenAPI YAML files based on
 * the business rules defined in WorkflowRulesRegistry, ensuring that the
 * API specification always matches the actual business logic.
 * 
 * Generated artifacts:
 * 1. Approval action schemas with valid transitions
 * 2. Status transition documentation  
 * 3. Role-based permission matrices
 * 4. Example request/response pairs
 * 
 * Usage:
 * - Run this during build process to keep OpenAPI specs in sync
 * - Generate contract tests from updated specs
 * - Auto-update API documentation
 * 
 * @author Development Team
 * @since 2.0
 */
public class OpenAPISpecGenerator {
    
    private final ObjectMapper mapper = new ObjectMapper();
    private final String outputDir;
    
    public OpenAPISpecGenerator(String outputDir) {
        this.outputDir = outputDir;
    }
    
    /**
     * Generate all OpenAPI artifacts from business rules
     */
    public void generateAll() throws IOException {
        generateApprovalActionSchema();
        generateStatusTransitionDocs();
        generatePermissionMatrix();
        generateExampleRequests();
        generateContractTests();
    }
    
    /**
     * Generate approval action schema with valid transitions
     */
    private void generateApprovalActionSchema() throws IOException {
        ObjectNode schema = mapper.createObjectNode();
        
        // Basic schema structure
        schema.put("type", "object");
        schema.put("description", "Approval action request (auto-generated from business rules)");
        
        // Properties
        ObjectNode properties = schema.putObject("properties");
        
        // timesheetId property
        ObjectNode timesheetId = properties.putObject("timesheetId");
        timesheetId.put("type", "integer");
        timesheetId.put("format", "int64");
        timesheetId.put("description", "ID of the timesheet to act upon");
        
        // action property with enum values from rules
        ObjectNode action = properties.putObject("action");
        action.put("type", "string");
        action.put("description", "Type of approval action to perform");
        
        ArrayNode actionEnum = action.putArray("enum");
        Set<ApprovalAction> validActions = getValidActionsFromRules();
        validActions.forEach(a -> actionEnum.add(a.name()));
        
        // Add action descriptions
        ObjectNode actionDescriptions = action.putObject("x-enum-descriptions");
        validActions.forEach(a -> {
            String description = generateActionDescription(a);
            actionDescriptions.put(a.name(), description);
        });
        
        // comment property
        ObjectNode comment = properties.putObject("comment");
        comment.put("type", "string");
        comment.put("maxLength", 500);
        comment.put("description", "Optional comment explaining the action");
        
        // Required fields
        ArrayNode required = schema.putArray("required");
        required.add("timesheetId");
        required.add("action");
        
        // Add business rule constraints
        schema.set("x-business-rules", generateBusinessRuleConstraints());
        
        writeYamlFile("approval-action-request.yaml", schema);
    }
    
    /**
     * Generate status transition documentation
     */
    private void generateStatusTransitionDocs() throws IOException {
        ObjectNode doc = mapper.createObjectNode();
        doc.put("title", "Timesheet Status Transitions");
        doc.put("description", "Valid status transitions based on business rules (auto-generated)");
        
        ObjectNode transitions = doc.putObject("transitions");
        
        // Group rules by from-status
        Map<ApprovalStatus, List<WorkflowRulesRegistry.WorkflowRule>> rulesByStatus = 
            WorkflowRulesRegistry.getAllRules().values().stream()
                .collect(Collectors.groupingBy(WorkflowRulesRegistry.WorkflowRule::fromStatus));
        
        rulesByStatus.forEach((fromStatus, rules) -> {
            ObjectNode statusNode = transitions.putObject(fromStatus.name());
            ArrayNode validTransitions = statusNode.putArray("validTransitions");
            
            rules.forEach(rule -> {
                ObjectNode transition = mapper.createObjectNode();
                transition.put("action", rule.action().name());
                transition.put("toStatus", rule.toStatus().name());
                transition.put("requiredRole", rule.role().name());
                transition.put("description", rule.description());
                
                // Add conditions
                transition.put("conditions", generateConditionDescription(rule));
                
                validTransitions.add(transition);
            });
        });
        
        writeYamlFile("status-transitions.yaml", doc);
    }
    
    /**
     * Generate role-based permission matrix
     */
    private void generatePermissionMatrix() throws IOException {
        ObjectNode matrix = mapper.createObjectNode();
        matrix.put("title", "Role Permission Matrix");
        matrix.put("description", "Actions allowed for each role by status (auto-generated)");
        
        ObjectNode roles = matrix.putObject("roles");
        
        for (UserRole role : UserRole.values()) {
            ObjectNode roleNode = roles.putObject(role.name());
            ObjectNode permissions = roleNode.putObject("permissions");
            
            for (ApprovalStatus status : ApprovalStatus.values()) {
                ArrayNode allowedActions = permissions.putArray(status.name());
                
                // Find all actions this role can perform on this status
                WorkflowRulesRegistry.getAllRules().entrySet().stream()
                    .filter(entry -> entry.getKey().role() == role && entry.getKey().fromStatus() == status)
                    .forEach(entry -> {
                        ObjectNode actionInfo = mapper.createObjectNode();
                        actionInfo.put("action", entry.getKey().action().name());
                        actionInfo.put("targetStatus", entry.getValue().toStatus().name());
                        actionInfo.put("description", entry.getValue().description());
                        allowedActions.add(actionInfo);
                    });
            }
        }
        
        writeYamlFile("permission-matrix.yaml", matrix);
    }
    
    /**
     * Generate example requests for each valid action
     */
    private void generateExampleRequests() throws IOException {
        ObjectNode examples = mapper.createObjectNode();
        examples.put("title", "API Request Examples");
        examples.put("description", "Example requests for each valid approval action (auto-generated)");
        
        ObjectNode requests = examples.putObject("examples");
        
        WorkflowRulesRegistry.getAllRules().forEach((key, rule) -> {
            String exampleName = String.format("%s_by_%s_on_%s", 
                key.action().name(), key.role().name(), key.fromStatus().name());
            
            ObjectNode example = requests.putObject(exampleName);
            example.put("description", rule.description());
            
            // Request example
            ObjectNode request = example.putObject("request");
            request.put("method", "POST");
            request.put("path", "/api/approvals");
            
            ObjectNode headers = request.putObject("headers");
            headers.put("Authorization", "Bearer <JWT_TOKEN_WITH_" + key.role().name() + "_ROLE>");
            headers.put("Content-Type", "application/json");
            
            ObjectNode body = request.putObject("body");
            body.put("timesheetId", 123);
            body.put("action", key.action().name());
            if (requiresComment(key.action())) {
                body.put("comment", "Example comment for " + key.action().name().toLowerCase());
            }
            
            // Expected response
            ObjectNode response = example.putObject("expectedResponse");
            response.put("status", 200);
            ObjectNode responseBody = response.putObject("body");
            responseBody.put("success", true);
            responseBody.put("newStatus", rule.toStatus().name());
            responseBody.put("message", "Action completed successfully");
        });
        
        writeYamlFile("api-examples.yaml", examples);
    }
    
    /**
     * Generate contract test specifications for tools like Dredd
     */
    private void generateContractTests() throws IOException {
        ObjectNode tests = mapper.createObjectNode();
        tests.put("title", "Contract Test Specifications");
        tests.put("description", "Test cases for API contract validation (auto-generated)");
        
        ArrayNode testCases = tests.putArray("testCases");
        
        // Generate positive test cases
        WorkflowRulesRegistry.getAllRules().forEach((key, rule) -> {
            ObjectNode testCase = mapper.createObjectNode();
            testCase.put("name", String.format("Should allow %s by %s on %s", 
                key.action().name(), key.role().name(), key.fromStatus().name()));
            testCase.put("description", rule.description());
            
            // Test setup
            ObjectNode setup = testCase.putObject("setup");
            setup.put("createTimesheetWithStatus", key.fromStatus().name());
            setup.put("authenticateAs", key.role().name());
            
            // Test execution
            ObjectNode execution = testCase.putObject("execution");
            execution.put("method", "POST");
            execution.put("endpoint", "/api/approvals");
            
            ObjectNode requestBody = execution.putObject("requestBody");
            requestBody.put("action", key.action().name());
            requestBody.put("timesheetId", "${timesheetId}");
            
            // Expected result
            ObjectNode expected = testCase.putObject("expected");
            expected.put("statusCode", 200);
            expected.put("newTimesheetStatus", rule.toStatus().name());
            
            testCases.add(testCase);
        });
        
        // Generate negative test cases
        generateNegativeTestCases(testCases);
        
        writeYamlFile("contract-tests.yaml", tests);
    }
    
    // Helper methods
    
    private Set<ApprovalAction> getValidActionsFromRules() {
        return WorkflowRulesRegistry.getAllRules().keySet().stream()
            .map(WorkflowRulesRegistry.RuleKey::action)
            .collect(Collectors.toSet());
    }
    
    private String generateActionDescription(ApprovalAction action) {
        // Get descriptions from rules for this action
        return WorkflowRulesRegistry.getAllRules().values().stream()
            .filter(rule -> rule.action() == action)
            .map(WorkflowRulesRegistry.WorkflowRule::description)
            .findFirst()
            .orElse("No description available");
    }
    
    private ObjectNode generateBusinessRuleConstraints() {
        ObjectNode constraints = mapper.createObjectNode();
        
        // Add validation rules
        ArrayNode validationRules = constraints.putArray("validations");
        
        // Status-based validations
        ObjectNode statusValidation = mapper.createObjectNode();
        statusValidation.put("rule", "Action must be valid for current timesheet status");
        statusValidation.put("implementation", "Validate using WorkflowRulesRegistry.canPerformAction()");
        validationRules.add(statusValidation);
        
        // Role-based validations  
        ObjectNode roleValidation = mapper.createObjectNode();
        roleValidation.put("rule", "User role must have permission for the requested action");
        roleValidation.put("implementation", "Check user role against WorkflowRulesRegistry rules");
        validationRules.add(roleValidation);
        
        return constraints;
    }
    
    private String generateConditionDescription(WorkflowRulesRegistry.WorkflowRule rule) {
        return switch (rule.role()) {
            case LECTURER -> "User must be the lecturer who teaches the course";
            case TUTOR -> "User must be the tutor who owns the timesheet";
            case HR -> "User must have HR role";
            case ADMIN -> "User must have ADMIN role (can override any restriction)";
        };
    }
    
    private boolean requiresComment(ApprovalAction action) {
        return action == ApprovalAction.REJECT || action == ApprovalAction.REQUEST_MODIFICATION;
    }
    
    private void generateNegativeTestCases(ArrayNode testCases) {
        // Test unauthorized actions
        ObjectNode unauthorizedTest = mapper.createObjectNode();
        unauthorizedTest.put("name", "Should reject unauthorized actions");
        unauthorizedTest.put("description", "Verify that actions not defined in rules are rejected");
        
        ObjectNode setup = unauthorizedTest.putObject("setup");
        setup.put("createTimesheetWithStatus", "DRAFT");
        setup.put("authenticateAs", "TUTOR");
        
        ObjectNode execution = unauthorizedTest.putObject("execution");
        execution.put("method", "POST");
        execution.put("endpoint", "/api/approvals");
        
        ObjectNode requestBody = execution.putObject("requestBody");
        requestBody.put("action", "APPROVE"); // TUTOR can't APPROVE DRAFT
        requestBody.put("timesheetId", "${timesheetId}");
        
        ObjectNode expected = unauthorizedTest.putObject("expected");
        expected.put("statusCode", 403);
        expected.put("message", "Action not allowed for current user and timesheet status");
        
        testCases.add(unauthorizedTest);
    }
    
    private void writeYamlFile(String filename, JsonNode content) throws IOException {
        Path outputPath = Paths.get(outputDir, filename);
        Files.createDirectories(outputPath.getParent());
        
        // Convert to YAML format (simplified - in real implementation use Jackson YAML)
        String yamlContent = "# Auto-generated from WorkflowRulesRegistry - DO NOT EDIT MANUALLY\n" +
                           "# Generated at: " + new Date() + "\n\n" +
                           mapper.writerWithDefaultPrettyPrinter().writeValueAsString(content);
        
        Files.write(outputPath, yamlContent.getBytes());
        System.out.println("Generated: " + outputPath);
    }
    
    /**
     * Main method for generating specs during build
     */
    public static void main(String[] args) throws IOException {
        String outputDir = args.length > 0 ? args[0] : "docs/generated/openapi";
        
        OpenAPISpecGenerator generator = new OpenAPISpecGenerator(outputDir);
        generator.generateAll();
        
        System.out.println("OpenAPI specifications generated successfully!");
        System.out.println("Run contract tests with: dredd " + outputDir + "/*.yaml http://localhost:8080");
    }
}
