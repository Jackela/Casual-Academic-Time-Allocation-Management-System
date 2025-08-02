package com.usyd.catams.dto.request;

import com.usyd.catams.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * User creation request DTO
 * 
 * Contains the information required to create a new user account
 * 
 * @author Development Team
 * @since 1.0
 */
public class UserCreateRequest {

    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Email format is invalid")
    @Size(max = 255, message = "Email length cannot exceed 255 characters")
    private String email;

    @NotBlank(message = "Name cannot be empty")
    @Size(max = 100, message = "Name length cannot exceed 100 characters")
    private String name;

    @NotBlank(message = "Password cannot be empty")
    @Size(min = 8, max = 255, message = "Password length must be between 8 and 255 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$",
        message = "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"
    )
    private String password;

    @NotNull(message = "User role cannot be null")
    private UserRole role;

    /**
     * Default constructor
     */
    public UserCreateRequest() {
    }

    /**
     * Constructor with all fields
     * 
     * @param email User email address
     * @param name User full name
     * @param password User password
     * @param role User role
     */
    public UserCreateRequest(String email, String name, String password, UserRole role) {
        this.email = email;
        this.name = name;
        this.password = password;
        this.role = role;
    }

    /**
     * Get user email
     * 
     * @return User email address
     */
    public String getEmail() {
        return email;
    }

    /**
     * Set user email
     * 
     * @param email User email address
     */
    public void setEmail(String email) {
        this.email = email;
    }

    /**
     * Get user name
     * 
     * @return User full name
     */
    public String getName() {
        return name;
    }

    /**
     * Set user name
     * 
     * @param name User full name
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Get user password
     * 
     * @return User password
     */
    public String getPassword() {
        return password;
    }

    /**
     * Set user password
     * 
     * @param password User password
     */
    public void setPassword(String password) {
        this.password = password;
    }

    /**
     * Get user role
     * 
     * @return User role
     */
    public UserRole getRole() {
        return role;
    }

    /**
     * Set user role
     * 
     * @param role User role
     */
    public void setRole(UserRole role) {
        this.role = role;
    }

    @Override
    public String toString() {
        return "UserCreateRequest{" +
                "email='" + email + '\'' +
                ", name='" + name + '\'' +
                ", role=" + role +
                '}';
    }
}