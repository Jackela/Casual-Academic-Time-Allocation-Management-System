# CATAMS Frontend

React + TypeScript frontend for the Casual Academic Time Allocation Management System (CATAMS).

## 🚀 Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 18** - Modern React with hooks and Context API
- 🔷 **TypeScript** - Full type safety and excellent developer experience
- 🎨 **Modern CSS** - Clean, responsive design with CSS Grid and Flexbox
- 🔐 **Authentication** - Complete auth flow with JWT tokens and protected routes
- 📡 **Axios** - HTTP client for API calls with interceptors
- 🧪 **Comprehensive Testing** - 143 tests across unit, component, and E2E levels
- 📊 **Dashboard** - Role-based dashboards for Lecturers, Tutors, and Admins
- ⏰ **Timesheet Management** - Create, submit, and approve timesheets
- ✅ **Approval Workflow** - Multi-step approval process for timesheet submissions

## Getting Started

### Prerequisites

- **Node.js 18+** and npm (or yarn/pnpm)
- **CATAMS backend** running on `http://localhost:8080` (default) or `http://localhost:8084` (E2E testing)
- **Modern browser** with ES2020 support

### Installation

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run linting
npm run lint
```

## 📁 Project Structure

```
src/
├── components/              # React components
│   ├── LoginPage.tsx       # Login form with authentication
│   ├── LecturerDashboard.tsx # Dashboard for lecturer role
│   ├── DashboardLayout.tsx  # Common layout wrapper
│   └── ProtectedRoute.tsx   # Route protection component
├── contexts/               # React Context providers
│   └── AuthContext.tsx     # Authentication state management
├── utils/                  # Utility functions
│   ├── auth.ts            # Authentication helpers
│   ├── formatters.ts      # Data formatting utilities
│   ├── validation.ts      # Form validation functions
│   └── storage-keys.ts    # LocalStorage key constants
├── config/                 # Configuration files
│   └── api.config.ts      # API endpoints and settings
├── test-utils/            # Testing utilities
│   └── TestProviders.tsx  # Test wrapper components
├── App.tsx                # Main application component
├── App.css               # Global application styles
├── index.css             # CSS reset and base styles
└── main.tsx              # Application entry point

e2e/                       # End-to-end tests
├── pages/                 # Page Object Model classes
│   ├── LoginPage.ts      # Login page interactions
│   ├── DashboardPage.ts  # Dashboard page interactions
│   ├── TimesheetPage.ts  # Timesheet page interactions
│   └── NavigationPage.ts # Navigation interactions
├── workflows/             # Critical user journey tests
└── tests/                # Integration and contract tests
```

## 🔌 API Integration

The frontend integrates with the CATAMS Spring Boot backend:

- **Development Base URL**: `http://localhost:8080`
- **E2E Testing Base URL**: `http://localhost:8084`
- **Auto-environment detection** based on `NODE_ENV` and `VITEST` variables

### 🔐 Authentication Flow

1. User navigates to login page
2. Form validates email and password client-side
3. Submits credentials to `POST /api/auth/login`
4. Backend validates and returns JWT token + user profile
5. Token stored in localStorage with user data
6. Protected routes become accessible
7. JWT token included in all subsequent API requests
8. Auto-redirect to intended page after login

### 📡 API Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/timesheets/pending-approval` - Pending timesheet approvals
- `POST /api/approvals` - Submit approval decisions
- `GET /api/dashboard/summary` - Dashboard statistics
- `GET /actuator/health` - Health check endpoint

## Development

### 📜 Available Scripts

**Development:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build optimized production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

**Testing:**
- `npm test` - Run all tests (unit + component + E2E)
- `npm run test:unit` - Run unit and component tests with Vitest
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage reports

**Quality Assurance:**
- `npm run type-check` - TypeScript type checking
- `npm run lint:fix` - Auto-fix ESLint issues

### 🌍 Environment Variables

Create environment files for different configurations:

**`.env` (Development):**
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_NAME=CATAMS
VITE_APP_VERSION=1.0.0

# Development flags
VITE_DEBUG_MODE=true
```

**`.env.test` (Testing):**
```env
# E2E Testing Configuration
VITE_API_BASE_URL=http://localhost:8084
NODE_ENV=test
```

**Environment Detection:**
The app automatically detects the environment and uses appropriate API URLs:
- **Development**: `http://localhost:8080`
- **Testing**: `http://localhost:8084` (when `NODE_ENV=test` or `VITEST=true`)
- **Production**: Uses `VITE_API_BASE_URL` or falls back to default

## 🧪 Testing

### Test Architecture

CATAMS frontend implements a comprehensive **Test Pyramid** approach:

```
🔺 E2E Tests (8 focused test files)
   ↳ Critical multi-step user journeys
   ↳ Page Object Model with stable data-testid selectors
   ↳ Real backend integration testing

🔺 Component Tests (16 comprehensive tests)
   ↳ LoginPage with all interaction scenarios
   ↳ Form validation and error handling
   ↳ Authentication flow testing

🔺 Unit Tests (127 focused tests)
   ↳ Utility functions and helpers
   ↳ Validation and formatting functions
   ↳ Authentication utilities
```

**Total: 143 tests with 100% pass rate**

### Testing Credentials

Use these pre-configured test accounts:

- **👨‍💼 Admin**: `admin@example.com` / `Admin123!`
- **👩‍🏫 Lecturer**: `lecturer@example.com` / `Lecturer123!`
- **👨‍🎓 Tutor**: `tutor@example.com` / `Tutor123!`

### Running Tests

```bash
# Run all tests
npm test

# Unit tests with coverage
npm run test:unit

# E2E tests (requires backend running)
npm run test:e2e

# Watch mode for development
npm run test:watch
```

## 🛠️ Technology Stack

### Core Framework
- **React 18** - UI library with hooks and concurrent features
- **TypeScript 5** - Static type checking and modern JS features
- **Vite** - Lightning-fast build tool and dev server

### State Management
- **React Context API** - Authentication and global state
- **Local State** - Component-specific state with hooks

### Networking & APIs
- **Axios** - HTTP client with interceptors and error handling
- **REST API** - Integration with Spring Boot backend

### Styling
- **CSS3** - Modern CSS with Grid, Flexbox, and custom properties
- **Responsive Design** - Mobile-first approach
- **CSS Modules** - Component-specific styling

### Testing
- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **Playwright** - End-to-end testing automation
- **@testing-library/user-event** - User interaction simulation

### Development Tools
- **ESLint** - Code linting and style enforcement
- **TypeScript Compiler** - Type checking and compilation
- **Vite HMR** - Hot module replacement for fast development

## 🌐 Browser Support

- **Chrome/Chromium 90+** ✅
- **Microsoft Edge 90+** ✅
- **Firefox 90+** ✅
- **Safari 14+** ✅
- **Opera 76+** ✅

**Requirements:**
- ES2020+ support
- CSS Grid and Flexbox
- Fetch API and Promises
- LocalStorage and SessionStorage

## 🤝 Contributing

### Development Guidelines

1. **Code Style**
   - Follow TypeScript and React best practices
   - Use functional components with hooks exclusively
   - Maintain strict type safety (no `any` types)
   - Follow existing naming conventions

2. **Component Standards**
   - Add `data-testid` attributes for E2E testing
   - Use React Context for global state
   - Implement proper error boundaries
   - Follow accessibility guidelines (WCAG 2.1)

3. **Testing Requirements**
   - Write unit tests for all utility functions
   - Add component tests for complex interactions
   - Include E2E tests for critical user journeys
   - Maintain test coverage above 90%

4. **Code Quality**
   - Run `npm run lint` before committing
   - Ensure all tests pass with `npm test`
   - Use meaningful commit messages
   - Update documentation for new features

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run full test suite and linting
4. Update documentation if needed
5. Submit PR with detailed description

## 📚 Additional Documentation

- [Test Pyramid Documentation](./TEST_PYRAMID.md)
- [E2E Test Optimization Summary](./PHASE-4-5-E2E-OPTIMIZATION-SUMMARY.md)
- [E2E Test Reports](./E2E-TEST-REPORT.md)
- [Testing Quick Start](../docs/testing/QUICK_START.md)

## 🚀 Quick Start Guide

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Casual-Academic-Time-Allocation-Management-System/frontend
npm install
```

### 2. Start Backend
Ensure the CATAMS backend is running on `http://localhost:8080`

### 3. Start Frontend
```bash
npm run dev
```

### 4. Login
Open `http://localhost:5173` and login with:
- Email: `lecturer@example.com`
- Password: `Lecturer123!`

### 5. Run Tests
```bash
npm test
```

**🎉 You're ready to develop!**

---

*CATAMS Frontend - Built with ❤️ using React, TypeScript, and modern web technologies*