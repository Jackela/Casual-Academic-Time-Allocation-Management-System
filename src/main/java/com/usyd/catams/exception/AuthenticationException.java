package com.usyd.catams.exception;

/**
 * User Authentication Exception
 * 
 * Used to represent user authentication failure scenarios
 * 
 * @author Development Team
 * @since 1.0
 */
public class AuthenticationException extends BusinessException {
    private static final long serialVersionUID = 1L;
    
    public AuthenticationException(String message) {
        super("AUTH_FAILED", message);
    }
    
    public AuthenticationException(String message, Throwable cause) {
        super("AUTH_FAILED", message, cause);
    }
}