# OpenTelemetry Configuration

## Overview

Sightline.ai includes optional OpenTelemetry (OTel) instrumentation for distributed tracing and observability. OTel can be completely disabled via environment variables if not needed.

## Kill Switch Configuration

### Environment Variables

Set either of these environment variables to `'1'` to **enable** OTel:

```bash
# For Next.js frontend
NEXT_PUBLIC_OTEL=1

# For FastAPI backend  
OTEL_ENABLED=1
```

**Default**: OTel is **disabled** by default (both variables default to `'0'` or undefined)

### Frontend (Next.js)

**File**: `instrumentation.ts`
- Exits early if `NEXT_PUBLIC_OTEL !== '1'` and `OTEL_ENABLED !== '1'`
- Currently only handles Sentry initialization (not pure OTel)

**File**: `src/lib/monitoring.ts` 
- Exports `OTEL_ENABLED` constant for use throughout the app
- Provides no-op fallbacks for monitoring functions when disabled
- Falls back to console logging when OTel is disabled

### Backend (FastAPI)

**File**: `api/monitoring.py`
- Checks `OTEL_ENABLED` and `NEXT_PUBLIC_OTEL` environment variables
- Wraps OTel initialization in try/except blocks
- Gracefully handles missing OTel dependencies
- Provides fallback logging when OTel components aren't available

## Configuration Options

### Basic Setup (.env)

```bash
# Disable OTel (default)
OTEL_ENABLED=0
NEXT_PUBLIC_OTEL=0

# Enable OTel
OTEL_ENABLED=1
NEXT_PUBLIC_OTEL=1
```

### Advanced Configuration

```bash
# OTLP Exporter Endpoint (optional)
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

# Service identification
OTEL_SERVICE_NAME="sightline"
OTEL_SERVICE_VERSION="1.0.0"
```

## Behavior When Disabled

When OTel is disabled:

### Frontend
- `startPerformanceMonitoring()` → no-op with console message
- `logError()` → falls back to `console.error()`
- `logApiCall()` → executes function without instrumentation
- `withErrorBoundary()` → logs to console instead of OTel
- `useErrorTracking()` hook → console logging fallbacks

### Backend  
- No OTel instrumentation loaded
- FastAPI and requests instrumentors not activated
- Graceful fallback to console logging
- No OTLP trace export attempted

## Troubleshooting

### Common Issues

1. **Import Errors**: OTel dependencies missing
   - Solution: Install with `pip install opentelemetry-api opentelemetry-sdk`
   - Or leave `OTEL_ENABLED=0` to skip OTel entirely

2. **Performance Impact**: OTel causing slowdowns
   - Solution: Set `OTEL_ENABLED=0` to disable completely
   - Alternative: Reduce sampling rate

3. **Development Noise**: Too many traces in development
   - Solution: Set `OTEL_ENABLED=0` for local development
   - Enable only in staging/production environments

### Verification

Check if OTel is properly disabled by looking for these log messages:

```
📡 OpenTelemetry disabled via environment variables
📡 Performance monitoring disabled (OTEL_ENABLED=false)  
```

## Best Practices

1. **Development**: Keep OTel disabled (`OTEL_ENABLED=0`) to reduce noise
2. **Staging**: Enable OTel (`OTEL_ENABLED=1`) for testing observability
3. **Production**: Enable based on monitoring requirements
4. **CI/CD**: Set `OTEL_ENABLED=0` in test environments to avoid external dependencies

## Integration with External Services

When `OTEL_ENABLED=1`, configure exporters:

- **Jaeger**: `OTEL_EXPORTER_OTLP_ENDPOINT="http://jaeger:14268/api/traces"`
- **Zipkin**: `OTEL_EXPORTER_OTLP_ENDPOINT="http://zipkin:9411/api/v2/spans"`
- **Cloud Services**: Use service-specific endpoints

When disabled, no external connections are attempted.