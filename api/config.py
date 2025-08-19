from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Settings
    api_version: str = "0.1.0"
    debug: bool = False
    
    # OpenAI Settings
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    openai_max_tokens: int = 3000
    
    # YouTube Settings
    youtube_api_key: Optional[str] = None
    
    # Redis/Upstash Settings
    upstash_redis_rest_url: Optional[str] = None
    upstash_redis_rest_token: Optional[str] = None
    
    # Rate Limiting
    rate_limit_per_minute: int = 10
    rate_limit_per_day: int = 100
    
    # Summarization Settings
    max_video_duration: int = 21600  # 6 hours in seconds (increased from 2 hours)
    summary_cache_ttl: int = 86400  # 24 hours in seconds
    
    # Proxy Settings (optional)
    proxy_enabled: bool = False
    proxy_type: str = "http"  # http, socks5, or webshare
    proxy_url: Optional[str] = None  # For custom proxies: http://user:pass@host:port
    
    # Webshare proxy settings (premium option)
    webshare_proxy_username: Optional[str] = None
    webshare_proxy_password: Optional[str] = None
    
    # Free proxy settings (for testing)
    free_proxy_enabled: bool = True  # Enable automatic free proxy rotation
    
    # Oxylabs settings
    oxylabs_username: Optional[str] = None
    oxylabs_password: Optional[str] = None
    
    # Gumloop settings
    gumloop_api_key: Optional[str] = None
    gumloop_user_id: Optional[str] = None
    gumloop_flow_id: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables

# Create settings instance
settings = Settings()