# Scripts Directory

This directory contains utility scripts for development, testing, and maintenance.

## Reference Implementation Scripts

### clone_reference.sh

Clones the reference implementation repository for comparison and debugging purposes.

**Usage:**
```bash
bash scripts/clone_reference.sh
```

**What it does:**
- Creates `.tmp/reference` directory
- Performs a shallow clone of `https://github.com/jma0014SCG/sightline.git`
- Displays commit information (hash, date, message)
- Provides usage instructions

**Location of cloned repository:**
`.tmp/reference/sightline`

**To compare files:**
```bash
# Compare a specific file
diff src/components/organisms/SummaryViewer/SummaryViewer.tsx .tmp/reference/sightline/src/components/organisms/SummaryViewer/SummaryViewer.tsx

# Compare directories
diff -r src/components/molecules .tmp/reference/sightline/src/components/molecules
```

**To clean up:**
```bash
rm -rf .tmp/reference
```

**To re-run:**
```bash
bash scripts/clone_reference.sh
```

The script automatically removes any existing clone before creating a fresh one, so it's safe to run multiple times.

## Other Development Scripts

- `debug-summary-content.js` - Analyzes summary content in the database
- `test-summary-fix.js` - Tests summary processing pipeline
- `test-new-procedures.js` - Tests newly implemented tRPC procedures (update, delete, claimAnonymous, getAnonymous)
- `setup-env.sh` - Environment setup and validation
- `dev.sh` - Development server startup
- `test-*.js` - Various testing utilities

## Testing New Procedures

### test-new-procedures.js

Tests all newly implemented tRPC procedures to ensure they're working correctly:

**Usage:**
```bash
node scripts/test-new-procedures.js
```

**What it tests:**
- `summary.getAnonymous` - Retrieves anonymous summaries (public procedure)
- `summary.delete` - Delete summary (protected procedure - tests auth)
- `summary.update` - Update summary metadata (protected procedure - tests auth)
- `summary.claimAnonymous` - Claim anonymous summaries after signup (protected procedure - tests auth)
- `summary.health` - Health check (public procedure - baseline test)

**Expected Results:**
- ✅ All protected procedures return 401 UNAUTHORIZED when not authenticated
- ✅ All public procedures work without authentication
- ✅ Health check confirms service is operational