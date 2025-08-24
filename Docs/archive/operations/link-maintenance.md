---
title: "Link Maintenance Guide"
description: "Automated tools and processes for maintaining documentation link health in Sightline.ai"
type: "guide"
canonical_url: "/docs/operations/link-maintenance"
version: "1.0"
last_updated: "2025-08-08"
audience: ["developers", "maintainers", "documentation-team"]
complexity: "intermediate"
tags: ["documentation", "automation", "maintenance", "links", "health-monitoring"]
maintenance_frequency: "monthly"
automation_level: "high"
related_docs: ["/claude", "/contributing", "/development/bug-tracking"]
---

# Link Maintenance Guide

**Automated tools and processes for maintaining documentation link health in Sightline.ai**

## Overview

This guide covers the automated link validation system designed to maintain 95%+ link health across all 60+ markdown files in the Sightline.ai documentation ecosystem.

## Link Validation Tools

### Primary Tool: Link Validator (`scripts/link-validator.js`)

**Purpose**: Comprehensive link validation across all markdown files

**Capabilities**:
- ✅ **Internal Links**: File references, directory paths, relative navigation
- ✅ **External Links**: HTTP/HTTPS URLs with timeout handling  
- ✅ **Anchor Links**: In-page navigation and cross-file anchors
- ✅ **Frontmatter References**: related_docs, canonical_url validation

**Usage**:
```bash
# Run full validation
node scripts/link-validator.js

# Or use package script
cd scripts && npm run validate-links
```

**Output**: 
- Console summary with health score
- `link-validation-report.json` - Machine-readable results
- `link-validation-report.md` - Human-readable analysis

### Secondary Tool: Archive Link Fixer (`scripts/fix-archive-links.js`)

**Purpose**: Batch fix relative path issues in archive documentation

**Usage**:
```bash
node scripts/fix-archive-links.js
```

**Target Files**:
- `Docs/archive/obsolete-root-docs/API_DOCUMENTATION.md`
- `Docs/archive/obsolete-root-docs/DOCUMENTATION_INDEX.md` 
- `Docs/archive/obsolete-root-docs/README.md`

## Health Metrics & Targets

### Current Performance
- **Files Monitored**: 63 markdown files
- **Total Links**: 382 links
- **Health Score**: 99.5% (Target: 95%+)
- **Broken Links**: 2 (archive external links only)

### Health Score Breakdown
- **Internal Links**: 100% healthy (111 total)
- **External Links**: 97.3% healthy (73 total)  
- **Anchor Links**: 100% healthy (89 total)
- **Frontmatter**: 100% healthy (109 total)

## Automated Monitoring

### Recommended Schedule

| Frequency | Action | Trigger |
|-----------|--------|---------|
| **Weekly** | Quick health check | `pnpm docs:health` |
| **Monthly** | Full validation + fixes | Link maintenance session |
| **Pre-Release** | Complete validation | Before major releases |
| **On-Demand** | After documentation changes | When adding new docs |

### GitHub Actions Integration (Recommended)

```yaml
# .github/workflows/docs-health.yml
name: Documentation Health Check

on:
  pull_request:
    paths: ['**/*.md', 'Docs/**/*']
  schedule:
    - cron: '0 9 1 * *' # Monthly on 1st at 9 AM

jobs:
  validate-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Validate Documentation Links
        run: |
          cd scripts
          npm install
          npm run validate-links
      - name: Check Health Score
        run: |
          HEALTH_SCORE=$(node -p "JSON.parse(require('fs').readFileSync('./link-validation-report.json')).summary.healthScore")
          if (( $(echo "$HEALTH_SCORE < 95" | bc -l) )); then
            echo "❌ Link health below 95%: $HEALTH_SCORE%"
            exit 1
          else
            echo "✅ Link health acceptable: $HEALTH_SCORE%"
          fi
```

## Common Link Issues & Solutions

### Issue Categories

#### High Priority - Active Documentation
- **API Structure Changes**: Update INDEX.md when API organization changes
- **File Relocations**: Update references when files move between directories
- **Navigation Breaks**: Fix main documentation index issues immediately

#### Medium Priority - Archive Files  
- **Relative Path Issues**: Use batch fixer for systematic relative path corrections
- **Outdated References**: Update references to moved/renamed files in archive content

#### Low Priority - External Links
- **API Documentation**: Use fallback URLs for frequently changing API docs
- **Service URLs**: Monitor third-party service URL changes

### Quick Fix Patterns

**File Moved**: Update all references using find/replace
```bash
# Example: Bug_tracking.md moved to development/
grep -r "Bug_tracking.md" . --include="*.md"
# Then update each reference manually or with sed
```

**Relative Path Issues**: Use the archive link fixer
```bash
node scripts/fix-archive-links.js
```

**External URL Changes**: Update to stable parent URLs
```bash
# Problematic: https://docs.service.com/api/v2/specific-endpoint
# Better: https://docs.service.com/api/
```

## Prevention Best Practices

### Documentation Authors

1. **Use Stable URLs**: Prefer parent directory URLs over specific endpoints
2. **Test Before Commit**: Run link validation on modified files
3. **Consistent Patterns**: Follow established relative path conventions
4. **Link Descriptions**: Use descriptive link text (not "here" or "link")

### Maintainers

1. **Regular Monitoring**: Schedule monthly link health checks
2. **Proactive Fixes**: Address broken links in active documentation immediately  
3. **Archive Management**: Decide retention policy for obsolete documentation
4. **Tool Updates**: Keep validation scripts updated with project structure changes

### Contributors

1. **Check Existing Patterns**: Review similar files for link formatting conventions
2. **Validate Changes**: Run link validator after adding new documentation
3. **Report Issues**: Use GitHub Issues for systematic link problems
4. **Document Decisions**: Update this guide when link patterns change

## Troubleshooting

### Common Error Messages

**"File not found"**:
- Check file path spelling and case sensitivity
- Verify relative path depth (`../` count)
- Confirm target file exists in expected location

**"HTTP 403/404"**:
- External service blocking automated requests (403)
- URL changed or endpoint deprecated (404)  
- Try parent directory URL or service homepage

**"Timeout"**:
- Network connectivity issue
- Service temporarily unavailable
- Consider adding URL to skip list for badge/shield services

### Emergency Procedures

**Sudden Health Score Drop**:
1. Run `node scripts/link-validator.js` 
2. Check recent file moves in git history
3. Look for batch changes that affected multiple files
4. Use archive link fixer if relative path issues

**Before Major Release**:
1. Full validation: `cd scripts && npm run validate-links`
2. Fix any broken links in active documentation
3. Verify API documentation structure
4. Update any changed service URLs

## Tool Configuration

### Link Validator Settings

**Timeouts**: 5 seconds for external links  
**Sampling**: 20 external URLs maximum (rate limiting)  
**Exclusions**: Badge services, shields.io (assumed valid)  
**File Patterns**: All `*.md` files except `venv/`, `node_modules/`

### Customization Options

**Add URL Patterns to Skip**:
```javascript
// In scripts/link-validator.js
if (url.includes('your-service.com') || url.includes('badge-service')) {
  return { valid: true, note: 'Skipped - known service' };
}
```

**Modify File Discovery**:
```javascript
// Exclude additional directories
const cmd = `find . -name "*.md" -not -path "*/your-dir/*" ...`;
```

## Success Metrics

### Target Performance
- **Overall Health**: ≥95%
- **Internal Links**: ≥90% 
- **External Links**: ≥90%
- **Anchor Links**: 100% (should never break)
- **Frontmatter**: 100% (controlled content)

### Monthly Reporting
- Health score trend over time
- Most common broken link patterns
- Time investment in link maintenance  
- Documentation coverage and growth

## Related Documentation

- **[Bug Tracking Guide](../development/bug-tracking.md)** - Report systematic link issues
- **[Contributing Guide](../../CONTRIBUTING.md)** - Documentation contribution standards  
- **[Architecture Guide](../../ARCHITECTURE.md)** - System overview for context
- **[Project Structure](../architecture/project-structure.md)** - File organization patterns

---

**Next Review Date**: September 1, 2025  
**Owner**: Documentation Team  
**Last Health Score**: 99.5% (August 8, 2025)