# Contributing to Sightline.ai

Welcome to Sightline.ai! We're excited that you're interested in contributing to our AI-powered YouTube video summarization platform. This guide will help you get started and ensure your contributions are effective and aligned with our project goals.

## 🎯 Project Vision

Sightline.ai transforms long-form YouTube videos into actionable insights, helping users speed-learn from video content. We're building a platform that's:

- **Fast**: 15-30 second summaries for 20+ minute videos
- **Intelligent**: AI-powered Smart Collections with automatic tagging
- **Accessible**: Anonymous trials, progressive registration, responsive design
- **Reliable**: Comprehensive testing, production-ready infrastructure

## 🚀 Quick Start for Contributors

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **pnpm** (package manager)
- **Python 3.12+** for the FastAPI backend
- **Git** for version control
- **PostgreSQL** (or access to Neon cloud database)
- **Code Editor** (VS Code recommended with extensions listed below)

### First-Time Setup

1. **Fork and Clone**

   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/sightline.git
   cd sightline
   ```

2. **Install Dependencies**

   ```bash
   # Install frontend dependencies
   pnpm install

   # Set up Python virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Configuration**

   ```bash
   # Copy environment template
   cp .env.example .env.local

   # Edit .env.local with required API keys:
   # - OPENAI_API_KEY (required for AI features)
   # - DATABASE_URL (Neon PostgreSQL)
   # - CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   # - Other optional services
   ```

4. **Database Setup**

   ```bash
   # Generate Prisma client
   pnpm db:generate

   # Push schema to database
   pnpm db:push

   # Initialize anonymous user account
   node scripts/init-anonymous-user.js
   ```

5. **Verification**

   ```bash
   # Start both frontend and backend
   pnpm dev:full

   # Frontend: http://localhost:3000
   # Backend: http://localhost:8000

   # Run tests to ensure everything works
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

## 📋 Development Workflow

### Branch Strategy

We use **GitHub Flow** for simplicity:

1. **Main Branch**: Always production-ready
2. **Feature Branches**: `feature/description-of-change`
3. **Bug Fix Branches**: `fix/issue-description`
4. **Documentation**: `docs/update-description`

### Creating a Pull Request

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/smart-collections-enhancement
   git push -u origin feature/smart-collections-enhancement
   ```

2. **Make Changes**
   - Follow our [coding standards](#-coding-standards)
   - Write tests for new features
   - Update documentation as needed

3. **Quality Checks**

   ```bash
   # Run all quality checks
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e  # If applicable
   ```

4. **Commit with Conventional Commits**

   ```bash
   git add .
   git commit -m "feat(smart-collections): add category filtering with visual counts"
   
   # Or for bug fixes:
   git commit -m "fix(auth): resolve session timeout issue in modal flow"
   ```

5. **Create Pull Request**
   - Use the PR template (automatically loaded)
   - Reference related issues
   - Add screenshots for UI changes
   - Request review from maintainers

### Pull Request Guidelines

**Before Submitting:**

- [ ] Code follows our style guidelines (ESLint passes)
- [ ] TypeScript compilation succeeds
- [ ] All tests pass (unit and integration)
- [ ] Documentation updated for new features
- [ ] No console errors or warnings
- [ ] Performance impact considered and documented

**PR Description Should Include:**

- **What**: Brief description of changes
- **Why**: Problem being solved or feature being added
- **How**: Technical approach taken
- **Testing**: How changes were validated
- **Breaking Changes**: Any compatibility concerns

## 🧪 Testing Standards

### Test Categories

1. **Unit Tests**: Jest + React Testing Library
   - Test individual components and functions
   - Mock external dependencies
   - Focus on behavior, not implementation

2. **End-to-End Tests**: Playwright
   - Test complete user workflows
   - Cross-browser compatibility
   - Critical user journeys

3. **Integration Tests**: API and database testing
   - tRPC procedure testing
   - Database operations
   - Third-party service integration

### Writing Good Tests

```typescript
// Good: Tests behavior, not implementation
describe('URLInput Component', () => {
  it('should validate YouTube URLs and show appropriate feedback', async () => {
    render(<URLInput onSubmit={mockSubmit} />)
    
    const input = screen.getByPlaceholderText('Paste YouTube URL here...')
    const submitButton = screen.getByRole('button', { name: /summarize/i })
    
    // Test invalid URL
    await user.type(input, 'invalid-url')
    await user.click(submitButton)
    expect(screen.getByText(/enter a valid youtube url/i)).toBeInTheDocument()
    
    // Test valid URL
    await user.clear(input)
    await user.type(input, 'https://youtube.com/watch?v=dQw4w9WgXcQ')
    await user.click(submitButton)
    expect(mockSubmit).toHaveBeenCalledWith('https://youtube.com/watch?v=dQw4w9WgXcQ')
  })
})
```

### Running Tests

```bash
# Unit tests
pnpm test                    # Run all Jest tests
pnpm test:watch              # Watch mode for development
pnpm test:coverage           # Generate coverage report

# E2E tests
pnpm test:e2e                # Run all Playwright tests
pnpm test:e2e:ui             # Run with UI mode for debugging

# Test specific files
pnpm test SummaryViewer      # Run tests matching pattern
```

## 💻 Coding Standards

### TypeScript Guidelines

1. **Strict Type Safety**: No `any` types
2. **Interface over Type**: Use interfaces for object shapes
3. **Proper Null Handling**: Use optional chaining and nullish coalescing

```typescript
// Good
interface CreateSummaryRequest {
  url: string
  userId?: string
}

const summary = await api.summary.create.mutate({ 
  url: validatedUrl 
})

// Handle potential null/undefined
const title = summary?.videoTitle ?? 'Untitled'
```

### React Component Standards

1. **Functional Components**: Use hooks instead of class components
2. **TypeScript Props**: Always type component props
3. **Atomic Design**: Follow our component hierarchy (atoms → molecules → organisms)

```typescript
// Good component structure
interface SummaryCardProps {
  summary: Summary
  onShare?: (summaryId: string) => void
  className?: string
}

export function SummaryCard({ summary, onShare, className }: SummaryCardProps) {
  const handleShare = useCallback(() => {
    onShare?.(summary.id)
  }, [onShare, summary.id])

  return (
    <Card className={cn('summary-card', className)}>
      {/* Component JSX */}
    </Card>
  )
}
```

### API Development Standards

1. **tRPC Procedures**: Use Zod for input/output validation
2. **Error Handling**: Proper error types with user-friendly messages
3. **Authentication**: Use `protectedProcedure` for authenticated routes

```typescript
// Good tRPC procedure
export const createSummary = protectedProcedure
  .input(
    z.object({
      url: z.string().url('Must be a valid URL'),
      isPublic: z.boolean().default(false),
    })
  )
  .output(
    z.object({
      id: z.string(),
      videoTitle: z.string(),
      taskId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // Implementation with proper error handling
    try {
      const result = await processSummary(input, ctx.userId)
      return result
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create summary. Please try again.',
        cause: error,
      })
    }
  })
```

### File Organization

```text
src/
├── components/
│   ├── atoms/           # Basic building blocks
│   ├── molecules/       # Feature-specific components
│   ├── organisms/       # Complex page sections
│   └── modals/          # Modal components
├── lib/                 # Utilities and services
├── hooks/               # Custom React hooks
├── server/api/routers/  # tRPC API routes
└── types/               # TypeScript definitions
```

## 🎨 UI/UX Contribution Guidelines

### Design System

We follow our established design system documented in [UI/UX Guidelines](Docs/UI_UX_doc.md):

- **Colors**: Use CSS custom properties for consistent theming
- **Typography**: Inter font stack with defined type scale
- **Components**: shadcn/ui components with Tailwind CSS
- **Spacing**: 8px grid system
- **Accessibility**: WCAG 2.1 AA compliance required

### Component Development

1. **Start with Design**: Check Figma designs or create wireframes
2. **Responsive First**: Design for mobile, enhance for desktop
3. **Accessibility**: Include ARIA labels, keyboard navigation, color contrast
4. **Performance**: Optimize images, minimize bundle impact

```typescript
// Good accessible component
<button
  type="button"
  className="btn btn-primary"
  onClick={handleSubmit}
  disabled={isLoading}
  aria-label="Create summary from YouTube URL"
  aria-describedby="url-input-help"
>
  {isLoading ? (
    <>
      <Spinner className="mr-2" aria-hidden="true" />
      Processing...
    </>
  ) : (
    'Summarize Video'
  )}
</button>
```

## 🚀 Feature Development Process

### Planning Phase

1. **Issue Discussion**: Discuss feature in GitHub Issues
2. **Technical Design**: Create design document for complex features
3. **Approval**: Get maintainer approval before starting work
4. **Breaking Changes**: Discuss breaking changes early

### Implementation Phase

1. **Create Feature Branch**: Following naming conventions
2. **Incremental Development**: Make small, focused commits
3. **Testing**: Write tests alongside implementation
4. **Documentation**: Update docs as you build

### Review Phase

1. **Self Review**: Check your own PR before requesting review
2. **Peer Review**: Address reviewer feedback promptly
3. **Quality Gates**: All checks must pass
4. **Maintainer Review**: Final approval from maintainers

## 🐛 Bug Reporting and Fixing

### Reporting Bugs

Use our [Bug Tracking](Docs/Bug_tracking.md) system:

1. **Search Existing**: Check if bug already reported
2. **Use Template**: Follow the bug report template
3. **Reproduction Steps**: Provide clear steps to reproduce
4. **Environment Details**: Include OS, browser, Node version

### Fixing Bugs

1. **Understand Root Cause**: Don't just fix symptoms
2. **Write Test**: Add test that would have caught the bug
3. **Document Fix**: Update Bug_tracking.md with resolution
4. **Consider Impact**: Ensure fix doesn't break other functionality

## 🔧 Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "prisma.prisma",
    "ms-python.python"
  ]
}
```

### Git Hooks (Husky)

We use Husky for pre-commit hooks:

- **pre-commit**: Runs linting and type checking
- **commit-msg**: Validates conventional commit format

### Debugging Tools

1. **React Developer Tools**: Browser extension for React debugging
2. **Prisma Studio**: Database GUI (`pnpm db:studio`)
3. **tRPC Panel**: API explorer in development
4. **Playwright Test UI**: E2E test debugging (`pnpm test:e2e:ui`)

## 📚 Documentation Contributions

### What to Document

- **New Features**: Architecture, API changes, usage examples
- **Breaking Changes**: Migration guides and compatibility notes
- **Setup Changes**: Environment variables, dependencies
- **Bug Fixes**: Root cause and resolution in Bug_tracking.md

### Documentation Standards

1. **Clear Structure**: Use headings, tables, code blocks
2. **Code Examples**: Always test code examples before documenting
3. **Up-to-date**: Keep docs in sync with code changes
4. **Accessible**: Write for different skill levels

## 🏆 Recognition

### Types of Contributions We Value

- **Code**: New features, bug fixes, performance improvements
- **Documentation**: Guides, examples, API documentation
- **Testing**: Test coverage, E2E scenarios, performance tests
- **Design**: UI improvements, accessibility enhancements
- **Community**: Helping other contributors, issue triaging

### Contributor Recognition

- Contributors are listed in our CHANGELOG
- Significant contributions are highlighted in release notes
- Top contributors may be invited to the maintainer team

## 📞 Getting Help

### Community Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community chat
- **Code Review**: Learning opportunity during PR reviews

### Maintainer Contact

For sensitive issues or questions:
- Email: contributors@sightline.ai
- Tag maintainers in issues: @maintainer-username

### Common Questions

**Q: How do I set up the development environment?**
A: Follow the [Quick Start](#quick-start-for-contributors) section above.

**Q: What should I work on?**
A: Check issues labeled `good first issue` or `help wanted`.

**Q: How do I run only the frontend/backend?**
A: Use `pnpm dev` (frontend only) or `pnpm api:dev` (backend only).

**Q: My tests are failing in CI but pass locally. What should I do?**
A: Check the CI logs for environment differences, ensure all dependencies are committed.

## 📄 License

By contributing to Sightline.ai, you agree that your contributions will be licensed under the same license as the project. See the [LICENSE](LICENSE) file for details.

---

**Thank you for contributing to Sightline.ai!** 🙏

Your contributions help make video learning more accessible and efficient for everyone. Whether you're fixing a typo, adding a feature, or improving performance, every contribution matters.

**Ready to start?** Check out our [good first issue](https://github.com/sightline-ai/sightline/labels/good%20first%20issue) label on GitHub to find beginner-friendly tasks.