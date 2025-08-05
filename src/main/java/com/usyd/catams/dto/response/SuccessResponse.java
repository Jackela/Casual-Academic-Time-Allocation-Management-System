package com.usyd.catams.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Generic success response wrapper DTO
 * 
 * Provides a consistent success response format across all API endpoints
 * following the OpenAPI specification. All successful API responses should
 * use this wrapper to ensure the success field is always present.
 * 
 * @param <T> The type of data being returned
 * @author Development Team
 * @since 1.0
 */
public class SuccessResponse<T> {
    
    @JsonProperty("success")
    private boolean success = true;
    
    @JsonProperty("data")
    private T data;
    
    public SuccessResponse() {
    }
    
    public SuccessResponse(T data) {
        this.success = true;
        this.data = data;
    }
    
    public SuccessResponse(boolean success, T data) {
        this.success = success;
        this.data = data;
    }
    
    public static <T> SuccessResponse<T> of(T data) {
        return new SuccessResponse<>(data);
    }
    
    public static <T> SuccessResponse<T> success(T data) {
        return new SuccessResponse<>(true, data);
    }
    
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public T getData() {
        return data;
    }
    
    public void setData(T data) {
        this.data = data;
    }
    
    @Override
    public String toString() {
        return "SuccessResponse{" +
                "success=" + success +
                ", data=" + data +
                '}';
    }
}