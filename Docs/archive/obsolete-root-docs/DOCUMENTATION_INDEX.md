# Documentation Index

Welcome to the Sightline.ai documentation! This comprehensive index will help you find the information you need quickly, whether you're a new developer getting started, a contributor adding features, or an operator deploying and maintaining the platform.

## 🚀 Quick Start Guides

### For Developers

**New to the project?** Start here:

1. **[README.md](README.md)** - Project overview, quick start, and core features
2. **[CLAUDE.md](CLAUDE.md)** - Claude Code development setup and commands
3. **[Development Setup](#-development--local-setup)** - Detailed environment setup
4. **[Project Structure](../../../Docs/architecture/project-structure.md)** - Codebase organization and architecture

### For Contributors

**Ready to contribute?** Follow this path:

1. **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines and process
2. **[Bug Tracking](../../../Docs/development/bug-tracking.md)** - Known issues and resolution process
3. **[Testing Strategy](../../../Docs/development/testing-strategy.md)** - Testing framework and quality standards

### For Operators

**Deploying to production?** Use these guides:

1. **[Production Operations Guide](PRODUCTION_OPERATIONS_GUIDE.md)** - Complete operational manual (deployment, monitoring, scaling)
2. **[Security Policy](SECURITY.md)** - Security implementation and best practices
3. **[Monitoring Guide](../../../Docs/operations/monitoring.md)** - Error tracking and performance monitoring

## 📚 Core Documentation

### 📁 Organized Documentation Structure

**All detailed documentation is now organized in the `Docs/` directory:**

```text
Docs/
├── architecture/          # Technical architecture & design
│   ├── ui-ux-guidelines.md
│   ├── project-structure.md
│   └── ui-ux-guidelines.md
├── development/          # Development resources
│   ├── bug-tracking.md
│   ├── environment-setup.md
│   ├── quick-reference.md
│   └── testing-strategy.md
├── operations/          # Operations & deployment
│   ├── legacy-deployment.md
│   ├── monitoring.md
│   ├── rate-limits.md
│   └── troubleshooting.md
├── reports/            # Project reports
│   ├── implementation-report.md
│   ├── test-improvement-roadmap.md
│   ├── test-report.md
│   └── testing-phase3-report.md
└── archive/           # Historical documents
    ├── legacy-docs/
    ├── old-deployment/
    └── old-implementation/
```

### Architecture & Technical Design

| Document | Description | Audience |
|----------|-------------|----------|
| **[Platform Documentation](../../../ARCHITECTURE.md)** | 📖 **Master Technical Reference** - Complete technical documentation covering architecture, features, API, deployment | All developers |
| **[Project Structure](../../../Docs/architecture/project-structure.md)** | Detailed codebase organization with atomic design patterns | Frontend developers |
| **[Implementation Reports](../../../Docs/reports/)** | Project implementation reports and roadmaps | Project managers, architects |

### Features & User Experience

| Document | Description | Audience |
|----------|-------------|----------|
| **[UI/UX Guidelines](../../../Docs/architecture/ui-ux-guidelines.md)** | Design system, accessibility standards, responsive design | UI/UX developers, designers |
| **[API Documentation](API_DOCUMENTATION.md)** | **Complete API Reference** - tRPC procedures and FastAPI endpoints with examples | Backend developers |

### Quality Assurance & Testing

| Document | Description | Audience |
|----------|-------------|----------|
| **[Testing Documentation](../../../Docs/development/testing-strategy.md)** | Comprehensive testing strategy: unit, E2E, performance, security | QA engineers, developers |
| **[Bug Tracking](../../../Docs/development/bug-tracking.md)** | Known issues, resolution process, common problems | All developers |

### Operations & Deployment

| Document | Description | Audience |
|----------|-------------|----------|
| **[Production Operations Guide](PRODUCTION_OPERATIONS_GUIDE.md)** | **Complete Operations Manual** - Deployment, monitoring, troubleshooting, scaling | DevOps engineers, SREs |
| **[Legacy Deployment](../../../Docs/operations/legacy-deployment.md)** | Legacy deployment procedures (see Operations Guide for updated) | DevOps engineers |
| **[Security Policy](SECURITY.md)** | Security headers, input validation, authentication | Security engineers |
| **[Monitoring Guide](../../../Docs/operations/monitoring.md)** | Error tracking, performance monitoring, alerting | Site reliability engineers |
| **[Rate Limits](../../../Docs/operations/rate-limits.md)** | API rate limiting configuration and management | Backend developers |

### Project Management

| Document | Description | Audience |
|----------|-------------|----------|
| **[Changelog](CHANGELOG.md)** | Version history and release notes | All stakeholders |

## 🛠 Development & Local Setup

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **Python 3.12+** - Backend API runtime  
- **pnpm** - Package manager (specified: v10.13.1)
- **PostgreSQL** - Database (or Neon cloud)

### Quick Setup

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd sightline
   pnpm install
   pip install -r requirements.txt
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Database Setup**

   ```bash
   pnpm db:generate
   pnpm db:push
   node scripts/init-anonymous-user.js
   ```

4. **Start Development**

   ```bash
   pnpm dev:full  # Both frontend (3000) and backend (8000)
   ```

### Essential Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend development server |
| `pnpm api:dev` | Start FastAPI backend server |
| `pnpm dev:full` | Start both servers concurrently |
| `pnpm lint` | Run ESLint code quality checks |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run all Jest unit tests |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm db:studio` | Open Prisma Studio database GUI |

## 🏗 Architecture Overview

### Tech Stack Summary

**Frontend**: Next.js 14 + TypeScript + Tailwind CSS + tRPC + TanStack Query
**Backend**: FastAPI + Python + LangChain + OpenAI  
**Database**: PostgreSQL + Prisma ORM  
**Auth**: Clerk (modal-based authentication)  
**Payments**: Stripe  
**Deployment**: Vercel  

### Key Features

- **AI Summarization**: Transform YouTube videos into structured summaries
- **Smart Collections**: AI-powered tagging with 7 entity types and 14 categories
- **Anonymous Trial**: 1 free summary without registration
- **Real-time Progress**: Live processing updates with task tracking
- **Multi-plan System**: Free (3 lifetime), Pro (25/month), Complete (unlimited)

## 🔗 API Documentation

**📖 [Complete API Reference](API_DOCUMENTATION.md)** - Comprehensive documentation for all API endpoints

### tRPC Routers (Type-Safe Frontend API)

| Router | Purpose | Key Procedures |
|--------|---------|----------------|
| **summary** | Video summarization | `create`, `createAnonymous`, `getById`, `update`, `delete` |
| **library** | Personal library management | `getAll`, `getStats`, `getTags`, `getCategories` |
| **auth** | User management | `getCurrentUser`, `updateProfile`, `exportUserData`, `deleteAccount` |
| **billing** | Stripe integration | `getSubscription`, `createCheckoutSession`, `createPortalSession` |
| **share** | Public sharing | `create`, `getBySlug`, `updateViews` |

### FastAPI Endpoints (AI Processing Backend)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/summarize` | POST | Main video summarization with progress tracking |
| `/api/progress/{task_id}` | GET | Real-time progress status |
| `/api/health` | GET | System health check with metrics |

## 🧪 Testing Strategy

### Test Categories

- **Unit Tests**: Jest + React Testing Library (16 suites, 449 tests)
- **End-to-End Tests**: Playwright cross-browser testing
- **Performance Tests**: Core Web Vitals and load testing
- **Security Tests**: Authentication, input validation, XSS prevention

### Running Tests

```bash
pnpm test              # Unit tests
pnpm test:e2e          # End-to-end tests  
pnpm test:coverage     # Coverage reports (70% threshold)
```

## 🚨 Troubleshooting

### Common Issues

| Issue | Solution | Documentation |
|-------|----------|---------------|
| **Server won't start** | Check port conflicts, use `pkill -f "next dev"` | [Bug #001](../../../Docs/development/bug-tracking.md#bug-001) |
| **Database connection fails** | Verify `DATABASE_URL`, run `pnpm db:generate` | [Development Setup](#-development--local-setup) |
| **TypeScript errors** | Run `pnpm typecheck`, fix type issues | [Code Quality](TESTING.md#code-quality-standards) |
| **Build fails** | Check ESLint config, run `pnpm lint:fix` | [Bug #004](../../../Docs/development/bug-tracking.md#bug-004) |

### Getting Help

1. **Check Bug Tracking**: Review [known issues](../../../Docs/development/bug-tracking.md)
2. **Documentation Search**: Use browser search across documentation files
3. **Development Commands**: Run diagnostic commands from [CLAUDE.md](CLAUDE.md)
4. **Quick Reference**: See [development quick reference](../../../Docs/development/quick-reference.md)

## 📝 Documentation Standards

### When to Update Documentation

- **New Features**: Update architecture docs and API documentation
- **Bug Fixes**: Document in [Bug_tracking.md](../../../Docs/development/bug-tracking.md)
- **Breaking Changes**: Update [CHANGELOG.md](CHANGELOG.md)
- **Setup Changes**: Update installation and environment guides

### Documentation Quality Standards

**📋 [Documentation Standards Guide](DOCUMENTATION_STANDARDS.md)** - Complete maintenance and quality standards

- **Accuracy**: All code examples must be tested and working
- **Completeness**: Include error handling and edge cases
- **Accessibility**: Use clear headings and table of contents
- **Maintenance**: Keep documentation in sync with code changes

---

**💡 Need help?** Start with the [README.md](README.md) for basics, or jump to the [Platform Documentation](../../../ARCHITECTURE.md) for comprehensive technical details.

**🐛 Found an issue?** Report it in [Bug_tracking.md](../../../Docs/development/bug-tracking.md) following the provided template.

**🚀 Ready to deploy?** Follow the [Production Operations Guide](PRODUCTION_OPERATIONS_GUIDE.md) for complete operational procedures.
