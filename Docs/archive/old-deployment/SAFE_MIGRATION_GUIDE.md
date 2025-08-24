# Safe Migration Guide: Usage Guard Middleware

## Overview
This guide provides a **zero-risk** migration path to the new usage guard middleware system. The implementation is designed to **never break existing functionality**.

## 🛡️ Safety Features

1. **Feature Flag Control**: Disabled by default via environment variable
2. **Fallback Mechanisms**: Automatic fallback to existing code on any error
3. **No Breaking Changes**: All existing functions remain available
4. **Gradual Migration**: Can be tested in development before production
5. **Instant Rollback**: Just unset the environment variable

## 📁 New Files (Non-Breaking Additions)

```
src/server/api/middleware/
├── usageGuard.ts           # New middleware implementation
└── usageGuardCompat.ts     # Compatibility layer

src/server/api/routers/summary/
├── guards.ts               # UNCHANGED - Existing implementation
├── safeIntegration.ts      # Safe wrapper functions
└── enhanced.example.ts     # Example usage (reference only)
```

## 🔄 Migration Steps

### Step 1: Deploy New Files (No Risk)
The new files can be deployed without any changes to existing code. They won't be used until explicitly enabled.

### Step 2: Optional - Update Summary Router (Minimal Changes)
If you want to prepare for migration, make these minimal changes to `summary.ts`:

```typescript
// At the top of the file, add:
import { 
  enforceAnonymousUsageLimitSafe,
  recordAnonymousUsageSafe,
  checkAuthenticatedUsageSafe,
  recordUsageEventSafe,
  isNewUsageGuardEnabled,
  ANONYMOUS_USER_ID
} from './summary/safeIntegration'

// Keep existing imports commented for easy rollback:
// import { 
//   enforceAnonymousUsageLimit, 
//   recordAnonymousUsage,
//   ANONYMOUS_USER_ID 
// } from './summary/guards'
```

Then replace function calls:
```typescript
// Old:
await enforceAnonymousUsageLimit(ctx.prisma, fingerprint, clientIP)
// New (safe):
await enforceAnonymousUsageLimitSafe(ctx.prisma, fingerprint, clientIP)

// Old:
await recordAnonymousUsage(ctx.prisma, fingerprint, clientIP, summary.id, metadata)
// New (safe):
await recordAnonymousUsageSafe(ctx.prisma, fingerprint, clientIP, summary.id, metadata)
```

### Step 3: Test in Development
1. Deploy without enabling the feature flag
2. Verify everything works normally
3. Enable in development: `export ENABLE_NEW_USAGE_GUARD=true`
4. Test all scenarios
5. Monitor logs for any warnings

### Step 4: Gradual Production Rollout
```bash
# Start with feature disabled (default)
# Everything uses existing code

# Enable for testing (can be done anytime)
export ENABLE_NEW_USAGE_GUARD=true

# If any issues, instantly rollback
unset ENABLE_NEW_USAGE_GUARD
```

## 🔍 How It Works

### When Feature Flag is DISABLED (default):
```
User Request
    ↓
Summary Router
    ↓
safeIntegration.ts
    ↓
Uses EXISTING guards.ts ← Current implementation
    ↓
Response
```

### When Feature Flag is ENABLED:
```
User Request
    ↓
Summary Router
    ↓
safeIntegration.ts
    ↓
Try NEW usageGuard.ts
    ↓ (on error)
Fallback to guards.ts ← Automatic safety
    ↓
Response
```

## 📊 Monitoring

Check logs for migration status:
```
# When disabled (default):
📦 Using existing usage guard implementation (new middleware disabled)

# When enabled:
🚀 New usage guard middleware is ENABLED

# On successful new implementation use:
New usage guard check successful

# On fallback:
New usage guard failed, falling back to existing
```

## ⚡ Quick Commands

### Enable new middleware:
```bash
# In .env file:
echo "ENABLE_NEW_USAGE_GUARD=true" >> .env

# Or via export:
export ENABLE_NEW_USAGE_GUARD=true
```

### Disable/Rollback:
```bash
# Remove from .env or:
export ENABLE_NEW_USAGE_GUARD=false
# Or just:
unset ENABLE_NEW_USAGE_GUARD
```

### Check status:
```bash
echo $ENABLE_NEW_USAGE_GUARD
```

## ✅ Testing Checklist

Before enabling in production, test:

- [ ] Anonymous user - first summary (should work)
- [ ] Anonymous user - second attempt (should be blocked)
- [ ] Authenticated FREE user - within limit (should work)
- [ ] Authenticated FREE user - exceeding limit (should be blocked)
- [ ] Authenticated PRO user - within monthly limit (should work)
- [ ] Authenticated PRO user - exceeding monthly limit (should be blocked)
- [ ] Headers properly extracted (x-anon-fp, x-forwarded-for)
- [ ] UsageEvent records created correctly
- [ ] Error messages are user-friendly

## 🚨 Rollback Plan

If anything goes wrong:

1. **Immediate**: `unset ENABLE_NEW_USAGE_GUARD`
2. **Permanent**: Remove from .env file
3. **Nuclear**: Revert the safeIntegration.ts import changes

The system will instantly revert to using the existing implementation.

## 📈 Benefits After Migration

Once fully migrated and tested:

1. **Centralized Logic**: All usage enforcement in one place
2. **Better Monitoring**: Enhanced logging and metrics
3. **Cleaner Code**: Simplified summary router
4. **Header Support**: Can pass fingerprint via headers
5. **Consistent Enforcement**: Same logic for all user types
6. **Easier Maintenance**: Single source of truth for limits

## 🤝 Support

The implementation is designed to be completely safe. However, if you encounter any issues:

1. Check logs for warnings or errors
2. Verify environment variable is set correctly
3. Ensure all new files are deployed
4. Test with feature flag disabled first

Remember: **The existing code remains completely unchanged and functional**. The new system only activates when explicitly enabled via environment variable.