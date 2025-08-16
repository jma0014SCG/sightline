# Knip report

## Unused files (29)

* e2e/helpers/global-setup.ts
* e2e/helpers/global-teardown.ts
* scripts/backfill-usage-events.ts
* scripts/fix-archive-links.js
* scripts/init-anonymous-user.js
* scripts/link-validator.js
* scripts/test-anonymous-flow.js
* scripts/test-db.js
* scripts/test-fingerprint.js
* scripts/test-logging.js
* scripts/test-pipeline.js
* scripts/toggle-improved-layout.js
* scripts/validate-env.js
* src/app/(dashboard)/library/[id]/page-improved.tsx
* src/lib/cache.ts
* src/lib/env.ts
* src/lib/performance.ts
* src/lib/rateLimit.ts
* src/lib/stripe-client.ts
* src/server/api/middleware/usageGuard.ts
* src/server/api/middleware/usageGuardCompat.ts
* src/server/api/routers/summary/enhanced.example.ts
* src/server/api/routers/summary/safeIntegration.ts
* src/test-utils/db.ts
* src/test-utils/msw-handlers.ts
* src/test-utils/msw-server.ts
* test-integration.js
* test-sentry.js
* tests/test-full-flow.js

## Unused dependencies (5)

| Name                     | Location          | Severity |
| :----------------------- | :---------------- | :------- |
| class-variance-authority | package.json:69:6 | error    |
| isomorphic-dompurify     | package.json:71:6 | error    |
| @stripe/stripe-js        | package.json:60:6 | error    |
| @upstash/redis           | package.json:68:6 | error    |
| @trpc/next               | package.json:64:6 | error    |

## Unused devDependencies (9)

| Name                             | Location           | Severity |
| :------------------------------- | :----------------- | :------- |
| @typescript-eslint/eslint-plugin | package.json:101:6 | error    |
| prettier-plugin-tailwindcss      | package.json:118:6 | error    |
| @typescript-eslint/parser        | package.json:102:6 | error    |
| eslint-config-prettier           | package.json:108:6 | error    |
| globals                          | package.json:109:6 | error    |
| dotenv                           | package.json:105:6 | error    |
| msw                              | package.json:114:6 | error    |
| @types/node-fetch                | package.json:98:6  | error    |
| @eslint/eslintrc                 | package.json:91:6  | error    |

## Unlisted dependencies (3)

| Name          | Location                                                      | Severity |
| :------------ | :------------------------------------------------------------ | :------- |
| @jest/globals | src/server/api/routers/__tests__/usage-limit-security.test.ts | error    |
| msw-trpc      | src/server/api/routers/__tests__/usage-limit-security.test.ts | error    |
| next-auth     | src/types/next-auth.d.ts                                      | error    |

## Unlisted binaries (3)

| Name                 | Location     | Severity |
| :------------------- | :----------- | :------- |
| scripts/setup-env.sh | package.json | error    |
| vercel               | package.json | error    |
| husky                | package.json | error    |

## Unresolved imports (1)

| Name       | Location       | Severity |
| :--------- | :------------- | :------- |
| babel-jest | jest.config.js | error    |

## Unused exports (67)

| Name                                   | Location                                        | Severity |
| :------------------------------------- | :---------------------------------------------- | :------- |
| getAnonymousUsageCount                 | src/server/api/routers/summary/guards.ts:156:23 | error    |
| checkAnonymousUsageLimit               | src/server/api/routers/summary/guards.ts:17:23  | error    |
| createMockURLValidation                | src/test-utils/component-mocks.ts:174:14        | error    |
| createMockLibraryData                  | src/test-utils/component-mocks.ts:113:14        | error    |
| createMockAuthStates                   | src/test-utils/component-mocks.ts:208:14        | error    |
| createMockShareData                    | src/test-utils/component-mocks.ts:193:14        | error    |
| createMockToast                        | src/test-utils/component-mocks.ts:233:14        | error    |
| hasUsedFreeSummary                     | src/lib/browser-fingerprint.ts:105:17           | error    |
| performanceBudgets                     | src/lib/performance-budgets.ts:255:14           | error    |
| generateBrowserFingerprint             | src/lib/browser-fingerprint.ts:20:23            | error    |
| createCorrelationContext               | src/lib/api/correlation.ts:63:17                | error    |
| waitForFormSubmission                  | e2e/helpers/wait-utils.ts:146:14                | error    |
| waitForElementStable                   | e2e/helpers/wait-utils.ts:114:14                | error    |
| withCorrelationId                      | src/lib/api/correlation.ts:33:17                | error    |
| retryWithBackoff                       | e2e/helpers/wait-utils.ts:170:14                | error    |
| createMockProgressTracking             | src/test-utils/react.tsx:160:14                 | error    |
| MOCK_BROWSER_FINGERPRINT               | src/test-utils/react.tsx:172:14                 | error    |
| mockIntersectionObserver               | src/test-utils/react.tsx:178:14                 | error    |
| createMockTRPCHooks                    | src/test-utils/react.tsx:143:14                 | error    |
| waitForApiResponse                     | e2e/helpers/wait-utils.ts:91:14                 | error    |
| CORRELATION_HEADER                     | src/lib/api/correlation.ts:7:14                 | error    |
| REQUEST_ID_HEADER                      | src/lib/api/correlation.ts:8:14                 | error    |
| A11Y_SELECTORS                         | e2e/helpers/selectors.ts:196:14                 | error    |
| waitForServer                          | e2e/helpers/wait-utils.ts:10:14                 | error    |
| createMockURL                          | src/test-utils/react.tsx:189:14                 | error    |
| waitForModal                           | e2e/helpers/wait-utils.ts:78:14                 | error    |
| waitForAsync                           | src/test-utils/react.tsx:175:14                 | error    |
| getSelector                            | e2e/helpers/selectors.ts:160:17                 | error    |
| waitForAuth                            | e2e/helpers/wait-utils.ts:20:14                 | error    |
| userEvent                              | src/test-utils/react.tsx:197:20                 | error    |
| PATTERNS                               | e2e/helpers/selectors.ts:177:14                 | error    |
| createMockOpenAIClassificationResponse | src/test-utils/mocks.ts:135:14                  | error    |
| createMockStripeSubscription           | src/test-utils/mocks.ts:106:14                  | error    |
| checkBusinessMetricAlert               | src/lib/alert-system.ts:331:14                  | error    |
| checkApiResponseAlert                  | src/lib/alert-system.ts:322:14                  | error    |
| createMockTRPCUtils                    | src/test-utils/react.tsx:91:14                  | error    |
| checkWebVitalsAlert                    | src/lib/alert-system.ts:327:14                  | error    |
| checkErrorRateAlert                    | src/lib/alert-system.ts:338:14                  | error    |
| createMockAuthUser                     | src/test-utils/react.tsx:74:14                  | error    |
| checkSecurityAlert                     | src/lib/alert-system.ts:343:14                  | error    |
| createTestWrapper                      | src/test-utils/react.tsx:33:17                  | error    |
| withEmailService                       | src/lib/emailService.ts:295:17                  | error    |
| featureFlags                           | src/lib/feature-flags.ts:79:14                  | error    |
| alertSystem                            | src/lib/alert-system.ts:319:14                  | error    |
| EMAIL_GROUPS                           | src/lib/emailService.ts:29:14                   | error    |
| createRateLimitHeaders                 | src/lib/rateLimits.ts:113:17                    | error    |
| getGlobalRateLimitKey                  | src/lib/rateLimits.ts:101:17                    | error    |
| createRateLimitError                   | src/lib/rateLimits.ts:139:17                    | error    |
| withErrorBoundary                      | src/lib/monitoring.ts:253:14                    | error    |
| createTestRouter                       | src/test-utils/trpc.ts:44:14                    | error    |
| useErrorTracking                       | src/lib/monitoring.ts:274:14                    | error    |
| testProcedure                          | src/test-utils/trpc.ts:45:14                    | error    |
| createCaller                           | src/test-utils/trpc.ts:59:14                    | error    |
| logApiCall                             | src/lib/monitoring.ts:234:14                    | error    |
| logError                               | src/lib/monitoring.ts:230:14                    | error    |
| waitFor                                | src/test-utils/trpc.ts:80:14                    | error    |
| clearAnonymousUsageData                | src/lib/anonUsage.ts:129:17                     | error    |
| getAnonymousUsageData                  | src/lib/anonUsage.ts:115:23                     | error    |
| useToast                               | src/hooks/useToast.ts:13:17                     | error    |
| generateSimpleFingerprint              | src/lib/anonUsage.ts:14:17                      | error    |
| getFreeSummariesUsed                   | src/lib/anonUsage.ts:69:17                      | error    |
| generateSecureToken                    | src/lib/security.ts:181:17                      | error    |
| TAG_COLORS_HOVER                       | src/lib/tag-utils.ts:28:14                      | error    |
| getClientIP                            | src/lib/security.ts:142:17                      | error    |
| TAG_COLORS                             | src/lib/tag-utils.ts:17:14                      | error    |
| isUserOnPlan                           | src/lib/stripe.ts:146:17                        | error    |
| formatPrice                            | src/lib/stripe.ts:118:17                        | error    |

## Unused exported types (29)

| Name                     | Location                                                            | Severity |
| :----------------------- | :------------------------------------------------------------------ | :------- |
| Summary                  | src/components/organisms/SummaryViewer/SummaryViewer.types.ts:46:18 | error    |
| SummaryViewerProps       | src/components/organisms/SummaryViewer/index.ts:3:14                | error    |
| ToastProps               | src/components/atoms/Toast/index.ts:2:25                            | error    |
| PerformanceThresholds    | e2e/helpers/performance-utils.ts:149:18                             | error    |
| CorrelationContext       | src/lib/api/correlation.ts:53:18                                    | error    |
| SummaryCreatedProperties | src/hooks/useAnalytics.ts:10:18                                     | error    |
| UserActionProperties     | src/hooks/useAnalytics.ts:22:18                                     | error    |
| ConversionProperties     | src/hooks/useAnalytics.ts:29:18                                     | error    |
| SelectorValue            | e2e/helpers/selectors.ts:155:13                                     | error    |
| SelectorPath             | e2e/helpers/selectors.ts:154:13                                     | error    |
| AnalyticsEventProperties | src/hooks/useAnalytics.ts:6:18                                      | error    |
| SubscriberUpdate         | src/lib/emailService.ts:20:18                                       | error    |
| SubscriberData           | src/lib/emailService.ts:12:18                                       | error    |
| FeatureFlags             | src/lib/feature-flags.ts:6:18                                       | error    |
| EmailGroup               | src/lib/emailService.ts:38:13                                       | error    |
| AlertRule                | src/lib/alert-system.ts:16:18                                       | error    |
| RateLimitHeaders         | src/lib/rateLimits.ts:106:18                                        | error    |
| RateLimitError           | src/lib/rateLimits.ts:128:18                                        | error    |
| AlertSeverity            | src/lib/alert-system.ts:4:13                                        | error    |
| RouterInput              | src/test-utils/trpc.ts:64:13                                        | error    |
| Alert                    | src/lib/alert-system.ts:6:18                                        | error    |
| AnonymousUsageData       | src/lib/anonUsage.ts:109:18                                         | error    |
| RateLimitConfig          | src/lib/rateLimits.ts:75:18                                         | error    |
| MockContext              | src/test-utils/trpc.ts:9:13                                         | error    |
| Toast                    | src/hooks/useToast.ts:5:18                                          | error    |
| TagType                  | src/lib/tag-utils.ts:6:13                                           | error    |
| LoggerOptions            | src/lib/logger.ts:27:18                                             | error    |
| PricingPlan              | src/lib/stripe.ts:69:13                                             | error    |
| LogLevel                 | src/lib/logger.ts:7:13                                              | error    |

