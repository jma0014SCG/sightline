# Bug Tracking Document

## Overview
This document tracks all bugs, errors, and their resolutions encountered during the development of Sightline.ai. Each entry includes error details, root cause analysis, and resolution steps.

## Bug Entry Format
```
### [Bug ID] - [Brief Description]
**Date:** [YYYY-MM-DD]
**Stage:** [Implementation Stage from Implementation.md]
**Severity:** [Critical/High/Medium/Low]
**Status:** [Open/In Progress/Resolved]

**Error Details:**
[Detailed error message and stack trace]

**Root Cause:**
[Analysis of why the error occurred]

**Resolution:**
[Steps taken to resolve the issue]

**Prevention:**
[Measures to prevent similar issues]
```

---

## Active Bugs

### [BUG-005] - Missing Playbooks & Heuristics and Feynman Flashcards Data in Frontend
**Date:** 2025-01-28
**Stage:** Stage 3: Summary Display & Management  
**Severity:** Medium
**Status:** In Progress

**Error Details:**
Playbooks & Heuristics and Feynman Flashcards sections are not displaying data in the frontend SummaryViewer component, despite backend correctly parsing and sending the data.

**Steps to Reproduce:**
1. Create a summary from a YouTube URL
2. View the summary in the frontend
3. Observe that Playbooks & Heuristics and Feynman Flashcards sections show "No data available"
4. Check browser console logs for parsing debug information

**Expected Behavior:**
Both sections should display parsed content from the Gumloop markdown output

**Actual Behavior:**  
Sections appear empty despite backend logs showing successful parsing of:
- `playbooks & heuristics` section (e.g., "If you can't see a control panel → View ▶ User Interface→toggle Project Browser/Properties")
- `feynman flashcards` section (e.g., "Q: Why set levels before modeling? A: They're datums; every height-based edit references them")

**Environment:**
- Frontend: React/Next.js with TypeScript
- Backend: FastAPI with Gumloop parser
- Data flow: Backend → tRPC → Frontend SummaryViewer component

**Root Cause Analysis:**
Backend parsing is working correctly (confirmed via server logs). Issue appears to be in frontend markdown parsing logic:
1. Section extraction may not be finding the correct section names
2. Regex patterns in parsing functions may not match the actual content format
3. Data prioritization logic may be incorrectly falling back to empty backend data

**Current Investigation:**
- Added debug logging to frontend parsing functions
- Verified backend is correctly structuring data in API response
- Testing section name matching and content extraction

**Possible Solutions:**
1. Fix regex patterns in `parsePlaybooks()` and `parseFeynmanFlashcards()` functions
2. Verify section name matching is case-insensitive and handles special characters
3. Ensure markdown content extraction is working correctly
4. Test with actual Gumloop output format

---

### [BUG-001] - Localhost Network Connectivity Issue
**Date:** 2025-07-17
**Stage:** Stage 1: Foundation & Setup
**Severity:** High
**Status:** Resolved

**Error Details:**
```
Firefox can't establish a connection to the server at localhost:3000.
curl: (7) Failed to connect to localhost port 3000 after 0 ms: Couldn't connect to server
```

**Steps to Reproduce:**
1. Run `npm run dev` (server starts successfully and reports "Ready in 1065ms")
2. Open browser and navigate to http://localhost:3000
3. Attempt to access http://localhost:3001 as alternative
4. Test with curl command: `curl -I http://localhost:3000`

**Expected Behavior:**
Browser should load the Next.js application homepage and demo page

**Actual Behavior:**
Browser shows "Unable to connect" error, curl fails with connection refused

**Environment:**
- OS: macOS (Darwin 24.5.0)
- Node: via npm (Next.js 14.2.30)
- Browser: Firefox
- Server Status: Running and shows "Ready" message

**Root Cause:**
Network connectivity issue between browser/curl and Next.js dev server, despite server reporting successful startup. Possible causes:
- macOS firewall blocking localhost connections
- Missing Local Network permissions for browsers
- Port binding issue with Next.js dev server
- Network interface binding problem

**Resolution:**
**Date Resolved:** 2025-01-18
**Resolution Method:** The issue was resolved by using explicit host binding with the `-H 0.0.0.0` flag in the Next.js development server command.

**Resolution Steps:**
1. **Root Cause Identified:** Next.js dev server was not properly binding to all network interfaces
2. **Solution Applied:** Modified the dev script to use `next dev -H 0.0.0.0 -p 3000`
3. **Server Restart:** Killed existing server process and restarted with new configuration
4. **Verification:** Confirmed server responds to localhost:3000 with HTTP 200 status

**Technical Details:**
- **Before:** `next dev` (default binding to localhost only)
- **After:** `next dev -H 0.0.0.0 -p 3000` (binds to all network interfaces)
- **Result:** Server now accessible on both localhost and network interfaces

**Current Status:**
- ✅ Server starts successfully with `npm run dev`
- ✅ Browser can access http://localhost:3000
- ✅ API endpoints responding (GET /api/auth/session 200)
- ✅ Main page loading (GET / 200)
- ✅ Database queries working (Prisma queries visible in logs)
- ✅ tRPC endpoints functional

**Note:** There are still some NextAuth session errors and Tailwind CSS warnings, but these are separate issues and don't prevent the application from loading.

**Additional Resolution (2025-01-21):**
**Server Restart Process:** Successfully restarted both frontend and backend servers using the following process:
1. **Kill existing processes:** `pkill -f "next dev" && pkill -f "uvicorn"`
2. **Start Next.js frontend:** `npm run dev` (runs on http://localhost:3000)
3. **Start FastAPI backend:** `npm run api:dev` (runs on http://localhost:8000)
4. **Verification:** Both servers responding with HTTP 200 status
5. **Application functionality:** Site is now fully accessible and functional

**Current Server Status (2025-01-21):**
- ✅ Next.js frontend: Running on http://localhost:3000
- ✅ FastAPI backend: Running on http://localhost:8000
- ✅ Database connections: Working (Prisma queries successful)
- ✅ Authentication: NextAuth endpoints responding
- ✅ tRPC API: Functional with successful summary creation
- ✅ UI: Loading with Tailwind CSS (minor warnings present but non-blocking)

**Prevention:**
- **Immediate:** Update package.json dev script to include `-H 0.0.0.0` flag
- **Long-term:** Document this requirement in setup guides
- **Team:** Ensure all developers use the same host binding configuration
- **Monitoring:** Watch for similar network binding issues after Next.js updates

---

## Active Bugs

### [BUG-004] - ESLint Deprecated Options Error
**Date:** 2025-07-22
**Stage:** Stage 1: Foundation & Setup
**Severity:** High
**Status:** Resolved

**Error Details:**
```
Invalid Options:
- Unknown options: useEslintrc, extensions, resolvePluginsRelativeTo, rulePaths, ignorePath, reportUnusedDisableDirectives
- 'extensions' has been removed.
- 'resolvePluginsRelativeTo' has been removed.
- 'ignorePath' has been removed.
- 'rulePaths' has been removed. Please define your rules using plugins.
- 'reportUnusedDisableDirectives' has been removed. Please use the 'overrideConfig.linterOptions.reportUnusedDisableDirectives' option instead.

Error: ESLint is using deprecated options that are no longer supported
Impact: Linting fails completely, code quality checks disabled
```

**Steps to Reproduce:**
1. Run `npm run lint` in project directory
2. ESLint v9.31.0 attempts to process legacy configuration
3. Deprecated options cause linting to fail completely

**Expected Behavior:**
ESLint should run successfully and provide code quality feedback

**Actual Behavior:**
ESLint fails to start due to deprecated configuration options, disabling all code quality checks

**Environment:**
- ESLint: 9.31.0 (later downgraded to 8.57.1)
- Next.js: 14.2.30
- @typescript-eslint/eslint-plugin: 8.37.0 (later downgraded to 7.18.0)
- @typescript-eslint/parser: 8.37.0 (later downgraded to 7.18.0)

**Root Cause:**
ESLint v9 introduced breaking changes that deprecated the `.eslintrc` configuration format and related options. Next.js's ESLint integration was not fully compatible with ESLint v9, causing deprecated options to be passed to the new ESLint version.

**Resolution:**
**Date Resolved:** 2025-07-22
**Resolution Method:** Downgraded ESLint and TypeScript ESLint packages to compatible versions and simplified configuration.

**Resolution Steps:**
1. **Downgraded ESLint:** `pnpm add eslint@^8.57.1 --save-dev`
2. **Downgraded TypeScript ESLint packages:** `pnpm add @typescript-eslint/eslint-plugin@^7.18.0 @typescript-eslint/parser@^7.18.0 --save-dev`
3. **Simplified ESLint configuration:** Updated `.eslintrc.json` to use only core Next.js rules with Prettier compatibility
4. **Verified functionality:** Confirmed ESLint runs successfully with `npm run lint`

**Final Configuration (.eslintrc.json):**
```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "prefer-const": "error",
    "no-console": [
      "warn",
      {
        "allow": ["warn", "error"]
      }
    ],
    "no-unused-vars": "off"
  }
}
```

**Current Status:**
- ✅ ESLint runs successfully without deprecated option errors
- ✅ Next.js core web vitals rules active
- ✅ Prettier integration working
- ✅ Code quality checks re-enabled
- ⚠️ Some TypeScript-specific rules temporarily disabled for compatibility

**Prevention:**
- **Monitor compatibility:** Check ESLint and Next.js compatibility before major version upgrades
- **Staged upgrades:** Upgrade ESLint ecosystem packages together, not individually
- **Test early:** Run linting immediately after package upgrades
- **Documentation:** Keep track of working package version combinations

---

### [BUG-002] - NextAuth Session Configuration Error
**Date:** 2025-01-18
**Stage:** Stage 2: Core Authentication & API Setup
**Severity:** Medium
**Status:** Open

**Error Details:**
```
[next-auth][error][JWT_SESSION_ERROR] 
Cannot read properties of undefined (reading 'id')
TypeError: Cannot read properties of undefined (reading 'id')
    at Object.session (webpack-internal:///(rsc)/./lib/auth/auth.ts:30:40)
```

**Steps to Reproduce:**
1. Start development server with `npm run dev`
2. Navigate to http://localhost:3000
3. Check server logs for NextAuth session errors

**Expected Behavior:**
NextAuth should handle session management without errors

**Actual Behavior:**
Session callback is trying to access `user.id` but `user` is undefined

**Environment:**
- NextAuth.js 4.24.11
- Next.js 14.2.30
- Prisma adapter configured

**Root Cause:**
Session callback in `lib/auth/auth.ts` line 30 is attempting to access `user.id` without proper null checking. This suggests either:
- User object is not being passed correctly to the session callback
- Database user record is not being created/found properly
- Prisma adapter configuration issue

**Possible Solutions:**
1. Add null checking in session callback
2. Verify Prisma adapter configuration
3. Check database connection and user table
4. Review NextAuth configuration in `lib/auth/auth.ts`

---

### [BUG-003] - Tailwind CSS Utility Class Error
**Date:** 2025-01-18
**Stage:** Stage 1: Foundation & Setup
**Severity:** Low
**Status:** Open

**Error Details:**
```
Error: Cannot apply unknown utility class `border-gray-200`. Are you using CSS modules or similar and missing `@reference`? https://tailwindcss.com/docs/functions-and-directives#reference-directive
```

**Steps to Reproduce:**
1. Start development server with `npm run dev`
2. Navigate to any page using Tailwind CSS classes
3. Check server logs for Tailwind compilation errors

**Expected Behavior:**
Tailwind CSS should compile without errors and apply utility classes correctly

**Actual Behavior:**
Tailwind CSS is not recognizing standard utility classes like `border-gray-200`

**Environment:**
- Tailwind CSS 4.1.11
- Next.js 14.2.30
- PostCSS 8.5.6

**Root Cause:**
Tailwind CSS v4 has different configuration requirements and may not be properly configured for the project structure. The error suggests missing `@reference` directive or incorrect configuration.

**Possible Solutions:**
1. Check Tailwind CSS configuration in `tailwind.config.ts`
2. Verify PostCSS configuration in `postcss.config.js`
3. Add `@reference` directive to CSS files if using CSS modules
4. Consider downgrading to Tailwind CSS v3 if v4 compatibility issues persist
5. Review Tailwind CSS v4 migration guide

---

## Resolved Bugs

### [BUG-001] - Localhost Network Connectivity Issue
**Date:** 2025-07-17
**Stage:** Stage 1: Foundation & Setup
**Severity:** High
**Status:** Resolved

**Resolution Date:** 2025-01-18
**Resolution:** Issue resolved after system restart. Server now properly binds to localhost:3000 and responds to requests.

---

## Common Issues Reference

### Environment Setup Issues

#### Node.js Version Mismatch
- **Symptom:** Package installation failures
- **Solution:** Use Node.js 18.x or 20.x (LTS versions)
- **Check:** Run `node --version`

#### Python Version Issues  
- **Symptom:** FastAPI or dependency installation failures
- **Solution:** Use Python 3.12 as specified in PRD
- **Check:** Run `python --version`

### Database Connection Issues

#### Neon Connection Timeout
- **Symptom:** Prisma connection timeouts
- **Solution:** Check connection string includes `-pooler` for serverless
- **Prevention:** Use connection pooling in production

#### Migration Failures
- **Symptom:** Prisma migration errors
- **Solution:** Check database permissions and schema conflicts
- **Prevention:** Always run migrations in development first

### API Integration Issues

#### YouTube API Quota Exceeded
- **Symptom:** 403 errors from YouTube
- **Solution:** Implement caching and rate limiting
- **Prevention:** Monitor API usage dashboard

#### OpenAI Rate Limits
- **Symptom:** 429 errors from OpenAI
- **Solution:** Implement exponential backoff
- **Prevention:** Use streaming responses and optimize prompts

### Build & Deployment Issues

#### Vercel Build Timeout
- **Symptom:** Build exceeds 45-minute limit
- **Solution:** Optimize build process, use caching
- **Prevention:** Monitor build times regularly

#### Cold Start Performance
- **Symptom:** Slow initial requests
- **Solution:** Implement warming strategies
- **Prevention:** Use edge functions where possible

---

## Error Patterns to Watch

1. **TypeScript Type Errors**
   - Always check `npm run typecheck` before committing
   - Use strict mode to catch issues early

2. **Prisma Schema Sync**
   - Run `npx prisma generate` after schema changes
   - Keep migrations in sync across environments

3. **Authentication Failures**
   - Verify OAuth credentials in environment
   - Check redirect URLs match deployment

4. **Payment Integration**
   - Test webhook signatures thoroughly
   - Implement idempotency for critical operations

---

## Debugging Tools & Commands

### Useful Commands
```bash
# Check TypeScript errors
npm run typecheck

# Lint code
npm run lint

# Run tests
npm test

# Check Prisma schema
npx prisma validate

# View database schema
npx prisma studio

# Check API routes
npm run api:routes

# Analyze bundle size
npm run analyze
```

### Environment Debugging
```bash
# Verify environment variables
npm run env:check

# Test database connection
npx prisma db pull --force

# Check API endpoints
curl http://localhost:3000/api/health
```

---

## Best Practices for Bug Prevention

1. **Always Check Documentation First**
   - Review Implementation.md for task context
   - Check project_structure.md before creating files
   - Follow UI_UX_doc.md for frontend work

2. **Test Incrementally**
   - Test each feature as you build
   - Don't accumulate technical debt
   - Fix issues immediately when found

3. **Use Type Safety**
   - Leverage TypeScript strictly
   - Use Zod for runtime validation
   - Define clear interfaces

4. **Monitor Performance**
   - Use Sentry for error tracking
   - Monitor API response times
   - Track user experience metrics

---

## Bug Reporting Template

When encountering a new bug, use this template:

```markdown
### [BUG-XXX] - [Title]
**Date:** [Today's date]
**Stage:** [Current implementation stage]
**Severity:** [Critical/High/Medium/Low]
**Status:** Open

**Error Details:**
```
[Error message or screenshot]
```

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- OS: [e.g., macOS 14.0]
- Node: [e.g., 20.x]
- Browser: [e.g., Chrome 120]

**Possible Solution:**
[Any ideas for fixing]
```

---

This document should be updated continuously throughout development to maintain a comprehensive record of all issues and their solutions.