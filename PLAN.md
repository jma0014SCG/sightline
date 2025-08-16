# Sightline Repository Refactoring Plan

## Overview
This plan organizes repository cleanup and maintenance tasks into atomic, non-breaking PRs. Each PR is designed to be independently mergeable without disrupting existing functionality.

## Critical Constraints
Based on analysis of `/Docs/_autogen/apisurfaces.md` and `/Docs/_autogen/data_flow.md`, the following MUST NOT be changed:
- All tRPC router endpoints and their input/output schemas
- FastAPI endpoints (`/api/summarize`, `/api/progress/{task_id}`, etc.)
- Database schema and model relationships
- Authentication flows (Clerk webhooks, JWT validation)
- Payment flows (Stripe webhooks, subscription management)
- Core data flows (URL input → Summary creation → Display)

## PR 1: Rename and Reorganize Files (Structure Only)

### Description
Move and rename files to improve organization without changing any code content.

### File Moves (using `git mv`)
```bash
# Move orphaned pages to proper structure
git mv src/app/not-found.tsx src/app/(public)/not-found.tsx
git mv src/app/global-error.tsx src/app/(public)/global-error.tsx

# Consolidate test/experimental pages
mkdir -p src/app/(experimental)
git mv src/app/test/page.tsx src/app/(experimental)/test/page.tsx
git mv src/app/dev/page.tsx src/app/(experimental)/dev/page.tsx

# Organize legacy/duplicate summary pages
mkdir -p src/app/(dashboard)/library/[id]/_legacy
git mv src/app/(dashboard)/library/[id]/page-improved.tsx src/app/(dashboard)/library/[id]/_legacy/page-improved.tsx
git mv src/app/(dashboard)/library/[id]/page-original.tsx src/app/(dashboard)/library/[id]/_legacy/page-original.tsx

# Move Python notebooks to proper location
mkdir -p api/notebooks
git mv api/*.ipynb api/notebooks/

# Organize patches
mkdir -p patches/applied
git mv patches/diagnostics.patch patches/applied/
git mv patches/01-complete-router-refactoring.patch patches/applied/
```

### Risks
- **Low Risk**: Using `git mv` preserves history
- **Import paths might need updating in moved files**
- **Vercel deployment configuration might need adjustment**

### Acceptance Criteria
- [ ] All files moved using `git mv` to preserve history
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes  
- [ ] `pnpm build` succeeds
- [ ] No functional changes to code

---

## PR 2: Archive Dead Code and Unused Files

### Description
Move genuinely unused files to an archive directory for potential future reference.

### Files to Archive
```bash
# Create archive structure
mkdir -p .archive/components
mkdir -p .archive/scripts
mkdir -p .archive/api

# Archive unused components
git mv src/components/debug/DebugPanel.tsx .archive/components/
git mv src/components/debug .archive/components/

# Archive legacy auth modal (replaced by SignInModal)
git mv src/components/modals/AuthModal.tsx .archive/components/

# Archive old notebooks
git mv api/notebooks/transcript_extraction.ipynb .archive/api/
git mv api/notebooks/prompt_construction.ipynb .archive/api/

# Archive unused experimental files
git mv src/app/(experimental)/test .archive/
```

### Risks
- **Medium Risk**: Need to verify files are truly unused
- **Some debug tools might be occasionally useful**
- **Legacy notebooks might contain useful reference code**

### Acceptance Criteria
- [ ] Verify no imports reference archived files
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] All critical flows still work (summary creation, auth, billing)

---

## PR 3: Regenerate and Update Documentation

### Description
Update auto-generated documentation to reflect current state after reorganization.

### Documentation Updates
```bash
# Regenerate architecture maps
node scripts/generate-docs.js --arch-map
node scripts/generate-docs.js --api-surfaces
node scripts/generate-docs.js --data-flow

# Update project structure documentation
# - Update file paths in project_structure.md
# - Update references in Implementation.md
# - Update ARCHITECTURE.md with new structure

# Generate fresh dependency analysis
node scripts/analyze-deps.js > Docs/_autogen/dependencies.md

# Create structure changelog
echo "# Structure Changes Log" > Docs/STRUCTURE_CHANGELOG.md
# Document all moves and rationale
```

### Risks
- **Low Risk**: Documentation only
- **Need to ensure all references are updated**
- **Auto-generation scripts might need adjustment**

### Acceptance Criteria
- [ ] All documentation reflects new structure
- [ ] No broken internal links
- [ ] Documentation generation scripts work
- [ ] README accurately describes project structure

---

## PR 4: Configuration and Metadata Cleanup

### Description
Clean up configuration files, remove obsolete entries, and standardize metadata.

### Configuration Updates
```bash
# Update package.json
# - Remove unused scripts
# - Update deprecated dependencies
# - Standardize script naming

# Clean up tsconfig.json
# - Remove unused path aliases
# - Update include/exclude patterns

# Update .gitignore
# - Add .archive directory
# - Remove obsolete entries

# Standardize ESLint config
# - Remove rules for deleted files
# - Update glob patterns

# Clean environment example
# - Remove unused variables
# - Add missing required variables
# - Update comments
```

### Risks
- **Medium Risk**: Build tools depend on configuration
- **Some "unused" scripts might be used in CI/CD**
- **Path aliases might break imports**

### Acceptance Criteria
- [ ] `pnpm install` runs clean
- [ ] `pnpm lint` passes with updated config
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] All development commands work
- [ ] CI/CD pipelines pass

---

## Execution Order and Dependencies

### Recommended Sequence
1. **PR 1** - Rename/Reorganize (least risky, improves structure)
2. **PR 2** - Archive Dead Code (depends on PR 1 for clean structure)
3. **PR 3** - Documentation Update (depends on PR 1 & 2 for accurate docs)
4. **PR 4** - Config Cleanup (can be done independently but better after structure is final)

### Pre-PR Checklist
For each PR, before starting:
1. Create feature branch from main
2. Run full test suite to establish baseline
3. Document current functionality with screenshots/recordings if UI changes

### Post-PR Validation
After each PR:
1. Full regression test of critical flows:
   - Anonymous user summary creation
   - Authenticated user summary creation  
   - Library viewing and filtering
   - Summary detail viewing
   - Billing/subscription flows
   - Sharing functionality
2. Deploy to staging/preview
3. Smoke test in production-like environment
4. Get code review from team

## Risk Mitigation

### Rollback Strategy
- Each PR is atomic and can be reverted independently
- Use feature flags for any risky changes
- Maintain backup of current structure in `.archive`
- Tag releases before and after each PR

### Monitoring
- Watch error rates in Sentry after each deployment
- Monitor API response times
- Check for 404s on moved pages
- Verify no increase in TypeScript errors

### Communication
- Notify team before each PR merge
- Update deployment notes
- Document any manual steps needed
- Create runbook for rollback procedures

## Success Metrics
- No increase in error rates
- No broken functionality
- Improved developer experience
- Cleaner project structure
- Better documentation accuracy
- Faster build times (potentially)

## Notes
- This plan intentionally avoids any code changes to minimize risk
- Each PR should take 1-2 hours to implement
- Total timeline: 1-2 days with proper testing
- Can be executed incrementally over time if needed