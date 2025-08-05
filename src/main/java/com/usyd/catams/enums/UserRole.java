package com.usyd.catams.enums;

/**
 * User role enumeration
 * 
 * Defines the different roles that users can have in the CATAMS system
 * 
 * @author Development Team
 * @since 1.0
 */
public enum UserRole {
    
    /**
     * Administrator role with full system access
     */
    ADMIN("Administrator"),
    
    /**
     * Lecturer role for academic staff who manage courses and supervise tutors
     */
    LECTURER("Lecturer"),
    
    /**
     * Tutor role for teaching assistants who work on specific courses
     */
    TUTOR("Tutor"),
    
    /**
     * HR role for human resources staff who manage user accounts and approvals
     */
    HR("Human Resources");
    
    private final String displayName;
    
    UserRole(String displayName) {
        this.displayName = displayName;
    }
    
    /**
     * Get the display name of the role
     * 
     * @return User-friendly display name
     */
    public String getDisplayName() {
        return displayName;
    }
}