package com.usyd.catams.exception;

import com.usyd.catams.dto.response.ErrorResponse;
import com.usyd.catams.service.Schedule1PolicyProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Global exception handler for centralized error handling
 * 
 * Handles all application exceptions and converts them to standardized error responses
 * 
 * @author Development Team
 * @since 1.0
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    /**
     * Handle business exceptions
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e, HttpServletRequest request) {
        logger.warn("Business exception: {} - {}", e.getErrorCode(), e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(e.getErrorCode())
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.badRequest().body(error);
    }
    
    /**
     * Handle authentication exceptions
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException e, HttpServletRequest request) {
        logger.warn("Authentication exception: {}", e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.UNAUTHORIZED.value())
            .error(ErrorCodes.AUTH_FAILED)
            .message("Authentication failed")
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
    
    /**
     * Handle Spring Security access denied exceptions
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException e, HttpServletRequest request) {
        logger.warn("Access denied exception: {}", e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.FORBIDDEN.value())
            .error(ErrorCodes.ACCESS_DENIED)
            .message("Access denied")
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Handle authorization failures - returns 403 Forbidden
     */
    @ExceptionHandler(AuthorizationException.class)
    public ResponseEntity<ErrorResponse> handleAuthorizationException(AuthorizationException e, HttpServletRequest request) {
        logger.warn("Authorization failure: {}", e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.FORBIDDEN.value())
            .error(e.getErrorCode())
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Handle SecurityException - business layer security violations
     */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ErrorResponse> handleSecurityException(SecurityException e, HttpServletRequest request) {
        logger.warn("Security exception: {}", e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.FORBIDDEN.value())
            .error(ErrorCodes.ACCESS_DENIED)
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Handle IllegalArgumentException - business rule violations
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException e, HttpServletRequest request) {
        logger.warn("Illegal argument exception: {}", e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(ErrorCodes.VALIDATION_FAILED)
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    /**
     * Handle business rule violations - returns 400 Bad Request
     */
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRuleException(BusinessRuleException e, HttpServletRequest request) {
        logger.warn("Business rule violation: {}", e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(e.getErrorCode())
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    /**
     * Map IllegalStateException to 400 Bad Request for business precondition failures
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException e, HttpServletRequest request) {
        logger.warn("Illegal state exception: {}", e.getMessage());
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(ErrorCodes.VALIDATION_FAILED)
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    /**
     * Handle validation exceptions from @Valid annotations
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException e, HttpServletRequest request) {
        
        List<String> errors = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.toList());
            
        String message = "Validation failed: " + String.join(", ", errors);
        logger.warn("Validation exception: {}", message);
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(ErrorCodes.VALIDATION_FAILED)
            .message(message)
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.badRequest().body(error);
    }
    
    /**
     * Handle constraint violation exceptions
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(
            ConstraintViolationException e, HttpServletRequest request) {
        
        String message = "Validation failed: " + e.getMessage();
        logger.warn("Constraint violation: {}", message);
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(ErrorCodes.VALIDATION_FAILED)
            .message(message)
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.badRequest().body(error);
    }
    
    /**
     * Handle missing or malformed request body
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e, HttpServletRequest request) {
        
        String message = "Invalid request body";
        logger.warn("Message not readable: {}", message);
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(ErrorCodes.VALIDATION_FAILED)
            .message(message)
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.badRequest().body(error);
    }
    
    
    /**
     * Handle resource not found exceptions
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException e, HttpServletRequest request) {
        logger.warn("Resource not found: {}", e.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.NOT_FOUND.value())
            .error(ErrorCodes.RESOURCE_NOT_FOUND)
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    /**
     * Handle Schedule 1 policy resolution failures to surface actionable feedback.
     */
    @ExceptionHandler(Schedule1PolicyProvider.RatePolicyNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleRatePolicyMissing(
            Schedule1PolicyProvider.RatePolicyNotFoundException e,
            HttpServletRequest request) {
        logger.error("Schedule 1 policy lookup failed: {}", e.getMessage());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error(ErrorCodes.INTERNAL_ERROR)
            .message(e.getMessage())
            .path(request.getRequestURI())
            .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
    
    /**
     * Handle unexpected runtime exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception e, HttpServletRequest request) {
        logger.error("System exception: {}", e.getMessage(), e);
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error(ErrorCodes.INTERNAL_ERROR)
            .message("Internal server error, please try again later")
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
