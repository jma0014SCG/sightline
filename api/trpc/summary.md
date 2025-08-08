# tRPC Summary Router

**Video summarization procedures for authenticated and anonymous users**

## Procedures

### `createAnonymous`

Create video summary for anonymous users without authentication.

**Usage**:
```typescript
api.summary.createAnonymous.mutate(input)
```

**Input Schema**:
```typescript
{
  url: string              // YouTube URL (validated, max 2048 chars)
  browserFingerprint: string  // Browser fingerprint for anonymous tracking
}
```

**Output Schema**:
```typescript
{
  id: string
  videoTitle: string
  channelName: string
  videoUrl: string
  content: string
  createdAt: Date
  isAnonymous: true
  canSave: false
  task_id: string
}
```

**Example**:
```typescript
const createAnonymousSubmit = async (url: string) => {
  const fingerprint = generateBrowserFingerprint()
  
  try {
    const summary = await api.summary.createAnonymous.mutate({
      url,
      browserFingerprint: fingerprint
    })
    
    console.log('Task ID:', summary.task_id)
    return summary
  } catch (error) {
    if (error.data?.code === 'FORBIDDEN') {
      // User already used their anonymous summary
      showSignUpModal()
    }
  }
}
```

**Error Codes**:
- `FORBIDDEN`: User already created anonymous summary
- `BAD_REQUEST`: Invalid YouTube URL or suspicious content
- `INTERNAL_SERVER_ERROR`: Backend processing failure

---

### `create`

Create video summary for authenticated users.

**Usage**:
```typescript
api.summary.create.mutate(input)
```

**Input Schema**:
```typescript
{
  url: string          // YouTube URL (validated)
  title?: string       // Optional custom title
  isPublic?: boolean   // Public sharing (default: false)
}
```

**Output Schema**:
```typescript
{
  id: string
  userId: string
  videoTitle: string
  channelName: string
  videoUrl: string
  content: string
  tags: Tag[]          // Smart Collections tags
  categories: Category[] // Smart Collections categories
  createdAt: Date
  task_id: string
}
```

**Example**:
```typescript
const createSummary = async (url: string) => {
  const user = useUser()
  if (!user) throw new Error('Authentication required')
  
  const summary = await api.summary.create.mutate({
    url,
    isPublic: false
  })
  
  // Poll for progress
  pollTaskProgress(summary.task_id)
  
  return summary
}
```

**Usage Limits**:
- Free Plan: 3 summaries total (lifetime)
- Pro Plan: 25 summaries/month
- Complete Plan: Unlimited

---

### `getById`

Retrieve specific summary by ID with access control.

**Usage**:
```typescript
api.summary.getById.useQuery({ id })
```

**Input Schema**:
```typescript
{
  id: string // Summary ID
}
```

**Output Schema**:
```typescript
{
  id: string
  videoTitle: string
  channelName: string
  videoUrl: string
  content: string
  keyMoments?: string
  tags: Tag[]
  categories: Category[]
  createdAt: Date
  isOwner: boolean      // User ownership flag
  canEdit: boolean      // Edit permissions
}
```

**Example**:
```typescript
const SummaryPage = ({ summaryId }: { summaryId: string }) => {
  const { data: summary, isLoading } = api.summary.getById.useQuery({ 
    id: summaryId 
  })
  
  if (isLoading) return <LoadingSkeleton />
  if (!summary) return <NotFound />
  
  return <SummaryViewer summary={summary} />
}
```

---

### `update`

Update summary metadata (title, public status).

**Usage**:
```typescript
api.summary.update.mutate(input)
```

**Input Schema**:
```typescript
{
  id: string
  title?: string
  isPublic?: boolean
}
```

**Example**:
```typescript
const updateSummary = async (id: string, updates: Partial<Summary>) => {
  const updated = await api.summary.update.mutate({
    id,
    ...updates
  })
  
  toast.success('Summary updated successfully')
  return updated
}
```

---

### `delete`

Delete user's summary with cascading cleanup.

**Usage**:
```typescript
api.summary.delete.mutate({ id })
```

**Input Schema**:
```typescript
{
  id: string // Summary ID to delete
}
```

**Output Schema**:
```typescript
{
  success: true
  deletedId: string
}
```

**Example**:
```typescript
const deleteSummary = async (id: string) => {
  if (!confirm('Delete this summary permanently?')) return
  
  await api.summary.delete.mutate({ id })
  
  // Update UI optimistically
  utils.summary.getById.invalidate({ id })
  utils.library.getAll.invalidate()
  
  toast.success('Summary deleted')
}
```

## Progress Tracking Integration

All summary creation procedures return a `task_id` for tracking AI processing progress:

```typescript
const trackSummaryProgress = async (taskId: string) => {
  const pollProgress = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/progress/${taskId}`)
      const progress = await response.json()
      
      setProgress(progress.progress)
      setStage(progress.stage)
      
      if (progress.status === 'completed') {
        // Refresh summary data
        await utils.summary.getById.invalidate()
        setProgress(100)
      } else if (progress.status === 'processing') {
        setTimeout(pollProgress, 2000)
      } else if (progress.status === 'error') {
        throw new Error(progress.stage)
      }
    } catch (error) {
      console.error('Progress tracking failed:', error)
    }
  }
  
  return pollProgress()
}
```

## Smart Collections Integration

Authenticated summaries automatically include Smart Collections tags and categories:

```typescript
interface Tag {
  id: string
  name: string
  type: 'PERSON' | 'COMPANY' | 'TECHNOLOGY' | 'PRODUCT' | 
        'CONCEPT' | 'FRAMEWORK' | 'TOOL'
}

// Example usage in UI
const TagDisplay = ({ tags }: { tags: Tag[] }) => {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <Badge 
          key={tag.id}
          variant={getTagColor(tag.type)}
          className="text-xs"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  )
}
```

## Error Handling Patterns

```typescript
const createSummaryWithErrorHandling = async (url: string) => {
  try {
    return await api.summary.create.mutate({ url })
  } catch (error) {
    if (error.data?.code === 'FORBIDDEN') {
      if (error.message.includes('limit')) {
        return showUpgradeModal()
      }
      if (error.message.includes('anonymous')) {
        return showSignUpModal()
      }
    }
    
    if (error.data?.code === 'BAD_REQUEST') {
      toast.error('Invalid YouTube URL or video unavailable')
      return
    }
    
    // Generic error
    toast.error('Failed to create summary. Please try again.')
    console.error('Summary creation error:', error)
  }
}
```

---

**Related Documentation**:
- [Library Router](library.md) - Personal library management
- [Progress Tracking](../fastapi/progress.md) - Real-time progress system
- [Examples](../examples/progress-tracking.md) - Implementation examples