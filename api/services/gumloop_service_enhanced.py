"""
Enhanced Gumloop Service with circuit breaker, retry logic, and timeout handling.

This service provides resilient access to Gumloop API with proper error handling.
"""

import asyncio
import logging
from typing import Optional, Dict, Any, Tuple
from gumloop import GumloopClient
import concurrent.futures
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.circuit_breaker import service_breakers
from logging_config import get_logger

logger = get_logger(__name__)


class EnhancedGumloopService:
    """Enhanced Gumloop service with resilience patterns."""
    
    def __init__(self, api_key: Optional[str] = None, user_id: Optional[str] = None, flow_id: Optional[str] = None):
        self.api_key = api_key
        self.user_id = user_id
        self.flow_id = flow_id
        self.client = None
        self.circuit_breaker = service_breakers.get("gumloop")
        self.timeout = 30  # 30 second timeout
        self.retry_attempts = 2
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
        
        # Initialize client
        if self.api_key and self.user_id:
            try:
                self.client = GumloopClient(
                    api_key=self.api_key,
                    user_id=self.user_id,
                    timeout=self.timeout
                )
                logger.info("✅ Enhanced Gumloop client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Gumloop client: {str(e)}")
                self.client = None
        else:
            logger.warning("⚠️ Gumloop credentials not provided")
    
    async def get_transcript(self, video_url: str) -> Optional[str]:
        """
        Extract transcript with circuit breaker and timeout.
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            Transcript string if available, None otherwise
        """
        if not self.client or not self.flow_id:
            logger.warning("Gumloop client or flow_id not configured")
            return None
        
        try:
            # Use circuit breaker
            result = await self.circuit_breaker.call(
                self._fetch_transcript_with_timeout, 
                video_url
            )
            return result
            
        except Exception as e:
            logger.error(f"❌ Gumloop service failed (circuit breaker active): {str(e)}")
            return None
    
    async def _fetch_transcript_with_timeout(self, video_url: str) -> Optional[str]:
        """
        Internal method with timeout and retries.
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            Transcript string if available
            
        Raises:
            Exception: On timeout or failure
        """
        for attempt in range(self.retry_attempts):
            try:
                # Use asyncio timeout
                result = await asyncio.wait_for(
                    self._run_gumloop_flow(video_url),
                    timeout=self.timeout
                )
                
                if result:
                    logger.info(f"✅ Gumloop transcript retrieved (attempt {attempt + 1})")
                    return result
                    
            except asyncio.TimeoutError:
                logger.error(f"❌ Gumloop request timed out after {self.timeout}s (attempt {attempt + 1})")
                if attempt == self.retry_attempts - 1:
                    raise Exception("Gumloop timeout")
                    
            except Exception as e:
                logger.error(f"❌ Gumloop attempt {attempt + 1} failed: {str(e)}")
                if attempt == self.retry_attempts - 1:
                    raise
                    
            # Exponential backoff between retries
            if attempt < self.retry_attempts - 1:
                await asyncio.sleep(2 ** attempt)
        
        return None
    
    async def _run_gumloop_flow(self, video_url: str) -> Optional[str]:
        """
        Run Gumloop flow in executor to avoid blocking.
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            Transcript string if available
        """
        loop = asyncio.get_event_loop()
        
        # Run synchronous Gumloop client in executor
        def run_flow():
            try:
                return self.client.run_flow(
                    flow_id=self.flow_id,
                    inputs={"link": video_url}
                )
            except Exception as e:
                logger.error(f"Gumloop flow execution failed: {str(e)}")
                raise
        
        output = await loop.run_in_executor(
            self.executor,
            run_flow
        )
        
        # Parse output
        return self._parse_gumloop_output(output)
    
    def _parse_gumloop_output(self, output: Any) -> Optional[str]:
        """
        Parse Gumloop output to extract transcript.
        
        Args:
            output: Raw Gumloop output
            
        Returns:
            Transcript string if found
        """
        if not output:
            return None
        
        # Handle different output formats
        if isinstance(output, dict):
            # Try to get transcript or summary
            content = (
                output.get("transcript") or
                output.get("summary") or
                output.get("content") or
                output.get("text") or
                output.get("result")
            )
            
            if content and isinstance(content, str):
                return content.strip()
        
        elif isinstance(output, str):
            return output.strip()
        
        elif isinstance(output, list) and len(output) > 0:
            # Handle list output
            first_item = output[0]
            if isinstance(first_item, dict):
                return self._parse_gumloop_output(first_item)
            elif isinstance(first_item, str):
                return first_item.strip()
        
        logger.warning(f"Unexpected Gumloop output format: {type(output)}")
        return None
    
    async def get_enhanced_summary(self, video_url: str) -> Dict[str, Any]:
        """
        Get enhanced summary with metadata.
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            Dictionary with summary, transcript, and category
        """
        if not self.client or not self.flow_id:
            return {"summary": None, "transcript": None, "category": None}
        
        try:
            # Use circuit breaker
            result = await self.circuit_breaker.call(
                self._fetch_enhanced_summary, 
                video_url
            )
            return result
            
        except Exception as e:
            logger.error(f"Failed to get enhanced summary: {str(e)}")
            return {"summary": None, "transcript": None, "category": None}
    
    async def _fetch_enhanced_summary(self, video_url: str) -> Dict[str, Any]:
        """
        Fetch enhanced summary with all metadata.
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            Dictionary with summary data
        """
        loop = asyncio.get_event_loop()
        
        def run_flow():
            try:
                return self.client.run_flow(
                    flow_id=self.flow_id,
                    inputs={"link": video_url}
                )
            except Exception as e:
                logger.error(f"Enhanced flow execution failed: {str(e)}")
                raise
        
        try:
            output = await asyncio.wait_for(
                loop.run_in_executor(self.executor, run_flow),
                timeout=self.timeout
            )
            
            # Parse enhanced output
            result = {
                "summary": None,
                "transcript": None,
                "category": None
            }
            
            if isinstance(output, dict):
                result["summary"] = output.get("summary")
                result["transcript"] = output.get("transcript")
                result["category"] = output.get("category")
                
                # Clean strings
                for key in result:
                    if result[key] and isinstance(result[key], str):
                        result[key] = result[key].strip()
            
            return result
            
        except asyncio.TimeoutError:
            raise Exception(f"Gumloop timeout after {self.timeout}s")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return self.circuit_breaker.get_stats()
    
    async def close(self):
        """Clean up resources."""
        self.executor.shutdown(wait=False)
        logger.info("Enhanced Gumloop service closed")