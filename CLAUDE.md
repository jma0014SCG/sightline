---
title: "AI Assistant Guide (Claude Code)"
description: "Guidance for Claude Code (claude.ai/code) when working with this repository"
type: "guide"
canonical_url: "/claude"
version: "1.0"
last_updated: "2025-01-09"
audience: ["ai-assistants", "claude-code"]
complexity: "reference"
tags: ["ai-guidance", "development", "commands", "architecture", "workflows"]
special_purpose: "ai_assistant_instructions"
related_docs: ["/contributing", "/architecture"]
---

## CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sightline.ai is a YouTube video summarization platform that uses AI to create concise, accurate summaries
of video content. It features a Next.js 14 frontend with TypeScript, a FastAPI Python backend for AI
processing, and integrates with multiple services including Clerk for auth, Stripe for payments, and
OpenAI for summarization.

## Essential Commands

### Development

```bash
# Install dependencies
pnpm install

# Set up Python virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start development servers
pnpm dev                    # Frontend only (port 3000)
pnpm api:dev               # Backend only (port 8000)
pnpm dev:full              # Both frontend and backend (concurrent)

# Environment setup
pnpm env:setup             # Set up environment variables
pnpm env:validate          # Validate environment variables
pnpm env:check             # Quick env check
```

### Code Quality

```bash
# Linting and type checking
pnpm lint                  # Run ESLint
pnpm lint:fix              # Fix linting issues
pnpm typecheck             # TypeScript type checking
pnpm format                # Format code with Prettier
pnpm format:check          # Check formatting

# Run all checks before committing
pnpm lint && pnpm typecheck && pnpm format:check
```

### Database

```bash
# Prisma commands
pnpm db:generate           # Generate Prisma client
pnpm db:migrate            # Run migrations (production)
pnpm db:push               # Push schema changes (development)
pnpm db:studio             # Open Prisma Studio GUI
pnpm db:seed               # Seed database with test data
```

### Build and Deployment

```bash
pnpm build                 # Production build
pnpm build:prod            # Production build with NODE_ENV=production
pnpm build:analyze         # Analyze bundle size
pnpm start                 # Start production server
pnpm deploy                # Deploy to Vercel production
pnpm deploy:preview        # Deploy preview to Vercel
pnpm vercel:link           # Link to Vercel project
pnpm vercel:env            # Pull environment variables from Vercel
pnpm prepare               # Install git hooks (Husky)
```

### Testing

```bash
# Frontend tests
node scripts/test-db.js           # Test database connection
node scripts/test-pipeline.js     # Test summarization pipeline

# Python API tests
cd api && python -m pytest        # Run all Python tests
python -m pytest tests/test_gumloop.py -v  # Run specific test with verbose
python tests/test_full_integration.py  # Full integration test

# Test specific services
python tests/test_transcript_service.py
python tests/test_oxylabs.py
python tests/test_ytdlp.py
```

## Smart Collections

AI-powered automatic categorization system that extracts entities and assigns categories to video
summaries for intelligent organization and filtering. See [Architecture Documentation](ARCHITECTURE.md#smart-collections-processing)
for comprehensive technical details.

## Architecture Overview

### Frontend (Next.js 14 App Router)

- **Authentication**: Clerk with modal-based flow and anonymous user support
- **State Management**: TanStack Query + tRPC for type-safe API calls
- **UI Components**: Atomic design pattern (atoms → molecules → organisms)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Key Pages**:
  - `/` - Landing page with URL input and anonymous summary support
  - `/library` - User's saved summaries with real-time progress
  - `/library/[id]` - Individual summary view
  - `/library/[id]/edit` - Edit summary details
  - `/settings` - Profile, notifications, account management
  - `/billing` - Stripe subscription management
  - `/share/[slug]` - Public share pages

### Backend Architecture

- **API Layer**: tRPC routers in `src/server/api/routers/`
  - `summary.ts` - Video summarization endpoints (includes anonymous support)
  - `library.ts` - User library management
  - `billing.ts` - Stripe integration
  - `auth.ts` - User management, notifications, data export
  - `share.ts` - Public sharing features

- **Python API**: FastAPI in `api/` directory
  - Entry point: `api/index.py` (includes progress tracking)


### Key Integration Points

1. **Clerk Webhooks** (`/api/webhooks/clerk`) - Syncs users to database
2. **Stripe Webhooks** (`/api/webhooks/stripe`) - Handles subscription events
3. **tRPC Bridge** - Type-safe communication between frontend and backend
4. **Progress Tracking** - Real-time updates via `useProgressTracking` hook
5. **Anonymous User Flow** - Browser fingerprinting for free summary tracking

### Database Schema (Prisma)

- **User** - Synced from Clerk, includes subscription info and metadata
- **Summary** - Video summaries with metadata, timestamps, and content sections
- **Subscription** - Stripe subscription details
- **Share** - Public sharing functionality

### Summary Limits

- **Anonymous**: 1 summary ever (tracked by browser fingerprint + IP)
- **Free Plan**: 3 summaries total (lifetime limit)
- **Pro Plan**: 25 summaries/month (resets on 1st)
- **Enterprise Plan**: Unlimited summaries

## Development Workflow

### Critical Documentation Consultation

Before starting any development task, **ALWAYS** consult these files in order:

/Users/jeffaxelrod/Documents/Sightline/PROJECT_INDEX.md

### Task Execution Protocol

1. **Task Assessment**: Read subtask from `/Docs/Implementation.md`
   - **Simple subtask**: Implement directly
   - **Complex subtask**: Create a todo list and break down further
   - Check task dependencies and prerequisites
   - Verify scope understanding

2. **Documentation Research**: Check relevant documentation links in the subtask before implementing

3. **UI/UX Implementation**: Consult `/Docs/UI_UX_doc.md` before implementing any UI/UX elements

4. **Project Structure Compliance**: Check `/Docs/project_structure.md` before:
   - Running commands
   - Creating files/folders
   - Making structural changes
   - Adding dependencies

5. **Implementation**: Follow established patterns and project structure guidelines

6. **Error Handling**:
   - Check `/Docs/Bug_tracking.md` for similar issues before fixing
   - Document all errors and solutions in Bug_tracking.md
   - Include error details, root cause, and resolution steps

7. **Task Completion**: Mark complete only when:
   - All functionality implemented correctly
   - Code follows project structure guidelines
   - UI/UX matches specifications (if applicable)
   - No errors or warnings remain
   - All task list items completed (if applicable)

### Critical Rules

- **NEVER** skip documentation consultation
- **NEVER** mark tasks complete without proper testing
- **NEVER** ignore project structure guidelines

- **ALWAYS** document errors and solutions
- **ALWAYS** follow the established workflow process

### Component Architecture

The codebase follows atomic design pattern with clear component hierarchy:

**Component Structure:**

- **Atoms** (`src/components/atoms/`): Basic building blocks (Skeleton, Toast)
- **Molecules** (`src/components/molecules/`): Simple components with specific functionality (URLInput, SummaryCard, LibraryControls)
- **Organisms** (`src/components/organisms/`): Complex components (SummaryViewer, PricingPlans)
- **Modals** (`src/components/modals/`): Modal components (SignInModal, AuthPromptModal)
- **Providers** (`src/components/providers/`): Context providers (TRPCProvider, ToastProvider)

**File Structure Pattern:**

```text
ComponentName/
├── ComponentName.tsx
├── ComponentName.types.ts (if needed)
└── index.ts
```

**Modals**: Place in `src/components/modals/` as standalone files (not in folders)

When creating new components:

- Use the atomic design pattern consistently
- Choose appropriate hierarchy level based on complexity
- Follow established file structure and naming conventions

