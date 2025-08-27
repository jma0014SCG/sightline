from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to Python path for imports
import sys
sys.path.insert(0, os.path.dirname(__file__))

# Setup structured logging
from logging_config import setup_logging, get_logger
setup_logging(level="INFO")
logger = get_logger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Sightline API",
    description="AI-powered YouTube video summarization API",
    version="1.0.0"
)

# Import and setup enhanced monitoring
from monitoring import setup_monitoring
setup_monitoring(app)

# Import correlation middleware
from middleware.correlation import CorrelationMiddleware

# Add correlation middleware first
app.add_middleware(CorrelationMiddleware)

# Configure CORS with more flexible configuration
allowed_origins = [
    "http://localhost:3000",
    "https://sightlineai.io",
    "https://www.sightlineai.io",
    "https://sightline.ai",  # Keep for any old references
    "https://www.sightline.ai",
]

# Add production URL from environment if available
if os.getenv("NEXT_PUBLIC_APP_URL"):
    allowed_origins.append(os.getenv("NEXT_PUBLIC_APP_URL"))

# Add custom allowed origins from environment (comma-separated)
if os.getenv("ALLOWED_ORIGINS"):
    custom_origins = os.getenv("ALLOWED_ORIGINS").split(",")
    allowed_origins.extend([origin.strip() for origin in custom_origins])

# In production, also allow Vercel preview deployments
if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION"):
    # This will allow all Vercel preview URLs
    allowed_origins.append("https://*.vercel.app")
    allowed_origins.append("https://sightline-ai-*.vercel.app")

# Remove duplicates while preserving order
seen = set()
allowed_origins = [x for x in allowed_origins if not (x in seen or seen.add(x))]

print(f"🔒 CORS allowed origins: {allowed_origins}")

# Use regex pattern in production to match all Vercel deployments
if os.getenv("RAILWAY_ENVIRONMENT"):
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https://.*\.vercel\.app$|https://sightlineai\.io|https://www\.sightlineai\.io|https://sightline\.ai|https://www\.sightline\.ai|http://localhost:3000",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "sightline-api"}

# Root endpoint
@app.get("/api")
async def root():
    return {"message": "Sightline API", "version": "0.1.0"}

# Add current directory to Python path
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Import progress storage service
from services.progress_storage import progress_storage

# Progress tracking endpoint - uses database storage
@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    """Get progress for a task ID. Returns default values if task not found."""
    progress = await progress_storage.get_progress(task_id)
    
    if progress is None:
        # Return "queued" state for unknown tasks
        return {
            "progress": 0, 
            "stage": "Queued...", 
            "status": "queued",
            "task_id": task_id
        }
    
    return progress

# Progress cleanup endpoint for completed tasks
@app.delete("/api/progress/{task_id}")
async def cleanup_progress(task_id: str):
    """Clean up completed progress data."""
    deleted = await progress_storage.delete_progress(task_id)
    return {"status": "cleaned" if deleted else "not_found"}

# Debug endpoint for development only
@app.get("/api/progress/debug/{task_id}")
async def debug_progress(task_id: str):
    """Get raw progress record with metadata (dev only)."""
    if os.getenv("NODE_ENV") != "development" and os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=404, detail="Not found")
    
    debug_info = await progress_storage.get_debug_info(task_id)
    if debug_info is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return debug_info

# Cleanup expired records periodically
@app.on_event("startup")
async def startup_event():
    """Initialize progress storage and schedule cleanup."""
    await progress_storage.init()
    
    # Run cleanup on startup
    deleted_count = await progress_storage.cleanup_expired()
    if deleted_count > 0:
        print(f"🧹 Cleaned up {deleted_count} expired progress records")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown."""
    await progress_storage.close()

# Import and include routers
try:
    from routers import summarize, transcript, health
    app.include_router(health.router, prefix="/api")
    app.include_router(summarize.router, prefix="/api")
    app.include_router(transcript.router, prefix="/api")
    print("✅ Routers imported successfully")
except ImportError as e:
    print(f"❌ Could not import routers: {e}")
    print("📝 Available files in routers/:")
    routers_dir = os.path.join(os.path.dirname(__file__), 'routers')
    if os.path.exists(routers_dir):
        for file in os.listdir(routers_dir):
            print(f"  - {file}")
    
    # Create working summarize endpoint as fallback
    @app.post("/api/summarize")
    async def working_summarize(request: Request):
        import uuid
        import asyncio
        import re
        from datetime import datetime
        
        # Extract correlation ID from request state (set by middleware)
        from middleware.correlation import extract_correlation_id, extract_task_id
        cid = extract_correlation_id(request)
        
        # Generate task ID immediately
        task_id = str(uuid.uuid4())
        
        # Set task ID in logging context
        from logging_config import set_correlation_context
        set_correlation_context(task_id=task_id)
        
        try:
            # Import required modules here to avoid import issues
            import sys
            import os
            sys.path.insert(0, os.path.dirname(__file__))
            
            from services.youtube_service import YouTubeService
            from services.langchain_service import LangChainService
            
            # Get request body
            body = await request.json()
            
            # Structured logging with correlation ID
            logger.info("Starting summarization", 
                       url=body.get("url"),
                       task_id=task_id)
            url = body.get("url", "")
            if not url:
                await progress_storage.set_progress(task_id, {"progress": 0, "stage": "Error: URL is required", "status": "error", "task_id": task_id, "cid": cid})
                return {"error": "URL is required", "task_id": task_id, "cid": cid}
            
            # Initialize progress tracking immediately
            await progress_storage.set_progress(task_id, {"progress": 5, "stage": "Initializing...", "status": "processing", "task_id": task_id, "cid": cid})
            
            # Extract video ID
            patterns = [
                r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
                r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})'
            ]
            
            video_id = None
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    video_id = match.group(1)
                    break
            
            if not video_id:
                await progress_storage.set_progress(task_id, {"progress": 0, "stage": "Error: Invalid YouTube URL", "status": "error", "task_id": task_id, "cid": cid})
                return {"error": "Invalid YouTube URL", "task_id": task_id, "cid": cid}
            
            # Initialize services
            await progress_storage.set_progress(task_id, {"progress": 10, "stage": "Connecting to YouTube...", "status": "processing", "task_id": task_id, "cid": cid})
            await asyncio.sleep(0.1)  # Brief pause to ensure progress is visible
            
            youtube_service = YouTubeService()
            langchain_service = LangChainService()
            
            # Get real video info and transcript
            print(f"🔄 Processing video ID: {video_id}")
            
            # Update progress: Getting video info and transcript in parallel
            await progress_storage.set_progress(task_id, {"progress": 25, "stage": "Fetching video data and transcript...", "status": "processing", "task_id": task_id, "cid": cid})
            video_info, (transcript, is_gumloop) = await youtube_service.get_video_data_parallel(video_id)
            print(f"📹 Video info: {video_info.title} by {video_info.channel_name} ({video_info.view_count} views)")
            print(f"📝 Transcript source: {'Gumloop' if is_gumloop else 'Standard'}")
            
            if not transcript:
                await progress_storage.set_progress(task_id, {"progress": 40, "stage": "Error: No transcript available", "status": "error", "task_id": task_id, "cid": cid})
                return {"error": "Could not retrieve transcript for this video. The video may not have captions available.", "task_id": task_id}
            
            print(f"📝 Retrieved transcript ({len(transcript)} characters)")
            
            # Update progress: Analyzing content
            await progress_storage.set_progress(task_id, {"progress": 60, "stage": "Analyzing content with AI...", "status": "processing", "task_id": task_id, "cid": cid})
            await asyncio.sleep(0.1)
            
            # Update progress: Generating summary
            await progress_storage.set_progress(task_id, {"progress": 80, "stage": "Generating your summary...", "status": "processing", "task_id": task_id, "cid": cid})
            summary = await langchain_service.summarize_transcript(
                transcript=transcript,
                video_title=video_info.title,
                channel_name=video_info.channel_name,
                video_url=url
            )
            
            # Update progress: Complete - this is critical for frontend coordination
            await progress_storage.set_progress(task_id, {"progress": 100, "stage": "Summary ready!", "status": "completed", "task_id": task_id, "cid": cid})
            print(f"✅ Progress marked as complete for task {task_id}")
            
            result = {
                "video_id": video_id,
                "video_url": url,
                "video_title": video_info.title,
                "channel_name": video_info.channel_name,
                "channel_id": video_info.channel_id,
                "duration": video_info.duration,
                "thumbnail_url": video_info.thumbnail_url,
                "summary": summary.content,
                "key_points": summary.key_points,
                "user_id": "test-user",
                "task_id": task_id,
                # Enhanced metadata from YouTubeMetadataService
                "description": video_info.description,
                "view_count": video_info.view_count,
                "like_count": video_info.like_count,
                "comment_count": video_info.comment_count,
                "upload_date": video_info.upload_date.isoformat() if video_info.upload_date else None,
                "is_gumloop": is_gumloop,
                # Processing source metadata
                "processing_source": "gumloop" if is_gumloop else "standard",
                "processing_version": "v1.0",
                "language": "en",
                # === GUMLOOP RICH CONTENT ===
                # Extract speakers from metadata or content
                "speakers": getattr(summary.metadata, 'speakers', []) if summary.metadata else [],
                "synopsis": getattr(summary.metadata, 'synopsis', None) if summary.metadata else None,
                # Rich structured sections
                "key_moments": [{"timestamp": km.timestamp, "insight": km.insight} for km in summary.key_moments],
                "frameworks": [{"name": f.name, "description": f.description} for f in getattr(summary, 'frameworks', [])],
                "debunked_assumptions": getattr(summary, 'debunked_assumptions', []),
                "in_practice": getattr(summary, 'in_practice', []),
                "playbooks": [{"trigger": p.trigger, "action": p.action} for p in getattr(summary, 'playbooks', [])],
                # Learning pack
                "learning_pack": {
                    "flashcards": [{"q": card.question, "a": card.answer} for card in summary.flashcards],
                    "quiz": [{"q": quiz.question, "a": quiz.answer} for quiz in summary.quiz_questions],
                    "glossary": [{"term": card.q, "definition": card.a} for card in summary.knowledge_cards],
                    "novel_ideas": []  # Will be populated from AI analysis
                } if (summary.flashcards or summary.quiz_questions or summary.knowledge_cards) else None,
                # Enrichment data
                "enrichment": {
                    "tools": getattr(summary, 'tools', []),
                    "sentiment": getattr(summary.insight_enrichment, 'sentiment', 'neutral') if hasattr(summary, 'insight_enrichment') and summary.insight_enrichment else 'neutral',
                    "risks": getattr(summary.insight_enrichment, 'risks_blockers_questions', []) if hasattr(summary, 'insight_enrichment') and summary.insight_enrichment else []
                },
                "metadata": {
                    "task_id": task_id,
                    "source": "gumloop" if is_gumloop else "standard",
                    "ai_version": "v1.0"
                }
            }
            
            print(f"🎯 Returning result with task_id: {task_id}")
            return result
            
        except Exception as e:
            # Always update progress with error state
            error_msg = f"Summarization failed: {str(e)}"
            await progress_storage.set_progress(task_id, {"progress": 0, "stage": f"Error: {str(e)}", "status": "error", "task_id": task_id, "cid": cid})
            print(f"❌ Error in summarization (task {task_id}): {error_msg}")
            return {"error": error_msg, "task_id": task_id}
    
    # Create a test endpoint to debug
    @app.post("/api/test-summarize")
    async def test_summarize(request: dict):
        try:
            url = request.get("url", "")
            return {
                "status": "test_success",
                "url": url,
                "message": "Test endpoint working"
            }
        except Exception as e:
            return {"error": str(e)}
    
    # Metadata refresh endpoint
    @app.post("/api/refresh-metadata")
    async def refresh_metadata(request: Request):
        """Refresh YouTube metadata for an existing summary"""
        try:
            from datetime import datetime
            
            body = await request.json()
            video_id = body.get("video_id")
            
            if not video_id:
                raise HTTPException(status_code=400, detail="video_id is required")
            
            # Extract correlation ID
            from middleware.correlation import extract_correlation_id
            cid = extract_correlation_id(request)
            
            logger.info("Refreshing metadata", video_id=video_id, cid=cid)
            
            # Initialize metadata service
            from services.youtube_metadata_service import YouTubeMetadataService
            metadata_service = YouTubeMetadataService()
            
            # Fetch fresh metadata
            metadata = await metadata_service.get_metadata(video_id)
            
            # Format response
            result = {
                "video_id": video_id,
                "title": metadata.get('title'),
                "description": metadata.get('description'),
                "channel_name": metadata.get('channel_name'),
                "view_count": metadata.get('view_count'),
                "like_count": metadata.get('like_count'),
                "comment_count": metadata.get('comment_count'),
                "upload_date": metadata.get('upload_date').isoformat() if metadata.get('upload_date') else None,
                "duration": metadata.get('duration'),
                "thumbnail_url": metadata.get('thumbnail_url'),
                "refreshed_at": datetime.now().isoformat(),
                "cid": cid
            }
            
            logger.info("Metadata refreshed successfully", 
                       video_id=video_id, 
                       view_count=result.get('view_count'),
                       cid=cid)
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to refresh metadata", error=str(e))
            raise HTTPException(status_code=500, detail=f"Failed to refresh metadata: {str(e)}")
    
    # Development-only synthetic test endpoint (always enabled for local testing)
    if True:  # Enable for testing - normally: os.getenv("NODE_ENV") == "development"
        @app.post("/api/dev/synthetic")
        async def synthetic_summary(request: Request):
            """Synthetic test endpoint that triggers a fixed public video summary with correlation tracking"""
            import uuid
            import asyncio
            from datetime import datetime
            
            # Generate correlation ID
            cid = request.headers.get("x-correlation-id", str(uuid.uuid4()))
            
            # Fixed public test video (Rick Astley - Never Gonna Give You Up)
            TEST_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            
            # Generate task ID
            task_id = str(uuid.uuid4())
            
            # Structured logging with correlation ID
            print(json.dumps({
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "component": "api.synthetic",
                "cid": cid,
                "task_id": task_id,
                "message": "Starting synthetic summary test",
                "video_url": TEST_VIDEO_URL
            }))
            
            try:
                # Initialize progress with correlation ID
                await progress_storage.set_progress(task_id, {
                    "progress": 5,
                    "stage": "Synthetic test starting...",
                    "status": "processing",
                    "task_id": task_id,
                    "cid": cid
                })
                
                # Log progress update
                print(json.dumps({
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "component": "api.synthetic.progress",
                    "cid": cid,
                    "task_id": task_id,
                    "progress": 5,
                    "message": "Progress initialized"
                }))
                
                # Simulate processing stages with delays
                stages = [
                    (25, "Fetching test video data..."),
                    (50, "Processing synthetic transcript..."),
                    (75, "Generating test summary..."),
                    (100, "Synthetic test complete!")
                ]
                
                for progress, stage in stages:
                    await asyncio.sleep(0.5)  # Simulate processing time
                    await progress_storage.set_progress(task_id, {
                        "progress": progress,
                        "stage": stage,
                        "status": "completed" if progress == 100 else "processing",
                        "task_id": task_id,
                        "cid": cid
                    })
                    
                    print(json.dumps({
                        "timestamp": datetime.now().isoformat(),
                        "level": "INFO",
                        "component": "api.synthetic.progress",
                        "cid": cid,
                        "task_id": task_id,
                        "progress": progress,
                        "stage": stage,
                        "message": f"Progress update: {stage}"
                    }))
                
                # Return response with correlation ID
                response = {
                    "task_id": task_id,
                    "cid": cid,
                    "video_url": TEST_VIDEO_URL,
                    "message": "Synthetic test initiated successfully",
                    "poll_endpoint": f"/api/progress/{task_id}"
                }
                
                print(json.dumps({
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "component": "api.synthetic",
                    "cid": cid,
                    "task_id": task_id,
                    "message": "Synthetic test completed",
                    "response": response
                }))
                
                return response
                
            except Exception as e:
                error_msg = f"Synthetic test failed: {str(e)}"
                await progress_storage.set_progress(task_id, {
                    "progress": 0,
                    "stage": f"Error: {str(e)}",
                    "status": "error",
                    "task_id": task_id,
                    "cid": cid
                })
                
                print(json.dumps({
                    "timestamp": datetime.now().isoformat(),
                    "level": "ERROR",
                    "component": "api.synthetic",
                    "cid": cid,
                    "task_id": task_id,
                    "error": str(e),
                    "message": error_msg
                }))
                
                return {"error": error_msg, "task_id": task_id, "cid": cid}

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return {
        "error": "Internal server error",
        "detail": str(exc) if os.getenv("NODE_ENV") == "development" else None,
        "status_code": 500
    }

# Vercel handler
handler = app