# Architecture Design Document - v0.2 (Framework)

## 1. Core Design Philosophy

### 1.1 User-Centric
Clean interfaces with clear feedback. System design focuses on user experience, ensuring each role (lecturer, tutor, HR) can complete core tasks in the shortest time possible. Through intuitive UI design and clear operational workflows, reduce user learning costs and improve system adoption rates.

### 1.2 Internalized Workflow
Build an "opinionated system" that guides users through state-driven UI and enforced business rules. The system is not just a tool, but a digital embodiment of workflow processes, ensuring correct execution of business processes and data consistency through technical means.

### 1.3 Future-Proof
Architecture with evolutionary capability and configurable business logic. Adopt modular design and standardized interfaces to reserve sufficient flexibility for future functional expansion and system integration, avoiding large-scale refactoring due to requirement changes.

## 2. Architectural Strategy

### 2.1 Initial Architecture: Modular Monolith
Adopting a modular monolith architecture in the early project phase ensures development efficiency in single-developer projects while laying the foundation for future decoupling. This architecture has the following advantages:

- **High Development Efficiency:** Single codebase, convenient for debugging and deployment
- **Data Consistency:** Avoids complexity of distributed transactions
- **Simple Operations:** Single deployment unit, reduces operational complexity
- **Clear Module Boundaries:** Prepares for future microservices decomposition

### 2.2 Long-term Vision: Microservices
Clearly stated for addressing future potential independent evolution pace and elastic scaling requirements. When system scale expands, teams grow, or independent deployment is needed, the monolith can be decomposed into microservices based on module boundaries:

- **Independent Evolution:** Different modules can be independently developed and deployed
- **Technology Diversity:** Different services can adopt most suitable technology stacks
- **Elastic Scaling:** Independently scale specific services based on load conditions
- **Fault Isolation:** Single service failures do not affect the overall system

## 3. Technology Selection (Preliminary)

### 3.1 Backend Technology Stack
**Primary Choice:** Java with Spring Boot 3+  
**Rationale:** Ultimate stability, powerful ecosystem, and clear microservices evolution path, suitable for long-term development of enterprise applications. Spring Boot provides a complete enterprise development framework, including dependency injection, AOP, transaction management, security framework, etc., very suitable for building maintainable and scalable systems.

**Technology Components:**
- Spring Boot 3.x (Core Framework)
- Spring Security (Authentication & Authorization)
- Spring Data JPA (Data Access Layer)
- Spring Web MVC (REST API)
- Spring Boot Actuator (Monitoring & Management)

### 3.2 Database
**Primary Choice:** PostgreSQL  
**Rationale:** Stability and ACID characteristics of relational databases, better suited for complex business logic and data consistency requirements. PostgreSQL provides powerful data type support, complex query capabilities, and transaction processing mechanisms, ensuring accuracy and consistency of time allocation and approval data.

**Feature Advantages:**
- ACID transactions guarantee data consistency
- Rich data types and constraint support
- Powerful query optimizer
- Good concurrency control mechanism

### 3.3 Frontend Technology
**Choice:** React.js with TypeScript  
**Rationale:** Component-based development, strong type support, rich UI component library

### 3.4 Deployment Strategy
**Development Environment:** Docker containerization, local Docker-Compose usage  
**Production Environment:** Cloud target AWS ECS or similar container services  
**CI/CD:** GitHub Actions automated build and deployment

## 4. Module Boundaries Definition

### 4.1 User Module
**Responsibility:** Manages users, roles, and permissions
**Core Functions:**
- User authentication and authorization
- Role-based access control (lecturer, tutor, HR)
- User information management
- Session management

**Interface Definition:**
```java
public interface UserService {
    AuthResult authenticate(AuthenticationRequest credentials);
    boolean authorize(User user, String resource, String action);
    Optional<UserProfile> getUserProfile(Long userId);
    void updateUserProfile(Long userId, UserProfileUpdateRequest profile);
    List<User> getUsersByRole(UserRole role);
    void deactivateUser(Long userId);
}

public class AuthenticationRequest {
    private String email;
    private String password;
    // getters and setters
}

public class AuthResult {
    private boolean success;
    private String token;
    private User user;
    private String errorMessage;
    // getters and setters
}
```

### 4.2 Timesheet Module
**Responsibility:** Manages CRUD operations for time allocation records
**Core Functions:**
- Create, query, update, delete time allocation records
- Time data validation and formatting
- Historical record management
- Batch operation support

**Interface Definition:**
```java
public interface TimesheetService {
    Long createTimesheet(TimesheetCreateRequest request);
    List<Timesheet> getTimesheets(TimesheetSearchFilter filters);
    Optional<Timesheet> getTimesheetById(Long timesheetId);
    void updateTimesheet(Long timesheetId, TimesheetUpdateRequest updates);
    void deleteTimesheet(Long timesheetId);
    List<Timesheet> getTimesheetsByUser(Long userId, LocalDate startDate, LocalDate endDate);
    BigDecimal calculateTotalPay(List<Timesheet> timesheets);
}

public class TimesheetCreateRequest {
    private Long tutorId;
    private Long courseId;
    private LocalDate weekStartDate;
    private BigDecimal hours;
    private BigDecimal hourlyRate;
    private String description;
    // getters and setters
}

public class TimesheetSearchFilter {
    private Long tutorId;
    private Long courseId;
    private LocalDate startDate;
    private LocalDate endDate;
    private ApprovalStatus status;
    private int page;
    private int size;
    // getters and setters
}
```

### 4.3 Approval Module
**Responsibility:** Manages the entire approval workflow state management
**Core Functions:**
- Approval process state machine management
- Modification request processing
- Approval history records
- Automatic process advancement

**Status Definition:**
```java
public enum ApprovalStatus {
    DRAFT("draft"),
    PENDING_TUTOR_REVIEW("pending_tutor_review"),
    TUTOR_APPROVED("tutor_approved"),
    MODIFICATION_REQUESTED("modification_requested"),
    PENDING_HR_REVIEW("pending_hr_review"),
    FINAL_APPROVED("final_approved"),
    REJECTED("rejected");
    
    private final String value;
    
    ApprovalStatus(String value) {
        this.value = value;
    }
    
    public String getValue() {
        return value;
    }
}

public interface ApprovalService {
    Long submitForApproval(Long timesheetId, Long submitterId);
    void approveTimesheet(Long timesheetId, Long approverId, String comment);
    void rejectTimesheet(Long timesheetId, Long approverId, String reason);
    void requestModification(Long timesheetId, Long requesterId, String modifications);
    List<Timesheet> getPendingApprovals(Long approverId);
    List<ApprovalHistory> getApprovalHistory(Long timesheetId);
    boolean canUserApprove(Long userId, Long timesheetId);
}
```

### 4.4 Notification Module
**Responsibility:** Manages sending of email and other notifications
**Core Functions:**
- Email notification sending
- Notification template management
- Sending status tracking
- Batch notification processing

**Interface Definition:**
```java
public interface NotificationService {
    void sendNotification(NotificationRequest request);
    void sendBulkNotifications(List<NotificationRequest> requests);
    List<NotificationHistory> getNotificationHistory(Long userId);
    void markAsRead(Long notificationId);
    List<NotificationTemplate> getAvailableTemplates();
}

public class NotificationRequest {
    private Long recipientId;
    private NotificationType type;
    private String subject;
    private String content;
    private Map<String, Object> templateData;
    private NotificationPriority priority;
    // getters and setters
}

public enum NotificationType {
    EMAIL, SMS, IN_APP_NOTIFICATION
}
```

### 4.5 Dashboard Module
**Responsibility:** Manages data aggregation and display
**Core Functions:**
- Time allocation statistics and summaries
- Budget usage analysis
- Real-time data display
- Report generation

**Interface Definition:**
```java
public interface DashboardService {
    DashboardSummary getDashboardSummary(Long userId, UserRole role);
    BudgetUsageReport getBudgetUsage(Long courseId, String semester);
    List<TimesheetSummary> getTimesheetSummaries(TimesheetSummaryFilter filter);
    WorkloadAnalysis getWorkloadAnalysis(Long tutorId, LocalDate startDate, LocalDate endDate);
    List<PendingItem> getPendingItems(Long userId);
}

public class DashboardSummary {
    private int totalTimesheets;
    private int pendingApprovals;
    private BigDecimal totalHours;
    private BigDecimal totalPay;
    private List<RecentActivity> recentActivities;
    // getters and setters
}
```

## 5. Strategy Pattern Design for Core Business Logic

### 5.1 ApprovalStrategy Interface
Handles different types of approval logic, supporting future extension of different approval rules:

```java
public interface ApprovalStrategy {
    boolean canApprove(User user, Timesheet timesheet);
    ApprovalResult approve(User user, Timesheet timesheet, String comment);
    List<User> getNextApprovers(Timesheet timesheet);
    ValidationResult validateApproval(ApprovalRequest approval);
    ApprovalStatus getNextStatus(ApprovalStatus currentStatus, ApprovalAction action);
}

@Component
public class LecturerApprovalStrategy implements ApprovalStrategy {
    @Override
    public boolean canApprove(User user, Timesheet timesheet) {
        return user.getRole() == UserRole.LECTURER && 
               timesheet.getCourse().getLecturerId().equals(user.getId());
    }
    
    @Override
    public ApprovalResult approve(User user, Timesheet timesheet, String comment) {
        // Implement lecturer approval logic
        return ApprovalResult.builder()
            .success(true)
            .nextStatus(ApprovalStatus.TUTOR_APPROVED)
            .comment(comment)
            .build();
    }
}

@Component
public class HRApprovalStrategy implements ApprovalStrategy {
    @Override
    public boolean canApprove(User user, Timesheet timesheet) {
        return user.getRole() == UserRole.HR && 
               timesheet.getStatus() == ApprovalStatus.PENDING_HR_REVIEW;
    }
    
    // Implement HR final approval logic
}
```

### 5.2 PayRateStrategy Interface
Manages different salary calculation rules, supporting flexible rate configuration:

```java
public interface PayRateStrategy {
    BigDecimal calculatePay(BigDecimal hours, BigDecimal hourlyRate, PayCalculationContext context);
    boolean validateRate(BigDecimal rate, User user, Course course);
    List<PayRate> getApplicableRates(User user, Course course);
    PayRateType getSupportedType();
}

public class PayCalculationContext {
    private LocalDate workDate;
    private Course course;
    private User tutor;
    private Map<String, Object> additionalParameters;
    // getters and setters
}

@Component
public class StandardPayRateStrategy implements PayRateStrategy {
    @Override
    public BigDecimal calculatePay(BigDecimal hours, BigDecimal hourlyRate, PayCalculationContext context) {
        return hours.multiply(hourlyRate);
    }
    
    @Override
    public PayRateType getSupportedType() {
        return PayRateType.STANDARD;
    }
}

@Component
public class TieredPayRateStrategy implements PayRateStrategy {
    @Override
    public BigDecimal calculatePay(BigDecimal hours, BigDecimal hourlyRate, PayCalculationContext context) {
        // Tiered hourly calculation (such as overtime pay)
        BigDecimal regularHours = hours.min(BigDecimal.valueOf(40));
        BigDecimal overtimeHours = hours.subtract(regularHours).max(BigDecimal.ZERO);
        
        BigDecimal regularPay = regularHours.multiply(hourlyRate);
        BigDecimal overtimePay = overtimeHours.multiply(hourlyRate.multiply(BigDecimal.valueOf(1.5)));
        
        return regularPay.add(overtimePay);
    }
}
```

### 5.3 NotificationStrategy Interface
Supports multiple notification methods and templates, convenient for future expansion:

```java
public interface NotificationStrategy {
    NotificationResult send(NotificationRequest notification);
    boolean supports(NotificationType type);
    String formatMessage(String template, Map<String, Object> data);
    void validateNotificationRequest(NotificationRequest request);
}

public class NotificationResult {
    private boolean success;
    private String messageId;
    private String errorMessage;
    private LocalDateTime sentAt;
    // getters and setters
}

@Component
public class EmailNotificationStrategy implements NotificationStrategy {
    @Autowired
    private JavaMailSender mailSender;
    
    @Override
    public NotificationResult send(NotificationRequest notification) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            
            helper.setTo(notification.getRecipientEmail());
            helper.setSubject(notification.getSubject());
            helper.setText(formatMessage(notification.getTemplate(), notification.getTemplateData()), true);
            
            mailSender.send(message);
            
            return NotificationResult.builder()
                .success(true)
                .sentAt(LocalDateTime.now())
                .build();
        } catch (Exception e) {
            return NotificationResult.builder()
                .success(false)
                .errorMessage(e.getMessage())
                .build();
        }
    }
    
    @Override
    public boolean supports(NotificationType type) {
        return type == NotificationType.EMAIL;
    }
}

@Component
public class SMSNotificationStrategy implements NotificationStrategy {
    @Override
    public boolean supports(NotificationType type) {
        return type == NotificationType.SMS;
    }
    
    // SMS notification implementation (future expansion)
}
```

## 6. Data Model Design

### 6.1 Core Entity Relationships
```
User
├── id: ObjectId
├── email: String
├── name: String
├── role: Enum [LECTURER, TUTOR, HR]
└── isActive: Boolean

Course
├── id: ObjectId
├── name: String
├── code: String
├── lecturer: ObjectId (User)
├── budget: Number
└── semester: String

Timesheet
├── id: ObjectId
├── tutor: ObjectId (User)
├── course: ObjectId (Course)
├── weekStartDate: Date
├── hours: Number
├── rate: Number
├── description: String
├── status: Enum (ApprovalStatus)
└── approvals: [Approval]

Approval
├── id: ObjectId
├── timesheet: ObjectId (Timesheet)
├── approver: ObjectId (User)
├── action: Enum [APPROVE, REJECT, REQUEST_MODIFICATION]
├── comment: String
└── timestamp: Date
```

## 7. Security Design

### 7.1 Authentication & Authorization
- JWT Token authentication mechanism
- Role-based access control (RBAC)
- API interface permission verification

### 7.2 Data Security
- Encrypted storage of sensitive data
- Audit log recording
- Data backup and recovery mechanisms

### 7.3 Input Validation
- Frontend and backend dual data validation
- SQL injection protection
- XSS attack protection

## 8. Non-Functional Requirements

### 8.1 Performance Requirements
- Response Time: API response time < 500ms
- Concurrent Support: Support 100+ concurrent users
- Data Loading: Page load time < 3 seconds

### 8.2 Availability Requirements
- System Availability: 99.5%
- Failure Recovery Time: < 4 hours
- Data Backup: Daily automatic backup

### 8.3 Scalability Requirements
- Horizontal scaling capability
- Modular deployment support
- Microservices evolution preparation

---

**Document Version:** v0.2  
**Creation Date:** 2025-08-01  
**Update Date:** 2025-08-01  
**Architect:** Technical Lead  
**Review Status:** Pending Technical Review