# FastAPI Summarization Endpoints

**High-performance AI processing endpoints for video summarization**

## Endpoints

### `POST /api/summarize`

Main video summarization endpoint with real-time progress tracking.

**URL**: `/api/summarize`  
**Method**: `POST`  
**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "userId": "user_123",
  "options": {
    "includeKeyMoments": true,
    "includeTranscript": false
  }
}
```

**Request Schema**:
```python
class SummarizeRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")
    userId: str = Field(..., description="User ID from authentication")
    options: Optional[SummarizeOptions] = None

class SummarizeOptions(BaseModel):
    includeKeyMoments: bool = True
    includeTranscript: bool = False
```

**Response**:
```json
{
  "video_id": "dQw4w9WgXcQ",
  "video_url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "video_title": "Rick Astley - Never Gonna Give You Up",
  "channel_name": "Rick Astley",
  "channel_id": "UC_example",
  "duration": 213,
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "summary": {
    "content": "# TL;DR\n\nRick Astley performs his hit song...",
    "key_points": [
      "Classic 80s music video production",
      "Iconic dance moves and vocals",
      "Cultural internet phenomenon"
    ],
    "key_moments": "0:00 - Song introduction...",
    "frameworks": [],
    "playbooks": [],
    "tools": [],
    "sentiment": "positive",
    "novelty_score": 5
  },
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "processing_time": 23.5,
    "model": "gpt-4o-mini",
    "transcript_length": 1240
  }
}
```

**Processing Stages**:
1. `Initializing...` (5%)
2. `Connecting to YouTube...` (10%)
3. `Fetching video information...` (25%)
4. `Downloading transcript...` (40%)
5. `Analyzing content with AI...` (60%)
6. `Generating your summary...` (80%)
7. `Summary ready!` (100%)

**Example Implementation**:
```python
@app.post("/api/summarize")
async def create_summary(
    request: SummarizeRequest,
    user_id: str = Depends(verify_token),
    background_tasks: BackgroundTasks
):
    # Generate unique task ID
    task_id = str(uuid.uuid4())
    
    # Initialize progress tracking
    progress_service.start_task(task_id, "Initializing...")
    
    # Start background processing
    background_tasks.add_task(
        process_summary_async,
        request.url,
        user_id,
        task_id,
        request.options
    )
    
    # Return immediate response with task ID
    return {
        "task_id": task_id,
        "status": "processing",
        "message": "Summary generation started"
    }
```

**Error Responses**:
```json
{
  "error": "Could not retrieve transcript for this video",
  "detail": "The video may not have captions available or is restricted",
  "status_code": 400,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "error_code": "TRANSCRIPT_UNAVAILABLE"
}
```

**Common Error Codes**:
- `INVALID_URL`: URL is not a valid YouTube video link
- `VIDEO_UNAVAILABLE`: Video is private, deleted, or geo-restricted
- `TRANSCRIPT_UNAVAILABLE`: No transcript available for the video
- `PROCESSING_FAILED`: AI processing encountered an error
- `QUOTA_EXCEEDED`: OpenAI API quota exceeded

---

### `POST /api/test-summarize`

Testing endpoint for API validation (development only).

**URL**: `/api/test-summarize`  
**Method**: `POST`  
**Authentication**: None (development only)

**Request Body**:
```json
{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response**:
```json
{
  "status": "test_success",
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "message": "Test endpoint working",
  "environment": "development"
}
```

## Processing Pipeline

### Transcript Acquisition
```python
async def get_video_transcript(video_url: str) -> str:
    """Multi-service transcript acquisition with fallback chain"""
    
    # Service priority order
    services = [
        youtube_transcript_service,  # Primary
        gumloop_service,            # Enhanced processing
        ytdlp_service,              # Fallback
        oxylabs_service             # Proxy-based
    ]
    
    for service in services:
        try:
            transcript = await service.get_transcript(video_url)
            if transcript:
                return transcript
        except Exception as e:
            logger.warning(f"{service.name} failed: {e}")
            continue
    
    raise TranscriptUnavailableError("No transcript service succeeded")
```

### AI Processing
```python
async def process_with_openai(transcript: str, video_metadata: dict) -> dict:
    """Process transcript with OpenAI for structured summary"""
    
    # Use structured output for consistent format
    completion = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": f"Video: {video_metadata['title']}\n\n{transcript}"}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "video_summary",
                "schema": VIDEO_SUMMARY_SCHEMA
            }
        }
    )
    
    return json.loads(completion.choices[0].message.content)
```

### Smart Collections Integration
```python
async def classify_content(summary: dict) -> dict:
    """Extract entities and categories using OpenAI classification"""
    
    classification = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
            {"role": "user", "content": summary["content"]}
        ],
        response_format={
            "type": "json_schema", 
            "json_schema": {"schema": CLASSIFICATION_SCHEMA}
        }
    )
    
    result = json.loads(classification.choices[0].message.content)
    
    # Store tags and categories in database
    await store_classifications(summary["id"], result)
    
    return result
```

## Performance Optimization

### Caching Strategy
```python
from functools import lru_cache
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

@lru_cache(maxsize=100)
def get_video_metadata(video_id: str) -> dict:
    """Cache video metadata to reduce YouTube API calls"""
    cached = redis_client.get(f"video_meta:{video_id}")
    if cached:
        return json.loads(cached)
    
    metadata = youtube_service.get_metadata(video_id)
    redis_client.setex(f"video_meta:{video_id}", 3600, json.dumps(metadata))
    return metadata
```

### Async Processing
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def process_summary_async(
    url: str,
    user_id: str,
    task_id: str,
    options: SummarizeOptions
):
    """Async summary processing with progress updates"""
    
    try:
        # Update progress: Fetching video info
        await progress_service.update_progress(task_id, 25, "Fetching video information...")
        
        # Parallel processing where possible
        video_metadata, transcript = await asyncio.gather(
            get_video_metadata_async(url),
            get_video_transcript_async(url)
        )
        
        # Update progress: AI processing
        await progress_service.update_progress(task_id, 60, "Analyzing content with AI...")
        
        # AI processing (CPU-intensive, run in thread pool)
        with ThreadPoolExecutor() as executor:
            summary = await asyncio.get_event_loop().run_in_executor(
                executor,
                process_with_openai,
                transcript,
                video_metadata
            )
        
        # Final steps
        await progress_service.update_progress(task_id, 100, "Summary ready!")
        
        # Store in database
        await store_summary(user_id, summary, video_metadata)
        
    except Exception as e:
        await progress_service.update_progress(
            task_id, -1, f"Error: {str(e)}", status="error"
        )
        raise
```

## Integration with tRPC

The FastAPI layer integrates with the tRPC layer through database updates:

```python
async def store_summary(user_id: str, summary: dict, metadata: dict):
    """Store processed summary in database for tRPC access"""
    
    summary_record = await db.summary.create({
        "data": {
            "userId": user_id,
            "videoTitle": metadata["title"],
            "channelName": metadata["channel"],
            "videoUrl": metadata["url"],
            "content": summary["content"],
            "keyMoments": summary.get("key_moments"),
            # Smart Collections will be added via classification
        }
    })
    
    # Trigger Smart Collections classification
    await classify_and_store_tags(summary_record.id, summary)
    
    return summary_record
```

---

**Related Documentation**:
- [Progress Tracking](progress.md) - Real-time progress system
- [Health Monitoring](health.md) - System health endpoints
- [tRPC Integration](../trpc/summary.md) - Frontend API integration