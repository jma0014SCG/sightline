# Dead Code Analysis - Sightline.ai

Generated: 2025-08-15

**⚠️ DO NOT DELETE WITHOUT VERIFICATION** - Some items may be used in ways not detected by static analysis.

## Summary Statistics

- **Unused Files**: 29
- **Unused Dependencies**: 5 production, 9 development
- **Unused Exports**: 67
- **Missing Dependencies**: 3

## Unused Files (29)

### Test & Development Scripts
These may be useful for development/debugging:

1. [`e2e/helpers/global-setup.ts`](../../e2e/helpers/global-setup.ts) - Playwright global setup
2. [`e2e/helpers/global-teardown.ts`](../../e2e/helpers/global-teardown.ts) - Playwright global teardown
3. [`scripts/backfill-usage-events.ts`](../../scripts/backfill-usage-events.ts) - Usage event backfill script
4. [`scripts/fix-archive-links.js`](../../scripts/fix-archive-links.js) - Archive link fixer
5. [`scripts/init-anonymous-user.js`](../../scripts/init-anonymous-user.js) - Anonymous user initialization
6. [`scripts/link-validator.js`](../../scripts/link-validator.js) - Link validation script
7. [`scripts/test-anonymous-flow.js`](../../scripts/test-anonymous-flow.js) - Anonymous flow testing
8. [`scripts/test-db.js`](../../scripts/test-db.js) - Database connection test
9. [`scripts/test-fingerprint.js`](../../scripts/test-fingerprint.js) - Fingerprint testing
10. [`scripts/test-logging.js`](../../scripts/test-logging.js) - Logging test
11. [`scripts/test-pipeline.js`](../../scripts/test-pipeline.js) - Pipeline test
12. [`scripts/toggle-improved-layout.js`](../../scripts/toggle-improved-layout.js) - Layout toggle script
13. [`scripts/validate-env.js`](../../scripts/validate-env.js) - Environment validation
14. [`test-integration.js`](../../test-integration.js) - Integration test
15. [`test-sentry.js`](../../test-sentry.js) - Sentry test
16. [`tests/test-full-flow.js`](../../tests/test-full-flow.js) - Full flow test

### Potentially Obsolete Source Files
Verify before removing:

17. [`src/app/(dashboard)/library/[id]/page-improved.tsx`](../../src/app/(dashboard)/library/[id]/page-improved.tsx) - Alternative page implementation
18. [`src/lib/cache.ts`](../../src/lib/cache.ts) - Caching utilities (may be used)
19. [`src/lib/env.ts`](../../src/lib/env.ts) - Environment validation (imported but not used?)
20. [`src/lib/performance.ts`](../../src/lib/performance.ts) - Performance utilities
21. [`src/lib/rateLimit.ts`](../../src/lib/rateLimit.ts) - Rate limiting utilities
22. [`src/lib/stripe-client.ts`](../../src/lib/stripe-client.ts) - Stripe client utilities

### Unused Middleware/Examples
23. [`src/server/api/middleware/usageGuard.ts`](../../src/server/api/middleware/usageGuard.ts) - Usage guard middleware
24. [`src/server/api/middleware/usageGuardCompat.ts`](../../src/server/api/middleware/usageGuardCompat.ts) - Compatibility version
25. [`src/server/api/routers/summary/enhanced.example.ts`](../../src/server/api/routers/summary/enhanced.example.ts) - Example router
26. [`src/server/api/routers/summary/safeIntegration.ts`](../../src/server/api/routers/summary/safeIntegration.ts) - Safe integration example

### Test Utilities (May be needed for tests)
27. [`src/test-utils/db.ts`](../../src/test-utils/db.ts) - Database test utilities
28. [`src/test-utils/msw-handlers.ts`](../../src/test-utils/msw-handlers.ts) - MSW mock handlers
29. [`src/test-utils/msw-server.ts`](../../src/test-utils/msw-server.ts) - MSW server setup

## Unused Dependencies

### Production Dependencies (5)
Verify these aren't used before removing:

| Package | Version | Location | Notes |
|---------|---------|----------|-------|
| `class-variance-authority` | ^0.7.1 | [`package.json:69`](../../package.json#L69) | CSS utility library |
| `isomorphic-dompurify` | ^2.26.0 | [`package.json:71`](../../package.json#L71) | XSS protection |
| `@stripe/stripe-js` | ^7.5.0 | [`package.json:60`](../../package.json#L60) | Stripe frontend SDK |
| `@upstash/redis` | ^1.35.3 | [`package.json:68`](../../package.json#L68) | Redis caching |
| `@trpc/next` | ^11.4.3 | [`package.json:64`](../../package.json#L64) | tRPC Next.js adapter |

### Development Dependencies (9)
Can be removed if not used:

| Package | Version | Location | Notes |
|---------|---------|----------|-------|
| `@typescript-eslint/eslint-plugin` | ^7.18.0 | [`package.json:101`](../../package.json#L101) | ESLint TypeScript plugin |
| `prettier-plugin-tailwindcss` | ^0.6.14 | [`package.json:118`](../../package.json#L118) | Prettier Tailwind plugin |
| `@typescript-eslint/parser` | ^7.18.0 | [`package.json:102`](../../package.json#L102) | ESLint TypeScript parser |
| `eslint-config-prettier` | ^10.1.5 | [`package.json:108`](../../package.json#L108) | ESLint Prettier config |
| `globals` | ^16.3.0 | [`package.json:109`](../../package.json#L109) | Global variables |
| `dotenv` | ^17.2.1 | [`package.json:105`](../../package.json#L105) | Environment variables |
| `msw` | ^2.10.4 | [`package.json:114`](../../package.json#L114) | API mocking |
| `@types/node-fetch` | ^2.6.13 | [`package.json:98`](../../package.json#L98) | Node fetch types |
| `@eslint/eslintrc` | ^3.3.1 | [`package.json:91`](../../package.json#L91) | ESLint config |

## Missing Dependencies (3)

These are imported but not in package.json:

1. **`next-auth`** - Referenced in [`src/types/next-auth.d.ts`](../../src/types/next-auth.d.ts)
   - Note: Project migrated to Clerk, this is likely obsolete

2. **`@jest/globals`** - Used in [`src/server/api/routers/__tests__/usage-limit-security.test.ts`](../../src/server/api/routers/__tests__/usage-limit-security.test.ts)
   - Should be added to devDependencies if tests are active

3. **`msw-trpc`** - Used in [`src/server/api/routers/__tests__/usage-limit-security.test.ts`](../../src/server/api/routers/__tests__/usage-limit-security.test.ts)
   - Should be added to devDependencies if tests are active

## Unused Exports (67 Total)

### High Priority - Likely Safe to Remove

#### Test Utilities (10 exports)
From [`src/test-utils/component-mocks.ts`](../../src/test-utils/component-mocks.ts):
- `createMockURLValidation` (line 174)
- `createMockLibraryData` (line 113)
- `createMockAuthStates` (line 208)
- `createMockShareData` (line 193)
- `createMockToast` (line 233)

From [`src/test-utils/react.tsx`](../../src/test-utils/react.tsx):
- `createMockProgressTracking` (line 160)

From [`e2e/helpers/wait-utils.ts`](../../e2e/helpers/wait-utils.ts):
- `waitForFormSubmission` (line 146)
- `waitForElementStable` (line 114)
- `retryWithBackoff` (line 170)

#### Potentially Obsolete Functions (7 exports)

From [`src/server/api/routers/summary/guards.ts`](../../src/server/api/routers/summary/guards.ts):
- `getAnonymousUsageCount` (line 156) - May be replaced
- `checkAnonymousUsageLimit` (line 17) - May be replaced

From [`src/lib/browser-fingerprint.ts`](../../src/lib/browser-fingerprint.ts):
- `hasUsedFreeSummary` (line 105) - Obsolete?
- `generateBrowserFingerprint` (line 20) - Check usage

From [`src/lib/api/correlation.ts`](../../src/lib/api/correlation.ts):
- `createCorrelationContext` (line 63)
- `withCorrelationId` (line 33)

### Medium Priority - Verify Usage

#### Performance & Caching (8 exports)
From [`src/lib/performance-budgets.ts`](../../src/lib/performance-budgets.ts):
- `performanceBudgets` (line 255) - Performance configuration

From [`src/lib/cache.ts`](../../src/lib/cache.ts):
- `withCache` (line 294)
- `getFromCache` (line 216)
- `setInCache` (line 217)
- `deleteFromCache` (line 219)
- `cacheExists` (line 220)
- `cacheUser` (line 230)
- `getCachedUser` (line 240)

#### Anonymous User Functions (4 exports)
From [`src/lib/anonUsage.ts`](../../src/lib/anonUsage.ts):
- `generateSimpleFingerprint` (line 14)
- `getFreeSummariesUsed` (line 69)
- `getAnonymousUsageData` (line 115)
- `clearAnonymousUsageData` (line 129)

### Low Priority - Keep for Now

#### E2E Test Utilities (15+ exports)
Various helper functions in `e2e/helpers/` that may be needed for future tests.

#### Type Definitions & Constants
Type exports and constants that may be referenced elsewhere.

## Python Security Vulnerabilities

**⚠️ SECURITY**: Update these packages immediately

| Package | Current | Required | Vulnerability |
|---------|---------|----------|--------------|
| `langchain` | 0.2.6 | ≥0.2.19 | GHSA-45pg-36p6-83v9, GHSA-hc5w-c9f8-9cc4 |
| `python-jose` | 3.3.0 | ≥3.4.0 | PYSEC-2024-232, PYSEC-2024-233 |
| `python-multipart` | 0.0.9 | ≥0.0.18 | GHSA-59g5-xgcq-4qw3 |
| `starlette` | 0.37.2 | ≥0.47.2 | GHSA-f96h-pmfr-66vw, GHSA-2c2j-9gv5-cj73 |
| `ecdsa` | 0.19.1 | Update | GHSA-wj6h-64fc-37mp |

Update with: `pip install --upgrade langchain python-jose python-multipart starlette ecdsa`

## Recommendations

### Immediate Actions
1. **Security**: Update Python packages with vulnerabilities
2. **Dependencies**: Remove confirmed unused production dependencies to reduce bundle size
3. **Missing Dependencies**: Add missing dev dependencies if tests are active

### Investigation Needed
1. Verify if `@stripe/stripe-js` is actually unused (seems unlikely)
2. Check if `@upstash/redis` is used for caching
3. Confirm `src/lib/cache.ts` is truly unused
4. Review test files to determine which test utilities are needed

### Keep for Now
1. Development scripts - useful for debugging
2. Test utilities - may be needed for future tests
3. Example/template files - useful as reference

### Cleanup Strategy
1. Start with obvious unused files (examples, obsolete implementations)
2. Remove unused dev dependencies
3. Carefully review production dependencies
4. Update Python packages for security
5. Clean up unused exports in phases

## Audit Commands Used

```bash
# JavaScript/TypeScript analysis
npx knip --reporter markdown > .reports/knip.md
npx ts-prune > .reports/ts-prune.txt
pnpm dlx depcheck > .reports/depcheck.txt

# Python security audit
pip-audit -r requirements.txt > .reports/pip-audit.txt
```

## Notes

- Some "unused" items may be imported dynamically or used in ways not detected by static analysis
- Test files and scripts may be valuable for development even if not regularly used
- Always test thoroughly after removing dependencies or files
- Consider keeping documentation and example files for reference