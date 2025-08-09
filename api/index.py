from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Sightline API",
    description="AI-powered YouTube video summarization API",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sightline.ai",
        os.getenv("NEXTAUTH_URL", "http://localhost:3000")
    ],
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

# Global progress tracking storage - persistent across function calls
progress_storage = {}

# Progress tracking endpoint - always available
@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    """Get progress for a task ID. Returns default values if task not found."""
    progress = progress_storage.get(task_id, {
        "progress": 0, 
        "stage": "Starting...", 
        "status": "processing",
        "task_id": task_id
    })
    return progress

# Progress cleanup endpoint for completed tasks
@app.delete("/api/progress/{task_id}")
async def cleanup_progress(task_id: str):
    """Clean up completed progress data to prevent memory leaks."""
    if task_id in progress_storage:
        del progress_storage[task_id]
        return {"status": "cleaned"}
    return {"status": "not_found"}

# Import and include routers
try:
    from routers import summarize, transcript
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
    async def working_summarize(request: dict):
        import uuid
        import asyncio
        import re
        
        # Generate task ID immediately
        task_id = str(uuid.uuid4())
        
        try:
            # Import required modules here to avoid import issues
            import sys
            import os
            sys.path.insert(0, os.path.dirname(__file__))
            
            from services.youtube_service import YouTubeService
            from services.langchain_service import LangChainService
            
            url = request.get("url", "")
            if not url:
                progress_storage[task_id] = {"progress": 0, "stage": "Error: URL is required", "status": "error", "task_id": task_id}
                return {"error": "URL is required", "task_id": task_id}
            
            # Initialize progress tracking immediately
            progress_storage[task_id] = {"progress": 5, "stage": "Initializing...", "status": "processing", "task_id": task_id}
            
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
                progress_storage[task_id] = {"progress": 0, "stage": "Error: Invalid YouTube URL", "status": "error", "task_id": task_id}
                return {"error": "Invalid YouTube URL", "task_id": task_id}
            
            # Initialize services
            progress_storage[task_id] = {"progress": 10, "stage": "Connecting to YouTube...", "status": "processing", "task_id": task_id}
            await asyncio.sleep(0.1)  # Brief pause to ensure progress is visible
            
            youtube_service = YouTubeService()
            langchain_service = LangChainService()
            
            # Get real video info and transcript
            print(f"🔄 Processing video ID: {video_id}")
            
            # Update progress: Getting video info and transcript in parallel
            progress_storage[task_id] = {"progress": 25, "stage": "Fetching video data and transcript...", "status": "processing", "task_id": task_id}
            video_info, (transcript, is_gumloop) = await youtube_service.get_video_data_parallel(video_id)
            print(f"📹 Video info: {video_info.title} by {video_info.channel_name} ({video_info.view_count} views)")
            print(f"📝 Transcript source: {'Gumloop' if is_gumloop else 'Standard'}")
            
            if not transcript:
                progress_storage[task_id] = {"progress": 40, "stage": "Error: No transcript available", "status": "error", "task_id": task_id}
                return {"error": "Could not retrieve transcript for this video. The video may not have captions available.", "task_id": task_id}
            
            print(f"📝 Retrieved transcript ({len(transcript)} characters)")
            
            # Update progress: Analyzing content
            progress_storage[task_id] = {"progress": 60, "stage": "Analyzing content with AI...", "status": "processing", "task_id": task_id}
            await asyncio.sleep(0.1)
            
            # Update progress: Generating summary
            progress_storage[task_id] = {"progress": 80, "stage": "Generating your summary...", "status": "processing", "task_id": task_id}
            summary = await langchain_service.summarize_transcript(
                transcript=transcript,
                video_title=video_info.title,
                channel_name=video_info.channel_name,
                video_url=url
            )
            
            # Update progress: Complete - this is critical for frontend coordination
            progress_storage[task_id] = {"progress": 100, "stage": "Summary ready!", "status": "completed", "task_id": task_id}
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
                "metadata": {
                    "task_id": task_id,
                    "source": "gumloop" if is_gumloop else "standard"
                }
            }
            
            print(f"🎯 Returning result with task_id: {task_id}")
            return result
            
        except Exception as e:
            # Always update progress with error state
            error_msg = f"Summarization failed: {str(e)}"
            progress_storage[task_id] = {"progress": 0, "stage": f"Error: {str(e)}", "status": "error", "task_id": task_id}
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