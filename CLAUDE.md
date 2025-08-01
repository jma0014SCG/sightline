# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sightline.ai is a YouTube video summarization platform that uses AI to create concise, accurate summaries of video content. It features a Next.js 14 frontend with TypeScript, a FastAPI Python backend for AI processing, and integrates with multiple services including Clerk for auth, Stripe for payments, and OpenAI for summarization.

## Essential Commands

### Development
```bash
# Install dependencies
pnpm install
pip install -r requirements.txt.disabled

# Start development servers
pnpm dev                    # Frontend only (port 3000)
npm run api:dev            # Backend only (port 8000)
npm run dev:full           # Both frontend and backend

# Environment setup
npm run env:setup          # Set up environment variables
npm run env:validate       # Validate environment variables
```

### Code Quality
```bash
# Linting and type checking
npm run lint               # Run ESLint
npm run lint:fix          # Fix linting issues
npm run typecheck         # TypeScript type checking
npm run format            # Format code with Prettier
npm run format:check      # Check formatting
```

### Database
```bash
# Prisma commands
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
```

### Build and Deployment
```bash
npm run build            # Production build
npm run build:prod       # Production build with NODE_ENV=production
npm run deploy           # Deploy to Vercel production
npm run deploy:preview   # Deploy preview to Vercel
```

### Testing
```bash
# Frontend tests
node scripts/test-db.js           # Test database connection
node scripts/test-pipeline.js     # Test summarization pipeline

# Python API tests
cd api && python -m pytest        # Run all Python tests
python tests/test_full_integration.py  # Full integration test
```

## Architecture Overview

### Frontend (Next.js 14 App Router)
- **Authentication**: Clerk (replaces NextAuth) - handles user auth, webhooks for user sync
- **State Management**: TanStack Query + tRPC for type-safe API calls
- **UI Components**: Atomic design pattern (atoms → molecules → organisms)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Key Pages**:
  - `/` - Landing page with URL input
  - `/library` - User's saved summaries  
  - `/library/[id]` - Individual summary view
  - `/settings` - Profile, notifications, account management
  - `/billing` - Stripe subscription management

### Backend Architecture
- **API Layer**: tRPC routers in `src/server/api/routers/`
  - `summary.ts` - Video summarization endpoints
  - `library.ts` - User library management
  - `billing.ts` - Stripe integration
  - `auth.ts` - User management
  - `share.ts` - Public sharing features

- **Python API**: FastAPI in `api/` directory
  - Multiple transcript services with fallback chain
  - LangChain + OpenAI for summarization
  - Services: YouTube, YT-DLP, Oxylabs, Gumloop

### Key Integration Points
1. **Clerk Webhooks** (`/api/webhooks/clerk`) - Syncs users to database
2. **Stripe Webhooks** (`/api/webhooks/stripe`) - Handles subscription events
3. **tRPC Bridge** - Type-safe communication between frontend and backend
4. **Progress Tracking** - Real-time updates via `useProgressTracking` hook

### Database Schema (Prisma)
- **User** - Synced from Clerk, includes subscription info
- **Summary** - Video summaries with metadata
- **Subscription** - Stripe subscription details
- **Share** - Public sharing functionality

## Development Workflow

1. **Before implementing UI**: Check `/Docs/UI_UX_doc.md` for design specifications
2. **For task planning**: Consult `/Docs/Implementation.md` for current stage
3. **Error handling**: Check `/Docs/Bug_tracking.md` before fixing issues
4. **Project structure**: Follow patterns in `/Docs/project_structure.md`

## Environment Variables

Critical variables needed:
- `DATABASE_URL` - Postgres connection string
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe payments
- `OPENAI_API_KEY` - AI summarization
- `YOUTUBE_API_KEY` - YouTube data access
- `GUMLOOP_API_KEY`, `OXYLABS_USERNAME/PASSWORD` - Transcript services

## Common Tasks

### Adding a new API endpoint
1. Create tRPC router in `src/server/api/routers/`
2. Add to root router in `src/server/api/root.ts`
3. Use in frontend via `api.<router>.<procedure>.useMutation()` or `.useQuery()`

### Modifying the database
1. Update schema in `prisma/schema.prisma`
2. Run `npm run db:generate` to update client
3. Run `npm run db:push` for development or `npm run db:migrate` for production

### Testing payment flows
1. Use Stripe test mode with test cards
2. Monitor webhooks at `/api/webhooks/stripe`
3. Check subscription status in database

## Security Considerations
- All API routes are protected by Clerk authentication
- Rate limiting implemented via custom middleware
- Input validation using Zod schemas
- Environment variables validated on startup
- XSS protection via DOMPurify for markdown rendering