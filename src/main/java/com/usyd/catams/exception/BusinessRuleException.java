package com.usyd.catams.exception;

/**
 * Exception thrown when business rules are violated.
 * 
 * <p>This exception represents violations of business logic constraints that result in
 * HTTP 400 Bad Request responses. Examples include:</p>
 * <ul>
 * <li>Attempting to modify timesheets in non-editable states (APPROVED, SUBMITTED)</li>
 * <li>Violating timesheet status transition rules</li>
 * <li>Breaking business preconditions (e.g., editing approved timesheets)</li>
 * <li>Invalid state changes that violate domain rules</li>
 * </ul>
 * 
 * <p><strong>HTTP Status Mapping:</strong> 400 Bad Request</p>
 * <p><strong>Semantic Purpose:</strong> Client sent a request that violates business rules</p>
 * 
 * @see AuthorizationException for permission-related failures (403 Forbidden)
 * @see IllegalArgumentException for input validation failures (400 Bad Request)
 * @since 2.1
 */
public class BusinessRuleException extends RuntimeException {
    
    private final String errorCode;
    
    /**
     * Creates a business rule exception with default error code.
     * 
     * @param message descriptive error message explaining the business rule violation
     */
    public BusinessRuleException(String message) {
        super(message);
        this.errorCode = "BUSINESS_RULE_VIOLATION";
    }
    
    /**
     * Creates a business rule exception with custom error code.
     * 
     * @param message descriptive error message explaining the business rule violation
     * @param errorCode specific error code for categorizing the violation type
     */
    public BusinessRuleException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode != null ? errorCode : "BUSINESS_RULE_VIOLATION";
    }
    
    /**
     * Creates a business rule exception with cause and default error code.
     * 
     * @param message descriptive error message explaining the business rule violation
     * @param cause the underlying cause of this exception
     */
    public BusinessRuleException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "BUSINESS_RULE_VIOLATION";
    }
    
    /**
     * Creates a business rule exception with cause and custom error code.
     * 
     * @param message descriptive error message explaining the business rule violation
     * @param errorCode specific error code for categorizing the violation type
     * @param cause the underlying cause of this exception
     */
    public BusinessRuleException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode != null ? errorCode : "BUSINESS_RULE_VIOLATION";
    }
    
    /**
     * Gets the error code associated with this business rule violation.
     * 
     * @return the error code, never null
     */
    public String getErrorCode() {
        return errorCode;
    }
}