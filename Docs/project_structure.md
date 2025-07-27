# Project Structure

## Root Directory

```
sightline/
├── src/                          # Application source code
│   ├── app/                      # Next.js 14 App Router
│   ├── components/               # React components
│   ├── lib/                      # Shared utilities and libraries
│   ├── server/                   # Server-side code
│   ├── styles/                   # Global styles
│   └── types/                    # TypeScript type definitions
├── api/                          # FastAPI backend
│   ├── routers/                  # API route handlers
│   ├── services/                 # Business logic
│   ├── models/                   # Pydantic models
│   └── utils/                    # Utility functions
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
├── docs/                         # Documentation
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
│   │       └── page.tsx         # Individual summary page
│   ├── settings/
│   │   └── page.tsx             # User settings
│   └── billing/
│       └── page.tsx             # Billing management
├── api/                          # API routes
│   ├── auth/[...nextauth]/
│   │   └── route.ts             # NextAuth handler
│   ├── trpc/[trpc]/
│   │   └── route.ts             # tRPC handler
│   └── webhooks/
│       └── stripe/
│           └── route.ts         # Stripe webhooks
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
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Card/
│   └── Badge/
├── molecules/                   # Combinations of atoms
│   ├── URLInput/
│   ├── SummaryCard/
│   ├── ShareModal/
│   └── PricingCard/
├── organisms/                   # Complex components
│   ├── Header/
│   ├── LibraryTable/
│   ├── SummaryViewer/
│   └── PaymentForm/
├── templates/                   # Page templates
│   ├── DashboardTemplate/
│   └── AuthTemplate/
└── providers/                   # Context providers
    ├── AuthProvider.tsx
    ├── ThemeProvider.tsx
    └── QueryProvider.tsx
```

#### /src/lib
Shared libraries and utilities
```
lib/
├── api/                         # API client setup
│   ├── trpc.ts                  # tRPC client
│   └── client.ts                # HTTP client
├── auth/                        # Auth utilities
│   ├── auth.ts                  # NextAuth config
│   └── session.ts               # Session helpers
├── db/                          # Database utilities
│   └── prisma.ts                # Prisma client singleton
├── utils/                       # General utilities
│   ├── cn.ts                    # Class name helper
│   ├── format.ts                # Formatting utilities
│   └── validation.ts            # Validation schemas
└── hooks/                       # Custom React hooks
    ├── useAuth.ts
    ├── useSummary.ts
    └── useSubscription.ts
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
│   │   └── billing.ts           # Billing router
│   ├── trpc.ts                  # tRPC setup
│   └── root.ts                  # Root router
└── services/
    ├── youtube.ts               # YouTube processing
    ├── langchain.ts             # LangChain integration
    └── stripe.ts                # Stripe services
```

### Backend Structure (/api)

#### FastAPI Application
```
api/
├── __init__.py
├── main.py                      # FastAPI app entry
├── dependencies.py              # Dependency injection
├── config.py                    # Configuration
├── routers/
│   ├── __init__.py
│   ├── summarize.py             # Summarization endpoints
│   ├── transcript.py            # Transcript processing
│   └── webhooks.py              # Webhook handlers
├── services/
│   ├── __init__.py
│   ├── youtube_service.py       # YouTube API integration
│   ├── langchain_service.py     # LangChain processing
│   ├── whisper_service.py       # Whisper fallback
│   └── queue_service.py         # Job queue management
├── models/
│   ├── __init__.py
│   ├── requests.py              # Request models
│   └── responses.py             # Response models
└── utils/
    ├── __init__.py
    ├── auth.py                  # Auth verification
    └── errors.py                # Error handling
```

### Database Structure (/prisma)

```
prisma/
├── schema.prisma                # Database schema
├── migrations/                  # Migration history
│   └── [timestamp]_init/
│       └── migration.sql
└── seed.ts                      # Database seeding
```

### Testing Structure (/tests)

```
tests/
├── unit/
│   ├── components/              # Component tests
│   ├── lib/                     # Utility tests
│   └── api/                     # API unit tests
├── integration/
│   ├── auth.test.ts            # Auth flow tests
│   └── summary.test.ts         # Summary flow tests
├── e2e/
│   ├── user-journey.spec.ts    # E2E user flows
│   └── fixtures/               # Test fixtures
└── setup/
    ├── jest.setup.ts           # Jest configuration
    └── test-utils.tsx          # Test utilities
```

### Configuration Files (/config & root)

```
Root configuration files:
├── .env.example                 # Environment variables template
├── .env.local                   # Local environment (gitignored)
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── postcss.config.js            # PostCSS config
├── .eslintrc.json              # ESLint rules
├── .prettierrc                  # Prettier config
├── jest.config.js              # Jest testing config
├── cypress.config.ts           # Cypress E2E config
├── vercel.json                 # Vercel deployment config
├── package.json                # Node dependencies
├── requirements.txt            # Python dependencies
└── docker-compose.yml          # Local development setup

config/
├── sentry.config.ts            # Sentry error tracking
└── langsmith.config.ts         # LangSmith monitoring
```

### Static Assets (/public)

```
public/
├── images/
│   ├── logo.svg
│   ├── og-image.png            # Open Graph image
│   └── icons/                  # App icons
├── fonts/                      # Custom fonts
└── manifest.json               # PWA manifest
```

### Documentation (/docs)

```
docs/
├── Implementation.md           # Implementation plan
├── project_structure.md        # This file
├── UI_UX_doc.md               # UI/UX documentation
├── api/                       # API documentation
│   ├── openapi.json           # OpenAPI spec
│   └── postman.json           # Postman collection
├── guides/                    # Developer guides
│   ├── setup.md              # Setup instructions
│   ├── deployment.md         # Deployment guide
│   └── contributing.md       # Contribution guidelines
└── adr/                      # Architecture Decision Records
    ├── 001-nextjs-14.md
    └── 002-langchain.md
```

### Build & Deployment (/scripts)

```
scripts/
├── build.sh                   # Build script
├── deploy.sh                  # Deployment script
├── migrate.sh                 # Database migration
├── seed.sh                    # Database seeding
└── test.sh                    # Test runner
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
├── ComponentName.test.tsx     # Tests
├── ComponentName.module.css   # Styles (if needed)
├── ComponentName.types.ts     # Type definitions
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
- Global UI state: Zustand (if needed)

## Environment-Specific Configurations

### Development
- `.env.local` for local development
- `docker-compose.yml` for local services
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
dist/                          # FastAPI build output
out/                           # Static export (if used)
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