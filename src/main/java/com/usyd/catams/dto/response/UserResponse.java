package com.usyd.catams.dto.response;

/**
 * User response DTO
 * 
 * Used for user information transfer in API responses.
 * Contains public user information (excludes sensitive data like passwords)
 * 
 * @author Development Team
 * @since 1.0
 */
public class UserResponse {

    private Long id;
    private String email;
    private String name;
    private String role;
    private Boolean isActive;

    /**
     * Default constructor
     */
    public UserResponse() {
    }

    /**
     * Constructor with all fields
     * 
     * @param id User ID
     * @param email User email address
     * @param name User full name
     * @param role User role as string
     */
    public UserResponse(Long id, String email, String name, String role) {
        this(id, email, name, role, null);
    }

    public UserResponse(Long id, String email, String name, String role, Boolean isActive) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.role = role;
        this.isActive = isActive;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    @Override
    public String toString() {
        return "UserResponse{" +
                "id=" + id +
                ", email='" + email + '\'' +
                ", name='" + name + '\'' +
                ", role='" + role + '\'' +
                ", isActive=" + isActive +
                '}';
    }
}
