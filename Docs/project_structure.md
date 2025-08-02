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
├── sign-in/[[...sign-in]]/       # Clerk sign-in pages
│   └── page.tsx                 # Clerk SignIn component
├── sign-up/[[...sign-up]]/       # Clerk sign-up pages
│   └── page.tsx                 # Clerk SignUp component
├── (dashboard)/                  # Dashboard group layout
│   ├── layout.tsx               # Dashboard layout wrapper
│   ├── library/
│   │   ├── page.tsx             # Library page
│   │   └── [id]/
│   │       ├── page.tsx         # Individual summary page
│   │       └── edit/
│   │           └── page.tsx     # Edit summary page
│   ├── settings/
│   │   └── page.tsx             # User settings (Profile, Notifications, Account Management)
│   └── billing/
│       └── page.tsx             # Billing management
├── (demo)/                       # Demo group layout
│   └── demo/
│       └── page.tsx             # Demo page
├── api/                          # API routes
│   ├── trpc/[trpc]/
│   │   └── route.ts             # tRPC handler
│   ├── webhooks/
│   │   ├── stripe/
│   │   │   └── route.ts         # Stripe webhooks
│   │   └── clerk/
│   │       └── route.ts         # Clerk user sync webhooks
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
│   │   ├── URLInput.tsx          # Enhanced with dynamic button states
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
├── modals/                      # Modal components (NEW)
│   ├── SignInModal/
│   │   ├── SignInModal.tsx       # Clerk authentication modal
│   │   └── index.ts
│   └── AuthPromptModal/
│       ├── AuthPromptModal.tsx   # Post-summary auth prompt
│       └── index.ts
├── organisms/                   # Complex components
│   ├── SummaryViewer/
│   │   ├── SummaryViewer.tsx
│   │   └── index.ts
│   └── PricingPlans/
│       ├── PricingPlans.tsx
│       └── index.ts
├── providers/                   # Context providers
│   ├── TRPCProvider.tsx         # tRPC React Query provider
│   ├── ToastProvider.tsx        # Toast notifications
│   └── MonitoringProvider.tsx   # Performance monitoring
│   # Note: AuthProvider removed - using ClerkProvider in layout.tsx
└── debug/                      # Debug components
    └── DebugPanel.tsx
```

#### /src/lib
Shared libraries and utilities
```
lib/
├── api/                         # API client setup
│   └── trpc.ts                  # tRPC client
# Note: auth/ directory removed - using Clerk for authentication
├── db/                          # Database utilities
│   └── prisma.ts                # Prisma client singleton
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts
│   └── useProgressTracking.ts      # Real-time progress tracking hook
├── utils.ts                     # General utilities
├── logger.ts                    # Logging utilities
├── monitoring.ts                # Performance monitoring
├── performance.ts               # Performance utilities
├── pricing.ts                   # Pricing utilities (Updated with Stripe integration)
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
│   │   ├── auth.ts              # Auth router (Profile, Notifications, Account Management)
│   │   ├── summary.ts           # Summary router
│   │   ├── library.ts           # Library router
│   │   ├── billing.ts           # Billing router (Stripe integration)
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
├── index.py                     # API entry point with progress tracking
│   # Enhanced with real-time progress storage and endpoints:
│   # - GET /api/progress/{task_id} for progress polling
│   # - Enhanced /api/summarize with task_id and progress updates
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

### Configuration Files

#### Root Level Configuration Files
```
/
├── tailwind.config.ts           # Tailwind CSS config 
├── postcss.config.js            # PostCSS config
├── next-env.d.ts               # Next.js types
└── tsconfig.json                # TypeScript configuration
```

#### /config Directory
```
config/
├── next.config.js               # Next.js configuration
├── .eslintrc.json              # ESLint rules
├── .prettierrc                  # Prettier config
├── components.json              # shadcn/ui config
├── vercel.json                  # Vercel deployment config
└── .vercelignore                # Vercel ignore rules
```

**Note**: Tailwind and PostCSS configs are in project root for Next.js 14 compatibility.

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

## Recent Changes: NextAuth to Clerk Migration

### Authentication System Change (July 2025)
The project has been migrated from NextAuth.js to Clerk for improved authentication and user management.

#### Files Added:
- `/src/middleware.ts` - Clerk middleware for route protection
- `/src/app/sign-in/[[...sign-in]]/page.tsx` - Clerk sign-in component
- `/src/app/sign-up/[[...sign-up]]/page.tsx` - Clerk sign-up component  
- `/src/app/api/webhooks/clerk/route.ts` - Clerk user sync webhook

#### Files Removed:
- `/src/app/api/auth/[...nextauth]/` - NextAuth API routes
- `/src/lib/auth/auth.ts` - NextAuth configuration
- `/src/components/providers/AuthProvider.tsx` - NextAuth session provider
- `/src/app/(auth)/` - Old auth group layout
- `/middleware.ts` - Old NextAuth middleware (root level)

#### Files Modified:
- `/src/app/layout.tsx` - Now uses ClerkProvider instead of AuthProvider
- `/src/lib/hooks/useAuth.ts` - Updated to use Clerk hooks
- `/src/server/api/trpc.ts` - Updated context to use Clerk's auth()
- `/src/server/api/routers/auth.ts` - Updated to work with Clerk userId
- `/prisma/schema.prisma` - Removed NextAuth models (Account, Session)
- `/.env.local` - Updated environment variables for Clerk

#### Database Changes:
- User model now uses Clerk user ID as primary key
- Removed Account and Session models (handled by Clerk)
- Added webhook endpoint for user synchronization

#### Environment Variables:
```env
# Old NextAuth variables (removed):
NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# New Clerk variables:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY  
CLERK_WEBHOOK_SECRET
```

### Modal-Based Authentication & Anonymous Flow (August 2025)
The authentication system has been enhanced with modal-based login and anonymous user support.

#### New Authentication Flow:
1. **Anonymous Users**: Can create 1 free summary without signing up
2. **Modal-Based Auth**: Sign-in/sign-up happens in modals (no page redirects)
3. **Progressive Registration**: Users see value before being asked to sign up
4. **Summary Claiming**: Anonymous summaries can be claimed after authentication

#### Files Added for Modal Flow:
- `/src/components/modals/SignInModal.tsx` - Clerk authentication modal wrapper
- `/src/components/modals/AuthPromptModal.tsx` - Post-summary authentication prompt
- `/src/lib/browser-fingerprint.ts` - Anonymous user tracking via browser fingerprinting
- `/src/hooks/useToast.ts` - Toast notification system for success feedback
- `/scripts/init-anonymous-user.js` - Database setup for anonymous user account

#### Files Modified for Anonymous Flow:
- `/src/components/molecules/URLInput/URLInput.tsx` - Dynamic button states and auth callbacks
- `/src/app/page.tsx` - Integrated modal flow with success notifications
- `/src/lib/hooks/useAuth.ts` - Added modal state management
- `/src/server/api/routers/summary.ts` - Anonymous summary procedures and enhanced limit checking

#### Enhanced Summary Limits:
- **Anonymous**: 1 summary ever (browser fingerprint + IP tracking)
- **Free Plan**: 3 summaries ever (total lifetime limit)
- **Pro Plan**: 25 summaries/month (monthly reset on 1st)
- **Complete Plan**: Unlimited summaries

#### Database Changes:
- Special "ANONYMOUS_USER" account for anonymous summaries
- Enhanced limit checking logic (total vs monthly based on plan)
- Browser fingerprint storage in summary metadata
- No schema changes required (avoided migrations)

## Environment-Specific Configurations

### Development
- `.env.local` for local development
- Hot module replacement enabled
- Source maps enabled
- Clerk development keys

### Staging
- `.env.staging` for staging environment
- Preview deployments on Vercel
- Testing integrations enabled
- Clerk test environment

### Production
- `.env.production` for production
- Optimized builds
- Error tracking enabled
- Performance monitoring active
- Clerk production keys

## Build Output Structure

```
.next/                         # Next.js build output
.vercel/                       # Vercel build cache
```

## Recent Enhancements: Real-time Progress Tracking

### Progress Tracking System (January 2025)
A comprehensive real-time progress tracking system has been implemented to provide realistic feedback during video summarization.

#### New Files Added:
- `/src/lib/hooks/useProgressTracking.ts` - Custom React hook for real-time progress polling
- Enhanced `/api/index.py` with progress storage and tracking endpoints

#### Backend Progress Tracking:
- **Progress Storage**: In-memory dictionary storing task progress by UUID
- **Progress Endpoint**: `GET /api/progress/{task_id}` for real-time polling
- **Enhanced Summarization**: `/api/summarize` now includes:
  - Unique task_id generation for each request
  - Real-time progress updates at actual processing stages:
    - 10%: "Connecting to YouTube..."
    - 25%: "Fetching video information..."
    - 40%: "Downloading transcript..."
    - 60%: "Analyzing content with AI..."
    - 80%: "Generating your summary..."
    - 100%: "Summary ready!"

#### Frontend Progress Integration:
- **useProgressTracking Hook**: Polls backend every second for real progress
- **Smart Fallbacks**: Falls back to realistic simulation if backend unavailable
- **Immediate Feedback**: Progress starts instantly when user submits URL
- **Temporary Task IDs**: Enables immediate progress display before backend response
- **Auto-cleanup**: Stops polling when task completes or errors

#### Pages Enhanced:
- **Landing Page** (`/src/app/page.tsx`): Real progress with auto-scroll to summary
- **Library Page** (`/src/app/(dashboard)/library/page.tsx`): Real progress with auto-navigation

#### Key Features:
- **Realistic Progress**: Reflects actual backend processing stages
- **Resilient**: Works even if progress API fails (graceful fallback)
- **Responsive**: 1-second polling for smooth progress updates
- **User-Friendly**: Clear stage messages and completion feedback

## Recent Updates: Payment System & Settings (August 2025)

### Stripe Payment Integration Enhancement
The PRO plan payment system has been fully implemented with direct Stripe payment links.

#### Changes Made:
- **Pricing Configuration** (`/src/lib/pricing.ts`):
  - Updated PRO plan with functional Stripe payment link
  - Removed "Coming soon" placeholder for PRO plan
  - Added fallback price ID support

- **PricingPlans Component** (`/src/components/organisms/PricingPlans/PricingPlans.tsx`):
  - Updated to handle clickable payment buttons
  - Integrated proper Stripe checkout flow
  - Dynamic button states based on payment link availability
  - Button text changes: "Coming soon" → "Subscribe now" for active plans

- **Environment Configuration**:
  - Added `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` environment variable
  - Updated `.env.example` with Stripe price ID requirements

### Complete Settings Page Implementation
A comprehensive user settings page has been implemented with three main sections.

#### New Features Added:

**1. Settings Page** (`/src/app/(dashboard)/settings/page.tsx`):
- **Profile Settings**: Name editing, email display, current plan info
- **Notification Preferences**: Email notifications, weekly digest, account alerts, usage warnings
- **Account Management**: Data export and account deletion with confirmation

**2. Enhanced Auth Router** (`/src/server/api/routers/auth.ts`):
- `updateNotificationPreferences`: Store user notification settings
- `getNotificationPreferences`: Retrieve user preferences with defaults
- `exportUserData`: Complete user data export (summaries, shared links, stats)
- `deleteAccount`: Secure account deletion with confirmation validation

**3. User Experience Improvements**:
- Tabbed interface for easy navigation
- Real-time form updates with success notifications
- Modal confirmations for dangerous operations
- Comprehensive form validation and error handling
- Data export functionality (JSON download)
- Secure account deletion requiring "DELETE" confirmation

#### Technical Implementation:
- **Data Storage**: Notification preferences stored in user metadata (JSON field)
- **Security**: Account deletion requires exact confirmation text
- **User Safety**: Export data before deletion capability
- **Integration**: Seamless tRPC integration with existing patterns
- **UI/UX**: Consistent design following app's Tailwind + shadcn/ui system

This structure supports:
- Clear separation of concerns
- Scalable architecture
- Easy navigation
- Consistent organization
- Efficient collaboration
- Automated testing
- Smooth deployment
- Real-time user feedback
- Robust progress tracking
- Comprehensive user management
- Secure payment processing
- Complete settings management