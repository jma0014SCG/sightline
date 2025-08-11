# Development Diagnostics Script

One-shot triage script for Sightline.ai development environment setup and monitoring.

## Quick Start

**Run the script:**
```bash
./scripts/dev-diagnose.sh
```

## What It Does

1. **🔥 Process Cleanup**
   - Kills processes on ports 3000 and 8000
   - Terminates any existing pnpm/uvicorn processes

2. **✅ Quality Checks**
   - Runs `pnpm typecheck` (30s timeout)
   - Runs `pnpm lint` (30s timeout)  
   - Runs `pnpm build` (60s timeout)
   - Non-blocking - continues on failures

3. **🚀 Service Startup**
   - Starts FastAPI on port 8000 (with reload)
   - Starts Next.js on port 3000 (dev mode)
   - Waits for services to be ready (30s each)

4. **📊 Log Monitoring**
   - Streams all logs to `/tmp/sightline-dev.log`
   - Filters and displays: `opentelemetry|otel|trpc|fastapi|error|exception`
   - Real-time colored output

5. **🛑 Fatal Error Detection**
   - Monitors for critical errors
   - Exits non-zero on first fatal error
   - Auto-cleanup on interrupt (Ctrl+C)

## Output

- **Services**: FastAPI at http://localhost:8000, Next.js at http://localhost:3000
- **API Docs**: http://localhost:8000/docs  
- **Full Logs**: `/tmp/sightline-dev.log`
- **Filtered Output**: Real-time error/trpc/otel monitoring

## Prerequisites

- pnpm installed
- Python venv at `./venv/` 
- Run from project root directory

## Exit Codes

- `0` - Normal shutdown (Ctrl+C)
- `1` - Fatal error detected or setup failure