# Project Structure

## Root Directory

```
sightline/
├── src/                          # Application source code
│   ├── app/                      # Next.js 14 App Router
│   ├── components/               # React components (atomic design)
│   ├── lib/                      # Shared utilities and libraries
│   ├── server/                   # Server-side code (tRPC)
│   └── types/                    # TypeScript type definitions
├── api/                          # FastAPI backend
│   ├── routers/                  # API route handlers
│   ├── services/                 # Business logic
│   ├── models/                   # Pydantic models
│   └── utils/                    # Utility functions
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
├── Docs/                         # Documentation
├── tests/                        # Test files
├── scripts/                      # Build and deployment scripts
└── config/                       # Configuration files
```

## Detailed Structure

### Frontend Structure (/src)

#### /src/app
Next.js 14 App Router structure with file-based routing
```
app/
├── (auth)/                       # Auth group layout
│   ├── login/
│   │   └── page.tsx             # Login page
│   └── register/
│       └── page.tsx             # Registration page
├── (dashboard)/                  # Dashboard group layout
│   ├── layout.tsx               # Dashboard layout wrapper
│   ├── library/
│   │   ├── page.tsx             # Library page
│   │   └── [id]/
│   │       ├── page.tsx         # Individual summary page
│   │       └── edit/
│   │           └── page.tsx     # Edit summary page
│   ├── settings/
│   │   └── page.tsx             # User settings
│   └── billing/
│       └── page.tsx             # Billing management
├── (demo)/                       # Demo group layout
│   └── demo/
│       └── page.tsx             # Demo page
├── api/                          # API routes
│   ├── auth/[...nextauth]/
│   │   └── route.ts             # NextAuth handler
│   ├── trpc/[trpc]/
│   │   └── route.ts             # tRPC handler
│   ├── webhooks/
│   │   └── stripe/
│   │       └── route.ts         # Stripe webhooks
│   └── health/
│       └── route.ts             # Health check
├── share/[slug]/
│   └── page.tsx                 # Public share pages
├── layout.tsx                   # Root layout
├── page.tsx                     # Landing page
├── loading.tsx                  # Global loading state
├── error.tsx                    # Global error boundary
└── globals.css                  # Global styles
```

#### /src/components
Organized by atomic design principles
```
components/
├── atoms/                       # Basic building blocks
│   ├── Skeleton/
│   │   ├── Skeleton.tsx
│   │   └── index.ts
│   └── Toast/
│       ├── Toast.tsx
│       └── index.ts
├── molecules/                   # Combinations of atoms
│   ├── URLInput/
│   │   ├── URLInput.tsx
│   │   └── index.ts
│   ├── SummaryCard/
│   │   ├── SummaryCard.tsx
│   │   └── index.ts
│   ├── ShareModal/
│   │   ├── ShareModal.tsx
│   │   └── index.ts
│   ├── LibraryControls/
│   │   ├── LibraryControls.tsx
│   │   └── index.ts
│   └── QuickActionsBar/
│       ├── QuickActionsBar.tsx
│       └── index.ts
├── organisms/                   # Complex components
│   ├── SummaryViewer/
│   │   ├── SummaryViewer.tsx
│   │   └── index.ts
│   └── PricingPlans/
│       ├── PricingPlans.tsx
│       └── index.ts
├── providers/                   # Context providers
│   ├── AuthProvider.tsx
│   ├── TRPCProvider.tsx
│   ├── ToastProvider.tsx
│   └── MonitoringProvider.tsx
└── debug/                      # Debug components
    └── DebugPanel.tsx
```

#### /src/lib
Shared libraries and utilities
```
lib/
├── api/                         # API client setup
│   └── trpc.ts                  # tRPC client
├── auth/                        # Auth utilities
│   └── auth.ts                  # NextAuth config
├── db/                          # Database utilities
│   └── prisma.ts                # Prisma client singleton
├── hooks/                       # Custom React hooks
│   └── useAuth.ts
├── utils.ts                     # General utilities
├── logger.ts                    # Logging utilities
├── monitoring.ts                # Performance monitoring
├── performance.ts               # Performance utilities
├── pricing.ts                   # Pricing utilities
├── rateLimit.ts                 # Rate limiting
├── security.ts                  # Security utilities
├── stripe.ts                    # Stripe utilities
└── stripe-client.ts             # Stripe client
```

#### /src/server
Server-side code and tRPC routers
```
server/
├── api/
│   ├── routers/
│   │   ├── auth.ts              # Auth router
│   │   ├── summary.ts           # Summary router
│   │   ├── library.ts           # Library router
│   │   ├── billing.ts           # Billing router
│   │   └── share.ts             # Share router
│   ├── trpc.ts                  # tRPC setup
│   └── root.ts                  # Root router
```

#### /src/types
TypeScript type definitions
```
types/
└── next-auth.d.ts              # NextAuth type extensions
```

### Backend Structure (/api)

#### FastAPI Application
```
api/
├── __init__.py
├── main.py                      # FastAPI app entry
├── dependencies.py              # Dependency injection
├── config.py                    # Configuration
├── index.py                     # API entry point
├── routers/
│   ├── __init__.py
│   ├── summarize.py             # Summarization endpoints
│   └── transcript.py            # Transcript processing
├── services/
│   ├── __init__.py
│   ├── youtube_service.py       # YouTube API integration
│   ├── langchain_service.py     # LangChain processing
│   ├── gumloop_service.py       # Gumloop integration
│   ├── oxylabs_service.py       # Oxylabs integration
│   ├── reliable_transcript_service.py # Reliable transcript service
│   ├── transcript_fallback_service.py # Fallback service
│   ├── youtube_direct_service.py # Direct YouTube service
│   ├── youtube_transcript_service.py # YouTube transcript service
│   ├── ytdlp_service.py         # yt-dlp service
│   └── gumloop_parser.py        # Gumloop parser
├── models/
│   ├── __init__.py
│   ├── requests.py              # Request models
│   └── responses.py             # Response models
└── utils/                       # Utility functions
```

### Database Structure (/prisma)

```
prisma/
└── schema.prisma                # Database schema
```

### Testing Structure (/tests)

```
tests/
├── test_api_response.py         # API response tests
├── test_fallback.py             # Fallback service tests
├── test_full_integration.py     # Full integration tests
├── test_gumloop_integration.py  # Gumloop integration tests
├── test_gumloop.py              # Gumloop service tests
├── test_oxylabs.py              # Oxylabs service tests
├── test_reliable.py             # Reliable service tests
├── test_transcript_service.py   # Transcript service tests
├── test_ytdlp.py                # yt-dlp service tests
├── test-playbooks-parsing.py    # Playbooks parsing tests
├── test-parsing.py              # Parsing tests
├── test-full-flow.js            # Full flow tests
├── test-oauth.html              # OAuth tests
├── test-markdown-parsing.md     # Markdown parsing tests
└── test-gumloop-output.md       # Gumloop output tests
```

### Configuration Files (/config)

```
config/
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── .eslintrc.json              # ESLint rules
├── .prettierrc                  # Prettier config
├── components.json              # shadcn/ui config
├── vercel.json                  # Vercel deployment config
├── .vercelignore                # Vercel ignore rules
└── next-env.d.ts               # Next.js types
```

### Documentation (/Docs)

```
Docs/
├── Implementation.md            # Implementation plan
├── project_structure.md         # This file
├── UI_UX_doc.md                # UI/UX documentation
├── Bug_tracking.md             # Bug tracking and fixes
├── PRODUCTION_DEPLOYMENT.md    # Production deployment guide
├── PRODUCTION_READY.md         # Production readiness checklist
├── DEPLOYMENT_CHECKLIST.md     # Deployment checklist
├── DEPLOYMENT.md               # General deployment guide
├── ENVIRONMENT.md              # Environment setup
├── ENABLE_USAGE_LIMITS.md     # Usage limits guide
├── SECURITY_AUDIT.md          # Security audit
├── IMPLEMENTATION_STATUS.md    # Implementation status
└── TROUBLESHOOTING.md         # Troubleshooting guide
```

### Build & Deployment (/scripts)

```
scripts/
├── debug-startup.sh            # Debug startup script
├── deploy-production.sh        # Production deployment
├── dev.sh                      # Development setup
├── setup-env.sh                # Environment setup
├── test-db.js                  # Database testing
├── test-pipeline.js            # Pipeline testing
└── test-youtube-transcript.py  # YouTube transcript testing
```

### Static Assets (/public)

```
public/
└── [static assets]             # Static files
```

## File Naming Conventions

### TypeScript/React Files
- Components: PascalCase (e.g., `SummaryCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase with `.types.ts` suffix
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`)
- Constants: UPPER_SNAKE_CASE in `.constants.ts` files

### Python Files
- Modules: snake_case (e.g., `youtube_service.py`)
- Classes: PascalCase within files
- Constants: UPPER_SNAKE_CASE

### Styles
- CSS Modules: `[Component].module.css`
- Global styles: lowercase with hyphens

## Module Organization Patterns

### Component Structure
Each component follows this pattern:
```
ComponentName/
├── ComponentName.tsx          # Main component
├── ComponentName.test.tsx     # Tests (if needed)
├── ComponentName.module.css   # Styles (if needed)
├── ComponentName.types.ts     # Type definitions (if needed)
└── index.ts                   # Barrel export
```

### API Route Structure
- Group related endpoints in routers
- Keep business logic in services
- Use dependency injection for shared resources
- Maintain separation between HTTP layer and business logic

### State Management
- Server state: TanStack Query + tRPC
- Client state: React hooks and context
- Form state: React Hook Form
- Global UI state: Context providers

## Environment-Specific Configurations

### Development
- `.env.local` for local development
- Hot module replacement enabled
- Source maps enabled

### Staging
- `.env.staging` for staging environment
- Preview deployments on Vercel
- Testing integrations enabled

### Production
- `.env.production` for production
- Optimized builds
- Error tracking enabled
- Performance monitoring active

## Build Output Structure

```
.next/                         # Next.js build output
.vercel/                       # Vercel build cache
```

This structure supports:
- Clear separation of concerns
- Scalable architecture
- Easy navigation
- Consistent organization
- Efficient collaboration
- Automated testing
- Smooth deployment