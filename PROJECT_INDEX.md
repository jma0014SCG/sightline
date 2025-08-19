# 📚 Sightline.ai Project Index

**Generated**: 2025-08-18  
**Type**: Comprehensive Project Navigation with Deep Analysis  
**Scope**: Complete repository structure and relationships

## 📊 Project Statistics

| Metric | Count | Health |
|--------|-------|--------|
| **TypeScript Files** | 162 | ✅ Well-structured |
| **Python Files** | 43 | ✅ Organized services |
| **React Components** | 37 | ✅ Atomic design |
| **API Routes** | 9 | ✅ RESTful patterns |
| **tRPC Routers** | 5 | ✅ Type-safe |
| **Documentation Files** | 1,727 | ⚠️ Needs cleanup |
| **Test Files** | 28+ | ✅ Good coverage |

## 🏗️ Architecture Overview

```
Sightline.ai
├── Frontend (Next.js 14 + TypeScript)
│   ├── App Router (src/app/)
│   ├── Components (Atomic Design)
│   └── tRPC Client
├── Backend Services
│   ├── tRPC API (src/server/)
│   └── FastAPI (api/)
├── Database (PostgreSQL + Prisma)
└── External Services (Clerk, Stripe, OpenAI)
```

## 📁 Complete Directory Index

### 🌟 Root Level

| Directory/File | Purpose | Status | Key Files |
|---------------|---------|--------|-----------|
| **/** | Project root | Active | package.json, .env.local |
| **README.md** | Main documentation | ✅ Current | Project overview |
| **ARCHITECTURE.md** | System design | ✅ Current | Technical architecture |
| **CLAUDE.md** | AI assistant guide | ✅ Current | Claude Code instructions |
| **CHANGELOG.md** | Version history | Active | Release notes |
| **CONTRIBUTING.md** | Contribution guide | Active | Dev workflow |
| **SECURITY.md** | Security policies | Active | Security implementation |
| **RATE_LIMITS.md** | API limits | ✅ Current | Rate limiting config |
| **GLOSSARY.md** | Terms & definitions | Active | Canonical terminology |

### 🎯 Source Code (`/src`)

#### App Router (`/src/app`)

| Path | Purpose | Type | Key Features |
|------|---------|------|--------------|
| **/(dashboard)** | Protected routes | Layout Group | Auth required |
| ├── **/billing** | Subscription management | Page | Stripe integration |
| ├── **/library** | User summaries | Page | Main library view |
| ├── **/library/[id]** | Summary detail | Dynamic | Individual summary |
| ├── **/library/[id]/edit** | Summary editor | Dynamic | Content editing |
| └── **/settings** | User preferences | Page | Profile management |
| **/(demo)** | Demo routes | Layout Group | Public access |
| **/api** | API routes | API | Backend endpoints |
| ├── **/trpc/[trpc]** | tRPC handler | API | Type-safe RPC |
| ├── **/webhooks/clerk** | Clerk webhooks | API | User sync |
| ├── **/webhooks/stripe** | Stripe webhooks | API | Payment events |
| └── **/health** | Health checks | API | System status |
| **/share/[slug]** | Public shares | Dynamic | Shared summaries |
| **/sign-in** | Authentication | Page | Clerk sign-in |
| **/sign-up** | Registration | Page | Clerk sign-up |
| **/upgrade** | Plan upgrade | Page | Subscription flow |
| **page.tsx** | Landing page | Page | Main entry point |
| **layout.tsx** | Root layout | Layout | App wrapper |

#### Components (`/src/components`)

**Atomic Design Pattern**:

| Level | Path | Count | Purpose |
|-------|------|-------|---------|
| **Atoms** | `/atoms` | 5 | Basic building blocks |
| ├── **CategoryBadge** | Badge | 1 | Category display |
| ├── **TagBadge** | Badge | 1 | Entity tags |
| ├── **Skeleton** | Loader | 1 | Loading states |
| ├── **Toast** | Notification | 1 | User feedback |
| └── **FloatingActionButton** | Button | 1 | Quick actions |
| **Molecules** | `/molecules` | 14 | Composite components |
| ├── **URLInput** | Input | 1 | YouTube URL entry |
| ├── **SummaryCard** | Card | 1 | Summary preview |
| ├── **LibraryControls** | Controls | 1 | Filtering/sorting |
| ├── **ShareModal** | Modal | 1 | Share functionality |
| ├── **MainContentColumn** | Layout | 1 | Primary content |
| ├── **KeyMomentsSidebar** | Sidebar | 1 | Timestamps |
| ├── **ActionsSidebar** | Sidebar | 1 | Quick actions |
| ├── **LearningHubTabs** | Tabs | 1 | Learning materials |
| ├── **InsightEnrichment** | Display | 1 | Meta-analysis |
| └── **TagStatsBar** | Stats | 1 | Tag statistics |
| **Organisms** | `/organisms` | 2 | Complex components |
| ├── **SummaryViewer** | Viewer | 1 | Full summary display |
| └── **PricingPlans** | Plans | 1 | Subscription tiers |
| **Modals** | `/modals` | 2 | Modal dialogs |
| ├── **AuthPromptModal** | Auth | 1 | Sign-in prompt |
| └── **SignInModal** | Auth | 1 | Sign-in form |
| **Providers** | `/providers` | 3 | Context providers |
| ├── **TRPCProvider** | API | 1 | tRPC client |
| ├── **ToastProvider** | UI | 1 | Notifications |
| └── **MonitoringProvider** | Telemetry | 1 | Error tracking |

#### Server (`/src/server`)

| Path | Purpose | Files | Key Features |
|------|---------|-------|--------------|
| **/api** | tRPC setup | 3 | API configuration |
| ├── **root.ts** | Root router | 1 | Router aggregation |
| ├── **trpc.ts** | tRPC instance | 1 | Context & middleware |
| └── **utils.ts** | Utilities | 1 | Helper functions |
| **/api/routers** | API routes | 5 | Business logic |
| ├── **summary.ts** | Summaries | 1 | CRUD operations |
| ├── **library.ts** | Library | 1 | User summaries |
| ├── **auth.ts** | Authentication | 1 | User management |
| ├── **billing.ts** | Payments | 1 | Stripe integration |
| └── **share.ts** | Sharing | 1 | Public links |

#### Libraries (`/src/lib`)

| Path | Purpose | Key Files |
|------|---------|-----------|
| **/api** | API utilities | API helpers |
| **/cache** | Caching logic | Cache management |
| **/db** | Database utils | Prisma helpers |
| **/hooks** | Custom hooks | React utilities |
| **/stripe** | Payment utils | Stripe config |
| **utils.ts** | General utils | Common helpers |
| **pricing.ts** | Pricing logic | Plan definitions |
| **monitoring.ts** | Telemetry | Error tracking |
| **fingerprint.ts** | Anonymous tracking | Browser fingerprinting |

### 🐍 Python Backend (`/api`)

| Path | Purpose | Key Files |
|------|---------|-----------|
| **/** | FastAPI root | index.py |
| **/models** | Pydantic models | request/response schemas |
| ├── **summarize.py** | Summary models | Request/Response types |
| └── **progress.py** | Progress tracking | Status models |
| **/services** | External services | Service integrations |
| ├── **youtube_service.py** | YouTube API | Video metadata |
| ├── **ytdlp_service.py** | YT-DLP | Fallback transcripts |
| ├── **oxylabs_service.py** | Oxylabs proxy | Proxy service |
| ├── **gumloop_service.py** | Gumloop AI | Enhanced processing |
| └── **transcript_service.py** | Orchestrator | Service coordination |
| **/routers** | API routes | Endpoint definitions |
| ├── **summarize.py** | Summary endpoints | /api/summarize |
| └── **progress.py** | Progress endpoints | /api/progress/{id} |
| **/middleware** | Middleware | Request processing |
| └── **cors.py** | CORS config | Cross-origin setup |

### 📝 Documentation (`/Docs`)

| Path | Purpose | Status | Contents |
|------|---------|--------|----------|
| **/_autogen** | Generated docs | ✅ Current | Analysis outputs |
| ├── **repo_map.md** | Structure map | Current | Directory purposes |
| ├── **config.md** | Configuration | Current | Settings extraction |
| ├── **apiscan.md** | API surface | Current | Endpoint documentation |
| ├── **data_flow.md** | Request flow | Current | Processing paths |
| ├── **dead_code.md** | Unused code | Current | Cleanup targets |
| ├── **debt_matrix.md** | Tech debt | Current | Prioritized issues |
| └── **docs_drift.md** | Doc accuracy | Current | Documentation gaps |
| **/architecture** | Design docs | Active | System design |
| **/development** | Dev guides | Active | Development workflow |
| **/deployment** | Deploy guides | Active | Production setup |
| **/operations** | Ops guides | Active | Monitoring & maintenance |
| **/archive** | Old docs | Archived | Historical reference |
| └── **/implementations** | Old implementations | Archived | Phase summaries |

### 🔧 Configuration

| Path | Purpose | Key Files |
|------|---------|-----------|
| **/prisma** | Database schema | schema.prisma |
| **/public** | Static assets | Images, icons |
| **/scripts** | Utility scripts | Build, test, deploy |
| **/e2e** | E2E tests | Playwright tests |
| **/tests** | Python tests | API tests |
| **/.github** | GitHub config | Workflows, actions |
| **/.vercel** | Vercel config | Deployment settings |

### 📦 Dependencies & Config Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| **package.json** | Node dependencies | Scripts, deps |
| **tsconfig.json** | TypeScript config | Compiler options |
| **next.config.js** | Next.js config | Build settings |
| **tailwind.config.ts** | Tailwind CSS | Styling config |
| **.env.local** | Environment vars | API keys |
| **requirements.txt** | Python deps | FastAPI, OpenAI |
| **vercel.json** | Vercel settings | Deployment config |

## 🔗 Key Relationships & Data Flow

### Request Flow
```
User → Next.js → tRPC → Database
                    ↓
                FastAPI → OpenAI
```

### Component Hierarchy
```
Providers
└── Layout
    └── Pages
        └── Organisms
            └── Molecules
                └── Atoms
```

### API Layer Architecture
```
Client → tRPC Router → Prisma → PostgreSQL
          ↓
      Validation (Zod)
          ↓
      Business Logic
          ↓
      External Services
```

## 🎯 Quick Navigation

### For Development
- **Start Here**: [README.md](README.md)
- **Setup Guide**: [Environment Setup](Docs/development/environment-setup.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

### For Operations
- **Production Guide**: [PRODUCTION_OPERATIONS_GUIDE.md](PRODUCTION_OPERATIONS_GUIDE.md)
- **Monitoring**: [Docs/operations/monitoring.md](Docs/operations/monitoring.md)
- **Security**: [SECURITY.md](SECURITY.md)

### For API Development
- **tRPC Routers**: [src/server/api/routers/](src/server/api/routers/)
- **FastAPI**: [api/](api/)
- **Database Schema**: [prisma/schema.prisma](prisma/schema.prisma)

### For Frontend Development
- **Components**: [src/components/](src/components/)
- **Pages**: [src/app/](src/app/)
- **Styles**: [src/app/globals.css](src/app/globals.css)

## 🔍 Search Patterns

### Find Components
```bash
find ./src/components -name "*.tsx"
```

### Find API Routes
```bash
find ./src/app/api -name "*.ts"
```

### Find Tests
```bash
find . -name "*.test.ts" -o -name "*.test.tsx"
```

### Find Documentation
```bash
find ./Docs -name "*.md"
```

## 📈 Code Quality Indicators

| Aspect | Status | Details |
|--------|--------|---------|
| **Type Safety** | ✅ Excellent | Full TypeScript + tRPC |
| **Component Structure** | ✅ Good | Atomic design pattern |
| **API Design** | ✅ Good | Type-safe tRPC |
| **Testing** | ✅ Good | Unit + E2E tests |
| **Documentation** | ⚠️ Needs cleanup | Some outdated docs |
| **Code Organization** | ✅ Good | Clear separation |
| **Security** | ✅ Good | Auth, rate limiting |
| **Performance** | ✅ Good | Optimized builds |

## 🚀 Next Steps

1. **Clean Documentation**: Remove remaining outdated docs
2. **Update API Docs**: Document missing tRPC procedures
3. **Component Storybook**: Add component documentation
4. **Test Coverage**: Increase unit test coverage
5. **Performance Monitoring**: Add more telemetry

---

*Index generated: 2025-08-18*  
*Next update: Review quarterly*  
*Total directories scanned: 100+*  
*Total files analyzed: 1,900+*