# Contributing

**Developer workflow guide for contributing to Sightline.ai platform**

## Development Environment Setup

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **Python 3.12+** - Backend API runtime
- **pnpm** - Package manager (specified: v10.13.1)
- **PostgreSQL** - Database (or Neon cloud instance)

### Quick Setup

```bash
# Clone repository
git clone <repository-url>
cd sightline

# Install dependencies
pnpm install
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Environment configuration
cp .env.example .env.local
# Edit .env.local with your API keys (see Environment Variables section)

# Database setup
pnpm db:generate
pnpm db:push
node scripts/init-anonymous-user.js

# Start development servers
pnpm dev:full  # Both frontend (3000) and backend (8000)
```

### Environment Variables

**Required for Development**:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sightline"

# Authentication (Clerk)
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# AI Services
OPENAI_API_KEY="sk-proj-..."

# Payments (Stripe - Test Mode)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID="price_..."

# Optional Services
YOUTUBE_API_KEY="..."  # For enhanced video metadata
GUMLOOP_API_KEY="..."  # For enhanced transcript processing
OXYLABS_USERNAME="..."  # For proxy-based transcript acquisition
OXYLABS_PASSWORD="..."
```

**Validation**:

```bash
pnpm env:check     # Quick validation
pnpm env:validate  # Comprehensive validation
```

## Development Workflow

### Code Standards

**TypeScript**:
- Use strict mode with comprehensive type checking
- Define interfaces for all data structures
- Prefer type inference over explicit types where clear
- Use discriminated unions for state management

**Component Architecture**:
- Follow atomic design pattern (atoms → molecules → organisms)
- Use composition over inheritance
- Implement proper error boundaries
- Ensure responsive design with Tailwind CSS

**API Development**:
- tRPC procedures must use Zod for input/output validation
- Follow RESTful principles for FastAPI endpoints
- Implement comprehensive error handling
- Use appropriate HTTP status codes

### Development Commands

```bash
# Frontend development
pnpm dev                    # Next.js development server (port 3000)
pnpm build                  # Production build
pnpm lint                   # ESLint code quality checks
pnpm lint:fix               # Auto-fix linting issues
pnpm typecheck              # TypeScript type checking
pnpm format                 # Format code with Prettier

# Backend development
pnpm api:dev               # FastAPI development server (port 8000)
pnpm api:test              # Python API tests

# Database management
pnpm db:generate           # Generate Prisma client
pnpm db:push               # Push schema changes (development)
pnpm db:migrate            # Run migrations (production)
pnpm db:studio             # Open Prisma Studio GUI
pnpm db:seed               # Seed database with test data

# Full development
pnpm dev:full              # Both frontend and backend servers
```

### Git Workflow

**Branch Naming**:
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/component-name` - Code refactoring
- `docs/documentation-update` - Documentation changes

**Commit Standards**:
- Use conventional commit format: `type(scope): description`
- Examples: `feat(auth): add anonymous user support`, `fix(api): resolve cors issues`
- Keep commits focused and atomic
- Include tests with feature commits

**Pre-commit Checks**:

```bash
# Automatically run before each commit
pnpm lint && pnpm typecheck && pnpm test
```

## Testing Strategy

### Test Categories

**Unit Tests** (Jest + React Testing Library):

```bash
pnpm test                  # Run all unit tests
pnpm test:watch            # Watch mode for development
pnpm test:coverage         # Generate coverage reports (70% minimum)
pnpm test:ci               # CI-optimized test run
```

**End-to-End Tests** (Playwright):

```bash
pnpm test:e2e              # Run E2E tests
pnpm test:e2e:headed       # Run with browser UI
pnpm test:e2e:debug        # Debug mode with DevTools
```

**API Tests** (Python + pytest):

```bash
cd api
python -m pytest                    # Run all API tests
python -m pytest tests/test_*.py    # Run specific test files
python -m pytest -v                 # Verbose output
```

### Test Writing Guidelines

**Unit Tests**:
- Test component behavior, not implementation details
- Use semantic queries (getByRole, getByLabelText)
- Mock external dependencies (APIs, third-party libraries)
- Test both success and error scenarios

**E2E Tests**:
- Focus on critical user journeys
- Test across multiple browsers (Chrome, Firefox, Safari)
- Use Page Object Model for maintainable tests
- Include accessibility testing with axe

**API Tests**:
- Test all endpoints with valid/invalid inputs
- Verify response schemas and status codes
- Test authentication and authorization
- Include performance benchmarks

### Quality Gates

**Before Pull Request**:

```bash
# Complete quality check
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
```

**Coverage Requirements**:
- Unit Tests: >70% code coverage
- E2E Tests: All critical user paths
- API Tests: All endpoints with success/error cases

## Pull Request Process

### PR Preparation

1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Implement Changes**: Follow coding standards and include tests
3. **Run Quality Checks**: Ensure all tests pass and code is formatted
4. **Update Documentation**: Update relevant docs for user-facing changes
5. **Self-Review**: Review your own code for obvious issues

### PR Requirements

**PR Title Format**:
- `feat: add Smart Collections AI tagging`
- `fix: resolve CORS issues in FastAPI`
- `docs: update API documentation`

**PR Description Template**:

```markdown
## Changes
Brief description of what this PR does

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated  
- [ ] Manual testing completed
- [ ] Edge cases considered

## Documentation
- [ ] Code comments added for complex logic
- [ ] API documentation updated (if applicable)
- [ ] User-facing documentation updated (if applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] No console errors or warnings
- [ ] Responsive design tested (mobile/desktop)
```

### Review Process

**Reviewer Guidelines**:
- Focus on logic, security, and maintainability
- Check for proper error handling
- Verify test coverage for new functionality
- Ensure accessibility standards are met
- Validate responsive design implementation

**Author Guidelines**:
- Respond to feedback constructively
- Make requested changes in separate commits
- Update tests when logic changes
- Resolve conflicts before requesting re-review

## Bug Reporting & Issue Management

### Bug Report Template

```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 12.6]
- Browser: [e.g., Chrome 108]
- Device: [e.g., iPhone 13, Desktop]

## Additional Context
Screenshots, error logs, etc.
```

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high/medium/low` - Priority classification

## Development Best Practices

### Performance Optimization

**Frontend**:
- Use React.memo for expensive components
- Implement proper loading states
- Optimize images with Next.js Image component
- Use code splitting for large components
- Implement proper caching strategies

**Backend**:
- Use database indexes for common queries
- Implement connection pooling
- Cache expensive operations
- Use appropriate HTTP status codes
- Monitor API response times

### Security Guidelines

**Input Validation**:
- Always validate inputs with Zod schemas
- Sanitize user-generated content
- Use parameterized queries (Prisma ORM)
- Implement proper rate limiting

**Authentication**:
- Never store sensitive data in localStorage
- Use HTTPS for all communications  
- Implement proper CORS policies
- Validate JWT tokens on server side

**Error Handling**:
- Never expose sensitive information in error messages
- Log errors appropriately for debugging
- Implement proper error boundaries
- Use structured error responses

### Code Organization

**File Structure**:

```text
src/
├── app/                    # Next.js App Router pages
├── components/             # React components (atomic design)
│   ├── atoms/             # Basic building blocks
│   ├── molecules/         # Simple combinations
│   └── organisms/         # Complex components
├── lib/                   # Shared utilities
├── server/                # tRPC server code
└── types/                 # TypeScript definitions
```

**Import Organization**:

```typescript
// External libraries
import React from 'react'
import { NextPage } from 'next'

// Internal modules (absolute imports)
import { Button } from '@/components/atoms/Button'
import { api } from '@/lib/trpc'

// Relative imports
import './styles.css'
```

### Accessibility Requirements

**WCAG 2.1 AA Compliance**:
- Use semantic HTML elements
- Provide alt text for images
- Ensure proper color contrast (4.5:1 minimum)
- Support keyboard navigation
- Use ARIA labels appropriately

**Testing**:
- Include accessibility tests in E2E suite
- Use axe-core for automated testing
- Test with screen readers
- Validate keyboard-only navigation

---

**Need Help?**

- Check existing [bug reports](docs/development/bug-tracking.md)
- Review [architecture documentation](ARCHITECTURE.md)
- Ask questions in GitHub Discussions
- Join development community channels