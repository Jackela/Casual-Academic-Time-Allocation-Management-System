package com.usyd.catams.dto.response;

/**
 * 标准错误响应DTO
 * 
 * 所有API错误响应都必须使用此格式
 * 
 * @author Development Team
 * @since 1.0
 */
public class ErrorResponse {
    
    private String timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    
    public ErrorResponse() {
    }
    
    public ErrorResponse(String timestamp, int status, String error, String message, String path) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }
    
    /**
     * Builder模式创建器
     */
    public static ErrorResponseBuilder builder() {
        return new ErrorResponseBuilder();
    }
    
    public static class ErrorResponseBuilder {
        private String timestamp;
        private int status;
        private String error;
        private String message;
        private String path;
        
        public ErrorResponseBuilder timestamp(String timestamp) {
            this.timestamp = timestamp;
            return this;
        }
        
        public ErrorResponseBuilder status(int status) {
            this.status = status;
            return this;
        }
        
        public ErrorResponseBuilder error(String error) {
            this.error = error;
            return this;
        }
        
        public ErrorResponseBuilder message(String message) {
            this.message = message;
            return this;
        }
        
        public ErrorResponseBuilder path(String path) {
            this.path = path;
            return this;
        }
        
        public ErrorResponse build() {
            return new ErrorResponse(timestamp, status, error, message, path);
        }
    }
    
    // Getters and setters
    public String getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
    
    public int getStatus() {
        return status;
    }
    
    public void setStatus(int status) {
        this.status = status;
    }
    
    public String getError() {
        return error;
    }
    
    public void setError(String error) {
        this.error = error;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getPath() {
        return path;
    }
    
    public void setPath(String path) {
        this.path = path;
    }
}