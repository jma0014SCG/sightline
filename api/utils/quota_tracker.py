"""
YouTube API Quota Tracker

Tracks quota usage to prevent exceeding daily limits.
YouTube Data API v3 has a daily quota of 10,000 units.

Quota costs:
- videos.list with 'snippet': 3 units (1 base + 2 snippet)
- videos.list with 'snippet,statistics': 5 units
- videos.list with 'snippet,statistics,contentDetails': 7 units (OLD)
- search.list: 100 units (EXPENSIVE - AVOID!)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class QuotaTracker:
    """Track YouTube API quota usage"""
    
    def __init__(self, daily_limit: int = 10000):
        self.daily_limit = daily_limit
        self.usage: Dict[str, int] = {}  # date -> units used
        self.last_reset = datetime.now().date()
    
    def add_usage(self, units: int, operation: str = "unknown"):
        """Record quota usage"""
        today = datetime.now().date()
        
        # Reset if new day
        if today != self.last_reset:
            self.usage = {}
            self.last_reset = today
            logger.info(f"📊 Quota reset for new day: {today}")
        
        # Add usage
        date_key = str(today)
        self.usage[date_key] = self.usage.get(date_key, 0) + units
        
        current_usage = self.usage[date_key]
        remaining = self.daily_limit - current_usage
        percentage = (current_usage / self.daily_limit) * 100
        
        # Log usage
        logger.info(f"📊 Quota: {operation} used {units} units")
        logger.info(f"   Daily usage: {current_usage}/{self.daily_limit} ({percentage:.1f}%)")
        logger.info(f"   Remaining: {remaining} units")
        
        # Warnings
        if percentage >= 90:
            logger.error(f"⚠️ CRITICAL: Quota usage at {percentage:.1f}%!")
        elif percentage >= 75:
            logger.warning(f"⚠️ WARNING: Quota usage at {percentage:.1f}%")
        elif percentage >= 50:
            logger.info(f"📊 INFO: Quota usage at {percentage:.1f}%")
        
        return remaining
    
    def get_remaining(self) -> int:
        """Get remaining quota for today"""
        today = str(datetime.now().date())
        used = self.usage.get(today, 0)
        return self.daily_limit - used
    
    def can_use(self, units: int) -> bool:
        """Check if we have enough quota"""
        return self.get_remaining() >= units
    
    def get_stats(self) -> Dict:
        """Get quota statistics"""
        today = str(datetime.now().date())
        used = self.usage.get(today, 0)
        remaining = self.daily_limit - used
        percentage = (used / self.daily_limit) * 100 if self.daily_limit > 0 else 0
        
        return {
            'date': today,
            'used': used,
            'remaining': remaining,
            'limit': self.daily_limit,
            'percentage': percentage,
            'videos_remaining_at_3_units': remaining // 3,  # Optimized
            'videos_remaining_at_7_units': remaining // 7,  # Old way
        }

# Global quota tracker instance
quota_tracker = QuotaTracker()