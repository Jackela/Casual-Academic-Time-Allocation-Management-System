package com.usyd.catams.controller;

import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.mapper.ApprovalMapper;
import com.usyd.catams.policy.AuthenticationFacade;
import com.usyd.catams.service.ApprovalService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

/**
 * REST Controller for timesheet confirmation operations.
 */
@RestController
@RequestMapping({"/api/confirmations", "/api/approvals"})
public class ApprovalController {

    private final ApprovalService approvalService;
    private final AuthenticationFacade authenticationFacade;
    private final ApprovalMapper approvalMapper;
    private static final Logger logger = LoggerFactory.getLogger(ApprovalController.class);

    @Autowired
    public ApprovalController(ApprovalService approvalService,
                              AuthenticationFacade authenticationFacade,
                              ApprovalMapper approvalMapper) {
        this.approvalService = approvalService;
        this.authenticationFacade = authenticationFacade;
        this.approvalMapper = approvalMapper;
    }

    @PostMapping
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<ApprovalActionResponse> performConfirmationAction(
            @Valid @RequestBody ApprovalActionRequest request) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        logger.info("HTTP approve: action={}, timesheetId={}, requesterId={}", request.getAction(), request.getTimesheetId(), requesterId);
        var approval = approvalService.performApprovalAction(
                request.getTimesheetId(), request.getAction(), request.getComment(), requesterId);
        logger.info("HTTP approve OK: action={}, timesheetId={}, fromStatus={}, toStatus={}",
                request.getAction(), request.getTimesheetId(), approval.getPreviousStatus(), approval.getNewStatus());
        return ResponseEntity.ok(approvalMapper.toResponse(approval));
    }

    @GetMapping("/history/{timesheetId}")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<java.util.List<ApprovalActionResponse>> getConfirmationHistory(
            @PathVariable("timesheetId") Long timesheetId) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        var approvals = approvalService.getApprovalHistory(timesheetId, requesterId);
        var responses = approvals.stream().map(approvalMapper::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<java.util.List<com.usyd.catams.dto.response.TimesheetResponse>> getPendingConfirmations() {
        // Placeholder: this endpoint not critical yet; return empty list for now
        return ResponseEntity.ok(java.util.List.of());
    }
}
