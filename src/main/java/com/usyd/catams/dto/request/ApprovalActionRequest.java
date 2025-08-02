package com.usyd.catams.dto.request;

import com.usyd.catams.enums.ApprovalAction;
import jakarta.validation.constraints.*;

/**
 * Request DTO for performing approval actions on timesheets.
 * 
 * This DTO is used for all approval workflow operations including:
 * - SUBMIT_FOR_APPROVAL: Submit a draft timesheet for approval
 * - APPROVE: Approve a pending timesheet
 * - REJECT: Reject a pending timesheet
 * - REQUEST_MODIFICATION: Request changes to a timesheet
 * 
 * Based on OpenAPI schema: ApprovalActionRequest
 */
public class ApprovalActionRequest {

    /**
     * ID of the timesheet to perform the action on.
     */
    @NotNull(message = "Timesheet ID is required")
    private Long timesheetId;

    /**
     * The approval action to perform.
     */
    @NotNull(message = "Action is required")
    private ApprovalAction action;

    /**
     * Optional comment explaining the approval action.
     * Maximum length is 500 characters.
     */
    @Size(max = 500, message = "Comment cannot exceed 500 characters")
    private String comment;

    // Default constructor
    public ApprovalActionRequest() {
    }

    /**
     * Constructor with all fields.
     * 
     * @param timesheetId ID of the timesheet
     * @param action the approval action to perform
     * @param comment optional comment explaining the action
     */
    public ApprovalActionRequest(Long timesheetId, ApprovalAction action, String comment) {
        this.timesheetId = timesheetId;
        this.action = action;
        this.comment = comment;
    }

    /**
     * Constructor without comment.
     * 
     * @param timesheetId ID of the timesheet
     * @param action the approval action to perform
     */
    public ApprovalActionRequest(Long timesheetId, ApprovalAction action) {
        this.timesheetId = timesheetId;
        this.action = action;
    }

    // Getters and Setters

    public Long getTimesheetId() {
        return timesheetId;
    }

    public void setTimesheetId(Long timesheetId) {
        this.timesheetId = timesheetId;
    }

    public ApprovalAction getAction() {
        return action;
    }

    public void setAction(ApprovalAction action) {
        this.action = action;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    /**
     * Validate all business rules for the approval action request.
     * 
     * @throws IllegalArgumentException if validation fails
     */
    public void validateBusinessRules() {
        if (timesheetId == null) {
            throw new IllegalArgumentException("Timesheet ID cannot be null");
        }

        if (timesheetId <= 0) {
            throw new IllegalArgumentException("Timesheet ID must be positive");
        }

        if (action == null) {
            throw new IllegalArgumentException("Action cannot be null");
        }

        if (comment != null && comment.length() > 500) {
            throw new IllegalArgumentException("Comment cannot exceed 500 characters");
        }
    }

    /**
     * Check if this request is for a submission action.
     * 
     * @return true if action is SUBMIT_FOR_APPROVAL
     */
    public boolean isSubmission() {
        return action == ApprovalAction.SUBMIT_FOR_APPROVAL;
    }

    /**
     * Check if this request is for an approval action.
     * 
     * @return true if action is APPROVE
     */
    public boolean isApproval() {
        return action == ApprovalAction.APPROVE;
    }

    /**
     * Check if this request is for a rejection action.
     * 
     * @return true if action is REJECT
     */
    public boolean isRejection() {
        return action == ApprovalAction.REJECT;
    }

    /**
     * Check if this request is for a modification request.
     * 
     * @return true if action is REQUEST_MODIFICATION
     */
    public boolean isModificationRequest() {
        return action == ApprovalAction.REQUEST_MODIFICATION;
    }

    @Override
    public String toString() {
        return "ApprovalActionRequest{" +
                "timesheetId=" + timesheetId +
                ", action=" + action +
                ", comment='" + comment + '\'' +
                '}';
    }
}