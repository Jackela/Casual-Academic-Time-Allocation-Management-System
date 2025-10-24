package com.usyd.catams.exception;

/**
 * Business conflict exception (HTTP 409).
 * Used to signal workflow/policy conflicts where the request is well-formed
 * but violates a domain invariant (e.g., admin approval before lecturer approval).
 */
public class BusinessConflictException extends RuntimeException {
    private final String errorCode;

    public BusinessConflictException(String message) {
        super(message);
        this.errorCode = ErrorCodes.RESOURCE_CONFLICT;
    }

    public BusinessConflictException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode == null ? ErrorCodes.RESOURCE_CONFLICT : errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}

