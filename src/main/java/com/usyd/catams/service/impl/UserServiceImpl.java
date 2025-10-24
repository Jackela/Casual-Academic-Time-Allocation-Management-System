package com.usyd.catams.service.impl;

import com.usyd.catams.dto.request.AuthenticationRequest;
import com.usyd.catams.dto.request.UserCreateRequest;
import com.usyd.catams.dto.request.UserUpdateRequest;
import com.usyd.catams.dto.response.AuthResult;
import com.usyd.catams.dto.response.UserResponse;
import com.usyd.catams.entity.User;
import com.usyd.catams.exception.AuthenticationException;
import com.usyd.catams.exception.BusinessException;
import com.usyd.catams.exception.BusinessRuleException;
import com.usyd.catams.exception.ErrorCodes;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.service.UserService;
import java.util.Comparator;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

/**
 * User service implementation
 * 
 * Implements user-related business logic including authentication functionality
 * 
 * @author Development Team
 * @since 1.0
 */
@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public UserServiceImpl(UserRepository userRepository, 
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * Authenticate user login credentials
     * 
     * Validates user email and password against database, generates JWT token on success
     * 
     * @param credentials Authentication request containing email and password
     * @return Authentication result with success status, JWT token and user info
     * @throws IllegalArgumentException when credentials are null or invalid format
     * @throws AuthenticationException when authentication fails
     */
    @Override
    public AuthResult authenticate(AuthenticationRequest credentials) {
        // Fail-fast validation - throw immediately on invalid input
        Assert.notNull(credentials, "Authentication credentials cannot be null");
        Assert.hasText(credentials.getEmail(), "Email cannot be empty");
        Assert.hasText(credentials.getPassword(), "Password cannot be empty");
        
        // Input sanitization - trim and normalize email
        String sanitizedEmail = credentials.getEmail().trim().toLowerCase();

        // Find user by email and active status
        User user = userRepository.findByEmailAndIsActive(sanitizedEmail, true)
            .orElseThrow(() -> new AuthenticationException("Invalid email or password"));

        // Verify password
        if (!passwordEncoder.matches(credentials.getPassword(), user.getHashedPassword())) {
            throw new AuthenticationException("Invalid email or password");
        }

        // Update last login timestamp
        user.updateLastLogin();
        userRepository.save(user);

        // Create user response DTO
        UserResponse userResponse = toResponse(user);

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(
            user.getId(),
            user.getEmail(),
            user.getRole().name()
        );

        return new AuthResult(true, token, userResponse, null);
    }

    /**
     * Create a new user account
     * 
     * Validates the request, checks for duplicate email, hashes the password,
     * and saves the new user to the database
     * 
     * @param request User creation request containing email, name, password, and role
     * @return User response DTO containing the created user's information
     * @throws IllegalArgumentException when request is null or invalid format
     * @throws BusinessException when email already exists
     */
    @Override
    public UserResponse createUser(UserCreateRequest request) {
        // Fail-fast validation - throw immediately on invalid input
        Assert.notNull(request, "User creation request cannot be null");
        Assert.hasText(request.getEmail(), "Email cannot be empty");
        Assert.hasText(request.getName(), "Name cannot be empty");
        Assert.hasText(request.getPassword(), "Password cannot be empty");
        Assert.notNull(request.getRole(), "User role cannot be null");
        
        // Input sanitization - trim and normalize inputs
        String sanitizedEmail = request.getEmail().trim().toLowerCase();
        String sanitizedName = request.getName().trim();

        // Check if email already exists
        if (userRepository.existsByEmail(sanitizedEmail)) {
            throw new BusinessException(ErrorCodes.EMAIL_EXISTS, "Email already exists");
        }

        // Hash the password
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // Create new user entity
        User user = new User(
            sanitizedEmail,
            sanitizedName,
            hashedPassword,
            request.getRole()
        );

        // Save user to database
        User savedUser = userRepository.save(user);

        // Create and return user response DTO
        return toResponse(savedUser);
    }

    @Override
    public List<UserResponse> getUsers() {
        return userRepository.findAll().stream()
            .sorted(Comparator.comparing(User::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toResponse)
            .toList();
    }

    @Override
    public List<UserResponse> searchUsers(String role, Boolean active) {
        List<User> users;
        try {
            if (role != null && !role.isBlank()) {
                UserRole r = UserRole.valueOf(role.trim().toUpperCase());
                if (active != null) {
                    users = userRepository.findByRoleAndIsActive(r, active);
                } else {
                    users = userRepository.findByRole(r);
                }
            } else {
                users = userRepository.findAll();
            }
        } catch (IllegalArgumentException e) {
            // Fallback to empty on invalid role
            users = List.of();
        }

        if (active != null && (role == null || role.isBlank())) {
            users = users.stream()
                .filter(u -> Boolean.TRUE.equals(active) ? Boolean.TRUE.equals(u.getIsActive()) : Boolean.FALSE.equals(u.getIsActive()))
                .toList();
        }

        return users.stream()
            .sorted(Comparator.comparing(User::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toResponse)
            .toList();
    }

    @Override
    public UserResponse updateUser(Long userId, UserUpdateRequest request) {
        Assert.notNull(userId, "User ID cannot be null");
        Assert.notNull(request, "User update request cannot be null");

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", String.valueOf(userId)));

        if (request.getIsActive() != null) {
            if (Boolean.FALSE.equals(request.getIsActive())
                    && user.getRole() == UserRole.ADMIN
                    && Boolean.TRUE.equals(user.getIsActive())) {
                long otherActiveAdmins = userRepository.findByRoleAndIsActive(UserRole.ADMIN, true)
                    .stream()
                    .filter(activeAdmin -> !activeAdmin.getId().equals(userId))
                    .count();

                if (otherActiveAdmins == 0) {
                    throw new BusinessRuleException("Cannot deactivate the last active administrator.", ErrorCodes.VALIDATION_FAILED);
                }
            }
            user.setIsActive(request.getIsActive());
        }

        if (request.getFirstName() != null || request.getLastName() != null) {
            String newFirst = request.getFirstName() != null
                ? normalizeName(request.getFirstName(), "First name")
                : user.getFirstName();
            String newLast = request.getLastName() != null
                ? normalizeName(request.getLastName(), "Last name")
                : user.getLastName();

            String combinedName = (newLast == null || newLast.isBlank())
                ? newFirst
                : newFirst + " " + newLast;
            user.setName(combinedName);
        }

        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    private UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }
        return new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getRole().name(),
            user.getIsActive()
        );
    }

    private String normalizeName(String value, String fieldName) {
        String trimmed = value != null ? value.trim() : null;
        if (trimmed == null || trimmed.isEmpty()) {
            throw new IllegalArgumentException(fieldName + " cannot be blank");
        }
        return trimmed;
    }
}
