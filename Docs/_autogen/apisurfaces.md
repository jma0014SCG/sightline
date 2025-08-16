# Public API Surfaces - DO NOT BREAK

Generated: 2025-08-15

Critical API surfaces that must maintain backward compatibility for existing clients.

## tRPC API Surface

### Summary Router (`api.summary.*`)

#### `createAnonymous` - Public Procedure
**Input Schema**: 
```typescript
z.object({
  url: z.string().url(),
  options: z.object({...}).optional()
})
```
**Output**: Summary object with all fields
**Top Callsites**:
1. [`src/app/page.tsx:190`](../../src/app/page.tsx#L190) - Landing page anonymous flow
2. Component: URLInput for non-authenticated users
3. Used in anonymous user journey

#### `create` - Protected Procedure  
**Input Schema**:
```typescript
z.object({
  url: z.string().url(),
  options: z.object({...}).optional()
})
```
**Output**: Summary object with all fields
**Top Callsites**:
1. [`src/app/page.tsx:110`](../../src/app/page.tsx#L110) - Landing page authenticated flow
2. [`src/app/(dashboard)/library/page.tsx:117`](../../src/app/(dashboard)/library/page.tsx#L117) - Library page
3. [`src/components/debug/DebugPanel.tsx:39`](../../src/components/debug/DebugPanel.tsx#L39) - Debug panel

#### `getById` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  id: z.string()
})
```
**Output**: Summary object or null
**Top Callsites**:
1. [`src/app/(dashboard)/library/[id]/page.tsx:20`](../../src/app/(dashboard)/library/[id]/page.tsx#L20) - Summary detail page
2. [`src/app/(dashboard)/library/[id]/edit/page.tsx:17`](../../src/app/(dashboard)/library/[id]/edit/page.tsx#L17) - Edit page
3. [`src/app/(dashboard)/library/[id]/page-improved.tsx:22`](../../src/app/(dashboard)/library/[id]/page-improved.tsx#L22) - Improved layout

#### `update` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  userNotes: z.string().optional()
})
```
**Output**: Updated summary object
**Top Callsites**:
1. [`src/app/(dashboard)/library/[id]/edit/page.tsx:24`](../../src/app/(dashboard)/library/[id]/edit/page.tsx#L24) - Edit page save
2. Used in summary editing flow
3. Updates user-editable fields only

#### `delete` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  id: z.string()
})
```
**Output**: Success boolean
**Top Callsites**:
1. [`src/app/(dashboard)/library/[id]/page.tsx:21`](../../src/app/(dashboard)/library/[id]/page.tsx#L21) - Summary detail delete
2. [`src/app/(dashboard)/library/page.tsx:151`](../../src/app/(dashboard)/library/page.tsx#L151) - Library list delete
3. [`src/app/(dashboard)/library/[id]/page-improved.tsx:23`](../../src/app/(dashboard)/library/[id]/page-improved.tsx#L23)

#### `toggleFavorite` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  id: z.string()
})
```
**Output**: Updated summary with favorite status
**Top Callsites**:
1. Used in SummaryCard component
2. Library page favorite toggle
3. Summary detail page

#### `updateNotes` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  id: z.string(),
  notes: z.string()
})
```
**Output**: Updated summary
**Top Callsites**:
1. Summary viewer notes section
2. Inline editing in summary detail
3. Auto-save functionality

#### `rate` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  id: z.string(),
  rating: z.number().min(1).max(5)
})
```
**Output**: Updated summary with rating
**Top Callsites**:
1. Summary viewer rating component
2. Library card rating display
3. Summary detail header

### Library Router (`api.library.*`)

#### `getAll` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  search: z.string().optional(),
  filter: z.object({
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    favorite: z.boolean().optional(),
    dateRange: z.object({...}).optional()
  }).optional(),
  sort: z.object({
    field: z.enum(['createdAt', 'updatedAt', 'title', 'viewCount']),
    order: z.enum(['asc', 'desc'])
  }).optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number()
  }).optional()
})
```
**Output**: Paginated summaries array
**Top Callsites**:
1. [`src/app/(dashboard)/library/page.tsx`](../../src/app/(dashboard)/library/page.tsx) - Main library view
2. Used with TanStack Query for infinite scroll
3. Filtered views (favorites, categories)

#### `getStats` - Protected Procedure
**Input**: None
**Output**: 
```typescript
{
  totalSummaries: number,
  favoritesCount: number,
  categoryCounts: Record<string, number>,
  recentlyViewed: Summary[],
  topRated: Summary[]
}
```
**Top Callsites**:
1. Library page statistics display
2. Dashboard overview (if implemented)
3. User profile stats

#### `getTags` - Protected Procedure
**Input**: None
**Output**: Array of Tag objects with counts
**Top Callsites**:
1. [`src/app/(dashboard)/library/page.tsx:147`](../../src/app/(dashboard)/library/page.tsx#L147) - Tag filter
2. Library controls component
3. Search/filter interface

#### `getCategories` - Protected Procedure  
**Input**: None
**Output**: Array of Category objects with counts
**Top Callsites**:
1. [`src/app/(dashboard)/library/page.tsx:148`](../../src/app/(dashboard)/library/page.tsx#L148) - Category filter
2. Library controls component
3. Navigation sidebar

### Billing Router (`api.billing.*`)

#### `getSubscription` - Protected Procedure
**Input**: None
**Output**: Subscription status object
**Top Callsites**:
1. [`src/app/(dashboard)/billing/page.tsx:41`](../../src/app/(dashboard)/billing/page.tsx#L41) - Billing page
2. Upgrade flow validation
3. Usage limit checks

#### `getUsageStats` - Protected Procedure
**Input**: None
**Output**: 
```typescript
{
  used: number,
  limit: number,
  plan: 'FREE' | 'PRO' | 'ENTERPRISE',
  resetDate: Date | null
}
```
**Top Callsites**:
1. [`src/app/(dashboard)/billing/page.tsx:42`](../../src/app/(dashboard)/billing/page.tsx#L42) - Usage display
2. [`src/app/(dashboard)/library/page.tsx:144`](../../src/app/(dashboard)/library/page.tsx#L144) - Library limits
3. Summary creation validation

#### `createCheckoutSession` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  priceId: z.string(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional()
})
```
**Output**: Stripe checkout URL
**Top Callsites**:
1. [`src/app/upgrade/page.tsx:74`](../../src/app/upgrade/page.tsx#L74) - Upgrade page
2. Pricing plans component
3. Usage limit exceeded modal

#### `createPortalSession` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  returnUrl: z.string().optional()
})
```
**Output**: Stripe portal URL
**Top Callsites**:
1. [`src/app/(dashboard)/billing/page.tsx:44`](../../src/app/(dashboard)/billing/page.tsx#L44) - Manage subscription
2. Settings page billing section
3. Cancel subscription flow

### Auth Router (`api.auth.*`)

#### `getCurrentUser` - Protected Procedure
**Input**: None
**Output**: User object with all fields
**Top Callsites**:
1. [`src/app/(dashboard)/settings/page.tsx:25`](../../src/app/(dashboard)/settings/page.tsx#L25) - Settings page
2. [`src/components/providers/MonitoringProvider.tsx:15`](../../src/components/providers/MonitoringProvider.tsx#L15) - Monitoring
3. Layout components for user display

#### `updateProfile` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  name: z.string().optional(),
  image: z.string().url().optional()
})
```
**Output**: Updated user object
**Top Callsites**:
1. [`src/app/(dashboard)/settings/page.tsx:29`](../../src/app/(dashboard)/settings/page.tsx#L29) - Profile update
2. Onboarding flow
3. Profile modal

#### `getNotificationPreferences` - Protected Procedure
**Input**: None
**Output**: Notification preferences object
**Top Callsites**:
1. [`src/app/(dashboard)/settings/page.tsx:26`](../../src/app/(dashboard)/settings/page.tsx#L26) - Settings page
2. Notification settings modal
3. Email preference center

#### `exportUserData` - Protected Procedure
**Input**: None
**Output**: Complete user data export (JSON)
**Top Callsites**:
1. [`src/app/(dashboard)/settings/page.tsx:47`](../../src/app/(dashboard)/settings/page.tsx#L47) - Data export
2. GDPR compliance features
3. Account management

#### `deleteAccount` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  confirmation: z.literal('DELETE')
})
```
**Output**: Success confirmation
**Top Callsites**:
1. [`src/app/(dashboard)/settings/page.tsx:49`](../../src/app/(dashboard)/settings/page.tsx#L49) - Account deletion
2. Settings danger zone
3. Account closure flow

### Share Router (`api.share.*`)

#### `create` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  summaryId: z.string(),
  isPublic: z.boolean().default(false),
  expiresAt: z.date().optional()
})
```
**Output**: ShareLink object with slug
**Top Callsites**:
1. [`src/components/molecules/ShareModal/ShareModal.tsx:26`](../../src/components/molecules/ShareModal/ShareModal.tsx#L26) - Share modal
2. Summary viewer share button
3. Quick actions bar

#### `getBySlug` - Public Procedure
**Input Schema**:
```typescript
z.object({
  slug: z.string()
})
```
**Output**: Shared summary with metadata
**Top Callsites**:
1. [`src/app/share/[slug]/page.tsx:17`](../../src/app/share/[slug]/page.tsx#L17) - Public share page
2. Share preview component
3. Embed functionality

#### `delete` - Protected Procedure
**Input Schema**:
```typescript
z.object({
  id: z.string()
})
```
**Output**: Success boolean
**Top Callsites**:
1. [`src/components/molecules/ShareModal/ShareModal.tsx:37`](../../src/components/molecules/ShareModal/ShareModal.tsx#L37) - Remove share
2. Share management page
3. Bulk share operations

## FastAPI Surface

### Core Endpoints

#### `POST /api/summarize`
**Request Body** (Pydantic):
```python
class SummarizeRequest(BaseModel):
    url: str
    options: Optional[dict] = None
```
**Response** (Pydantic):
```python
class SummarizeResponse(BaseModel):
    video_id: str
    video_url: str
    video_title: str
    channel_name: str
    channel_id: str
    duration: int
    thumbnail_url: Optional[str]
    summary: str
    key_points: List[str]
    task_id: Optional[str]
    # Plus rich content fields...
```
**Authentication**: None (handled by tRPC layer)
**Used By**: tRPC summary.create and summary.createAnonymous

#### `GET /api/progress/{task_id}`
**Path Parameters**: task_id (string)
**Response**:
```python
{
    "progress": int,  # 0-100
    "stage": str,     # Current stage name
    "status": str,    # "pending", "processing", "completed", "failed"
    "cid": Optional[str]  # Correlation ID
}
```
**Authentication**: None
**Used By**: useProgressTracking hook

#### `POST /api/refresh-metadata`
**Request Body**:
```python
{
    "video_id": str
}
```
**Response**: Updated VideoInfo object
**Authentication**: None
**Used By**: Metadata refresh feature

#### `GET /api/health`
**Response**:
```python
{
    "status": "healthy",
    "timestamp": datetime
}
```
**Authentication**: None
**Used By**: Health checks, monitoring

### Router Endpoints

#### `POST /summarize` (via router)
Alternative endpoint with same schema as `/api/summarize`
**Used By**: Alternative API clients

#### `POST /transcript`
**Request Body**:
```python
class TranscriptRequest(BaseModel):
    video_id: str
    language: Optional[str] = "en"
```
**Response**:
```python
class TranscriptResponse(BaseModel):
    video_id: str
    transcript: str
    segments: Optional[List[dict]]
```
**Used By**: Transcript-only features

## Prisma Models (Summary Flow)

### User Model
**Critical Fields**:
```prisma
id: String @id              // Clerk user ID
email: String @unique
plan: Plan                  // FREE | PRO | ENTERPRISE
summariesUsed: Int         // Usage tracking
summariesLimit: Int        // Plan limits
stripeCustomerId: String?  // Stripe integration
```
**Operations**:
- `findUnique` by id or email
- `update` for profile, plan, usage
- `create` on Clerk webhook

### Summary Model
**Critical Fields**:
```prisma
id: String @id
userId: String              // User reference
videoId: String            // YouTube video ID
videoUrl: String
content: String @db.Text   // Main content
keyPoints: Json?           // Structured data
// Rich content fields
keyMoments: Json?
frameworks: Json?
playbooks: Json?
learningPack: Json?
enrichment: Json?
// User interaction
userNotes: String?
rating: Int?
isFavorite: Boolean
```
**Operations**:
- `create` for new summaries
- `findMany` for library listing
- `findUnique` by id
- `update` for edits, notes, ratings
- `upsert` for duplicate handling
- `delete` for removal
- `count` for usage tracking

**Indexes** (Performance Critical):
- `@@unique([userId, videoId])` - Prevent duplicates
- `@@index([userId])` - User's summaries
- `@@index([videoId])` - Video lookups
- `@@index([userId, isFavorite])` - Favorites filter
- `@@index([userId, uploadDate])` - Date sorting

### ShareLink Model
**Critical Fields**:
```prisma
id: String @id
slug: String @unique       // Public URL slug
summaryId: String         // Summary reference
userId: String            // Owner
isPublic: Boolean         // Visibility
expiresAt: DateTime?      // Expiration
views: Int                // View counter
```
**Operations**:
- `create` for new shares
- `findUnique` by slug (public access)
- `update` for settings
- `delete` for removal

### UsageEvent Model
**Critical Fields**:
```prisma
id: String @id
userId: String
eventType: String         // "summary_created", etc.
videoId: String?          // YouTube video ID
metadata: Json?           // Additional context
createdAt: DateTime
```
**Operations**:
- `create` for tracking events
- `count` for usage limits
- `findFirst` for duplicate checks
**Indexes**:
- `@@index([userId, eventType, createdAt])` - Usage queries

### Category & Tag Models
**Critical Fields**:
```prisma
// Category
id: String @id
name: String @unique
summaries: Summary[]      // Many-to-many

// Tag
id: String @id
name: String @unique
type: String              // PERSON, COMPANY, etc.
summaries: Summary[]      // Many-to-many
```
**Operations**:
- `findMany` for listing
- `create` for new entities
- Relation queries for filtering

### Progress Model
**Critical Fields**:
```prisma
taskId: String @id
data: Json                // Progress data
createdAt: DateTime
expiresAt: DateTime       // TTL management
```
**Operations**:
- `create` for new tasks
- `findUnique` by taskId
- `delete` after completion
- Automatic cleanup via expiresAt

## Breaking Change Risk Assessment

### HIGH RISK - Core Functionality
These changes would break existing clients:

1. **Summary Creation Flow**
   - Input schema for `create`/`createAnonymous`
   - Response structure changes
   - Progress tracking format

2. **Authentication**
   - Clerk webhook user sync
   - Protected procedure auth checks
   - User ID format/structure

3. **Database Schema**
   - Summary table structure
   - User-Summary relationships
   - Unique constraints

### MEDIUM RISK - Features
These affect specific features:

1. **Library Operations**
   - Filter/sort parameters
   - Pagination structure
   - Category/tag format

2. **Billing Integration**
   - Stripe webhook handling
   - Usage limit calculations
   - Plan upgrade flow

3. **Share Functionality**
   - Slug generation
   - Public access control
   - Expiration handling

### LOW RISK - Enhancement Areas
Safe to modify with care:

1. **Rich Content Fields**
   - New JSON fields in Summary
   - Additional metadata
   - Processing improvements

2. **UI Components**
   - Component props (internal)
   - Styling changes
   - Layout modifications

3. **Performance Optimizations**
   - Caching strategies
   - Query optimizations
   - Background jobs

## Backward Compatibility Guidelines

### DO NOT CHANGE
1. Existing procedure names in tRPC routers
2. Required fields in Zod schemas
3. Prisma model primary keys and unique constraints
4. FastAPI endpoint paths and methods
5. Webhook payload structures

### SAFE TO ADD
1. Optional fields to schemas
2. New procedures to routers
3. Additional indexes to database
4. New API endpoints (don't conflict)
5. Rich content fields (backward compatible)

### REQUIRES MIGRATION
1. Changing field types
2. Removing procedures
3. Modifying authentication flow
4. Database schema changes
5. Breaking webhook format changes

## Version Strategy

When making breaking changes:
1. Create new version (`v2`) endpoints
2. Maintain old endpoints during transition
3. Add deprecation warnings
4. Document migration path
5. Set sunset date for old APIs