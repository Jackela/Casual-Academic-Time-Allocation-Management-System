package com.usyd.catams.controller;

import com.usyd.catams.dto.request.AuthenticationRequest;
import com.usyd.catams.dto.response.AuthResult;
import com.usyd.catams.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication controller
 * 
 * Handles user authentication related API requests
 * 
 * @author Development Team
 * @since 1.0
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * User login authentication
     * 
     * @param request Authentication request containing email and password
     * @return 200 - Login successful, returns JWT token and user info
     *         401 - Authentication failed
     *         400 - Invalid request parameters
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResult> login(@Valid @RequestBody AuthenticationRequest request) {
        // No try-catch - let exceptions bubble up to GlobalExceptionHandler
        // Follow Exception Handling Principle 2: Centralized Exception Handling
        AuthResult result = userService.authenticate(request);
        return ResponseEntity.ok(result);
    }
}