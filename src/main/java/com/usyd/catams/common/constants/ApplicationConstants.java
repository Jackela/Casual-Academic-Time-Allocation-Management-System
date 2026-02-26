package com.usyd.catams.common.constants;

/**
 * Application-wide constants for CATAMS.
 * 
 * <p>This class centralizes commonly used string literals, numeric constants,
 * and configuration values to ensure consistency and ease of maintenance.</p>
 * 
 * @author Development Team
 * @since 1.0
 */
public final class ApplicationConstants {

    private ApplicationConstants() {
        throw new AssertionError("ApplicationConstants is a utility class and should not be instantiated");
    }

    // ========================================
    // Application Info
    // ========================================
    
    public static final String APP_NAME = "CATAMS";
    public static final String APP_VERSION = "1.0.0";
    public static final String APP_DESCRIPTION = "Casual Academic Time Allocation Management System";

    // ========================================
    // HTTP Headers
    // ========================================
    
    public static final String HEADER_AUTHORIZATION = "Authorization";
    public static final String HEADER_BEARER_PREFIX = "Bearer ";
    public static final String HEADER_CONTENT_TYPE = "Content-Type";
    public static final String HEADER_X_REQUEST_ID = "X-Request-Id";
    public static final String HEADER_X_CORRELATION_ID = "X-Correlation-Id";
    public static final String HEADER_X_USER_ID = "X-User-Id";

    // ========================================
    // Media Types
    // ========================================
    
    public static final String MEDIA_TYPE_JSON = "application/json";
    public static final String MEDIA_TYPE_PROBLEM_JSON = "application/problem+json";

    // ========================================
    // API Paths
    // ========================================
    
    public static final String API_PREFIX = "/api";
    public static final String API_AUTH = "/api/auth";
    public static final String API_TIMESHEETS = "/api/timesheets";
    public static final String API_APPROVALS = "/api/approvals";
    public static final String API_DASHBOARD = "/api/dashboard";
    public static final String API_USERS = "/api/users";
    public static final String API_COURSES = "/api/courses";
    public static final String API_ADMIN = "/api/admin";

    // ========================================
    // Ports
    // ========================================
    
    public static final int DEFAULT_SERVER_PORT = 8080;
    public static final int E2E_SERVER_PORT = 8084;
    public static final int DEFAULT_FRONTEND_PORT = 5173;
    public static final int E2E_FRONTEND_PORT = 5174;

    // ========================================
    // Pagination
    // ========================================
    
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    // ========================================
    // Date/Time Formats
    // ========================================
    
    public static final String DATE_FORMAT = "yyyy-MM-dd";
    public static final String TIME_FORMAT = "HH:mm:ss";
    public static final String DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
    public static final String ISO_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";

    // ========================================
    // Session/Security
    // ========================================
    
    public static final int JWT_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
    public static final int REFRESH_TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    // ========================================
    // Schedule 1 Business Rules
    // ========================================
    
    /** Fixed delivery hours for Tutorial task type */
    public static final int TUTORIAL_FIXED_DELIVERY_HOURS = 1;
    
    /** Maximum associated hours for standard tutorial */
    public static final double TUTORIAL_MAX_ASSOCIATED_STANDARD = 2.0;
    
    /** Maximum associated hours for repeat tutorial */
    public static final double TUTORIAL_MAX_ASSOCIATED_REPEAT = 1.0;
    
    /** Maximum hours per week for a single timesheet entry */
    public static final double MAX_HOURS_PER_ENTRY = 10.0;
    
    /** Minimum hours per entry */
    public static final double MIN_HOURS_PER_ENTRY = 0.5;

    // ========================================
    // Rate Codes
    // ========================================
    
    public static final class RateCodes {
        private RateCodes() {}
        
        /** Standard tutorial (non-repeat) */
        public static final String TU1 = "TU1";
        public static final String TU2 = "TU2";
        
        /** Repeat tutorial */
        public static final String TU3 = "TU3";
        public static final String TU4 = "TU4";
        
        /** Oral assessment */
        public static final String AO1 = "AO1";
        public static final String AO2 = "AO2";
        
        /** Demonstration */
        public static final String DE1 = "DE1";
        public static final String DE2 = "DE2";
        
        /** Marking */
        public static final String M03 = "M03";
        public static final String M04 = "M04";
        public static final String M05 = "M05";
    }

    // ========================================
    // Task Types
    // ========================================
    
    public static final class TaskTypes {
        private TaskTypes() {}
        
        public static final String TUTORIAL = "TUTORIAL";
        public static final String ORAA = "ORAA";
        public static final String DEMO = "DEMO";
        public static final String MARKING = "MARKING";
    }

    // ========================================
    // Approval Status
    // ========================================
    
    public static final class ApprovalStatus {
        private ApprovalStatus() {}
        
        public static final String DRAFT = "DRAFT";
        public static final String PENDING_SUBMISSION = "PENDING_SUBMISSION";
        public static final String SUBMITTED = "SUBMITTED";
        public static final String TUTOR_CONFIRMED = "TUTOR_CONFIRMED";
        public static final String LECTURER_APPROVED = "LECTURER_APPROVED";
        public static final String HR_CONFIRMED = "HR_CONFIRMED";
        public static final String REJECTED = "REJECTED";
        public static final String DELETED = "DELETED";
    }

    // ========================================
    // User Roles
    // ========================================
    
    public static final class Roles {
        private Roles() {}
        
        public static final String ADMIN = "ADMIN";
        public static final String HR = "HR";
        public static final String LECTURER = "LECTURER";
        public static final String TUTOR = "TUTOR";
    }

    // ========================================
    // Log Messages
    // ========================================
    
    public static final class LogMessages {
        private LogMessages() {}
        
        public static final String REQUEST_RECEIVED = "Request received";
        public static final String REQUEST_COMPLETED = "Request completed";
        public static final String VALIDATION_FAILED = "Validation failed";
        public static final String RESOURCE_NOT_FOUND = "Resource not found";
        public static final String UNAUTHORIZED_ACCESS = "Unauthorized access attempt";
        public static final String CALCULATION_COMPLETED = "Calculation completed";
    }

    // ========================================
    // Cache Keys
    // ========================================
    
    public static final class CacheKeys {
        private CacheKeys() {}
        
        public static final String RATE_CODES = "rate_codes";
        public static final String POLICY_VERSIONS = "policy_versions";
        public static final String USER_PERMISSIONS = "user_permissions";
        public static final String COURSE_ASSIGNMENTS = "course_assignments";
    }

    // ========================================
    // Spring Profiles
    // ========================================
    
    public static final class Profiles {
        private Profiles() {}
        
        public static final String DEV = "dev";
        public static final String TEST = "test";
        public static final String E2E = "e2e";
        public static final String E2E_LOCAL = "e2e-local";
        public static final String DOCKER = "docker";
        public static final String PROD = "prod";
    }
}
