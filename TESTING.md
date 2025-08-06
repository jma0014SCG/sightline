# Testing Guide

This document outlines the testing strategy and setup for the Sightline.ai platform.

## Overview

The platform uses Jest as the testing framework with:
- Unit tests for individual functions and components
- Integration tests for API endpoints and workflows
- End-to-end tests for user scenarios (planned)
- Test coverage reporting and thresholds

## Setup

### Test Framework
- **Jest** - Testing framework with Next.js integration
- **@testing-library/jest-dom** - DOM testing utilities
- **@testing-library/react** - React component testing (to be added)

### Configuration Files
- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Test environment setup and mocks
- Coverage thresholds: 70% for branches, functions, lines, and statements

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run specific test types
pnpm test:unit        # Unit tests
pnpm test:integration # Integration tests (planned)
pnpm test:e2e         # End-to-end tests (planned)
```

## Test Structure

### File Naming Convention
```
src/lib/security.ts          # Source file
src/lib/__tests__/security.test.ts  # Test file
```

### Test Categories

#### Unit Tests
- **Location**: `src/**/__tests__/**/*.test.ts`
- **Purpose**: Test individual functions, utilities, and components
- **Examples**: 
  - `security.test.ts` - Input validation and sanitization
  - `rateLimits.test.ts` - Rate limiting configuration

#### Integration Tests (Planned)
- **Location**: `tests/integration/**/*.test.ts`
- **Purpose**: Test API endpoints and database operations
- **Examples**:
  - Authentication flows
  - Summary creation pipeline
  - Payment processing

#### End-to-End Tests (Planned)
- **Location**: `tests/e2e/**/*.test.ts`
- **Purpose**: Test complete user workflows
- **Tools**: Playwright or Cypress
- **Examples**:
  - User registration and summary creation
  - Anonymous user flow
  - Subscription management

## Mocking Strategy

### Next.js Mocks
- Router (both Pages and App Router)
- Navigation hooks
- Environment variables

### Third-party Service Mocks
- **Clerk**: Authentication methods and hooks
- **tRPC**: API client and procedures
- **Stripe**: Payment processing (planned)
- **OpenAI**: AI services (planned)

### Browser APIs
- `IntersectionObserver`
- `matchMedia`
- Console methods (to reduce test noise)

## Writing Tests

### Best Practices

1. **Follow AAA Pattern**
   ```typescript
   test('should validate YouTube URLs', () => {
     // Arrange
     const validUrl = 'https://www.youtube.com/watch?v=123'
     
     // Act
     const result = isValidYouTubeURL(validUrl)
     
     // Assert
     expect(result).toBe(true)
   })
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // Good
   test('should sanitize script tags from user input')
   
   // Bad
   test('sanitize test')
   ```

3. **Test Edge Cases**
   ```typescript
   describe('edge cases', () => {
     test('should handle empty input')
     test('should handle null values')
     test('should handle extremely long strings')
   })
   ```

4. **Group Related Tests**
   ```typescript
   describe('Security Utils', () => {
     describe('sanitizeInput', () => {
       test('should remove script tags')
       test('should preserve safe content')
     })
   })
   ```

### Testing Utilities

#### Custom Matchers
Custom Jest matchers can be added to `jest.setup.js`:
```javascript
expect.extend({
  toBeValidYouTubeURL(received) {
    const pass = isValidYouTubeURL(received)
    return {
      message: () => `expected ${received} to be a valid YouTube URL`,
      pass,
    }
  }
})
```

#### Test Helpers
Create reusable test utilities in `tests/helpers/`:
```typescript
// tests/helpers/mockUser.ts
export const createMockUser = (overrides = {}) => ({
  id: 'user123',
  email: 'test@example.com',
  plan: 'FREE',
  ...overrides,
})
```

## Coverage Reporting

### Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Collection
Includes:
- All TypeScript/JavaScript files in `src/`
- Excludes type definitions, stories, and index files

### Viewing Coverage
```bash
# Generate coverage report
pnpm test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

## Test Data Management

### Test Database
- Use separate test database for integration tests
- Reset database state between tests
- Use factories for creating test data

### Environment Variables
Test-specific environment variables are set in `jest.setup.js`:
```javascript
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
```

## Continuous Integration

### GitHub Actions (Planned)
```yaml
- name: Run Tests
  run: pnpm test:coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
Tests run automatically on commit via Husky:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm test && pnpm lint"
    }
  }
}
```

## Future Testing Enhancements

### 1. Component Testing
- Add React Testing Library
- Test UI components in isolation
- Mock API calls and user interactions

### 2. API Testing
- Test tRPC procedures
- Mock database operations
- Test error handling and validation

### 3. End-to-End Testing
- Add Playwright for browser automation
- Test critical user journeys
- Cross-browser compatibility testing

### 4. Performance Testing
- Load testing for summary creation
- API response time testing
- Memory usage monitoring

### 5. Visual Regression Testing
- Screenshot testing for UI components
- Automated visual diff detection
- Cross-browser visual consistency

## Debugging Tests

### Common Issues
1. **Tests timeout**: Increase timeout in `jest.config.js`
2. **Module not found**: Check `moduleNameMapping` configuration
3. **Mock not working**: Verify mock is defined before import

### Debugging Commands
```bash
# Run tests with debug output
pnpm test --verbose

# Run specific test file
pnpm test security.test.ts

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Testing Philosophy

1. **Test Behavior, Not Implementation**
   - Focus on what functions do, not how they do it
   - Test public APIs, not internal details

2. **Fast and Reliable**
   - Unit tests should run quickly
   - Tests should be deterministic
   - Avoid network calls in unit tests

3. **Maintainable**
   - Keep tests simple and readable
   - Use descriptive assertions
   - Refactor tests when code changes

4. **Comprehensive**
   - Test happy paths and error conditions
   - Cover edge cases and boundary conditions
   - Maintain high coverage for critical paths

---

Last Updated: 2025-01-09
Version: 1.0.0