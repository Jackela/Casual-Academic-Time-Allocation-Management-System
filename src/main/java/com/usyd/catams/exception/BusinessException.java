package com.usyd.catams.exception;

/**
 * 业务异常基类
 * 
 * 用于表示可预期的业务规则违反，如数据验证失败、权限不足等
 * 
 * @author Development Team
 * @since 1.0
 */
public class BusinessException extends RuntimeException {
    
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