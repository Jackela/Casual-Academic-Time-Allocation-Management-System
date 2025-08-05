# CATAMS - Casual Academic Time Allocation Management System

A comprehensive full-stack web application for managing casual academic staff time allocation, timesheet submission, and approval workflows at universities.

## 🎯 Project Overview

CATAMS streamlines the administrative processes for casual academic staff (tutors, demonstrators, markers) by providing:

- **Timesheet Management** - Digital submission and tracking
- **Approval Workflows** - Multi-level approval processes  
- **Role-Based Access** - Different interfaces for Tutors, Lecturers, and Administrators
- **Real-time Tracking** - Live status updates and notifications
- **Comprehensive Reporting** - Analytics and budget management

## 🏗️ Architecture

### Technology Stack

**Backend (Spring Boot):**
- Java 17 with Spring Boot 3.x
- Spring Security with JWT authentication
- Spring Data JPA with H2/PostgreSQL
- RESTful API design
- Comprehensive test suite (Unit, Integration, E2E)

**Frontend (React):**
- React 18 with TypeScript
- Vite for build tooling
- Axios for API communication
- Context API for state management
- 143 tests across Unit, Component, and E2E levels

**Development & Testing:**
- Maven for Java build management
- Vitest + React Testing Library for frontend testing
- Playwright for E2E automation
- ESLint and TypeScript for code quality

## 🚀 Quick Start

### Prerequisites

- **Java 17+** and Maven 3.6+
- **Node.js 18+** and npm
- **Git** for version control
- **Modern browser** (Chrome, Firefox, Safari, Edge)

### 1. Clone Repository

```bash
git clone <repository-url>
cd Casual-Academic-Time-Allocation-Management-System
```

### 2. Start Backend

```bash
# Start Spring Boot application
mvn spring-boot:run

# Alternative: Run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Backend will be available at `http://localhost:8080`

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 4. Login & Test

Open `http://localhost:5173` and login with test credentials:

- **👨‍💼 Admin**: `admin@example.com` / `Admin123!`
- **👩‍🏫 Lecturer**: `lecturer@example.com` / `Lecturer123!`  
- **👨‍🎓 Tutor**: `tutor@example.com` / `Tutor123!`

## 📁 Project Structure

```
CATAMS/
├── src/main/java/              # Spring Boot backend
│   └── com/usyd/catams/
│       ├── controller/         # REST API controllers
│       ├── service/           # Business logic layer
│       ├── repository/        # Data access layer
│       ├── entity/           # JPA entities
│       ├── dto/              # Data transfer objects
│       ├── config/           # Configuration classes
│       └── security/         # Authentication & authorization
│
├── src/test/java/             # Backend tests
│   ├── integration/          # Integration tests
│   ├── unit/                # Unit tests
│   └── contract/            # API contract tests
│
├── frontend/                  # React frontend application  
│   ├── src/                  # Source code
│   │   ├── components/       # React components
│   │   ├── contexts/        # React Context providers
│   │   ├── utils/           # Utility functions
│   │   └── config/          # Configuration files
│   ├── e2e/                 # End-to-end tests
│   │   ├── pages/           # Page Object Model
│   │   ├── workflows/       # User journey tests
│   │   └── tests/           # Integration tests
│   └── coverage/            # Test coverage reports
│
├── docs/                     # Project documentation
│   ├── architecture/        # Architecture documentation
│   ├── stories/             # User stories and requirements
│   └── testing/             # Testing guidelines
│
├── requirements/             # Project requirements and specs
├── pom.xml                  # Maven configuration  
└── README.md               # This file
```

## 🧪 Testing

### Comprehensive Test Coverage

**Backend Testing:**
- **Unit Tests** - Service and utility testing
- **Integration Tests** - Full workflow testing with test database
- **API Contract Tests** - REST endpoint validation
- **Performance Tests** - Load and stress testing

**Frontend Testing:**
- **Unit Tests (127)** - Utility and helper function testing
- **Component Tests (16)** - React component interaction testing  
- **E2E Tests (8 focused files)** - Critical user journey automation

### Running Tests

**Backend:**
```bash
# Run all backend tests
mvn test

# Run specific test categories
mvn test -Dtest="*IntegrationTest"
mvn test -Dtest="*UnitTest"

# Generate test coverage report
mvn jacoco:report
```

**Frontend:**
```bash
cd frontend

# Run all frontend tests
npm test

# Run specific test types
npm run test:unit      # Unit + Component tests
npm run test:e2e       # End-to-end tests
npm run test:watch     # Watch mode for development

# Generate coverage report
npm run test:coverage
```

## 🔧 Development

### Backend Development

```bash
# Start in development mode with hot reload
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Run with E2E testing profile
mvn spring-boot:run -Dspring-boot.run.profiles=e2e

# Build production JAR
mvn clean package
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Run linting and type checking
npm run lint
npm run type-check
```

### Environment Profiles

**Backend Profiles:**
- `dev` - Development with H2 database and detailed logging
- `test` - Testing with in-memory database
- `e2e` - E2E testing with test data initialization
- `prod` - Production configuration

**Frontend Environments:**
- Development: `http://localhost:8080` (default backend)
- Testing: `http://localhost:8084` (E2E backend)
- Production: Configurable via environment variables

## 📊 Features

### For Tutors/Casual Staff
- ⏰ Submit weekly timesheets
- 📝 Track work descriptions and hours
- 📋 View submission history and status
- 🔔 Receive approval notifications

### For Lecturers
- ✅ Review and approve timesheet submissions
- 📊 Monitor team workload and budgets
- 📈 Access detailed reporting dashboards
- 🎯 Manage course allocations

### For Administrators  
- 👥 Manage users and roles
- 📊 System-wide analytics and reporting
- ⚙️ Configure approval workflows
- 💰 Budget tracking and management

## 🔐 Security

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Authorization** - Granular permission system
- **Input Validation** - Comprehensive server-side validation
- **CORS Configuration** - Proper cross-origin resource sharing
- **SQL Injection Prevention** - Parameterized queries with JPA
- **XSS Protection** - Client-side sanitization

## 📚 Documentation

- [Architecture Documentation](./docs/architecture/)
- [API Documentation](./docs/openapi.yaml)
- [User Stories](./docs/stories/)
- [Testing Guidelines](./docs/testing/)
- [Frontend Documentation](./frontend/README.md)

## 🤝 Contributing

### Development Workflow

1. **Fork & Clone** - Create your own fork
2. **Create Branch** - Feature or bugfix branch from `main`
3. **Develop** - Implement changes with tests
4. **Test** - Ensure all tests pass
5. **Document** - Update relevant documentation
6. **Pull Request** - Submit with detailed description

### Code Standards

**Backend:**
- Follow Java naming conventions
- Use Spring Boot best practices
- Write comprehensive tests
- Document API endpoints

**Frontend:**
- Use TypeScript strict mode
- Follow React hooks patterns
- Add data-testid for E2E testing
- Maintain accessibility standards

### Commit Messages

Follow conventional commit format:
```
feat: add timesheet approval workflow
fix: resolve authentication token expiry
docs: update API documentation
test: add integration tests for approvals
```

## 🚢 Deployment

### Production Build

**Backend:**
```bash
mvn clean package -Pprod
java -jar target/catams-1.0.0.jar
```

**Frontend:**
```bash
cd frontend
npm run build
# Deploy dist/ directory to web server
```

### Environment Variables

**Backend:**
```properties
# Database configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/catams
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

# JWT configuration
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000
```

**Frontend:**
```env
VITE_API_BASE_URL=https://api.catams.university.edu
VITE_APP_NAME=CATAMS
VITE_APP_VERSION=1.0.0
```

## 📈 Performance

- **Backend** - Sub-200ms API response times
- **Frontend** - Lighthouse score 90+ across all metrics
- **Database** - Optimized queries with proper indexing
- **Caching** - Strategic caching for frequently accessed data

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check Java version (17+ required)
- Verify port 8080 is available
- Check database connection settings

**Frontend build fails:**
- Ensure Node.js 18+ is installed
- Clear node_modules and reinstall
- Check TypeScript configuration

**Tests failing:**
- Ensure backend is running for E2E tests
- Check test database configuration
- Verify all dependencies are installed

### Getting Help

1. Check existing [Issues](https://github.com/your-repo/issues)
2. Review documentation in `docs/`
3. Run tests to identify specific problems
4. Create detailed issue report

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏫 University of Sydney

Developed for the University of Sydney as part of the casual academic staff management system initiative.

---

**CATAMS v1.0** - *Streamlining academic workforce management* 🎓