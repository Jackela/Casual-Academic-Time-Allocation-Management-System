package com.usyd.catams.service;

import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;

import java.util.List;

/**
 * Service interface for managing timesheet approval operations.
 * 
 * This service handles the business logic for timesheet approval workflow
 * including submission, approval, rejection, and modification requests
 * according to the CATAMS business rules and OpenAPI specification.
 * 
 * Key business rules enforced:
 * - Users can only submit their own timesheets for approval
 * - LECTURERs can approve/reject timesheets for their courses
 * - ADMINs can perform any approval action
 * - Status transitions must follow the defined workflow
 * - All approval actions are audited
 */
public interface ApprovalService {

    /**
     * Submit a timesheet for approval (SUBMIT_FOR_APPROVAL action).
     * 
     * Business rules enforced:
     * - Timesheet must be in DRAFT status
     * - User can only submit their own timesheets (except ADMIN)
     * - Status transitions from DRAFT to PENDING_LECTURER_APPROVAL
     * - Creates audit trail in approvals table
     * 
     * @param timesheetId ID of the timesheet to submit
     * @param comment optional comment explaining the submission
     * @param requesterId ID of the user making the request
     * @return the created approval record
     * @throws IllegalArgumentException if business rules are violated
     * @throws SecurityException if user lacks permission to submit timesheet
     */
    Approval submitForApproval(Long timesheetId, String comment, Long requesterId);

    /**
     * Perform an approval action on a timesheet.
     * 
     * This method handles APPROVE, REJECT, and REQUEST_MODIFICATION actions.
     * Business rules enforced:
     * - User must have permission to perform the action
     * - Timesheet must be in appropriate status for the action
     * - Status transitions must be valid according to workflow
     * - Creates audit trail in approvals table
     * 
     * @param timesheetId ID of the timesheet
     * @param action the approval action to perform
     * @param comment optional comment explaining the action
     * @param requesterId ID of the user performing the action
     * @return the created approval record
     * @throws IllegalArgumentException if business rules are violated
     * @throws SecurityException if user lacks permission to perform action
     */
    Approval performApprovalAction(Long timesheetId, ApprovalAction action, String comment, Long requesterId);

    /**
     * Get approval history for a specific timesheet.
     * 
     * @param timesheetId the timesheet ID
     * @param requesterId ID of the user making the request (for access control)
     * @return list of approval actions for the timesheet
     * @throws SecurityException if user lacks permission to view approval history
     */
    List<Approval> getApprovalHistory(Long timesheetId, Long requesterId);

    /**
     * Get pending approvals that require action from a specific user.
     * 
     * @param approverId the approver's ID
     * @return list of timesheets pending approval from this user
     */
    List<Timesheet> getPendingApprovalsForUser(Long approverId);

    /**
     * Check if a user can perform a specific approval action on a timesheet.
     * 
     * Access control rules:
     * - TUTOR: Can only submit their own timesheets
     * - LECTURER: Can approve/reject/request modifications for their courses
     * - ADMIN: Can perform any action on any timesheet
     * 
     * @param timesheet the timesheet
     * @param action the approval action
     * @param requesterId ID of the user
     * @return true if user can perform the action
     */
    boolean canUserPerformAction(Timesheet timesheet, ApprovalAction action, Long requesterId);

    /**
     * Get the current approval status of a timesheet based on approval history.
     * 
     * @param timesheetId the timesheet ID
     * @return the current approval status
     */
    ApprovalStatus getCurrentApprovalStatus(Long timesheetId);

    /**
     * Validate that an approval action can be performed on a timesheet.
     * 
     * This method performs comprehensive validation including:
     * - User permission checks
     * - Current status validation
     * - Valid status transition validation
     * - Business rule compliance
     * 
     * @param timesheet the timesheet
     * @param action the approval action
     * @param requesterId ID of the user
     * @throws IllegalArgumentException if validation fails
     * @throws SecurityException if user lacks permission
     */
    void validateApprovalAction(Timesheet timesheet, ApprovalAction action, Long requesterId);

    /**
     * Get approval statistics for reporting purposes.
     * 
     * @param approverId the approver's ID
     * @param requesterId ID of the user making the request (for access control)
     * @return approval statistics
     * @throws SecurityException if user lacks permission to view statistics
     */
    List<Object[]> getApprovalStatistics(Long approverId, Long requesterId);
}