package com.usyd.catams.dto.response;

/**
 * Standard error response DTO
 * 
 * All API error responses must use this format to ensure consistency
 * across the entire CATAMS system, matching the OpenAPI ErrorResponse schema.
 * 
 * @author Development Team
 * @since 1.0
 */
public class ErrorResponse {
    
    private boolean success = false;
    private String timestamp;
    private int status;
    private String error;
    private String message;
    private String errorMessage;
    private String path;
    
    public ErrorResponse() {
    }
    
    public ErrorResponse(String timestamp, int status, String error, String message, String path) {
        this.success = false;
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.message = message;
        this.errorMessage = message; // Set errorMessage same as message for backward compatibility
        this.path = path;
    }
    
    /**
     * Builder pattern creator for ErrorResponse
     * 
     * @return ErrorResponseBuilder instance for fluent construction
     */
    public static ErrorResponseBuilder builder() {
        return new ErrorResponseBuilder();
    }
    
    public static class ErrorResponseBuilder {
        private boolean success = false;
        private String timestamp;
        private int status;
        private String error;
        private String message;
        private String errorMessage;
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
            this.errorMessage = message; // Keep them in sync
            return this;
        }
        
        public ErrorResponseBuilder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            if (this.message == null) {
                this.message = errorMessage; // Keep them in sync
            }
            return this;
        }
        
        public ErrorResponseBuilder path(String path) {
            this.path = path;
            return this;
        }
        
        public ErrorResponseBuilder success(boolean success) {
            this.success = success;
            return this;
        }
        
        public ErrorResponse build() {
            ErrorResponse response = new ErrorResponse(timestamp, status, error, message, path);
            response.success = this.success;
            response.errorMessage = this.errorMessage;
            return response;
        }
    }
    
    // Getters and setters
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
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
        this.errorMessage = message; // Keep them in sync
    }
    
    public String getErrorMessage() {
        return errorMessage;
    }
    
    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
    
    public String getPath() {
        return path;
    }
    
    public void setPath(String path) {
        this.path = path;
    }
}