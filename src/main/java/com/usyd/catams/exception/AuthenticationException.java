package com.usyd.catams.exception;

/**
 * 用户认证异常
 * 
 * 用于表示用户认证失败的情况
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