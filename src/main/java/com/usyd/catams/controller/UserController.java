package com.usyd.catams.controller;

import com.usyd.catams.dto.request.UserCreateRequest;
import com.usyd.catams.dto.response.UserResponse;
import com.usyd.catams.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * User management controller
 * 
 * Handles user management related API requests including user creation
 * 
 * @author Development Team
 * @since 1.0
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Create a new user account
     * 
     * Creates a new user in the system. Only ADMIN users can create new accounts.
     * 
     * @param request User creation request containing email, name, password, and role
     * @return 201 - User created successfully
     *         400 - Invalid request data or email already exists
     *         401 - Authentication required
     *         403 - Insufficient permissions (not ADMIN)
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        // Service layer handles validation, duplicate checking, password hashing
        // Global exception handler manages error responses
        UserResponse userResponse = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userResponse);
    }
}