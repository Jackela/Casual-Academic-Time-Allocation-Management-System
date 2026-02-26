# Coding Standards Document

## Purpose
Define coding specifications to ensure code consistency, readability, and LLM-friendliness.

*Development guidelines that all development agents must strictly follow*

## 1. General Principles

### 1.1 SOLID Principles
- **S - Single Responsibility Principle**
  - Each class should have only one reason to change
  - Each method should do only one thing

- **O - Open/Closed Principle**
  - Open for extension, closed for modification
  - Use interfaces and abstract classes for extensible design

- **L - Liskov Substitution Principle**
  - Subclasses should be substitutable for their parent classes without affecting program correctness

- **I - Interface Segregation Principle**
  - Clients should not depend on interfaces they don't need

- **D - Dependency Inversion Principle**
  - Depend on abstractions, not concrete implementations

### 1.2 DRY Principle (Don't Repeat Yourself)
- Avoid code duplication
- Extract common logic into shared components
- Use constants for repeated values

## 2. Naming Conventions

### 2.1 Class Names
- **Rule**: UpperCamelCase
- **Examples**:
  ```java
  // ✅ Correct
  public class TimesheetService { }
  public class UserController { }
  public class AuthenticationRequest { }
  
  // ❌ Incorrect
  public class timesheetService { }
  public class user_controller { }
  public class authentication_Request { }
  ```

### 2.2 Method and Variable Names
- **Rule**: lowerCamelCase
- **Examples**:
  ```java
  // ✅ Correct
  public void createTimesheet() { }
  private String userEmail;
  private LocalDate startDate;
  
  // ❌ Incorrect
  public void CreateTimesheet() { }
  private String user_email;
  private LocalDate start_date;
  ```

### 2.3 Constants
- **Rule**: UPPER_SNAKE_CASE
- **Examples**:
  ```java
  // ✅ Correct
  public static final int MAX_HOURS = 40;
  public static final String DEFAULT_ROLE = "TUTOR";
  private static final String JWT_SECRET_KEY = "secret";
  
  // ❌ Incorrect
  public static final int maxHours = 40;
  public static final String defaultRole = "TUTOR";
  ```

### 2.4 Package Names
- **Rule**: All lowercase, dot-separated
- **Examples**:
  ```java
  // ✅ Correct
  package com.usyd.catams.service;
  package com.usyd.catams.dto.request;
  
  // ❌ Incorrect
  package com.usyd.catams.Service;
  package com.usyd.catams.DTO.Request;
  ```

## 3. Commenting Standards

### 3.1 Core Requirements
**All public classes and methods must have JavaDoc-style comments**

### 3.2 Class Comment Examples
```java
/**
 * User service interface responsible for user-related business logic processing
 * 
 * Contains core functions including user authentication, creation, and queries
 * 
 * @author Development Team
 * @since 1.0
 */
public interface UserService {
    // Method definitions...
}
```

### 3.3 Method Comment Examples
```java
/**
 * Authenticate user login credentials
 * 
 * Validates the correctness of user email and password, generates JWT token upon success
 * 
 * @param credentials Authentication request object containing email and password
 * @return Authentication result containing success status, JWT token, and user information
 * @throws IllegalArgumentException when credentials are null or incorrectly formatted
 * @throws AuthenticationException when authentication fails
 */
AuthResult authenticate(AuthenticationRequest credentials);
```

### 3.4 Complex Business Logic Comments
```java
/**
 * Calculate timesheet salary
 * 
 * Calculates final salary based on different salary strategies:
 * 1. Standard strategy: hours × hourly rate
 * 2. Tiered strategy: regular time at standard rate, overtime at 1.5x rate
 * 
 * @param hours Work hours, must be greater than 0
 * @param hourlyRate Hourly rate, must be greater than 0
 * @param context Salary calculation context containing course and user information
 * @return Calculated total salary
 */
public BigDecimal calculatePay(BigDecimal hours, BigDecimal hourlyRate, PayCalculationContext context) {
    // Implementation logic...
}
```

## 4. API Design Standards

### 4.1 RESTful Principles
**Strictly follow RESTful design principles**

### 4.2 URL Design
- **Rule**: Use plural nouns to represent resources
- **Examples**:
  ```java
  // ✅ Correct
  @GetMapping("/api/users")           // Get user list
  @GetMapping("/api/users/{id}")      // Get specific user
  @GetMapping("/api/timesheets")      // Get timesheet list
  @PostMapping("/api/auth/login")     // User login
  
  // ❌ Incorrect
  @GetMapping("/api/getUsers")        // Verb form
  @GetMapping("/api/user")            // Singular form
  @PostMapping("/api/loginUser")      // Verb form
  ```

### 4.3 HTTP Method Usage
```java
// ✅ Correct HTTP method usage
@GetMapping("/api/users")                    // Query resources
@PostMapping("/api/users")                   // Create resources
@PutMapping("/api/users/{id}")              // Update entire resource
@PatchMapping("/api/users/{id}")            // Partial update resource
@DeleteMapping("/api/users/{id}")           // Delete resource
```

### 4.4 HTTP Status Code Standards
```java
/**
 * User login authentication
 * 
 * @return 200 - Login successful
 *         400 - Request parameter error
 *         401 - Authentication failed
 *         500 - Internal server error
 */
@PostMapping("/api/auth/login")
public ResponseEntity<AuthResult> login(@RequestBody AuthenticationRequest request) {
    try {
        AuthResult result = userService.authenticate(request);
        return ResponseEntity.ok(result);              // 200
    } catch (IllegalArgumentException e) {
        return ResponseEntity.badRequest().build();    // 400
    } catch (AuthenticationException e) {
        return ResponseEntity.status(401).build();     // 401
    }
}
```

## 5. Design By Contract

### 5.1 Pre-conditions
**Perform parameter validation at method entry points**

```java
@Service
public class UserServiceImpl implements UserService {
    
    /**
     * Create new user
     */
    @Override
    public Long createUser(@Valid UserCreateRequest request) {
        // Use javax.validation annotations for automatic validation
        Assert.notNull(request, "User creation request cannot be null");
        Assert.hasText(request.getEmail(), "Email cannot be empty");
        Assert.hasText(request.getPassword(), "Password cannot be empty");
        
        // Business logic...
        return userId;
    }
}
```

### 5.2 DTO Validation Annotation Examples
```java
public class UserCreateRequest {
    
    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Email format is incorrect")
    private String email;
    
    @NotBlank(message = "Password cannot be empty")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$", 
             message = "Password must contain uppercase and lowercase letters, numbers, and special characters")
    private String password;
    
    @NotNull(message = "User role cannot be null")
    private UserRole role;
    
    // getters and setters...
}
```

### 5.3 Post-conditions
**Ensure correctness of method return values or object states**

```java
public AuthResult authenticate(AuthenticationRequest credentials) {
    // Pre-condition check
    Assert.notNull(credentials, "Authentication credentials cannot be null");
    
    // Business logic processing
    AuthResult result = performAuthentication(credentials);
    
    // Post-condition check
    Assert.notNull(result, "Authentication result cannot be null");
    if (result.isSuccess()) {
        Assert.hasText(result.getToken(), "Must return valid token when authentication succeeds");
        Assert.notNull(result.getUser(), "Must return user information when authentication succeeds");
    }
    
    return result;
}
```

## 6. Error Handling

### 6.1 Global Exception Handler
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    /**
     * Handle business exceptions
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        logger.warn("Business exception: {}", e.getMessage());
        return ResponseEntity.badRequest()
            .body(new ErrorResponse(e.getCode(), e.getMessage()));
    }
    
    /**
     * Handle authentication exceptions
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException e) {
        logger.warn("Authentication exception: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse("AUTH_FAILED", "Authentication failed"));
    }
    
    /**
     * Handle resource not found exceptions
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException e) {
        logger.warn("Resource not found: {}", e.getMessage());
        return ResponseEntity.notFound().build();
    }
}
```

### 6.2 Custom Business Exceptions
```java
/**
 * Business exception base class
 */
public class BusinessException extends RuntimeException {
    private final String code;
    
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
    
    public String getCode() {
        return code;
    }
}

/**
 * Resource not found exception
 */
public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String resource, Object id) {
        super("RESOURCE_NOT_FOUND", String.format("%s with id %s not found", resource, id));
    }
}

/**
 * User authentication exception
 */
public class AuthenticationException extends BusinessException {
    public AuthenticationException(String message) {
        super("AUTH_FAILED", message);
    }
}
```

## 7. Testing Standards

### 7.1 Test Coverage Goals
- **Service Layer**: Achieve 80%+ unit test coverage
- **Controller Layer**: All API endpoints must have integration tests
- **Repository Layer**: Complex query methods require testing

### 7.2 Unit Test Examples
```java
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @InjectMocks
    private UserServiceImpl userService;
    
    @Test
    @DisplayName("Successfully create user")
    void shouldCreateUserSuccessfully() {
        // Given
        UserCreateRequest request = new UserCreateRequest();
        request.setEmail("test@example.com");
        request.setPassword("Password123!");
        request.setRole(UserRole.TUTOR);
        
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(createMockUser());
        
        // When
        Long userId = userService.createUser(request);
        
        // Then
        assertThat(userId).isNotNull();
        verify(userRepository).save(any(User.class));
    }
    
    @Test
    @DisplayName("Throw exception when email already exists")
    void shouldThrowExceptionWhenEmailExists() {
        // Given
        UserCreateRequest request = new UserCreateRequest();
        request.setEmail("existing@example.com");
        
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);
        
        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(BusinessException.class)
            .hasMessage("Email already exists");
    }
}
```

### 7.3 Integration Test Examples
```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class AuthControllerIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:13")
            .withDatabaseName("catams_test")
            .withUsername("test")
            .withPassword("test");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("Successfully login and return JWT")
    void shouldLoginSuccessfullyAndReturnJWT() {
        // Given
        AuthenticationRequest request = new AuthenticationRequest();
        request.setEmail("test@example.com");
        request.setPassword("Password123!");
        
        // When
        ResponseEntity<AuthResult> response = restTemplate.postForEntity(
            "/api/auth/login", request, AuthResult.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getToken()).isNotBlank();
    }
}
```

## 8. Test Runner Constitution

To ensure a clean, fast, and reliable test suite, this project enforces a strict separation of concerns between its testing frameworks. This constitution is the absolute source of truth.

### **Article I: The Domain of Vitest**
- `vitest` is to be used **exclusively** for all non-browser tests.
- This includes:
    - **Unit Tests** (e.g., `src/**/*.test.ts`): For testing individual functions and utilities in isolation.
    - **API Contract Tests** (e.g., `e2e/api/**/*.spec.ts`): For testing the backend API contract directly using the `ApiClient`, without a browser.

### **Article II: The Domain of Playwright**
- `@playwright/test` is to be used **exclusively** for true End-to-End (E2E) tests that simulate real user interactions in a browser.
- Its scope is limited to the `e2e/modules/**/*.spec.ts` files.

### **Article III: The Uncrossable Boundary**
- Under **no circumstances** should `import` statements from `vitest` and `@playwright/test` appear in the same test file. They are mutually exclusive.

## 9. Exception Handling Strategy

The CATAMS project adopts a unified exception handling strategy to ensure consistency and maintainability of error handling. This strategy is based on four core principles:

### 9.1 Principle 1: Fail-Fast

**Core Concept: Validate all external input at the earliest possible stage**

All external data (API requests, user input, external system calls) must be validated before entering business logic. Once invalid data is detected, immediately throw exceptions to prevent error data from propagating through the system.

#### 9.1.1 Controller Layer Validation
```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        // @Valid annotation triggers automatic validation, Spring throws MethodArgumentNotValidException on failure
        UserResponse user = userService.createUser(request);
        return ResponseEntity.status(201).body(user);
    }
}
```

#### 9.1.2 Service Layer Pre-condition Checks
```java
@Service
public class UserServiceImpl implements UserService {
    
    @Override
    public Long createUser(UserCreateRequest request) {
        // Pre-condition validation - fail immediately
        Assert.notNull(request, "User creation request cannot be null");
        Assert.hasText(request.getEmail(), "Email cannot be empty");
        Assert.hasText(request.getPassword(), "Password cannot be empty");
        
        // Business rule validation - fail immediately
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("EMAIL_EXISTS", "Email already exists");
        }
        
        // Normal business logic
        return createUserInternal(request);
    }
}
```

#### 9.1.3 DTO Validation Annotations
```java
public class UserCreateRequest {
    
    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Email format is incorrect")
    private String email;
    
    @NotBlank(message = "Password cannot be empty")
    @Size(min = 8, max = 64, message = "Password length must be between 8-64 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$", 
             message = "Password must contain uppercase and lowercase letters, numbers, and special characters")
    private String password;
    
    @NotNull(message = "User role cannot be null")
    private UserRole role;
    
    // getters and setters...
}
```

### 9.2 Principle 2: Centralized Exception Handling

**Core Concept: Business logic layers do not catch exceptions, let exceptions "bubble up" to global handlers**

Service and Repository layers focus on business logic implementation and are not responsible for exception handling. All exceptions are passed to the Controller layer through the "exception bubbling" mechanism, where they are handled uniformly by the global exception handler.

#### 9.2.1 Service Layer Does Not Catch Exceptions
```java
@Service
public class UserServiceImpl implements UserService {
    
    @Override
    public AuthResult authenticate(AuthenticationRequest credentials) {
        // Do not use try-catch, let exceptions bubble up naturally
        User user = userRepository.findByEmail(credentials.getEmail())
            .orElseThrow(() -> new AuthenticationException("User does not exist or password is incorrect"));
        
        if (!passwordEncoder.matches(credentials.getPassword(), user.getPassword())) {
            throw new AuthenticationException("User does not exist or password is incorrect");
        }
        
        // Return result normally
        return buildAuthResult(user);
    }
}
```

#### 9.2.2 Global Exception Handler
```java
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
            .error("AUTH_FAILED")
            .message("Authentication failed")
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
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
            .error("INTERNAL_ERROR")
            .message("Internal system error, please try again later")
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

### 9.3 Principle 3: Differentiated Exception Types

**Core Concept: Distinguish between predictable business exceptions and unpredictable system exceptions**

#### 9.3.1 BusinessException - Predictable Business Exceptions
Used to handle predictable business rule violations, returns 4xx status codes, logs WARN level messages.

```java
/**
 * Business exception base class
 * 
 * Used to represent predictable business rule violations, such as data validation failures, insufficient permissions, etc.
 */
public class BusinessException extends RuntimeException {
    
    private final String errorCode;
    
    public BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public BusinessException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
}

/**
 * Specific business exception implementations
 */
public class AuthenticationException extends BusinessException {
    public AuthenticationException(String message) {
        super("AUTH_FAILED", message);
    }
}

public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String resource, Object id) {
        super("RESOURCE_NOT_FOUND", String.format("%s with id %s not found", resource, id));
    }
}

public class ValidationException extends BusinessException {
    public ValidationException(String message) {
        super("VALIDATION_FAILED", message);
    }
}
```

#### 9.3.2 Usage Scenario Examples
```java
@Service
public class UserServiceImpl implements UserService {
    
    @Override
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }
    
    @Override
    public Long createUser(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("EMAIL_EXISTS", "Email already exists");
        }
        
        if (!isValidPassword(request.getPassword())) {
            throw new ValidationException("Password does not meet security requirements");
        }
        
        // Normal business logic
        return saveUser(request);
    }
}
```

#### 9.3.3 System Exception Handling
For unpredictable system exceptions (such as NullPointerException, database connection exceptions, etc.), the global handler will:
- Return generic 500 status code
- Log complete exception stack at ERROR level
- Return generic error messages to clients (avoid exposing system details)

### 9.4 Principle 4: Standardized Error Response Body

**Core Concept: All API error responses must follow a unified JSON structure**

#### 9.4.1 Standard Error Response Format
```json
{
  "timestamp": "2025-08-01T10:15:30.123Z",
  "status": 400,
  "error": "EMAIL_EXISTS",
  "message": "Email already exists",
  "path": "/api/users"
}
```

#### 9.4.2 ErrorResponse Class Implementation
```java
/**
 * Standard error response DTO
 * 
 * All API error responses must use this format
 */
public class ErrorResponse {
    
    private String timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    
    // Constructors
    public ErrorResponse() {
    }
    
    public ErrorResponse(String timestamp, int status, String error, String message, String path) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }
    
    // Builder pattern
    public static ErrorResponseBuilder builder() {
        return new ErrorResponseBuilder();
    }
    
    public static class ErrorResponseBuilder {
        private String timestamp;
        private int status;
        private String error;
        private String message;
        private String path;
        
        public ErrorResponseBuilder timestamp(String timestamp) {
            this.timestamp = timestamp;
            return this;
        }
        
        public ErrorResponseBuilder status(int status) {
            this.status = status;
            return this;
        }
        
        public ErrorResponseBuilder error(String error) {
            this.error = error;
            return this;
        }
        
        public ErrorResponseBuilder message(String message) {
            this.message = message;
            return this;
        }
        
        public ErrorResponseBuilder path(String path) {
            this.path = path;
            return this;
        }
        
        public ErrorResponse build() {
            return new ErrorResponse(timestamp, status, error, message, path);
        }
    }
    
    // getters and setters...
}
```

#### 9.4.3 Error Code Standards
```java
/**
 * Error code constants definition
 */
public class ErrorCodes {
    
    // Authentication related
    public static final String AUTH_FAILED = "AUTH_FAILED";
    public static final String TOKEN_EXPIRED = "TOKEN_EXPIRED";
    public static final String ACCESS_DENIED = "ACCESS_DENIED";
    
    // Data validation related
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    public static final String EMAIL_EXISTS = "EMAIL_EXISTS";
    public static final String INVALID_PASSWORD = "INVALID_PASSWORD";
    
    // Resource related
    public static final String RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";
    public static final String RESOURCE_CONFLICT = "RESOURCE_CONFLICT";
    
    // System related
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";
    public static final String SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";
}
```

#### 9.4.4 Complete Error Handling Example
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    /**
     * Handle data validation exceptions
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException e, HttpServletRequest request) {
        
        List<String> errors = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.toList());
            
        String message = "Data validation failed: " + String.join(", ", errors);
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(HttpStatus.BAD_REQUEST.value())
            .error(ErrorCodes.VALIDATION_FAILED)
            .message(message)
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.badRequest().body(error);
    }
}
```

### 9.5 Exception Handling Best Practices

#### 9.5.1 Logging Strategy
```java
// ✅ Correct: Log business exceptions at WARN level
logger.warn("User login failed: email={}, reason={}", email, "Password incorrect");

// ✅ Correct: Log system exceptions at ERROR level with complete stack
logger.error("Database connection exception: {}", e.getMessage(), e);

// ❌ Incorrect: Do not log business exceptions at ERROR level in business layer
logger.error("User does not exist: {}", email); // This should be WARN level
```

#### 9.5.2 Exception Message Internationalization
```java
@Component
public class MessageSourceUtil {
    
    @Autowired
    private MessageSource messageSource;
    
    public String getMessage(String code, Object... args) {
        return messageSource.getMessage(code, args, LocaleContextHolder.getLocale());
    }
}

// Usage example
throw new BusinessException("EMAIL_EXISTS", 
    messageSourceUtil.getMessage("error.email.exists", request.getEmail()));
```

#### 9.5.3 Security Considerations
```java
// ✅ Correct: Do not expose internal system information
throw new AuthenticationException("Username or password incorrect");

// ❌ Incorrect: Exposes information about whether user exists
throw new AuthenticationException("User does not exist");

// ✅ Correct: Generic error message
return ErrorResponse.builder()
    .message("Internal system error, please try again later")
    .build();

// ❌ Incorrect: Exposes internal system exception information
return ErrorResponse.builder()
    .message("SQL connection timeout: " + e.getMessage())
    .build();
```

## 10. Code Format and Structure

### 10.1 Import Order
```java
// 1. Java standard library
import java.time.LocalDateTime;
import java.util.List;

// 2. Third-party libraries
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

// 3. Project internal packages
import com.usyd.catams.dto.AuthResult;
import com.usyd.catams.entity.User;
```

### 10.2 Class Structure Order
```java
public class UserServiceImpl implements UserService {
    
    // 1. Static constants
    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);
    private static final int MAX_LOGIN_ATTEMPTS = 3;
    
    // 2. Instance variables (dependency injection)
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    // 3. Constructors
    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
    
    // 4. Public methods (interface implementations)
    @Override
    public AuthResult authenticate(AuthenticationRequest credentials) {
        // Implementation...
    }
    
    // 5. Private helper methods
    private void validateCredentials(AuthenticationRequest credentials) {
        // Implementation...
    }
}
```

---

**Document Version**: v1.1  
**Creation Date**: 2025-08-01  
**Update Date**: 2025-08-01  
**Scope**: All CATAMS project development  
**Mandatory Enforcement**: All code must pass code review checks against these standards
