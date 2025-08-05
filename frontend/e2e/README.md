# Frontend E2E Testing Suite

## Overview

This E2E testing suite follows industry best practices for reliable, maintainable test automation using Playwright and TypeScript.

## Architecture

### Test Organization
```
e2e/
├── fixtures/
│   └── auth.ts              # Authentication fixtures and helpers
├── pages/
│   ├── LoginPage.ts         # Login page object model
│   └── DashboardPage.ts     # Dashboard page object model
├── modules/
│   ├── auth/               # Authentication tests
│   ├── dashboard/          # Dashboard functionality tests
│   ├── timesheets/         # Timesheet management tests
│   ├── logout/             # Logout functionality tests
│   └── ui/                 # UI component tests
└── global.setup.ts         # Global authentication setup
```

### Key Features

#### 🔐 **Robust Authentication**
- Proper authentication fixtures with React context support
- Multiple fixture types: `authenticatedPage`, `unauthenticatedPage`, `testDataPage`
- Automatic retry and fallback mechanisms

#### 📄 **Page Object Model**
- Reusable page objects for common interactions
- Centralized element selectors and methods
- Enhanced maintainability and readability

#### ⏱️ **Reliable Waiting Strategies**
- Custom wait helpers for API responses
- Element retry mechanisms
- Proper timing for React state updates

#### 🏷️ **Test Categorization**
- `@smoke` - Essential functionality tests
- `@critical` - Business-critical feature tests
- `@integration` - API integration tests
- `@ui` - User interface tests
- `@auth` - Authentication-related tests
- `@error-handling` - Error scenario tests
- `@validation` - Form validation tests

#### 🔄 **Test Data Management**
- Graceful handling of empty states
- Test data seeding and cleanup helpers
- Data isolation between tests

## Running Tests

### Basic Commands
```bash
# Run all tests
npm run test:e2e

# Run specific categories
npm run test:e2e:smoke       # Smoke tests only
npm run test:e2e:critical    # Critical functionality
npm run test:e2e:integration # API integration tests

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Generate reports
npm run test:e2e:report
```

### Module-specific Tests
```bash
# Authentication tests
npm run test:e2e:auth-modules

# Dashboard tests  
npm run test:e2e:dashboard-modules

# Individual test files
npm run test:e2e:auth-login
npm run test:e2e:dashboard-loading
```

## Best Practices Implemented

### ✅ **Authentication**
- **Problem**: Tests failed due to broken authentication fixture
- **Solution**: Proper login flow with React AuthContext integration
- **Implementation**: `AuthHelpers.performLogin()` with state verification

### ✅ **Test Isolation**
- **Problem**: Tests interfering with each other
- **Solution**: Individual fixtures and data cleanup
- **Implementation**: `testDataPage` fixture with seeding/cleanup

### ✅ **Flaky Test Prevention**
- **Problem**: Race conditions and timing issues
- **Solution**: Robust waiting strategies and retry mechanisms
- **Implementation**: `WaitHelpers` class with multiple wait patterns

### ✅ **Maintainable Selectors**
- **Problem**: Brittle element selectors
- **Solution**: Page Object Model with centralized selectors
- **Implementation**: `LoginPage`, `DashboardPage` classes

### ✅ **Error Handling**
- **Problem**: Tests failing silently without clear debugging info
- **Solution**: Comprehensive error handling and logging
- **Implementation**: Try-catch blocks with fallback behavior

### ✅ **Test Organization**
- **Problem**: Monolithic test files
- **Solution**: Modular organization with tagged categories
- **Implementation**: Nested describe blocks with semantic tags

## Configuration

### Playwright Config Optimizations
- **Reduced timeouts** for faster feedback (45s test, 10s action, 5s expect)
- **Limited workers** for stability (4 local, 1 CI)
- **Multiple reporters** (HTML, JSON, JUnit, GitHub Actions)
- **Enhanced debugging** (traces, screenshots, videos on failure)

### Cross-browser Testing
- Chromium, Firefox, and WebKit support
- Consistent authentication across browsers
- Browser-specific handling where needed

## Troubleshooting

### Common Issues

#### Authentication Failures
```bash
# Check if backend is running with E2E profile
curl http://localhost:8084/actuator/health

# Verify test credentials
curl -X POST http://localhost:8084/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lecturer@example.com","password":"Lecturer123!"}'
```

#### Test Data Issues
- Tests gracefully skip when no data available
- Use `testDataPage` fixture for tests requiring specific data
- Check console logs for data seeding status

#### Timing Issues
- Tests include retry mechanisms and proper waits
- Use `WaitHelpers.waitForElementWithRetry()` for flaky elements
- Increase timeouts in `playwright.config.ts` if needed

## Development Guidelines

### Adding New Tests
1. **Use appropriate fixture**: `authenticatedPage`, `unauthenticatedPage`, or `testDataPage`
2. **Add semantic tags**: Choose from existing tags or add new ones
3. **Use Page Objects**: Create or extend page objects for new components
4. **Handle edge cases**: Include empty states, errors, and loading states
5. **Follow naming conventions**: Descriptive test names with clear expectations

### Page Object Guidelines
```typescript
export class NewPage {
  readonly page: Page;
  readonly selector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.selector = page.getByTestId('element');
  }

  async performAction() {
    // Implementation with error handling
  }

  async expectState() {
    // Assertions with proper waits
  }
}
```

### Test Writing Guidelines
```typescript
test.describe('Feature Name', { tag: '@category' }, () => {
  test('should do something', { tag: '@specific-tag' }, async ({ fixture }) => {
    // Arrange - Set up test state
    
    // Act - Perform action
    
    // Assert - Verify results
  });
});
```

## Performance Considerations

- **Parallel execution** with worker limits for stability
- **Selective test running** using tags for faster feedback
- **Optimized timeouts** balanced between speed and reliability
- **Efficient selectors** using data-testid attributes
- **Minimal setup overhead** with reusable fixtures

## Future Enhancements

### Planned Improvements
1. **Visual Testing**: Screenshot comparisons for UI consistency
2. **Accessibility Testing**: Automated a11y checks
3. **Performance Testing**: Load time and interaction metrics
4. **Mobile Testing**: Responsive design validation
5. **API Contract Testing**: Schema validation for API responses

### Integration Opportunities
1. **CI/CD Pipeline**: GitHub Actions integration with test reports
2. **Test Data Management**: Dedicated test database seeding
3. **Monitoring**: Test execution metrics and failure analysis
4. **Documentation**: Auto-generated test documentation