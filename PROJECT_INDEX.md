# Sightline.ai Project Reference Index

## Quick Access Reference for Development and Navigation

This index provides fast access to key components, routes, and files in the Sightline.ai repository for efficient development workflow.

---

## 🚀 Essential Commands

```bash
# Development
pnpm dev                    # Frontend only (port 3000)
pnpm api:dev               # Backend only (port 8000)
pnpm dev:full              # Both frontend + backend
pnpm build                 # Production build

# Quality
pnpm lint && pnpm typecheck && pnpm format:check

# Database
pnpm db:generate           # Generate Prisma client
pnpm db:push               # Push schema changes (dev)
pnpm db:studio             # Open Prisma Studio GUI

# Testing
node scripts/test-db.js           # Test database
node scripts/test-pipeline.js     # Test summarization
cd api && python -m pytest        # Python tests
```

---

## 🏗️ Architecture Overview

```
Sightline.ai/
├── Frontend (Next.js 14 App Router)
│   ├── Authentication: Clerk + Anonymous Support
│   ├── State: tRPC + TanStack Query  
│   ├── UI: Tailwind + shadcn/ui + Atomic Design
│   └── Real-time: Progress Tracking
├── Backend APIs
│   ├── tRPC Routers: Type-safe API layer
│   └── Python FastAPI: AI Processing + Transcripts
├── Database: PostgreSQL (Neon) + Prisma ORM
└── Services: OpenAI, YouTube API, Stripe, Clerk
```

---

## 📁 Core Directory Structure

### Frontend (`src/`)
```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Authenticated routes
│   │   ├── library/          # User summaries
│   │   ├── billing/          # Stripe integration
│   │   └── settings/         # User preferences
│   ├── api/                  # API routes & webhooks
│   └── share/[slug]/         # Public sharing
├── components/               # Atomic Design Pattern
│   ├── atoms/               # Basic elements (Toast, Skeleton)
│   ├── molecules/           # Simple components (URLInput, SummaryCard)
│   ├── organisms/           # Complex components (SummaryViewer, PricingPlans)
│   ├── modals/              # Modal components
│   └── providers/           # Context providers
├── server/api/              # tRPC backend
│   └── routers/             # API route definitions
└── lib/                     # Utilities & services
```

### Backend (`api/`)
```
api/
├── index.py                 # FastAPI entry point
├── services/                # Transcript & AI services
│   ├── reliable_transcript_service.py    # Main service with fallbacks
│   ├── youtube_service.py               # YouTube Data API
│   ├── gumloop_service.py              # Gumloop integration
│   └── langchain_service.py            # OpenAI summarization
└── routers/                 # FastAPI routes
    ├── summarize.py         # Main summarization endpoint
    └── transcript.py        # Transcript-only endpoint
```

---

## 🔗 API Routes & Procedures

### tRPC Routers (`src/server/api/routers/`)

#### Summary Router (`summary.ts`)
- `create` → Create new video summary (anonymous support)
- `getById` → Fetch summary by ID
- `updateById` → Edit summary details
- `deleteById` → Remove summary
- `getProgress` → Real-time progress tracking

#### Library Router (`library.ts`)  
- `getAll` → User's summary collection
- `getStats` → Usage statistics & limits
- `bulkDelete` → Multiple summary deletion

#### Auth Router (`auth.ts`)
- `getCurrentUser` → User profile data
- `updateProfile` → Edit user settings
- `deleteAccount` → Account deletion
- `exportUserData` → GDPR data export

#### Billing Router (`billing.ts`)
- `createCheckoutSession` → Stripe payment flow
- `createPortalSession` → Subscription management
- `getSubscription` → Current plan details

#### Share Router (`share.ts`)
- `createShareLink` → Generate public URL
- `getSharedSummary` → Fetch shared content
- `revokeShare` → Disable public access

### Python API Routes (`api/routers/`)
- `POST /summarize` → Full video summarization with progress tracking
- `POST /transcript` → Transcript-only extraction
- `GET /progress/{task_id}` → Real-time progress updates

---

## 🧩 Component Architecture

### Atomic Design Hierarchy

#### Atoms (`src/components/atoms/`)
- `Skeleton` → Loading placeholders
- `Toast` → Notification system
- `FloatingActionButton` → Floating UI element

#### Molecules (`src/components/molecules/`)
- `URLInput` → Video URL input with validation
- `SummaryCard` → Summary preview cards
- `LibraryControls` → Search, filter, sort controls
- `ActionsSidebar` → Summary actions (copy, share, export)
- `KeyMomentsSidebar` → Clickable timestamps
- `LearningHubTabs` → Organized learning materials
- `MainContentColumn` → Primary content display
- `InsightEnrichment` → Meta-analysis sidebar
- `QuickActionsBar` → Quick action buttons
- `ShareModal` → Public sharing interface

#### Organisms (`src/components/organisms/`)
- `SummaryViewer` → Complete summary display with multi-column layout
- `PricingPlans` → Subscription plan selection

#### Modals (`src/components/modals/`)
- `SignInModal` → Authentication modal
- `AuthPromptModal` → Login prompts for actions

---

## 🗄️ Database Schema (`prisma/schema.prisma`)

### Core Models
- **User** → Synced from Clerk, subscription info
- **Summary** → Video summaries with metadata & content
- **Subscription** → Stripe subscription details  
- **Share** → Public sharing configuration

### Key Relationships
```
User (1) ←→ (many) Summary
User (1) ←→ (1) Subscription  
Summary (1) ←→ (many) Share
```

---

## ⚙️ Configuration Files

### Essential Config
- `package.json` → Dependencies & scripts (pnpm)
- `next.config.js` → Next.js configuration
- `tailwind.config.ts` → Styling system
- `tsconfig.json` → TypeScript configuration
- `prisma/schema.prisma` → Database schema

### Testing & Quality
- `jest.config.js` → Unit testing setup
- `playwright.config.ts` → E2E testing
- `.eslintrc.json` → Code linting rules

### Environment & Deployment  
- `.env.local` → Local environment variables
- `vercel.json` → Deployment configuration
- `requirements.txt` → Python dependencies

---

## 🔑 Environment Variables

### Core Application
- `DATABASE_URL` → Postgres connection (Neon)
- `NEXT_PUBLIC_APP_URL` → Application base URL

### Authentication (Clerk)
- `CLERK_SECRET_KEY` → Server-side secret
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → Client-side key
- `CLERK_WEBHOOK_SECRET` → Webhook verification

### Payments (Stripe)
- `STRIPE_SECRET_KEY` → Server-side secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Client-side key
- `STRIPE_WEBHOOK_SECRET` → Webhook verification
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` → Pro plan pricing

### AI Services
- `OPENAI_API_KEY` → GPT summarization & Smart Collections
- `YOUTUBE_API_KEY` → Video metadata

### Transcript Services (Fallback Chain)
- `GUMLOOP_API_KEY` → Enhanced transcript processing
- `OXYLABS_USERNAME` / `OXYLABS_PASSWORD` → Proxy service

---

## 🔄 Data Flow & Processing

### Summary Creation Pipeline
1. **URL Input** → URLInput component validates YouTube URL
2. **Transcript Extraction** → Python API with fallback chain:
   - Gumloop (enhanced) → YouTube Direct → YT-DLP → Oxylabs
3. **AI Processing** → OpenAI GPT-4 with structured prompts
4. **Smart Collections** → AI classification into categories
5. **Real-time Updates** → Progress tracking via task IDs
6. **Database Storage** → Prisma ORM to PostgreSQL

### Authentication Flow
1. **Anonymous Access** → Browser fingerprinting for free summaries
2. **Sign-up Prompt** → AuthPromptModal after actions
3. **Clerk Integration** → Modal-based auth flow
4. **User Sync** → Webhook creates database record
5. **Summary Claiming** → Anonymous summaries transferred to user

---

## 🎯 Key Features & Integrations

### Smart Collections (AI-Powered)
- Automatic categorization using OpenAI classification
- Entity extraction and intelligent tagging
- See `ARCHITECTURE.md#smart-collections-processing`

### Anonymous User Support  
- Browser fingerprinting (no cookies required)
- 1 free summary per browser/IP combination
- Seamless transition to authenticated user

### Real-time Progress Tracking
- Task-based progress updates via `/progress/{task_id}`
- Realistic stage messaging with actual backend coordination
- Graceful fallback to simulation mode

### Multi-Column Summary Display
- **MainContentColumn** → Video embed, TL;DR, sections
- **KeyMomentsSidebar** → Clickable timestamps with YouTube integration
- **ActionsSidebar** → Copy, share, export functions  
- **LearningHubTabs** → Frameworks, flashcards, quiz, glossary
- **InsightEnrichment** → Sentiment, tools, risk analysis

---

## 🧪 Testing Structure

### Frontend Tests (`src/`)
- `__tests__/` directories alongside components
- Jest + React Testing Library
- Mock Service Worker for API mocking

### Backend Tests (`api/` + `tests/`)
- Python pytest for API testing
- Integration tests for full pipeline
- Service-specific test files

### E2E Tests (`e2e/`)
- Playwright cross-browser testing
- User flow validation
- Performance benchmarks

### Test Commands
```bash
# Frontend unit tests
npm test

# Python API tests  
cd api && python -m pytest

# E2E tests
npx playwright test

# Specific test files
python tests/test_gumloop.py -v
node scripts/test-pipeline.js
```

---

## 🔍 Debugging & Monitoring

### Common Issues & Solutions
- **White Screen/tRPC Context Error** → Check provider order in layout.tsx
- **Port Conflicts** → `lsof -i :3000` and `lsof -i :8000`
- **Server Start Issues** → `pkill -f "next dev"` and `pkill -f "uvicorn"`

### Debugging Tools
- Browser console for tRPC errors
- Prisma Studio (`pnpm db:studio`) for database inspection  
- Python API logs in development console
- React Query Devtools for data fetching
- Sentry error tracking (production)

### Health Checks
- `/api/health` → Application health status
- `pnpm env:check` → Environment validation
- `node scripts/test-db.js` → Database connectivity

---

## 📚 Documentation References

### Primary Documentation
- `README.md` → Project overview & setup
- `CLAUDE.md` → AI assistant guidance
- `ARCHITECTURE.md` → Technical architecture deep-dive
- `CONTRIBUTING.md` → Development guidelines

### Specialized Docs
- `DECISIONS/` → Architecture Decision Records (ADRs)
- `Docs/` → Detailed development documentation
- `SECURITY.md` → Security considerations
- `RATE_LIMITS.md` → API rate limiting

### Quick References
- `Docs/development/quick-reference.md` → Command reference
- `Docs/development/bug-tracking.md` → Known issues
- `GLOSSARY.md` → Technical terminology

---

## 🚦 Usage Limits & Plans

### Anonymous Users
- 1 summary per browser fingerprint + IP (lifetime limit)

### Free Plan  
- 3 summaries total (lifetime limit)
- Basic features only

### Pro Plan ($9/month)
- 25 summaries per month (resets on 1st)
- Advanced features + priority processing

### Complete Plan (if implemented)
- Unlimited summaries
- Premium features + priority support

---

*Last Updated: January 2025 | Generated for fast development reference*