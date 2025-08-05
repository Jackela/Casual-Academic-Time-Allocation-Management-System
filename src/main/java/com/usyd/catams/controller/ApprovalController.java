package com.usyd.catams.controller;

import com.usyd.catams.application.ApprovalApplicationService;
import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.security.AuthenticationUtils;
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

    private final ApprovalApplicationService approvalApplicationService;
    private final AuthenticationUtils authenticationUtils;

    @Autowired
    public ApprovalController(ApprovalApplicationService approvalApplicationService, 
                            AuthenticationUtils authenticationUtils) {
        this.approvalApplicationService = approvalApplicationService;
        this.authenticationUtils = authenticationUtils;
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
        Long requesterId = authenticationUtils.getCurrentUserId(authentication);

        // Perform the approval action using application service (returns DTO directly)
        ApprovalActionResponse response = approvalApplicationService.performApprovalActionAndReturnDto(
            request.getTimesheetId(),
            request.getAction(),
            request.getComment(),
            requesterId
        );

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
        Long requesterId = authenticationUtils.getCurrentUserId(authentication);

        // Get approval history using application service (returns DTOs directly)
        java.util.List<ApprovalActionResponse> responses = approvalApplicationService.getApprovalHistoryAsDto(timesheetId, requesterId);

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
        Long requesterId = authenticationUtils.getCurrentUserId(authentication);

        // Get pending approvals using application service
        // Note: This endpoint needs proper implementation with DTO conversion
        // For now, returning empty list as this is not critical for MVP
        
        return ResponseEntity.ok(java.util.List.of()); // TODO: Implement proper DTO conversion
    }
}