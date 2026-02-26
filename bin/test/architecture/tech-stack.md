# Technology Stack Document

## Purpose
Define the core technology stack used in the project, serving as the basis for AI dependency selection and code generation.

*Generated based on architecture-v0.2.md*

## 1. Backend

### 1.1 Language
- **Java 17+**
  - Use the latest LTS version to gain latest language features and performance optimizations
  - Support for Records, Pattern Matching, Text Blocks and other modern Java features
  - Provide better garbage collection and memory management

### 1.2 Framework
- **Spring Boot 3.x**
  - Core application framework providing auto-configuration and convention over configuration
  - Integrates Spring ecosystem best practices
  - Supports reactive programming and cloud-native features

### 1.3 Core Components

#### Spring Security
- **Purpose**: Authentication and Authorization
- **Functions**: 
  - JWT Token authentication mechanism
  - Role-based access control (RBAC)
  - BCrypt password encryption
  - CSRF and XSS protection

#### Spring Data JPA
- **Purpose**: Data Access Layer
- **Functions**:
  - ORM object-relational mapping
  - Repository pattern implementation
  - Declarative transaction management
  - Automatic database query generation

#### Spring Web MVC
- **Purpose**: REST API Development
- **Functions**:
  - RESTful API design
  - JSON serialization/deserialization
  - Unified exception handling
  - Request validation and binding

#### Spring Boot Actuator
- **Purpose**: Monitoring and Management
- **Functions**:
  - Application health checks
  - Performance metrics collection
  - Runtime monitoring
  - Management endpoint exposure

## 2. Database

### 2.1 Type
- **Relational Database**
  - ACID transactions guarantee data consistency
  - Strong data constraints and integrity
  - Complex query and multi-table join support

### 2.2 Product
- **PostgreSQL 13+**
  - Enterprise-level stability and reliability
  - Rich data type support
  - Powerful query optimizer
  - Excellent concurrency control mechanism
  - JSON and NoSQL feature support

**Why Choose PostgreSQL:**
- SQL standard compliant with good compatibility
- Supports high concurrent read/write operations
- Provides complete ACID transaction support
- Rich index types and query optimization
- Active open-source community and long-term support

## 3. Frontend

### 3.1 Framework
- **React.js**
  - Component-based development model
  - Virtual DOM provides high performance
  - Rich ecosystem and community support
  - Flexible state management options

### 3.2 Language
- **TypeScript**
  - Static type checking reduces runtime errors
  - Better IDE support and code hints
  - Enhanced code readability and maintainability
  - Perfect integration with React

## 4. Deployment & DevOps

### 4.1 Containerization
- **Docker**
  - Application containerized deployment
  - Environment consistency guarantee
  - Simplified deployment and scaling processes
  - Resource isolation and management

### 4.2 Local Development Environment
- **Docker-Compose**
  - Multi-service orchestration and management
  - Rapid local development environment setup
  - Database and dependency service containerization
  - Development environment standardization

### 4.3 Cloud Deployment
- **AWS ECS (Elastic Container Service)**
  - Managed container orchestration service
  - Auto-scaling and load balancing
  - High availability and fault recovery
  - Integration with AWS ecosystem

### 4.4 CI/CD
- **GitHub Actions**
  - Automated build and testing
  - Code quality checks
  - Automated deployment processes
  - Integration testing and release management

## 5. Development Tools and Dependency Management

### 5.1 Build Tools
- **Maven**
  - Project dependency management
  - Standardized build processes
  - Plugin ecosystem
  - Multi-module project support

### 5.2 Testing Frameworks
- **JUnit 5**: Unit testing framework
- **Mockito**: Mock objects and testing assistance
- **TestContainers**: Integration testing containerization
- **Spring Boot Test**: Spring environment integration testing
- **AssertJ**: Fluent assertion library

### 5.3 Code Quality Tools
- **SpotBugs**: Static code analysis
- **Checkstyle**: Code style checking
- **JaCoCo**: Test coverage reporting
- **SonarQube**: Code quality analysis platform

### 5.4 Development Dependencies
- **Lombok**: Reduce boilerplate code
- **MapStruct**: Object mapping tool
- **Swagger/OpenAPI**: API documentation generation
- **Jackson**: JSON processing
- **Hibernate Validator**: Data validation

## 6. Data Access and Persistence

### 6.1 ORM Framework
- **Hibernate**: JPA implementation, object-relational mapping
- **Spring Data JPA**: Simplify data access layer development

### 6.2 Database Connection
- **HikariCP**: High-performance database connection pool
- **PostgreSQL JDBC Driver**: Database driver

### 6.3 Data Migration
- **Flyway**: Database version control and migration tool

## 7. Security and Authentication

### 7.1 Authentication & Authorization
- **Spring Security**: Security framework
- **JWT (JSON Web Token)**: Stateless authentication
- **BCrypt**: Password hashing algorithm

### 7.2 Data Protection
- **HTTPS/TLS**: Transport layer security
- **Spring Security CSRF**: Cross-site request forgery protection
- **Spring Security XSS**: Cross-site scripting attack protection

## 8. Monitoring and Logging

### 8.1 Application Monitoring
- **Spring Boot Actuator**: Application health monitoring
- **Micrometer**: Application metrics collection

### 8.2 Log Management
- **SLF4J**: Logging facade
- **Logback**: Logging implementation
- **Structured Logging**: JSON format log output

---

**Document Version**: v1.0  
**Creation Date**: 2025-08-01  
**Based on**: architecture-v0.2.md  
**Maintainer**: Development Team