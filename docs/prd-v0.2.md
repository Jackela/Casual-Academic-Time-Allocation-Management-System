# Product Requirements Document (PRD) - v0.2 (Draft)

## 1. Overview

### 1.1 Project Background

The Casual Academic Time Allocation Management System (CATAMS) `[cite: 520]` aims to address efficiency issues in managing casual tutor time allocation within academic institutions. Current time management processes typically rely on paper forms or scattered spreadsheets, leading to information opacity, chaotic approval processes, and difficulties in budget control.

The core value of the CATAMS system lies in helping course coordinators, casual tutors, and HR teams clearly and intuitively input and review time allocation data `[cite: 529]`, improving the accuracy and efficiency of time management through digitized processes, ensuring transparent budget usage and effective control.

### 1.2 Project Objectives

Establish a clear, reliable, and intuitive time management system prototype to validate core workflows. Specific objectives include:

- Simplify time entry processes and reduce human errors
- Establish transparent approval mechanisms to ensure data accuracy
- Provide real-time budget monitoring and usage analysis
- Implement automated notification and review processes
- Lay a solid foundation for future system expansion

## 2. User Personas & Key Scenarios

### 2.1 Lecturer

**Core Requirements:** Quickly input and approve tutor time allocations, overview budget usage.

**Typical Scenarios:**
- Batch input of all tutors' work hours and task descriptions for the week every weekend
- Review and approve time modification requests submitted by tutors
- Monitor course budget usage and remaining budget through dashboard
- Confirm final time data and proceed to HR review stage

**Pain Points:**
- Need to handle time data for multiple tutors, prone to errors
- Lack real-time understanding of budget usage
- Approval process lacks transparency, high communication costs

### 2.2 Casual Tutor

**Core Requirements:** View own time records and initiate modification requests for incorrect entries.

**Typical Scenarios:**
- Log into system to view time records entered by lecturers
- Submit modification requests with explanations when time records are incorrect
- Track approval status of modification requests
- View historical time records and salary calculations

**Pain Points:**
- Cannot timely access time entry information
- Lack effective communication and correction mechanisms when errors are found
- Lack transparency in time approval processes

### 2.3 HR Team

**Core Requirements:** Receive notifications and conduct final reviews at the final stage of the process.

**Typical Scenarios:**
- Receive automatically sent time review notifications from the system
- Review time data confirmed by both lecturers and tutors
- Conduct final review and confirm salary payments
- Generate salary reports and budget usage reports

**Pain Points:**
- Lack unified entry point for time data
- Difficulty tracking completeness of approval processes
- Manual salary calculation processing prone to errors

## 3. Core User Stories (Based on Assumed Requirements)

### 3.1 Time Entry Function
- As a lecturer, I want to be able to enter time allocation weekly for each tutor `[cite: 531]`, including work description, hours, and salary rate, so that I can accurately record tutors' workload.

### 3.2 Time Viewing Function
- As a tutor, I want to be able to log into the system to view all time records related to me `[cite: 532]`, so that I can understand my work hours and salary situation.

### 3.3 Modification Request Function
- As a tutor, I want to be able to propose modifications to a time record and submit it to the lecturer for review `[cite: 535]`, so that I can correct possible errors.

### 3.4 Approval Management Function
- As a lecturer, I want to be able to see tutors' modification requests and choose to "approve" or "reject" `[cite: 535]`, so that I can maintain the accuracy of time data.

### 3.5 Budget Monitoring Function
- As a lecturer, I want to be able to see each tutor's total hours, budget usage, and remaining situation on a dashboard `[cite: 536]`, so that I can reasonably allocate and control budget.

### 3.6 Automatic Notification Function
- When time allocation is confirmed by both me and the tutor, the system should automatically notify the HR team for final review `[cite: 533]`, so that the complete approval process can be completed.

## 4. Scope Definition (MoSCoW)

### 4.1 Must Have (This Release)
- User authentication and role permission management (lecturer, tutor, HR)
- Time entry function (supporting description, duration, rate)
- Time viewing and historical record function
- Modification request submission and approval process
- Basic dashboard (time summary, budget usage)
- Automatic notification mechanism (email notification to HR team)
- Data security and audit logs

### 4.2 Should Have (This Release)
- Batch time entry function
- Export function (PDF/Excel formats)
- Mobile adaptation
- Advanced search and filtering functions

### 4.3 Could Have (This Release)
- Time statistics charts and trend analysis
- Custom salary rate rules
- Multi-language support
- System configuration management interface

### 4.4 Won't Have (This Release)
- API integration with any external systems
- Complex report export and data analysis
- AI prediction functions
- Third-party single sign-on integration
- Advanced workflow engine

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

#### 5.1.1 Response Time
- **API Response Time:** 95% of API calls should respond within 500ms, 99% of calls within 1 second
- **Page Load Time:** Home page and main functional pages should load within 3 seconds
- **Database Queries:** Complex queries (such as dashboard data aggregation) should respond within 2 seconds
- **Batch Operations:** Batch time entry (≤50 records) processing time should be within 10 seconds

#### 5.1.2 Concurrent Processing Capability
- **Concurrent Users:** Support at least 100 concurrent users using the system simultaneously
- **Peak Processing:** Support 300 concurrent users during end-of-semester concentrated time entry periods
- **Database Connections:** Database connection pool should support at least 50 concurrent connections

#### 5.1.3 Throughput Requirements
- **Time Entry:** System should support processing at least 500 time records per minute
- **Approval Processing:** Should be able to process at least 100 approval operations per minute
- **Notification Sending:** Support sending at least 200 email notifications per minute

### 5.2 Security Requirements

#### 5.2.1 Authentication and Authorization
- **Multi-Factor Authentication:** Support email-based two-factor authentication mechanism
- **Session Management:** JWT Token validity period not exceeding 8 hours, supporting automatic renewal
- **Role-Based Access Control:** Strict role-based access control (RBAC), ensuring users can only access authorized resources
- **Password Policy:** Mandatory 8+ character passwords containing uppercase and lowercase letters, numbers, and special characters

#### 5.2.2 Data Security
- **Data Encryption:** All sensitive data (such as salary information) encrypted in database storage
- **Transmission Security:** API communication must use HTTPS protocol, TLS 1.2 or higher versions
- **Audit Logs:** Complete recording of all user operations, including login, data modifications, permission changes, etc.
- **Data Backup:** Daily automatic backup, encrypted backup data storage, retained for 30 days

#### 5.2.3 Input Validation and Protection
- **Input Validation:** Front-end and back-end dual validation to prevent malicious input and injection attacks
- **XSS Protection:** HTML escaping of output content to prevent cross-site scripting attacks
- **CSRF Protection:** Implement CSRF Token mechanism to prevent cross-site request forgery
- **SQL Injection Protection:** Use parameterized queries and ORM frameworks to prevent SQL injection

#### 5.2.4 Privacy Protection
- **Data Minimization:** Only collect and store necessary business data
- **Access Logs:** Record access logs for sensitive data for audit purposes
- **Data Anonymization:** Use anonymized test data in non-production environments

### 5.3 Availability Requirements

#### 5.3.1 System Availability
- **System Uptime:** 99.5% system availability (monthly downtime not exceeding 3.6 hours)
- **Planned Maintenance Window:** Maximum 4 hours of planned maintenance time per month, scheduled during non-working hours
- **Failure Recovery Time:** Service recovery within 4 hours after system failure

#### 5.3.2 Fault Tolerance
- **Data Redundancy:** Critical data using master-slave replication to ensure data safety
- **Service Degradation:** Non-critical functions can be temporarily degraded under high load conditions to ensure core functions operate normally
- **Error Handling:** Friendly error messages and recovery mechanisms to avoid user data loss

#### 5.3.3 Monitoring and Alerting
- **System Monitoring:** 24×7 system monitoring including service status, resource utilization, error rates, etc.
- **Performance Monitoring:** Real-time monitoring of key indicators such as API response time, database performance, memory usage
- **Automatic Alerting:** Automatic alert notifications to operations team when system anomalies occur

### 5.4 Scalability Requirements

#### 5.4.1 User Scale Expansion
- **User Growth:** System architecture should support user expansion from 100 to 1000+
- **Data Volume Growth:** Support data processing capability expansion from thousands to millions of records
- **Geographic Expansion:** Reserve multi-tenant and internationalization expansion capabilities

#### 5.4.2 Functional Module Expansion
- **Modular Design:** New functional modules can be independently developed and deployed
- **API Extension:** Provide standard REST APIs supporting third-party system integration
- **Plugin Mechanism:** Reserve plugin extension interfaces supporting custom business rules

### 5.5 Compatibility Requirements

#### 5.5.1 Browser Compatibility
- **Modern Browsers:** Support Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** Support mainstream mobile device browser access with responsive design
- **Screen Resolution:** Support display at 1024×768 resolution and above

#### 5.5.2 Operating System Compatibility
- **Server Side:** Support Linux (Ubuntu 20.04+, CentOS 8+)
- **Database:** PostgreSQL 13+ versions
- **Java Runtime Environment:** JDK 17+

---

**Document Version:** v0.2  
**Creation Date:** 2025-08-01  
**Update Date:** 2025-08-01  
**Owner:** Project Manager  
**Review Status:** Pending Review