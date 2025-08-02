package com.usyd.catams.service;

import com.usyd.catams.dto.request.AuthenticationRequest;
import com.usyd.catams.dto.request.UserCreateRequest;
import com.usyd.catams.dto.response.AuthResult;
import com.usyd.catams.dto.response.UserResponse;

/**
 * User service interface
 * 
 * Handles user-related business logic including user authentication, creation, and queries
 * 
 * @author Development Team
 * @since 1.0
 */
public interface UserService {

    /**
     * Authenticate user login credentials
     * 
     * Validates user email and password, generates JWT token on success
     * 
     * @param credentials Authentication request containing email and password
     * @return Authentication result with success status, JWT token and user info
     * @throws IllegalArgumentException when credentials are null or invalid format
     * @throws com.usyd.catams.exception.AuthenticationException when authentication fails
     */
    AuthResult authenticate(AuthenticationRequest credentials);

    /**
     * Create a new user account
     * 
     * Validates the request, checks for duplicate email, hashes the password,
     * and saves the new user to the database
     * 
     * @param request User creation request containing email, name, password, and role
     * @return User response DTO containing the created user's information
     * @throws IllegalArgumentException when request is null or invalid format
     * @throws com.usyd.catams.exception.BusinessException when email already exists
     */
    UserResponse createUser(UserCreateRequest request);
}