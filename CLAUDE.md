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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sightline.ai is a YouTube video summarization platform that uses AI to create concise, accurate summaries of video content. It features a Next.js 14 frontend with TypeScript, a FastAPI Python backend for AI processing, and integrates with multiple services including Clerk for auth, Stripe for payments, and OpenAI for summarization.

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

AI-powered automatic categorization system that extracts entities and assigns categories to video summaries for intelligent organization and filtering. See [Architecture Documentation](ARCHITECTURE.md#smart-collections-processing) for comprehensive technical details.

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
  - Multiple transcript services with fallback chain
  - LangChain + OpenAI for summarization
  - Services: YouTube, YT-DLP, Oxylabs, Gumloop
  - Real-time progress tracking with task IDs

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
- **Complete Plan**: Unlimited summaries

## Development Workflow

### Critical Documentation Consultation
Before starting any development task, **ALWAYS** consult these files in order:
1. **`/Docs/Bug_tracking.md`** - Check for known issues first
2. **`/Docs/Implementation.md`** - Main task reference and current stage
3. **`/Docs/project_structure.md`** - Structure guidance for commands, files, and folders
4. **`/Docs/UI_UX_doc.md`** - Design requirements for any UI/UX work

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
- **NEVER** implement UI without checking UI_UX_doc.md
- **NEVER** fix errors without checking Bug_tracking.md first
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
```
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

### tRPC Procedures
When adding new procedures:
1. Define input/output schemas using Zod
2. Use `protectedProcedure` for authenticated routes
3. Use `publicProcedure` for anonymous/public routes
4. Handle errors with appropriate TRPCError codes
5. Update types in the frontend automatically via tRPC inference

## Environment Variables

### Core Application Variables
- `DATABASE_URL` - Postgres connection string (Neon)
- `NEXT_PUBLIC_APP_URL` - Application base URL

### Authentication (Clerk)
- `CLERK_SECRET_KEY` - Clerk server-side secret key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk client-side publishable key
- `CLERK_WEBHOOK_SECRET` - Clerk webhook verification secret

### Payments (Stripe)
- `STRIPE_SECRET_KEY` - Stripe server-side secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe client-side publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification secret
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` - Stripe Pro plan price ID
- `NEXT_PUBLIC_STRIPE_COMPLETE_PRICE_ID` - Stripe Complete plan price ID (if applicable)

### AI Services
- `OPENAI_API_KEY` - OpenAI API key for summarization and Smart Collections classification (see [Smart Collections](ARCHITECTURE.md#smart-collections-processing))
- `YOUTUBE_API_KEY` - YouTube Data API key for video metadata

### Transcript Services (Fallback Chain)
- `GUMLOOP_API_KEY` - Gumloop API key for enhanced transcript processing
- `OXYLABS_USERNAME` - Oxylabs proxy service username
- `OXYLABS_PASSWORD` - Oxylabs proxy service password

### Optional Services
- `SENTRY_DSN` - Sentry error tracking (optional)
- `UPSTASH_REDIS_URL` - Upstash Redis connection (optional caching)

**Configuration Commands:**
- `pnpm env:check` - Validate required environment variables
- `pnpm env:validate` - Comprehensive environment validation
- `pnpm env:setup` - Run environment setup script

## Common Tasks

### Adding a new API endpoint
1. Create tRPC router in `src/server/api/routers/`
2. Add to root router in `src/server/api/root.ts`
3. Use in frontend via `api.<router>.<procedure>.useMutation()` or `.useQuery()`

### Modifying the database
1. Update schema in `prisma/schema.prisma`
2. Run `pnpm db:generate` to update client
3. Run `pnpm db:push` for development or `pnpm db:migrate` for production
4. Test locally before deploying migrations

### Testing payment flows
1. Use Stripe test mode with test cards (4242 4242 4242 4242)
2. Monitor webhooks at `/api/webhooks/stripe`
3. Check subscription status in database
4. Test both success and failure scenarios

### Working with the Python API
1. Virtual environment is at `venv/` in project root (accessed as `../venv/` from api directory)
2. Activate venv: `source venv/bin/activate` (from project root) or `source ../venv/bin/activate` (from api directory)
3. Run API directly: `pnpm api:dev`
4. Test API health: `pnpm api:test`
5. Check `api/services/` for available transcript fallback services

### Adding YouTube timestamp navigation
1. Parse timestamps from content using regex: `/(\d{1,2}:\d{2}(?::\d{2})?)/g`
2. Convert to seconds for YouTube player API
3. Use `player.seekTo(seconds)` for navigation
4. Ensure player is ready before seeking

### Implementing modal-based authentication
1. Use `SignInModal` component from `@/components/modals/`
2. Control visibility with state in parent component
3. Use Clerk's redirect URLs for post-auth callbacks
4. Handle success with toast notifications

### Working with SummaryViewer Components
When modifying summary display functionality:
1. **MainContentColumn**: Add new collapsible sections following the pattern of In Practice/Playbooks
2. **LearningHubTabs**: Add new tabs by updating TabType union and adding render logic
3. **InsightEnrichment**: Modify to display additional backend data fields as needed
4. **Section Parsing**: Use the alias system in SummaryViewer.tsx for content extraction fallbacks
5. **Data Types**: Update SummaryViewer.types.ts when adding new backend data structures

### Adding Rich Data Components
For new structured data from the AI backend:
1. Define TypeScript interfaces in `SummaryViewer.types.ts`
2. Extract data in the main SummaryViewer component
3. Choose appropriate location (main column for actionable content, sidebar for reference)
4. Follow existing design patterns (collapsible cards, colored headers, consistent spacing)
5. Implement graceful fallbacks between structured data and parsed content sections

## Recent Architecture Changes

### SummaryViewer Rich Data Display (Latest)
The SummaryViewer has been enhanced to display structured AI data as dedicated components:
- **Playbooks Section**: New collapsible section in MainContentColumn displaying trigger/action playbooks
- **Novel Idea Meter**: New tab in LearningHubTabs showing ideas with novelty scores (1-5 stars)
- **InsightEnrichment**: New sidebar component for sentiment, tools/resources, and risk analysis
- **Enhanced Section Parsing**: Improved content extraction with alias support and fallback logic

### SummaryViewer Multi-Column Layout
The SummaryViewer uses a responsive multi-column layout:
- **MainContentColumn**: Primary content display with video embed, TL;DR, In Practice, Playbooks, and Debunked Assumptions
- **KeyMomentsSidebar**: Clickable timestamps and key moments with YouTube player integration
- **ActionsSidebar**: Quick actions (copy, share, export) with authentication-aware features
- **LearningHubTabs**: Organized learning materials (Frameworks, Playbooks, Flashcards, Glossary, Quiz, Ideas)
- **InsightEnrichment**: Meta-analysis including sentiment, tools, and risk considerations

### Anonymous User Support
- Special "ANONYMOUS_USER" account in database
- Browser fingerprinting for tracking (no cookies required)
- Seamless transition from anonymous to authenticated
- Summary claiming after sign-up

### Real-time Progress Tracking
- Backend stores progress in memory by task ID
- Frontend polls `/api/progress/{task_id}` endpoint
- Realistic stage messages reflecting actual processing
- Graceful fallback to simulation if backend unavailable

## Security Considerations
- All API routes are protected by Clerk authentication middleware
- Anonymous routes use browser fingerprinting + IP for rate limiting
- Rate limiting implemented via custom middleware
- Input validation using Zod schemas on all endpoints
- Environment variables validated on startup
- XSS protection via DOMPurify for markdown rendering
- Webhook endpoints verify signatures (Clerk and Stripe)

## Performance Optimizations
- Implement React.memo for expensive components
- Use dynamic imports for large components
- Enable SWC minification in next.config.js
- Implement proper caching headers for static assets
- Use Vercel's Edge Network for global distribution

## Debugging Tips

### Common Issues

**"Unable to find tRPC Context" Error / White Screen on Frontend**
- **Cause**: React provider order issue - components trying to use tRPC hooks outside of TRPCProvider context
- **Symptoms**: Frontend shows white screen, 500 errors, "Unable to find tRPC Context" in console
- **Solution**: Ensure all components using tRPC hooks (like `api.*.useQuery()`) are wrapped inside `<TRPCProvider>`
- **Fixed in**: layout.tsx - moved `MonitoringProvider` inside `TRPCProvider`

**Servers Won't Start**
- **Port Conflicts**: Check for existing processes on ports 3000/8000 with `lsof -i :3000` and `lsof -i :8000`
- **Kill processes**: `pkill -f "next dev"` and `pkill -f "uvicorn"`
- **Verify both servers running**: Backend should show "Application startup complete", Frontend should show "✓ Ready"

### General Debugging
- Check browser console for tRPC errors
- Use Prisma Studio (`pnpm db:studio`) to inspect database
- Monitor Python API logs in development console
- Check Vercel Functions logs for production issues
- Use React Query Devtools for debugging data fetching

## Package Manager
This project uses pnpm (v10.13.1) as specified in package.json. Always use pnpm for dependency management to ensure lockfile compatibility.

**Note**: There's currently an inconsistency in `package.json` where the `dev:full` script uses `pnpm run dev` instead of `pnpm dev`. This should be updated for consistency.