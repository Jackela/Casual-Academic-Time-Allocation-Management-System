package com.usyd.catams.exception;

/**
 * Exception thrown when a requested resource is not found.
 * 
 * This exception should be used when a specific resource (timesheet, user, course, etc.)
 * cannot be found by ID or other unique identifier, resulting in a 404 Not Found HTTP status.
 * 
 * @author Development Team
 * @since 1.0
 */
public class ResourceNotFoundException extends RuntimeException {
    
    private final String resourceType;
    private final String resourceId;
    
    public ResourceNotFoundException(String resourceType, String resourceId) {
        super(String.format("%s not found with ID: %s", resourceType, resourceId));
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    public ResourceNotFoundException(String resourceType, String resourceId, String message) {
        super(message);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    public String getResourceType() {
        return resourceType;
    }
    
    public String getResourceId() {
        return resourceId;
    }
}