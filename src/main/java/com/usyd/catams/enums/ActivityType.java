package com.usyd.catams.enums;

/**
 * Activity types for dashboard recent activity feeds
 * 
 * Represents different types of user activities and system events
 * that can be displayed in dashboard activity logs
 */
public enum ActivityType {
    TIMESHEET_CREATED,
    TIMESHEET_SUBMITTED,
    TIMESHEET_APPROVED,
    TIMESHEET_REJECTED,
    MODIFICATION_REQUESTED,
    MODIFICATION_COMPLETED,
    HR_REVIEW_STARTED,
    FINAL_APPROVAL,
    PAYMENT_PROCESSED
}