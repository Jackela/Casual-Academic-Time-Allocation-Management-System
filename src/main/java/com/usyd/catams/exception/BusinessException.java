package com.usyd.catams.exception;

/**
 * Business Exception Base Class
 * 
 * Used to represent predictable business rule violations, such as data validation failures, insufficient permissions, etc.
 * 
 * @author Development Team
 * @since 1.0
 */
public class BusinessException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    
    private final String errorCode;
    
    public BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public BusinessException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
}