package com.usyd.catams.exception;

/**
 * Error Code Constants Definition
 * 
 * @author Development Team
 * @since 1.0
 */
public class ErrorCodes {
    
    // Authentication related
    public static final String AUTH_FAILED = "AUTH_FAILED";
    public static final String TOKEN_EXPIRED = "TOKEN_EXPIRED";
    public static final String ACCESS_DENIED = "ACCESS_DENIED";
    
    // Data validation related
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    public static final String EMAIL_EXISTS = "EMAIL_EXISTS";
    public static final String INVALID_PASSWORD = "INVALID_PASSWORD";
    
    // Resource related
    public static final String RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";
    public static final String RESOURCE_CONFLICT = "RESOURCE_CONFLICT";
    
    // System related
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";
    public static final String SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";
    
    private ErrorCodes() {
        // Prevent instantiation
    }
}