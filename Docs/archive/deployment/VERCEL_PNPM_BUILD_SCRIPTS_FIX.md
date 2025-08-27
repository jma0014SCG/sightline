# 🚀 Fixing pnpm Build Scripts in Vercel

## The Problem
Vercel builds are failing because pnpm v10 blocks build scripts from running, which breaks:
- Prisma client generation
- Clerk auth components
- Other essential build tools

## Solution 1: Disable Script Protection in Vercel (Quickest)

### Add to Vercel Environment Variables:
```bash
# In Vercel Dashboard → Settings → Environment Variables
PNPM_IGNORE_SCRIPTS=false
```

Or via CLI:
```bash
vercel env add PNPM_IGNORE_SCRIPTS production
# Enter value: false
```

This tells pnpm to run all scripts in Vercel (safe in CI/CD environment).

## Solution 2: Pre-approve Scripts (More Secure)

### Step 1: Create Approval File Locally
```bash
# Create .pnpm-approval.json
cat > .pnpm-approval.json << 'EOF'
{
  "approvedBuilds": [
    "@prisma/client",
    "@prisma/engines",
    "prisma",
    "@clerk/shared",
    "@sentry/cli",
    "esbuild",
    "core-js",
    "msw",
    "unrs-resolver"
  ]
}
EOF
```

### Step 2: Commit and Push
```bash
git add .pnpm-approval.json
git commit -m "chore: approve pnpm build scripts for Vercel"
git push
```

### Step 3: Configure pnpm in Vercel
Add to your `.npmrc`:
```bash
# .npmrc
onlyBuiltDependenciesFile=.pnpm-approval.json
```

## Solution 3: Override in vercel.json (Build Command)

Edit `vercel.json`:
```json
{
  "buildCommand": "PNPM_IGNORE_SCRIPTS=false pnpm install && pnpm vercel-build",
  "installCommand": "corepack enable && pnpm install --frozen-lockfile --ignore-scripts=false"
}
```

## Solution 4: Use npm/yarn Instead (Last Resort)

If pnpm issues persist, temporarily switch:

### In vercel.json:
```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run vercel-build"
}
```

## Recommended Approach for Your Project

Since you're already using Vercel, the fastest fix is:

### 1. Add Environment Variable in Vercel Dashboard:
```
Name: PNPM_IGNORE_SCRIPTS
Value: false
Environment: Production, Preview, Development
```

### 2. Redeploy:
```bash
vercel --prod --force
```

## Why This Works

- **In CI/CD**: Running scripts is safer because:
  - Clean environment each build
  - No persistent access to secrets
  - Isolated from your local machine
  
- **PNPM_IGNORE_SCRIPTS=false**: Tells pnpm to run scripts like npm/yarn do
- **Trade-off**: Slightly less secure, but acceptable in CI/CD

## Verification

After deploying with the fix:

1. Check build logs for:
   ```
   ✓ Packages built successfully
   ✓ Prisma Client generated
   ```

2. Verify your app works:
   - Database queries work (Prisma)
   - Authentication works (Clerk)
   - No missing dependencies

## Quick Checklist

- [ ] Add `PNPM_IGNORE_SCRIPTS=false` to Vercel env vars
- [ ] OR commit `.pnpm-approval.json` file
- [ ] Trigger new deployment
- [ ] Check build logs for success
- [ ] Test app functionality

## Troubleshooting

If builds still fail:

1. **Check pnpm version**:
   ```json
   // package.json
   "packageManager": "pnpm@9.x.x"  // Downgrade from 10.x if needed
   ```

2. **Force rebuild**:
   ```bash
   vercel --prod --force
   ```

3. **Clear build cache**:
   - Vercel Dashboard → Settings → Clear Build Cache

---

**For your immediate fix**: Just add `PNPM_IGNORE_SCRIPTS=false` to Vercel environment variables and redeploy. Takes 2 minutes. ✅