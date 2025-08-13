package com.usyd.catams.exception;

/**
 * Exception thrown when authorization/permission checks fail.
 * 
 * <p>This exception represents failures in access control and authorization that result in
 * HTTP 403 Forbidden responses. Examples include:</p>
 * <ul>
 * <li>Users attempting to access timesheets for courses they don't teach</li>
 * <li>Cross-course permission violations (lecturer accessing other lecturer's course)</li>
 * <li>Role-based access control failures</li>
 * <li>Resource-level permission denials</li>
 * </ul>
 * 
 * <p><strong>HTTP Status Mapping:</strong> 403 Forbidden</p>
 * <p><strong>Semantic Purpose:</strong> Client lacks sufficient permissions for the requested resource</p>
 * 
 * <p><strong>Distinction from Authentication:</strong></p>
 * <ul>
 * <li><strong>AuthenticationException (401):</strong> "Who are you?" - Identity verification failed</li>
 * <li><strong>AuthorizationException (403):</strong> "You can't do that!" - Permission denied for authenticated user</li>
 * </ul>
 * 
 * @see BusinessRuleException for business rule violations (400 Bad Request)
 * @see AuthenticationException for identity verification failures (401 Unauthorized)
 * @since 2.1
 */
public class AuthorizationException extends RuntimeException {
    
    private final String errorCode;
    
    /**
     * Creates an authorization exception with default error code.
     * 
     * @param message descriptive error message explaining the permission failure
     */
    public AuthorizationException(String message) {
        super(message);
        this.errorCode = "AUTHORIZATION_FAILED";
    }
    
    /**
     * Creates an authorization exception with custom error code.
     * 
     * @param message descriptive error message explaining the permission failure
     * @param errorCode specific error code for categorizing the authorization failure type
     */
    public AuthorizationException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode != null ? errorCode : "AUTHORIZATION_FAILED";
    }
    
    /**
     * Creates an authorization exception with cause and default error code.
     * 
     * @param message descriptive error message explaining the permission failure
     * @param cause the underlying cause of this exception
     */
    public AuthorizationException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "AUTHORIZATION_FAILED";
    }
    
    /**
     * Creates an authorization exception with cause and custom error code.
     * 
     * @param message descriptive error message explaining the permission failure
     * @param errorCode specific error code for categorizing the authorization failure type
     * @param cause the underlying cause of this exception
     */
    public AuthorizationException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode != null ? errorCode : "AUTHORIZATION_FAILED";
    }
    
    /**
     * Gets the error code associated with this authorization failure.
     * 
     * @return the error code, never null
     */
    public String getErrorCode() {
        return errorCode;
    }
}