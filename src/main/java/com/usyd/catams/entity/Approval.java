package com.usyd.catams.entity;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/**
 * Approval entity representing approval actions performed on timesheets.
 * 
 * This entity tracks the complete audit trail of all approval actions
 * performed on timesheets, including submissions, approvals, rejections,
 * and modification requests.
 * 
 * Each record represents a single approval action at a point in time,
 * providing complete traceability of the approval workflow.
 */
@Entity
@Table(name = "approvals", 
    indexes = {
        @Index(name = "idx_approval_timesheet", columnList = "timesheetId"),
        @Index(name = "idx_approval_approver", columnList = "approverId"),
        @Index(name = "idx_approval_action", columnList = "action"),
        @Index(name = "idx_approval_timestamp", columnList = "timestamp"),
        @Index(name = "idx_approval_timesheet_timestamp", columnList = "timesheetId, timestamp")
    }
)
public class Approval {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * The timesheet this approval action applies to.
     */
    @NotNull
    @Column(nullable = false, name = "timesheet_id")
    private Long timesheetId;
    
    /**
     * The user who performed this approval action.
     */
    @NotNull
    @Column(nullable = false, name = "approver_id")
    private Long approverId;
    
    /**
     * The type of approval action performed.
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ApprovalAction action;
    
    /**
     * The status before this action was performed.
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "previous_status", length = 50)
    private ApprovalStatus previousStatus;
    
    /**
     * The status after this action was performed.
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "new_status", length = 50)
    private ApprovalStatus newStatus;
    
    /**
     * Optional comment explaining the approval action.
     */
    @Size(max = 500)
    @Column(length = 500)
    private String comment;
    
    /**
     * Timestamp when the approval action was performed.
     */
    @NotNull
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    /**
     * Whether this approval action is still active/current.
     * Used for auditing and tracking superseded actions.
     */
    @NotNull
    @Column(nullable = false, name = "is_active")
    private Boolean isActive;
    
    // Default constructor
    public Approval() {
    }
    
    /**
     * Constructor for creating a new approval action.
     * 
     * @param timesheetId ID of the timesheet
     * @param approverId ID of the user performing the action
     * @param action the approval action being performed
     * @param previousStatus the status before the action
     * @param newStatus the status after the action
     * @param comment optional comment explaining the action
     */
    public Approval(Long timesheetId, Long approverId, ApprovalAction action, 
                   ApprovalStatus previousStatus, ApprovalStatus newStatus, String comment) {
        this.timesheetId = timesheetId;
        this.approverId = approverId;
        this.action = action;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.comment = comment;
        this.isActive = true;
    }
    
    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
        if (this.isActive == null) {
            this.isActive = true;
        }
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getTimesheetId() {
        return timesheetId;
    }
    
    public void setTimesheetId(Long timesheetId) {
        this.timesheetId = timesheetId;
    }
    
    public Long getApproverId() {
        return approverId;
    }
    
    public void setApproverId(Long approverId) {
        this.approverId = approverId;
    }
    
    public ApprovalAction getAction() {
        return action;
    }
    
    public void setAction(ApprovalAction action) {
        this.action = action;
    }
    
    public ApprovalStatus getPreviousStatus() {
        return previousStatus;
    }
    
    public void setPreviousStatus(ApprovalStatus previousStatus) {
        this.previousStatus = previousStatus;
    }
    
    public ApprovalStatus getNewStatus() {
        return newStatus;
    }
    
    public void setNewStatus(ApprovalStatus newStatus) {
        this.newStatus = newStatus;
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
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    // Business methods
    
    /**
     * Check if this approval represents a submission action.
     * 
     * @return true if this is a submission
     */
    public boolean isSubmission() {
        return action == ApprovalAction.SUBMIT_FOR_APPROVAL;
    }
    
    /**
     * Check if this approval represents a confirmation action.
     * 
     * @return true if this is a confirmation
     */
    public boolean isConfirmation() {
        return action == ApprovalAction.TUTOR_CONFIRM || 
               action == ApprovalAction.LECTURER_CONFIRM || 
               action == ApprovalAction.HR_CONFIRM;
    }
    
    /**
     * Check if this approval represents a rejection action.
     * 
     * @return true if this is a rejection
     */
    public boolean isRejection() {
        return action == ApprovalAction.REJECT;
    }
    
    /**
     * Check if this approval represents a modification request.
     * 
     * @return true if this is a modification request
     */
    public boolean isModificationRequest() {
        return action == ApprovalAction.REQUEST_MODIFICATION;
    }
    
    /**
     * Validate business rules for the approval action.
     * 
     * @throws IllegalArgumentException if validation fails
     */
    public void validateBusinessRules() {
        validateBusinessRules(true);
    }
    
    /**
     * Validate business rules for the approval action with optional timesheet ID validation.
     * 
     * @param requireTimesheetId whether to require timesheet ID to be non-null
     * @throws IllegalArgumentException if validation fails
     */
    public void validateBusinessRules(boolean requireTimesheetId) {
        if (requireTimesheetId && timesheetId == null) {
            throw new IllegalArgumentException("Timesheet ID cannot be null");
        }
        
        if (approverId == null) {
            throw new IllegalArgumentException("Approver ID cannot be null");
        }
        
        if (action == null) {
            throw new IllegalArgumentException("Approval action cannot be null");
        }
        
        if (previousStatus == null) {
            throw new IllegalArgumentException("Previous status cannot be null");
        }
        
        if (newStatus == null) {
            throw new IllegalArgumentException("New status cannot be null");
        }
        
        // Validate that the status transition is valid via SSOT state machine
        // Use SSOT state machine without relying on exception control flow
        if (!com.usyd.catams.common.application.ApprovalStateMachineHolder.canTransition(previousStatus, action, newStatus)) {
            throw new IllegalArgumentException("Invalid status transition from " + previousStatus + " to " + newStatus);
        }
        
        // Validate comment length
        if (comment != null && comment.length() > 500) {
            throw new IllegalArgumentException("Comment cannot exceed 500 characters");
        }
    }
    
    @Override
    public String toString() {
        return "Approval{" +
                "id=" + id +
                ", timesheetId=" + timesheetId +
                ", approverId=" + approverId +
                ", action=" + action +
                ", previousStatus=" + previousStatus +
                ", newStatus=" + newStatus +
                ", comment='" + comment + '\'' +
                ", timestamp=" + timestamp +
                ", isActive=" + isActive +
                '}';
    }
}