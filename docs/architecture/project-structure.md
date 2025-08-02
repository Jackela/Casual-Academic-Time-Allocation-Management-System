# Project Structure Document

## Purpose
Define the project's directory structure to facilitate AI file location and code generation.

*Standardized directory layout ensuring clear and consistent code organization*

## 1. Root Directory Structure

```
Casual-Academic-Time-Allocation-Management-System/
├── .bmad-core/                    # BMad tool configuration and templates
│   ├── core-config.yaml          # Core configuration file
│   ├── tasks/                     # Task definitions
│   ├── templates/                 # Code templates
│   └── checklists/               # Checklists
├── docs/                         # Project documentation
│   ├── architecture/             # Architecture design documents
│   ├── prd/                      # Product requirements documents
│   └── stories/                  # User story documents
├── src/                          # Source code directory
│   ├── main/                     # Main program source code
│   └── test/                     # Test code
├── target/                       # Maven build output (auto-generated)
├── .gitignore                    # Git ignore file configuration
├── docker-compose.yml            # Docker local environment configuration
├── Dockerfile                    # Docker container build file
├── pom.xml                       # Maven project configuration
└── README.md                     # Project documentation
```

## 2. Documentation Directory Structure (docs/)

```
docs/
├── architecture/                 # Architecture design documents
│   ├── tech-stack.md            # Technology stack document
│   ├── coding-standards.md      # Coding standards
│   ├── project-structure.md     # Project structure (this document)
│   ├── data-models.md           # Data model design
│   ├── api-specification.md     # API interface specification
│   └── security-design.md       # Security design document
├── prd/                         # Product requirements documents
│   ├── prd-v0.2.md             # Product requirements document
│   └── epic-*.md               # Epic requirements documents
├── stories/                     # User stories
│   ├── 1.1.story.md            # User story files
│   ├── 1.2.story.md
│   └── ...
└── deployment/                  # Deployment related documents
    ├── local-setup.md          # Local environment setup
    ├── production-deploy.md    # Production environment deployment
    └── docker-guide.md         # Docker usage guide
```

## 3. Backend Source Code Structure (src/main/java/com/usyd/catams)

### 3.1 Complete Directory Tree
```
src/main/java/com/usyd/catams/
├── CatamsApplication.java        # Spring Boot main application class
├── config/                      # Spring configuration classes
│   ├── SecurityConfig.java     # Spring Security configuration
│   ├── JpaConfig.java          # JPA database configuration
│   ├── WebConfig.java          # Web MVC configuration
│   └── ApplicationConfig.java   # Application general configuration
├── controller/                  # REST API controllers
│   ├── AuthController.java     # Authentication related APIs
│   ├── UserController.java     # User management APIs
│   ├── TimesheetController.java # Timesheet management APIs
│   ├── ApprovalController.java  # Approval workflow APIs
│   └── DashboardController.java # Dashboard APIs
├── dto/                        # Data Transfer Objects
│   ├── request/                # Request DTOs
│   │   ├── AuthenticationRequest.java
│   │   ├── UserCreateRequest.java
│   │   ├── TimesheetCreateRequest.java
│   │   └── ApprovalRequest.java
│   ├── response/               # Response DTOs
│   │   ├── AuthResult.java
│   │   ├── UserResponse.java
│   │   ├── TimesheetResponse.java
│   │   └── DashboardSummary.java
│   └── common/                 # Common DTOs
│       ├── ErrorResponse.java
│       ├── PageResponse.java
│       └── ApiResponse.java
├── entity/                     # JPA entities (database table mapping)
│   ├── User.java              # User entity
│   ├── Course.java            # Course entity
│   ├── Timesheet.java         # Timesheet entity
│   ├── Approval.java          # Approval entity
│   └── AuditableEntity.java   # Auditable base class
├── enums/                      # Enum types
│   ├── UserRole.java          # User role enum
│   ├── ApprovalStatus.java    # Approval status enum
│   ├── NotificationType.java  # Notification type enum
│   └── PayRateType.java       # Pay rate type enum
├── exception/                  # Custom exception classes
│   ├── BusinessException.java       # 业务异常基类
│   ├── ResourceNotFoundException.java # 资源未找到异常
│   ├── AuthenticationException.java  # 认证异常
│   ├── AuthorizationException.java   # 授权异常
│   └── ValidationException.java     # 数据验证异常
├── repository/                 # Spring Data JPA Repository
│   ├── UserRepository.java    # 用户数据访问
│   ├── CourseRepository.java  # 课程数据访问
│   ├── TimesheetRepository.java # 工时记录数据访问
│   └── ApprovalRepository.java # 审批记录数据访问
├── service/                    # 业务逻辑服务接口
│   ├── UserService.java       # 用户服务接口
│   ├── TimesheetService.java  # 工时服务接口
│   ├── ApprovalService.java   # 审批服务接口
│   ├── NotificationService.java # 通知服务接口
│   └── DashboardService.java  # 仪表盘服务接口
├── service/impl/              # 服务接口实现类
│   ├── UserServiceImpl.java   # 用户服务实现
│   ├── TimesheetServiceImpl.java # 工时服务实现
│   ├── ApprovalServiceImpl.java  # 审批服务实现
│   ├── EmailNotificationServiceImpl.java # 邮件通知服务实现
│   └── DashboardServiceImpl.java # 仪表盘服务实现
├── strategy/                   # 策略模式实现
│   ├── approval/              # 审批策略
│   │   ├── ApprovalStrategy.java      # 审批策略接口
│   │   ├── LecturerApprovalStrategy.java # 讲师审批策略
│   │   └── HRApprovalStrategy.java    # HR审批策略
│   ├── payrate/               # 薪资计算策略
│   │   ├── PayRateStrategy.java       # 薪资策略接口
│   │   ├── StandardPayRateStrategy.java # 标准薪资策略
│   │   └── TieredPayRateStrategy.java # 分层薪资策略
│   └── notification/          # 通知策略
│       ├── NotificationStrategy.java  # 通知策略接口
│       ├── EmailNotificationStrategy.java # 邮件通知策略
│       └── SmsNotificationStrategy.java   # 短信通知策略
├── security/                   # 安全相关组件
│   ├── JwtTokenProvider.java  # JWT令牌提供者
│   ├── JwtAuthenticationFilter.java # JWT认证过滤器
│   ├── CustomUserDetailsService.java # 用户详情服务
│   └── SecurityUtils.java     # 安全工具类
├── util/                      # 工具类
│   ├── DateUtils.java         # 日期工具类
│   ├── ValidationUtils.java   # 验证工具类
│   ├── StringUtils.java       # 字符串工具类
│   └── JsonUtils.java         # JSON处理工具类
└── validation/                # 自定义验证注解
    ├── EmailValidator.java    # 邮箱验证器
    ├── PasswordValidator.java # 密码验证器
    └── UniqueEmail.java       # 唯一邮箱验证注解
```

### 3.2 Detailed Package Descriptions

#### 3.2.1 config/ - Spring Configuration Classes
**Purpose**: Store various Spring framework configuration classes
- **SecurityConfig.java**: Spring Security configuration including JWT authentication, CORS, CSRF, etc.
- **JpaConfig.java**: JPA and database related configuration
- **WebConfig.java**: Web MVC configuration including message converters, interceptors, etc.
- **ApplicationConfig.java**: Application-level Bean configuration

#### 3.2.2 controller/ - REST API Controllers
**Purpose**: Handle HTTP requests and define REST API endpoints
- Follow RESTful design principles
- 只负责请求处理和响应，不包含业务逻辑
- 使用@RestController注解
- 统一使用ResponseEntity返回响应

#### 3.2.3 dto/ - 数据传输对象
**作用**: 定义API请求和响应的数据结构
- **request/**: 存放API请求对象，包含验证注解
- **response/**: 存放API响应对象
- **common/**: 存放通用的响应格式
- 使用javax.validation注解进行数据验证

#### 3.2.4 entity/ - JPA实体类
**作用**: 映射数据库表结构
- 使用JPA注解进行ORM映射
- 继承AuditableEntity获得审计字段
- 遵循数据库设计规范
- 包含必要的关联关系定义

#### 3.2.5 enums/ - 枚举类型
**作用**: 定义系统中使用的枚举常量
- **UserRole**: 用户角色（LECTURER, TUTOR, HR）
- **ApprovalStatus**: 审批状态（DRAFT, PENDING, APPROVED等）
- 提供类型安全和代码可读性

#### 3.2.6 exception/ - 自定义异常
**作用**: 定义业务相关的异常类型
- 继承RuntimeException或其子类
- 配合@RestControllerAdvice进行全局异常处理
- 提供明确的错误码和错误信息

#### 3.2.7 repository/ - 数据访问层
**作用**: 定义数据访问接口
- 继承JpaRepository或其他Spring Data接口
- 定义自定义查询方法
- 使用@Query注解编写复杂查询

#### 3.2.8 service/ 和 service/impl/ - 业务逻辑层
**作用**: 实现核心业务逻辑
- **service/**: 定义业务服务接口
- **service/impl/**: 实现业务服务接口
- 使用@Service注解
- 处理事务管理和业务规则

#### 3.2.9 strategy/ - 策略模式实现
**作用**: 实现可扩展的业务策略
- **approval/**: 不同类型的审批策略
- **payrate/**: 不同的薪资计算策略  
- **notification/**: 不同的通知发送策略
- 使用@Component注解注册为Spring Bean

#### 3.2.10 security/ - 安全组件
**作用**: 实现认证和授权相关功能
- JWT令牌的生成、验证和管理
- 自定义认证过滤器
- 用户详情加载服务

#### 3.2.11 util/ - 工具类
**作用**: 提供通用的工具方法
- 日期处理、字符串操作、JSON转换等
- 使用静态方法，无状态设计
- 提高代码复用性

#### 3.2.12 validation/ - 自定义验证
**作用**: 实现业务相关的数据验证
- 自定义验证注解和验证器
- 配合Bean Validation框架使用

## 4. 测试代码结构 (src/test/java/com/usyd/catams)

```
src/test/java/com/usyd/catams/
├── CatamsApplicationTests.java   # Spring Boot启动测试
├── controller/                   # 控制器集成测试
│   ├── AuthControllerTest.java
│   ├── UserControllerTest.java
│   └── TimesheetControllerTest.java
├── service/                     # 服务层单元测试
│   ├── UserServiceImplTest.java
│   ├── TimesheetServiceImplTest.java
│   └── ApprovalServiceImplTest.java
├── repository/                  # 数据访问层测试
│   ├── UserRepositoryTest.java
│   └── TimesheetRepositoryTest.java
├── security/                    # 安全组件测试
│   ├── JwtTokenProviderTest.java
│   └── JwtAuthenticationFilterTest.java
├── util/                       # 工具类测试
│   ├── DateUtilsTest.java
│   └── ValidationUtilsTest.java
└── integration/                # 集成测试
    ├── AuthIntegrationTest.java
    ├── TimesheetIntegrationTest.java
    └── TestConfig.java         # 测试配置
```

## 5. 资源文件结构 (src/main/resources)

```
src/main/resources/
├── application.yml              # Spring Boot主配置文件
├── application-dev.yml          # 开发环境配置
├── application-test.yml         # 测试环境配置
├── application-prod.yml         # 生产环境配置
├── db/                         # 数据库相关
│   └── migration/              # Flyway数据库迁移脚本
│       ├── V1__Create_users_table.sql
│       ├── V2__Create_courses_table.sql
│       ├── V3__Create_timesheets_table.sql
│       └── V4__Create_approvals_table.sql
├── templates/                  # 模板文件
│   └── email/                  # 邮件模板
│       ├── approval-notification.html
│       └── password-reset.html
├── static/                     # 静态资源
│   ├── css/
│   ├── js/
│   └── images/
└── logback-spring.xml          # 日志配置文件
```

## 6. 配置文件结构

### 6.1 Maven配置 (pom.xml)
项目的依赖管理、构建配置和插件配置

### 6.2 Docker配置
- **Dockerfile**: 应用容器构建配置
- **docker-compose.yml**: 本地开发环境多服务编排

### 6.3 Spring Boot配置
- **application.yml**: 主配置文件
- **application-{profile}.yml**: 环境特定配置

## 7. 文件命名约定

### 7.1 Java类文件
- **Entity**: `{EntityName}.java` (如 User.java)
- **Controller**: `{ResourceName}Controller.java` (如 UserController.java)
- **Service**: `{DomainName}Service.java` 和 `{DomainName}ServiceImpl.java`
- **Repository**: `{EntityName}Repository.java`
- **DTO**: `{Purpose}{EntityName}.java` (如 UserCreateRequest.java)
- **Exception**: `{SpecificName}Exception.java`

### 7.2 测试文件
- **单元测试**: `{ClassName}Test.java`
- **集成测试**: `{FeatureName}IntegrationTest.java`

### 7.3 配置文件
- **Spring配置**: `{PurposeName}Config.java`
- **数据库迁移**: `V{version}__{description}.sql`

## 8. 代码组织原则

### 8.1 分层原则
严格按照分层架构组织代码：
```
Controller -> Service -> Repository -> Database
     ^           ^
     |           |
    DTO      Entity
```

### 8.2 依赖方向
- 上层可以依赖下层，下层不能依赖上层
- 同层之间尽量避免循环依赖
- 通过接口实现解耦

### 8.3 Modularization Principles  
- Organize code by functional modules
- High cohesion within each module
- Low coupling between modules
- Facilitate future microservices decomposition

---

**Document Version**: v1.0  
**Creation Date**: 2025-08-01  
**Applicable Project**: CATAMS (Casual Academic Time Allocation Management System)  
**Maintainer**: Development Team