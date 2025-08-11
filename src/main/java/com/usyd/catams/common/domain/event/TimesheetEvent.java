package com.usyd.catams.common.domain.event;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;

/**
 * Timesheet domain events for the CATAMS system
 * 
 * These events represent significant timesheet-related business occurrences that other
 * services or components need to be aware of. When extracted to microservices, these
 * events will be published to message queues for cross-service communication.
 * 
 * Event Types:
 * - TimesheetCreatedEvent: New timesheet created
 * - TimesheetUpdatedEvent: Existing timesheet modified  
 * - TimesheetSubmittedEvent: Timesheet submitted for approval
 * - TimesheetApprovalProcessedEvent: Approval action taken
 * - TimesheetDeletedEvent: Timesheet removed
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public abstract class TimesheetEvent extends AbstractDomainEvent {
    private static final long serialVersionUID = 1L;
    
    private static final String AGGREGATE_TYPE = "TIMESHEET";
    
    protected final Long tutorId;
    protected final Long courseId;
    protected final LocalDate weekStartDate;
    
    protected TimesheetEvent(String timesheetId, Long tutorId, Long courseId, 
                           LocalDate weekStartDate, String triggeredBy, String correlationId) {
        super(timesheetId, AGGREGATE_TYPE, triggeredBy, correlationId, null);
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.weekStartDate = weekStartDate;
    }
    
    public Long getTutorId() { return tutorId; }
    public Long getCourseId() { return courseId; }
    public LocalDate getWeekStartDate() { return weekStartDate; }
    
    /**
     * Event fired when a new timesheet is created
     */
        public static class TimesheetCreatedEvent extends TimesheetEvent {
            private static final long serialVersionUID = 1L;
        
        private final BigDecimal hours;
        private final BigDecimal hourlyRate;
        private final String description;
        
        public TimesheetCreatedEvent(String timesheetId, Long tutorId, Long courseId,
                                   LocalDate weekStartDate, BigDecimal hours, BigDecimal hourlyRate,
                                   String description, String triggeredBy, String correlationId) {
            super(timesheetId, tutorId, courseId, weekStartDate, triggeredBy, correlationId);
            this.hours = hours;
            this.hourlyRate = hourlyRate;
            this.description = description;
        }
        
        @Override
        public String getEventType() {
            return "TIMESHEET_CREATED";
        }
        
        public BigDecimal getHours() { return hours; }
        public BigDecimal getHourlyRate() { return hourlyRate; }
        public String getDescription() { return description; }
        
        public BigDecimal getTotalAmount() {
            return hours.multiply(hourlyRate);
        }
    }
    
    /**
     * Event fired when a timesheet is updated
     */
        public static class TimesheetUpdatedEvent extends TimesheetEvent {
            private static final long serialVersionUID = 1L;
        
        private final BigDecimal previousHours;
        private final BigDecimal newHours;
        private final String previousDescription;
        private final String newDescription;
        
        public TimesheetUpdatedEvent(String timesheetId, Long tutorId, Long courseId,
                                   LocalDate weekStartDate, BigDecimal previousHours, BigDecimal newHours,
                                   String previousDescription, String newDescription,
                                   String triggeredBy, String correlationId) {
            super(timesheetId, tutorId, courseId, weekStartDate, triggeredBy, correlationId);
            this.previousHours = previousHours;
            this.newHours = newHours;
            this.previousDescription = previousDescription;
            this.newDescription = newDescription;
        }
        
        @Override
        public String getEventType() {
            return "TIMESHEET_UPDATED";
        }
        
        public BigDecimal getPreviousHours() { return previousHours; }
        public BigDecimal getNewHours() { return newHours; }
        public String getPreviousDescription() { return previousDescription; }
        public String getNewDescription() { return newDescription; }
        
        public BigDecimal getHoursDifference() {
            return newHours.subtract(previousHours);
        }
        
        public boolean hasSignificantChange() {
            return !Objects.equals(previousHours, newHours) || 
                   !Objects.equals(previousDescription, newDescription);
        }
    }
    
    /**
     * Event fired when a timesheet is submitted for approval
     */
        public static class TimesheetSubmittedEvent extends TimesheetEvent {
            private static final long serialVersionUID = 1L;
        
        private final ApprovalStatus previousStatus;
        private final ApprovalStatus newStatus;
        private final Long nextApproverId;
        
        public TimesheetSubmittedEvent(String timesheetId, Long tutorId, Long courseId,
                                     LocalDate weekStartDate, ApprovalStatus previousStatus,
                                     ApprovalStatus newStatus, Long nextApproverId,
                                     String triggeredBy, String correlationId) {
            super(timesheetId, tutorId, courseId, weekStartDate, triggeredBy, correlationId);
            this.previousStatus = previousStatus;
            this.newStatus = newStatus;
            this.nextApproverId = nextApproverId;
        }
        
        @Override
        public String getEventType() {
            return "TIMESHEET_SUBMITTED";
        }
        
        public ApprovalStatus getPreviousStatus() { return previousStatus; }
        public ApprovalStatus getNewStatus() { return newStatus; }
        public Long getNextApproverId() { return nextApproverId; }
        
        public boolean isInitialSubmission() {
            return previousStatus == ApprovalStatus.DRAFT;
        }
        
        public boolean isResubmission() {
            return previousStatus == ApprovalStatus.MODIFICATION_REQUESTED;
        }
    }
    
    /**
     * Event fired when an approval action is processed on a timesheet
     */
        public static class TimesheetApprovalProcessedEvent extends TimesheetEvent {
            private static final long serialVersionUID = 1L;
        
        private final Long approverId;
        private final ApprovalAction action;
        private final ApprovalStatus previousStatus;
        private final ApprovalStatus newStatus;
        private final String comments;
        private final Long nextApproverId;
        
        public TimesheetApprovalProcessedEvent(String timesheetId, Long tutorId, Long courseId,
                                             LocalDate weekStartDate, Long approverId,
                                             ApprovalAction action, ApprovalStatus previousStatus,
                                             ApprovalStatus newStatus, String comments,
                                             Long nextApproverId, String triggeredBy, String correlationId) {
            super(timesheetId, tutorId, courseId, weekStartDate, triggeredBy, correlationId);
            this.approverId = approverId;
            this.action = action;
            this.previousStatus = previousStatus;
            this.newStatus = newStatus;
            this.comments = comments;
            this.nextApproverId = nextApproverId;
        }
        
        @Override
        public String getEventType() {
            return "TIMESHEET_APPROVAL_PROCESSED";
        }
        
        public Long getApproverId() { return approverId; }
        public ApprovalAction getAction() { return action; }
        public ApprovalStatus getPreviousStatus() { return previousStatus; }
        public ApprovalStatus getNewStatus() { return newStatus; }
        public String getComments() { return comments; }
        public Long getNextApproverId() { return nextApproverId; }
        
        public boolean isApproved() {
            return action == ApprovalAction.APPROVE;
        }
        
        public boolean isRejected() {
            return action == ApprovalAction.REJECT;
        }
        
        public boolean isModificationRequested() {
            return action == ApprovalAction.REQUEST_MODIFICATION;
        }
        
        public boolean isFinalApproval() {
            return isApproved() && newStatus == ApprovalStatus.FINAL_APPROVED;
        }
        
        public boolean hasComments() {
            return comments != null && !comments.trim().isEmpty();
        }
    }
    
    /**
     * Event fired when a timesheet is deleted
     */
        public static class TimesheetDeletedEvent extends TimesheetEvent {
            private static final long serialVersionUID = 1L;
        
        private final ApprovalStatus previousStatus;
        private final BigDecimal hours;
        private final BigDecimal hourlyRate;
        private final String reason;
        
        public TimesheetDeletedEvent(String timesheetId, Long tutorId, Long courseId,
                                   LocalDate weekStartDate, ApprovalStatus previousStatus,
                                   BigDecimal hours, BigDecimal hourlyRate, String reason,
                                   String triggeredBy, String correlationId) {
            super(timesheetId, tutorId, courseId, weekStartDate, triggeredBy, correlationId);
            this.previousStatus = previousStatus;
            this.hours = hours;
            this.hourlyRate = hourlyRate;
            this.reason = reason;
        }
        
        @Override
        public String getEventType() {
            return "TIMESHEET_DELETED";
        }
        
        public ApprovalStatus getPreviousStatus() { return previousStatus; }
        public BigDecimal getHours() { return hours; }
        public BigDecimal getHourlyRate() { return hourlyRate; }
        public String getReason() { return reason; }
        
        public BigDecimal getLostAmount() {
            return hours.multiply(hourlyRate);
        }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("deletionReason", reason);
            metadata.put("lostAmount", getLostAmount());
            return metadata;
        }
    }
    
    /**
     * Event fired when timesheet deadlines are approaching or exceeded
     */
        public static class TimesheetDeadlineEvent extends TimesheetEvent {
            private static final long serialVersionUID = 1L;
        
        private final java.time.LocalDateTime deadline;
        private final long daysOverdue;
        private final String deadlineType; // "APPROACHING" or "OVERDUE"
        
        public TimesheetDeadlineEvent(String timesheetId, Long tutorId, Long courseId,
                                    LocalDate weekStartDate, java.time.LocalDateTime deadline,
                                    long daysOverdue, String deadlineType,
                                    String triggeredBy, String correlationId) {
            super(timesheetId, tutorId, courseId, weekStartDate, triggeredBy, correlationId);
            this.deadline = deadline;
            this.daysOverdue = daysOverdue;
            this.deadlineType = deadlineType;
        }
        
        @Override
        public String getEventType() {
            return "TIMESHEET_DEADLINE_" + deadlineType;
        }
        
        public java.time.LocalDateTime getDeadline() { return deadline; }
        public long getDaysOverdue() { return daysOverdue; }
        public String getDeadlineType() { return deadlineType; }
        
        public boolean isApproaching() {
            return "APPROACHING".equals(deadlineType);
        }
        
        public boolean isOverdue() {
            return "OVERDUE".equals(deadlineType);
        }
        
        @Override
        public boolean isPublishable() {
            // Always publish deadline events as they may need external notifications
            return true;
        }
    }
}