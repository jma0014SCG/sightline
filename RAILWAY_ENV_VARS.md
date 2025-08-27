# Railway Environment Variables Configuration

Copy these environment variables to your Railway project dashboard.

## Required Environment Variables

```bash
# Database (Your Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require

# External Service APIs
OPENAI_API_KEY=your_openai_api_key_here
GUMLOOP_API_KEY=your_gumloop_api_key_here
GUMLOOP_USER_ID=your_gumloop_user_id_here
GUMLOOP_FLOW_ID=your_gumloop_flow_id_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# Performance Configuration
PROGRESS_TTL_HOURS=4
MAX_WORKERS=2
WORKER_TIMEOUT=60
HEALTH_CHECK_TIMEOUT=60

# Monitoring (Optional but recommended)
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=WARNING

# CORS Configuration
ALLOWED_ORIGINS=https://sightlineai.io,https://www.sightlineai.io

# Connection Pool Settings (Optimized for Neon)
DB_POOL_MIN_SIZE=3
DB_POOL_MAX_SIZE=10
DB_COMMAND_TIMEOUT=25
DB_MAX_INACTIVE_CONNECTION_LIFETIME=300

# Circuit Breaker Settings
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60

# Resource Thresholds
MEMORY_THRESHOLD_PERCENT=80
CPU_THRESHOLD_PERCENT=90
CONNECTION_THRESHOLD_PERCENT=90
```

## How to Set These in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Click "Raw Editor"
5. Paste all the environment variables above
6. Replace the placeholder values with your actual API keys
7. Click "Save"

## Important Notes

- ✅ Your Neon database URL is already configured and tested
- ⚠️ Make sure to add your actual API keys for:
  - OpenAI (for AI summarization)
  - Gumloop (for enhanced processing)
  - YouTube (for video metadata)
- The database connection pool is optimized for Neon's pooler
- Circuit breakers will prevent cascade failures
- Resource monitoring will alert on high usage

## Health Check URLs After Deployment

Once deployed, you can monitor your backend at:

- `https://your-app.railway.app/api/health` - Basic health check
- `https://your-app.railway.app/api/health/detailed` - Comprehensive metrics
- `https://your-app.railway.app/api/health/resources` - Resource usage
- `https://your-app.railway.app/api/health/database` - Database connectivity
- `https://your-app.railway.app/api/health/circuit-breakers` - Circuit breaker status