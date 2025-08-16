# Repository Map - Sightline.ai

Generated: 2025-08-15

## Project Structure (Depth 4)

```
sightline/
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD workflows
│       └── ci.yml              # Pull request CI checks
├── .reports/                   # Audit reports (generated)
├── api/                        # Python FastAPI backend
│   ├── middleware/             # API middleware
│   ├── models/                 # Pydantic models
│   ├── routers/                # API route handlers
│   └── services/               # Business logic services
├── config/                     # Configuration files
├── DECISIONS/                  # Architecture decision records
├── docs/                       # Documentation
│   ├── _autogen/              # Auto-generated docs
│   ├── architecture/          # Architecture docs
│   ├── archive/               # Archived/legacy docs
│   ├── development/           # Development guides
│   ├── operations/            # Operations guides
│   └── reports/               # Various reports
├── e2e/                       # End-to-end tests
│   └── helpers/               # E2E test utilities
├── prisma/                    # Database schema
├── public/                    # Static assets
│   └── images/                # Image assets
│       ├── logo/              # Logo files
│       └── podcasts/          # Podcast thumbnails
├── scripts/                   # Utility scripts
├── src/                       # Next.js source code
│   ├── app/                   # App router pages
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── (demo)/            # Demo routes
│   │   ├── actions/           # Server actions
│   │   ├── admin/             # Admin pages
│   │   ├── api/               # API routes
│   │   ├── debug/             # Debug pages
│   │   ├── share/             # Public share pages
│   │   ├── sign-in/           # Authentication pages
│   │   ├── sign-up/           # Registration pages
│   │   └── upgrade/           # Subscription upgrade
│   ├── components/            # React components
│   │   ├── atoms/             # Basic UI elements
│   │   ├── debug/             # Debug components
│   │   ├── modals/            # Modal components
│   │   ├── molecules/         # Composite components
│   │   ├── monitoring/        # Monitoring widgets
│   │   ├── organisms/         # Complex components
│   │   └── providers/         # Context providers
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   │   ├── api/               # API utilities
│   │   ├── db/                # Database utilities
│   │   ├── hooks/             # Library hooks
│   │   └── stripe/            # Stripe utilities
│   ├── server/                # Server-side code
│   │   └── api/               # tRPC API
│   │       ├── middleware/    # API middleware
│   │       └── routers/       # tRPC routers
│   ├── test-utils/            # Test utilities
│   └── types/                 # TypeScript types
├── tests/                     # Python tests
└── venv/                      # Python virtual environment
```

## Key Entrypoints

### Frontend
- **Main App**: [`src/app/layout.tsx`](../../src/app/layout.tsx) - Root layout with providers
- **Landing Page**: [`src/app/page.tsx`](../../src/app/page.tsx) - Public landing page
- **Library**: [`src/app/(dashboard)/library/page.tsx`](../../src/app/(dashboard)/library/page.tsx) - User's summary library
- **Summary View**: [`src/app/(dashboard)/library/[id]/page.tsx`](../../src/app/(dashboard)/library/[id]/page.tsx) - Individual summary display

### Backend
- **FastAPI**: [`api/index.py`](../../api/index.py) - Main FastAPI application
- **tRPC Root**: [`src/server/api/root.ts`](../../src/server/api/root.ts) - tRPC router aggregation
- **Database**: [`prisma/schema.prisma`](../../prisma/schema.prisma) - Database schema definition

### Configuration
- **Next.js**: [`next.config.js`](../../next.config.js) - Next.js configuration
- **TypeScript**: [`tsconfig.json`](../../tsconfig.json) - TypeScript configuration
- **Package**: [`package.json`](../../package.json) - Dependencies and scripts

## Folder Purposes

### `/api` - Python Backend
FastAPI backend handling video processing, transcription, and AI summarization. Includes multiple transcript service fallbacks (YouTube, YT-DLP, Oxylabs, Gumloop).

### `/src/app` - Next.js App Router
Page components and API routes using Next.js 14 App Router pattern. Organized by route groups for dashboard, demo, authentication, and public pages.

### `/src/components` - React Components
Atomic design pattern:
- **atoms/**: Basic building blocks (buttons, skeletons)
- **molecules/**: Simple combinations (cards, inputs)
- **organisms/**: Complex components (viewers, plans)
- **modals/**: Modal dialogs
- **providers/**: React context providers

### `/src/server/api` - tRPC Backend
Type-safe API layer with routers for:
- **auth**: User management
- **billing**: Stripe subscriptions
- **library**: Summary management
- **share**: Public sharing
- **summary**: Video summarization

### `/src/lib` - Utilities
Shared utilities for:
- Authentication (Clerk)
- Database (Prisma)
- Payments (Stripe)
- Monitoring (Sentry)
- Performance tracking
- Environment validation

### `/prisma` - Database
PostgreSQL schema with models for:
- Users (Clerk integration)
- Summaries (video content)
- Categories & Tags (organization)
- Usage tracking
- Progress tracking

### `/scripts` - Automation
Development and deployment scripts for:
- Environment setup
- Database operations
- Testing
- Validation

### `/e2e` - Testing
Playwright end-to-end tests covering:
- User flows
- Payment processes
- Performance benchmarks
- Security validation

## Package.json Scripts

### Development
- `dev`: Start Next.js dev server (port 3000)
- `api:dev`: Start FastAPI server (port 8000)
- `dev:full`: Run both frontend and backend concurrently

### Build & Deploy
- `build`: Production build
- `build:analyze`: Build with bundle analyzer
- `start`: Start production server
- `deploy`: Deploy to Vercel production
- `deploy:preview`: Deploy preview to Vercel

### Database
- `db:generate`: Generate Prisma client
- `db:migrate`: Run migrations (production)
- `db:push`: Push schema changes (development)
- `db:studio`: Open Prisma Studio GUI
- `db:seed`: Seed database with test data

### Code Quality
- `lint`: Run ESLint
- `lint:fix`: Fix linting issues
- `typecheck`: TypeScript type checking
- `format`: Format code with Prettier
- `format:check`: Check formatting

### Testing
- `test`: Run Jest tests
- `test:watch`: Jest in watch mode
- `test:coverage`: Generate coverage report
- `test:e2e`: Run Playwright tests
- `test:e2e:ui`: Playwright with UI mode

### Environment
- `env:setup`: Set up environment variables
- `env:validate`: Validate environment variables
- `env:check`: Quick env check

## TypeScript Configuration

### Compiler Options
- **Target**: ES5
- **Module**: ESNext with bundler resolution
- **Strict**: Enabled
- **JSX**: Preserve
- **Paths**: `@/*` → `./src/*`

### Include/Exclude
- **Include**: All `.ts`, `.tsx` files
- **Exclude**: `node_modules`

## Next.js Configuration

### Features
- **React Strict Mode**: Enabled
- **SWC Minification**: Enabled
- **Compression**: Enabled
- **Image Optimization**: WebP/AVIF formats
- **Security Headers**: CSP, HSTS, XSS protection
- **Sentry Integration**: Error tracking
- **Bundle Analyzer**: Development mode

### Experimental
- **Optimize Package Imports**: lucide-react, react-markdown
- **Instrumentation Hook**: Enabled

## Database Models (Prisma)

### Core Models
- **User**: Authentication, subscription, usage tracking
- **Summary**: Video summaries with rich content
- **Category**: Content categorization
- **Tag**: Entity tagging (people, companies, topics)
- **ShareLink**: Public sharing functionality
- **Progress**: Async task tracking
- **UsageEvent**: Usage audit trail

### Rich Content Fields (Summary)
- **keyMoments**: Timestamped insights
- **frameworks**: Mental models
- **debunkedAssumptions**: Misconceptions
- **inPractice**: Real-world applications
- **playbooks**: Action triggers
- **learningPack**: Educational content
- **enrichment**: Meta-analysis

## tRPC Routers & Procedures

### authRouter
- `getCurrentUser` (query): Get authenticated user
- `updateProfile` (mutation): Update user profile
- `getNotificationPreferences` (query): Get preferences
- `exportUserData` (query): Export user data
- `deleteAccount` (mutation): Delete user account

### billingRouter
- `getSubscription` (query): Current subscription status
- `createCheckoutSession` (mutation): Start Stripe checkout
- `cancelSubscription` (mutation): Cancel subscription
- `getUsageStats` (query): Usage statistics

### libraryRouter
- `getAll` (query): Get user's summaries
- `getStats` (query): Library statistics
- `getTags` (query): Available tags
- `getCategories` (query): Available categories

### shareRouter
- `create` (mutation): Create share link
- `getBySlug` (query): Get shared summary
- `getById` (query): Get share by ID
- `update` (mutation): Update share settings
- `delete` (mutation): Delete share link
- `getAll` (query): List user's shares

### summaryRouter
- `create` (mutation): Create new summary
- `createAnonymous` (mutation): Anonymous summary
- `getById` (query): Get summary by ID
- `update` (mutation): Update summary
- `updateNotes` (mutation): Update user notes
- `delete` (mutation): Delete summary
- `getByVideoId` (query): Get by YouTube ID
- `toggleFavorite` (mutation): Toggle favorite status
- `claimAnonymousSummaries` (query): Claim anonymous
- `rate` (mutation): Rate summary

## FastAPI Endpoints

### Health & Status
- `GET /api/health`: Health check
- `GET /api`: API info

### Progress Tracking
- `GET /api/progress/{task_id}`: Get task progress
- `DELETE /api/progress/{task_id}`: Delete progress
- `GET /api/progress/debug/{task_id}`: Debug info

### Summarization
- `POST /api/summarize`: Main summarization endpoint
- `POST /api/test-summarize`: Test endpoint
- `POST /api/refresh-metadata`: Refresh YouTube metadata
- `POST /api/dev/synthetic`: Synthetic test data (dev only)

### Routers (via FastAPI Router)
- `POST /summarize`: Alternative summarization
- `POST /transcript`: Get transcript only

## Environment Variables

### Core Application
- `NODE_ENV`: development/production
- `NEXT_PUBLIC_APP_URL`: Application URL
- `DATABASE_URL`: PostgreSQL connection

### Authentication (Clerk)
- `CLERK_SECRET_KEY`: Server-side key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Client key
- `CLERK_WEBHOOK_SECRET`: Webhook verification

### AI Services
- `OPENAI_API_KEY`: OpenAI API key
- `YOUTUBE_API_KEY`: YouTube Data API (optional)

### Payments (Stripe)
- `STRIPE_SECRET_KEY`: Server-side key
- `STRIPE_WEBHOOK_SECRET`: Webhook verification
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Client key
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`: Pro plan price
- `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID`: Enterprise price

### Optional Services
- **Sentry**: Error tracking (DSN, org, project, auth token)
- **PostHog**: Analytics (key, host)
- **MailerLite**: Email marketing
- **LangSmith**: LLM monitoring
- **Upstash Redis**: Caching
- **Gumloop**: Enhanced transcription
- **Oxylabs**: Proxy service

## Key Technologies

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript 5
- Tailwind CSS
- tRPC
- TanStack Query
- Clerk (Auth)
- Stripe (Payments)

### Backend
- FastAPI (Python)
- Prisma ORM
- PostgreSQL (Neon)
- OpenAI API
- LangChain
- YouTube API

### Infrastructure
- Vercel (Hosting)
- Neon (Database)
- Sentry (Monitoring)
- PostHog (Analytics)

### Testing
- Jest (Unit)
- Playwright (E2E)
- MSW (API Mocking)