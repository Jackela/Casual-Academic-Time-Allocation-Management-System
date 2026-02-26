package com.usyd.catams.exception;

/**
 * Centralized Error Code Constants for CATAMS.
 * 
 * Error codes follow the pattern: {CATEGORY}_{SPECIFIC_ERROR}
 * 
 * Categories:
 * - AUTH_*   : Authentication related errors
 * - ACCESS_* : Authorization and permission errors
 * - VAL_*    : Validation errors
 * - RES_*    : Resource related errors (not found, conflicts)
 * - BIZ_*    : Business rule violations
 * - SYS_*    : System/infrastructure errors
 * 
 * @author Development Team
 * @since 1.0
 */
public final class ErrorCodes {

    private ErrorCodes() {
        throw new AssertionError("ErrorCodes is a utility class and should not be instantiated");
    }

    // ========================================
    // Authentication Errors (AUTH_*)
    // ========================================
    
    /** Authentication failed - invalid credentials */
    public static final String AUTH_FAILED = "AUTH_FAILED";
    
    /** JWT token has expired */
    public static final String TOKEN_EXPIRED = "TOKEN_EXPIRED";
    
    /** JWT token is invalid or malformed */
    public static final String TOKEN_INVALID = "TOKEN_INVALID";
    
    /** Session has expired */
    public static final String SESSION_EXPIRED = "SESSION_EXPIRED";
    
    /** Account is locked */
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    
    /** Account is not verified */
    public static final String ACCOUNT_NOT_VERIFIED = "ACCOUNT_NOT_VERIFIED";

    // ========================================
    // Authorization/Access Errors (ACCESS_*)
    // ========================================
    
    /** General access denied */
    public static final String ACCESS_DENIED = "ACCESS_DENIED";
    
    /** User lacks required role */
    public static final String ACCESS_ROLE_REQUIRED = "ACCESS_ROLE_REQUIRED";
    
    /** User lacks permission for resource */
    public static final String ACCESS_PERMISSION_DENIED = "ACCESS_PERMISSION_DENIED";
    
    /** Cross-tenant access attempt */
    public static final String ACCESS_TENANT_VIOLATION = "ACCESS_TENANT_VIOLATION";

    // ========================================
    // Validation Errors (VAL_*)
    // ========================================
    
    /** General validation failure */
    public static final String VALIDATION_FAILED = "VAL_VALIDATION_FAILED";
    
    /** Email already exists */
    public static final String EMAIL_EXISTS = "VAL_EMAIL_EXISTS";
    
    /** Password does not meet requirements */
    public static final String INVALID_PASSWORD = "VAL_INVALID_PASSWORD";
    
    /** Invalid input format */
    public static final String INVALID_FORMAT = "VAL_INVALID_FORMAT";
    
    /** Required field is missing */
    public static final String REQUIRED_FIELD_MISSING = "VAL_REQUIRED_FIELD_MISSING";
    
    /** Value out of allowed range */
    public static final String VALUE_OUT_OF_RANGE = "VAL_VALUE_OUT_OF_RANGE";
    
    /** Invalid date format or value */
    public static final String INVALID_DATE = "VAL_INVALID_DATE";
    
    /** Invalid numeric value */
    public static final String INVALID_NUMERIC = "VAL_INVALID_NUMERIC";

    // ========================================
    // Resource Errors (RES_*)
    // ========================================
    
    /** Resource not found */
    public static final String RESOURCE_NOT_FOUND = "RES_NOT_FOUND";
    
    /** Resource already exists */
    public static final String RESOURCE_EXISTS = "RES_EXISTS";
    
    /** Resource conflict (e.g., unique constraint) */
    public static final String RESOURCE_CONFLICT = "RES_CONFLICT";
    
    /** Resource has been modified by another transaction */
    public static final String RESOURCE_MODIFIED = "RES_MODIFIED";
    
    /** Resource is in invalid state for operation */
    public static final String RESOURCE_INVALID_STATE = "RES_INVALID_STATE";

    // ========================================
    // Business Rule Errors (BIZ_*)
    // ========================================
    
    /** General business rule violation */
    public static final String BUSINESS_RULE_VIOLATION = "BIZ_RULE_VIOLATION";
    
    /** Timesheet submission not allowed */
    public static final String TIMESHEET_SUBMISSION_NOT_ALLOWED = "BIZ_TIMESHEET_SUBMISSION_NOT_ALLOWED";
    
    /** Timesheet modification not allowed */
    public static final String TIMESHEET_MODIFICATION_NOT_ALLOWED = "BIZ_TIMESHEET_MODIFICATION_NOT_ALLOWED";
    
    /** Invalid approval action for current state */
    public static final String INVALID_APPROVAL_ACTION = "BIZ_INVALID_APPROVAL_ACTION";
    
    /** Duplicate timesheet for same week */
    public static final String DUPLICATE_TIMESHEET = "BIZ_DUPLICATE_TIMESHEET";
    
    /** Budget exceeded */
    public static final String BUDGET_EXCEEDED = "BIZ_BUDGET_EXCEEDED";
    
    /** Course assignment required */
    public static final String COURSE_ASSIGNMENT_REQUIRED = "BIZ_COURSE_ASSIGNMENT_REQUIRED";

    // ========================================
    // System/Infrastructure Errors (SYS_*)
    // ========================================
    
    /** Internal server error */
    public static final String INTERNAL_ERROR = "SYS_INTERNAL_ERROR";
    
    /** Service unavailable */
    public static final String SERVICE_UNAVAILABLE = "SYS_SERVICE_UNAVAILABLE";
    
    /** Database error */
    public static final String DATABASE_ERROR = "SYS_DATABASE_ERROR";
    
    /** External service error */
    public static final String EXTERNAL_SERVICE_ERROR = "SYS_EXTERNAL_SERVICE_ERROR";
    
    /** Rate limit exceeded */
    public static final String RATE_LIMIT_EXCEEDED = "SYS_RATE_LIMIT_EXCEEDED";
    
    /** Configuration error */
    public static final String CONFIGURATION_ERROR = "SYS_CONFIGURATION_ERROR";

    // ========================================
    // Schedule 1 Calculation Errors (SCH_*)
    // ========================================
    
    /** Rate code not found for parameters */
    public static final String RATE_CODE_NOT_FOUND = "SCH_RATE_CODE_NOT_FOUND";
    
    /** Policy version not found */
    public static final String POLICY_VERSION_NOT_FOUND = "SCH_POLICY_VERSION_NOT_FOUND";
    
    /** Invalid task type for calculation */
    public static final String INVALID_TASK_TYPE = "SCH_INVALID_TASK_TYPE";
    
    /** Calculation error */
    public static final String CALCULATION_ERROR = "SCH_CALCULATION_ERROR";
}
