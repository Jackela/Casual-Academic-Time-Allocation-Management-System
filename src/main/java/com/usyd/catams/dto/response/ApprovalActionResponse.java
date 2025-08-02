package com.usyd.catams.dto.response;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for approval action operations.
 * 
 * This DTO is returned when an approval action is successfully performed,
 * providing details about the action taken and the current state of the timesheet.
 * 
 * Based on OpenAPI schema: ApprovalActionResponse
 */
public class ApprovalActionResponse {

    /**
     * ID of the timesheet the action was performed on.
     */
    private Long timesheetId;

    /**
     * The approval action that was performed.
     */
    private ApprovalAction action;

    /**
     * The new status of the timesheet after the action.
     */
    private ApprovalStatus newStatus;

    /**
     * ID of the user who performed the approval action.
     */
    private Long approverId;

    /**
     * Name of the user who performed the approval action.
     */
    private String approverName;

    /**
     * Comment provided with the approval action.
     */
    private String comment;

    /**
     * Timestamp when the approval action was performed.
     */
    private LocalDateTime timestamp;

    /**
     * List of next possible actions or steps in the workflow.
     */
    private List<String> nextSteps;

    // Default constructor
    public ApprovalActionResponse() {
    }

    /**
     * Constructor with essential fields.
     * 
     * @param timesheetId ID of the timesheet
     * @param action the approval action performed
     * @param newStatus the new status after the action
     * @param approverId ID of the approver
     * @param approverName name of the approver
     * @param comment comment provided with the action
     * @param timestamp when the action was performed
     */
    public ApprovalActionResponse(Long timesheetId, ApprovalAction action, ApprovalStatus newStatus,
                                 Long approverId, String approverName, String comment, LocalDateTime timestamp) {
        this.timesheetId = timesheetId;
        this.action = action;
        this.newStatus = newStatus;
        this.approverId = approverId;
        this.approverName = approverName;
        this.comment = comment;
        this.timestamp = timestamp;
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

    public ApprovalStatus getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(ApprovalStatus newStatus) {
        this.newStatus = newStatus;
    }

    public Long getApproverId() {
        return approverId;
    }

    public void setApproverId(Long approverId) {
        this.approverId = approverId;
    }

    public String getApproverName() {
        return approverName;
    }

    public void setApproverName(String approverName) {
        this.approverName = approverName;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public List<String> getNextSteps() {
        return nextSteps;
    }

    public void setNextSteps(List<String> nextSteps) {
        this.nextSteps = nextSteps;
    }

    /**
     * Add a next step to the workflow guidance.
     * 
     * @param step description of the next step
     */
    public void addNextStep(String step) {
        if (this.nextSteps == null) {
            this.nextSteps = new java.util.ArrayList<>();
        }
        this.nextSteps.add(step);
    }

    /**
     * Check if this response represents a successful submission.
     * 
     * @return true if action was SUBMIT_FOR_APPROVAL
     */
    public boolean isSubmissionResponse() {
        return action == ApprovalAction.SUBMIT_FOR_APPROVAL;
    }

    /**
     * Check if this response represents a successful approval.
     * 
     * @return true if action was APPROVE
     */
    public boolean isApprovalResponse() {
        return action == ApprovalAction.APPROVE;
    }

    /**
     * Check if this response represents a rejection.
     * 
     * @return true if action was REJECT
     */
    public boolean isRejectionResponse() {
        return action == ApprovalAction.REJECT;
    }

    /**
     * Check if this response represents a modification request.
     * 
     * @return true if action was REQUEST_MODIFICATION
     */
    public boolean isModificationRequestResponse() {
        return action == ApprovalAction.REQUEST_MODIFICATION;
    }

    /**
     * Generate workflow guidance based on the new status.
     * 
     * @return list of next steps appropriate for the current status
     */
    public static List<String> generateNextStepsForStatus(ApprovalStatus status) {
        switch (status) {
            case PENDING_LECTURER_APPROVAL:
                return List.of(
                    "Timesheet is now pending lecturer approval",
                    "Lecturer can approve, reject, or request modifications",
                    "No further action required from submitter at this time"
                );
                
            case PENDING_TUTOR_REVIEW:
                return List.of(
                    "Timesheet has been approved by lecturer",
                    "Now pending tutor review and confirmation",
                    "Tutor can approve or request modifications"
                );
                
            case TUTOR_APPROVED:
                return List.of(
                    "Timesheet has been approved by tutor",
                    "Automatically moving to HR review queue",
                    "No further action required from tutor or lecturer"
                );
                
            case PENDING_HR_REVIEW:
                return List.of(
                    "Timesheet is now in HR review queue",
                    "HR can give final approval or reject",
                    "No action required from other parties"
                );
                
            case FINAL_APPROVED:
                return List.of(
                    "Timesheet has been fully approved",
                    "Ready for payroll processing",
                    "No further approvals required"
                );
                
            case REJECTED:
                return List.of(
                    "Timesheet has been rejected",
                    "Review rejection reason and make necessary corrections",
                    "Can be edited and resubmitted"
                );
                
            case MODIFICATION_REQUESTED:
                return List.of(
                    "Modifications have been requested",
                    "Review the feedback and update the timesheet",
                    "Resubmit after making the requested changes"
                );
                
            case DRAFT:
                return List.of(
                    "Timesheet is in draft status",
                    "Can be edited and updated as needed",
                    "Submit for approval when ready"
                );
                
            default:
                return List.of("Status updated successfully");
        }
    }

    @Override
    public String toString() {
        return "ApprovalActionResponse{" +
                "timesheetId=" + timesheetId +
                ", action=" + action +
                ", newStatus=" + newStatus +
                ", approverId=" + approverId +
                ", approverName='" + approverName + '\'' +
                ", comment='" + comment + '\'' +
                ", timestamp=" + timestamp +
                ", nextSteps=" + nextSteps +
                '}';
    }
}