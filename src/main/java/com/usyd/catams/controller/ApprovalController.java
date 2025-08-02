package com.usyd.catams.controller;

import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.User;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.ApprovalService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for timesheet approval operations.
 * 
 * This controller implements the OpenAPI specification for approval endpoints
 * including submission, approval, rejection, and modification requests with proper RBAC security.
 * 
 * Endpoints:
 * - POST /api/approvals - Perform approval action (all authenticated users with appropriate permissions)
 */
@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;
    private final UserRepository userRepository;

    @Autowired
    public ApprovalController(ApprovalService approvalService, UserRepository userRepository) {
        this.approvalService = approvalService;
        this.userRepository = userRepository;
    }

    /**
     * Perform an approval action on a timesheet.
     * 
     * Supports all approval workflow actions:
     * - SUBMIT_FOR_APPROVAL: Submit draft timesheet for approval (TUTOR/ADMIN)
     * - APPROVE: Approve pending timesheet (LECTURER/ADMIN)
     * - REJECT: Reject pending timesheet (LECTURER/ADMIN)
     * - REQUEST_MODIFICATION: Request changes to timesheet (LECTURER/ADMIN)
     * 
     * Access control is enforced at the service layer based on user role and timesheet ownership.
     */
    @PostMapping
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<ApprovalActionResponse> performApprovalAction(
            @Valid @RequestBody ApprovalActionRequest request,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = getCurrentUserId(authentication);

        // Perform the approval action using service layer
        Approval approval = approvalService.performApprovalAction(
            request.getTimesheetId(),
            request.getAction(),
            request.getComment(),
            requesterId
        );

        // Build response DTO
        ApprovalActionResponse response = buildApprovalActionResponse(approval);

        return ResponseEntity.ok(response);
    }

    /**
     * Get approval history for a specific timesheet.
     * 
     * Access control is enforced at the service layer based on user permissions.
     */
    @GetMapping("/history/{timesheetId}")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<java.util.List<ApprovalActionResponse>> getApprovalHistory(
            @PathVariable("timesheetId") Long timesheetId,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = getCurrentUserId(authentication);

        // Get approval history using service layer
        java.util.List<Approval> approvals = approvalService.getApprovalHistory(timesheetId, requesterId);

        // Convert to response DTOs
        java.util.List<ApprovalActionResponse> responses = approvals.stream()
            .map(this::buildApprovalActionResponse)
            .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Get pending approvals for the current user.
     * 
     * Returns timesheets that are pending approval actions from the current user.
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<java.util.List<com.usyd.catams.dto.response.TimesheetResponse>> getPendingApprovals(
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = getCurrentUserId(authentication);

        // Get pending approvals using service layer
        java.util.List<com.usyd.catams.entity.Timesheet> pendingTimesheets = 
            approvalService.getPendingApprovalsForUser(requesterId);

        // Convert to response DTOs (you'll need to inject TimesheetMapper if this is used)
        // For now, returning a simplified response
        // In a complete implementation, you'd convert these to TimesheetResponse DTOs
        
        return ResponseEntity.ok(java.util.List.of()); // Placeholder - implement as needed
    }

    // Helper methods

    /**
     * Extract user ID from authentication context.
     * 
     * @param authentication the authentication object
     * @return the user ID
     */
    private Long getCurrentUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new SecurityException("Authentication required");
        }

        // Extract user ID from authentication principal
        Object principal = authentication.getPrincipal();
        
        if (principal instanceof com.usyd.catams.entity.User) {
            return ((com.usyd.catams.entity.User) principal).getId();
        } else if (principal instanceof Long) {
            return (Long) principal;
        } else if (principal instanceof String) {
            try {
                return Long.parseLong((String) principal);
            } catch (NumberFormatException e) {
                throw new SecurityException("Invalid user ID in authentication context");
            }
        } else {
            throw new SecurityException("Invalid authentication principal type: " + principal.getClass().getName());
        }
    }

    /**
     * Build ApprovalActionResponse DTO from Approval entity.
     * 
     * @param approval the approval entity
     * @return the response DTO
     */
    private ApprovalActionResponse buildApprovalActionResponse(Approval approval) {
        
        // Get approver information
        User approver = userRepository.findById(approval.getApproverId())
            .orElse(null);
        
        String approverName = approver != null ? 
            approver.getName() : 
            "Unknown User";

        // Create response
        ApprovalActionResponse response = new ApprovalActionResponse(
            approval.getTimesheetId(),
            approval.getAction(),
            approval.getNewStatus(),
            approval.getApproverId(),
            approverName,
            approval.getComment(),
            approval.getTimestamp()
        );

        // Add workflow guidance
        response.setNextSteps(ApprovalActionResponse.generateNextStepsForStatus(approval.getNewStatus()));

        return response;
    }
}