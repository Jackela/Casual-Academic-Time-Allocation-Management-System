package com.usyd.catams.dto.response;

/**
 * Authentication result response DTO
 * 
 * Contains authentication success status, JWT token, user information and error message
 * 
 * @author Development Team
 * @since 1.0
 */
public class AuthResult {

    private boolean success;
    private String token;
    private UserResponse user;
    private String errorMessage;

    public AuthResult() {
    }

    public AuthResult(boolean success, String token, UserResponse user, String errorMessage) {
        this.success = success;
        this.token = token;
        this.user = user;
        this.errorMessage = errorMessage;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserResponse getUser() {
        return user;
    }

    public void setUser(UserResponse user) {
        this.user = user;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}