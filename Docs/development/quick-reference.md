---
title: "Sightline.ai Quick Reference"
description: "Essential commands and configurations for rapid development and troubleshooting"
type: "reference"
canonical_url: "/docs/development/quick-reference"
version: "1.0"
last_updated: "2025-01-09"
audience: ["developers", "new-contributors"]
complexity: "beginner"
tags: ["quick-reference", "commands", "development", "cheatsheet", "productivity"]
status: "active"
quick_start: true
estimated_time: "5 minutes read"
related_docs: ["/claude", "/contributing", "/docs/development/environment-setup"]
---

# Sightline.ai Quick Reference

*Essential commands and configurations for rapid development*

## 🚀 Development Commands

### Frontend Development

```bash
pnpm dev                      # Start Next.js dev server (port 3000)
pnpm build                    # Production build
pnpm lint && pnpm typecheck   # Code quality checks
pnpm format                   # Format code with Prettier
```

### Backend Development

```bash
pnpm api:dev                  # Start FastAPI server (port 8000)
pnpm dev:full                 # Start both frontend and backend
```

### Database Operations

```bash
pnpm db:generate              # Generate Prisma client
pnpm db:push                  # Push schema changes (dev)
pnpm db:studio                # Open Prisma Studio
```

### Environment Management

```bash
pnpm env:check                # Validate environment variables
pnpm env:validate             # Comprehensive env validation
```

## 🔧 Essential Environment Variables

```bash
# Core
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentication (Clerk)
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# AI Services (Required)
OPENAI_API_KEY="sk-proj-..."

# Payments (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID="price_..."
```

## 📁 Key File Locations

### Frontend Components

```
src/components/
├── organisms/SummaryViewer/    # Main summary display
├── molecules/URLInput/         # Video URL input
├── molecules/LibraryControls/  # Smart Collections filtering
└── modals/                     # Authentication modals
```

### API Routers

```
src/server/api/routers/
├── summary.ts                  # Video summarization
├── library.ts                  # Personal library + Smart Collections
├── auth.ts                     # User management
└── billing.ts                  # Stripe integration
```

### Core Services

```
src/lib/
├── classificationService.ts   # Smart Collections AI tagging
├── security.ts                # Input validation & XSS protection
├── browser-fingerprint.ts     # Anonymous user tracking
└── hooks/useProgressTracking.ts # Real-time progress
```

## 🧪 Testing Commands

```bash
# Frontend Testing
node scripts/test-db.js                    # Database connection
node scripts/test-pipeline.js              # Summarization pipeline

# Backend Testing  
cd api && python -m pytest                 # All Python tests
python tests/test_full_integration.py      # Full integration test
```

## 🎯 Smart Collections Integration

### AI Classification Tags

- **PERSON** (Blue): Individuals, influencers, experts
- **COMPANY** (Green): Organizations, businesses, brands  
- **TECHNOLOGY** (Orange): Programming languages, platforms
- **PRODUCT** (Pink): Specific products, apps, services
- **CONCEPT** (Indigo): Abstract concepts, methodologies
- **FRAMEWORK** (Yellow): Frameworks, libraries, systems
- **TOOL** (Teal): Software tools, applications

### Usage in Components

```typescript
// Filter by Smart Collections
const { data } = api.library.getAll.useQuery({
  categories: ['Technology', 'Programming'],
  tags: ['React', 'TypeScript']
})

// Get user's tags and categories
const tags = api.library.getTags.useQuery()
const categories = api.library.getCategories.useQuery()
```

## 🔐 Authentication Flow

### Anonymous Users

1. Browser fingerprinting → 1 free summary
2. Success → Auth prompt modal
3. Registration → Claim anonymous summary

### Authenticated Users

- **FREE**: 3 summaries total (lifetime)
- **PRO**: 25 summaries/month ($9.99)
- **ENTERPRISE**: Unlimited (planned)

## 🚨 Common Issues & Solutions

**Issue**: "OpenAI API key not found"  
**Fix**: Set `OPENAI_API_KEY` in `.env.local`

**Issue**: "Database connection failed"  
**Fix**: Verify `DATABASE_URL` and run `pnpm db:generate`

**Issue**: "Clerk authentication not working"  
**Fix**: Check Clerk keys and webhook configuration

**Issue**: "YouTube transcript not found"  
**Fix**: Try videos with captions; not all videos have transcripts

**Issue**: "Progress bar disappears, summary appears randomly"  
**Fix**: Fixed in latest update - progress tracking now properly waits for completion

## 🔍 Debug Panel (Development Only)

The debug panel appears in the bottom-right corner during development:

### Features

- **Auth Status**: Shows current authentication state
- **Progress Tracking**: Real-time display of task progress
- **Test Buttons**:
  - **Test Summary**: Create a test summary with default YouTube URL
  - **Test Progress**: Simulate progress tracking with temporary task ID
  - **Test Backend**: Check backend progress endpoint availability
  - **Test Auth**: Verify authentication session
  - **Test tRPC**: Check tRPC connection (expanded view)
  - **Test OAuth**: Test Google OAuth flow (expanded view)

### Usage

1. Click **Expand** to see all testing options
2. Monitor logs in the gray area for real-time feedback
3. Use **Clear** to reset the log display
4. Task IDs and progress status shown when active

### Troubleshooting Progress Issues

- Check if backend is running: **Test Backend** button
- Verify task ID transitions in the logs
- Monitor progress percentage and status updates
- Look for error messages in red

## 📊 Performance Targets

- **Summary Creation**: 15-30 seconds for 20-minute videos
- **Frontend Load**: <3s on 3G, <1s on WiFi  
- **Success Rate**: 95% for videos with captions
- **Lighthouse Score**: 95+ Performance, 100 Accessibility

## 🔗 Important URLs

- **Production**: <https://sightline.ai>
- **Local Frontend**: <http://localhost:3000>
- **Local Backend**: <http://localhost:8000>
- **Prisma Studio**: <http://localhost:5555>

---

*For complete documentation, see [SIGHTLINE_PLATFORM_DOCUMENTATION.md](SIGHTLINE_PLATFORM_DOCUMENTATION.md)*
