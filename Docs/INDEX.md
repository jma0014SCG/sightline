---
title: "Documentation Index"
description: "Central navigation hub for all Sightline.ai platform documentation"
type: "guide"
canonical_url: "/docs/"
version: "1.0"
last_updated: "2025-01-09"
audience: ["all-users", "developers", "operators", "contributors"]
complexity: "beginner"
tags: ["navigation", "index", "documentation-hub", "quick-start"]
navigation_hub: true
total_docs: 67
quick_start: true
---

# Documentation Index

**Central navigation hub for all Sightline.ai platform documentation**

## Table of Contents

- [Quick Start Paths](#quick-start) - Get started by user type
- [Core Documentation](#core-docs) - Essential files and APIs
  - [Architectural Decision Records](#adrs) - Design decisions
  - [API Documentation](#api-docs) - tRPC and FastAPI reference
- [Detailed Documentation](#detailed-docs) - Complete guides by category
  - [Architecture & Design](#architecture-design)
  - [Development Resources](#development)  
  - [Operations & Deployment](#operations)
  - [Project Reports](#reports)
- [Legacy Documentation](#archive) - Archived content
- [Documentation Status](#status) - Current state metrics
- [Documentation Standards](#standards) - Maintenance guidelines
- [Getting Help](#help) - Support resources

---

## Quick Start Paths {#quick-start}

### For New Developers

1. **[README.md](../README.md)** - Project overview and quick start
2. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture and data flow
3. **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Development setup and workflow
4. **[GLOSSARY.md](../GLOSSARY.md)** - Platform terminology

### For Contributors  

1. **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Complete development guide
2. **[Bug Tracking](development/bug-tracking.md)** - Known issues and resolutions
3. **[Testing Strategy](development/testing-strategy.md)** - Testing framework
4. **[DECISIONS/](../DECISIONS/)** - Architectural decision records

### For Operators

1. **[Production Operations](../PRODUCTION_OPERATIONS_GUIDE.md)** - Complete operational manual
2. **[Security Policy](../SECURITY.md)** - Security implementation
3. **[Monitoring Guide](operations/monitoring.md)** - Error tracking setup

## Core Documentation (LLM-Optimized Structure) {#core-docs}

### Essential Files (Root Level)

| Document | Purpose | Audience | Status |
|----------|---------|----------|---------|
| **[README.md](../README.md)** | Project overview, what/why/how/run/links | All users | ✅ Active |
| **[ARCHITECTURE.md](../ARCHITECTURE.md)** | System diagrams ([overview](../ARCHITECTURE.md#system-overview)), data flow ([patterns](../ARCHITECTURE.md#data-flow)), dependencies ([external](../ARCHITECTURE.md#external-dependencies)) | Developers, Architects | ✅ Active |
| **[CONTRIBUTING.md](../CONTRIBUTING.md)** | Development workflow, testing, PR process | Contributors | ✅ Active |
| **[GLOSSARY.md](../GLOSSARY.md)** | Canonical terminology and definitions | All stakeholders | ✅ Active |

### Architectural Decision Records {#adrs}

| ADR | Title | Status | Review Date |
|-----|-------|--------|-------------|
| **[ADR-0001](../DECISIONS/ADR-0001-dual-api-architecture.md)** | Dual API Architecture (tRPC + FastAPI) | ✅ Accepted | 2025-02-15 |
| **[ADR-0002](../DECISIONS/ADR-0002-smart-collections-ai-classification.md)** | Smart Collections AI Classification | ✅ Accepted | 2025-03-01 |
| **[ADR-0003](../DECISIONS/ADR-0003-anonymous-user-browser-fingerprinting.md)** | Anonymous User Browser Fingerprinting | ✅ Accepted | 2025-02-20 |

### API Documentation (Schema-First) {#api-docs}

| API Layer | Documentation | Purpose |
|-----------|---------------|---------|
| **tRPC** | [API/trpc/](../API/trpc/) | Type-safe frontend-backend communication |
| **FastAPI** | [API/fastapi/](../API/fastapi/) | High-performance AI processing |
| **Examples** | [API/examples/](../API/examples/) | Implementation patterns |

**Quick API Reference**:

- [Summary Procedures](../API/trpc/summary.md) - Video summarization API
- [Summarization Endpoint](../API/fastapi/summarization.md) - AI processing API
- [Progress Tracking](../API/examples/progress-tracking.md) - Real-time progress

## Detailed Documentation (Docs/ Directory) {#detailed-docs}

### By Category

#### Architecture & Design {#architecture-design}

- **[Project Structure](architecture/project-structure.md)** - Codebase organization
- **[UI/UX Guidelines](architecture/ui-ux-guidelines.md)** - Design system and accessibility

*For comprehensive technical architecture reference, see [ARCHITECTURE.md](../ARCHITECTURE.md) (root level)*

**See Also**: [Security Implementation](../ARCHITECTURE.md#security) • [Performance Patterns](../ARCHITECTURE.md#performance) • [ADR References](../ARCHITECTURE.md#adrs-reference)

#### Development Resources {#development}

- **[Environment Setup](development/environment-setup.md)** - Detailed development configuration
- **[Bug Tracking](development/bug-tracking.md)** - Known issues and resolution process
- **[Testing Strategy](development/testing-strategy.md)** - Unit tests, E2E tests (Playwright), performance benchmarks
- **[Quick Reference](development/quick-reference.md)** - Development commands cheat sheet

**See Also**: [CONTRIBUTING.md](../CONTRIBUTING.md) • [Environment Variables](../ARCHITECTURE.md#external-dependencies) • [Testing Framework](development/testing-strategy.md)

#### Operations & Deployment {#operations}

- **[Monitoring Guide](operations/monitoring.md)** - Error tracking and performance monitoring
- **[Rate Limits](../RATE_LIMITS.md)** - API rate limiting configuration and enforcement
- **[Troubleshooting](operations/troubleshooting.md)** - Common issues and solutions
- **[Legacy Deployment](operations/legacy-deployment.md)** - Historical deployment docs

**See Also**: [Production Operations Guide](../PRODUCTION_OPERATIONS_GUIDE.md) • [Security Policy](../SECURITY.md) • [Performance Monitoring](../ARCHITECTURE.md#performance)

#### Project Reports {#reports}

- **[Implementation Report](reports/implementation-report.md)** - Project implementation summary

*Historical test reports have been archived. For current testing information, see [Testing Strategy](development/testing-strategy.md)*

## Legacy Documentation (Archive) {#archive}

### Archived Files

Files moved to `archive/` directory are no longer maintained but kept for historical reference:

#### Recently Archived (2025-01-09 Deduplication)

- **[Duplicated Documentation](archive/duplicates/)** - Files consolidated to canonical sources
- **[Test Reports](archive/test-reports/)** - Historical testing reports and roadmaps

#### Previously Archived

- **Legacy Implementation Docs** - Superseded by current architecture  
- **Old Deployment Guides** - Replaced by Production Operations Guide
- **Historical Feature Specs** - Implemented and integrated into main docs
- **Obsolete Root Documentation** - Files moved during documentation hardening

## Documentation Status {#status}

### Active Documentation (7 Core Files)

✅ **README.md** - Entry point with what/why/how/run/links  
✅ **ARCHITECTURE.md** - Technical foundation with system diagrams  
✅ **CONTRIBUTING.md** - Complete developer workflow guide  
✅ **DECISIONS/** - Architectural decision records with ADR format  
✅ **API/** - Schema-first documentation (tRPC + FastAPI)  
✅ **GLOSSARY.md** - Canonical terminology reference  
✅ **Docs/INDEX.md** - This navigation hub  

### Maintained Documentation (Supporting)

- Production operations and security guides
- Detailed architecture and development resources
- Testing strategies and bug tracking
- Project reports and analysis

### Quality Metrics

- **Coverage**: 100% of core features documented
- **Freshness**: Core docs updated with each major release
- **Accuracy**: All code examples tested and validated
- **Accessibility**: Proper heading structure and navigation

## Documentation Standards {#standards}

### When to Update Documentation

**Immediate Updates Required**:

- New features or API changes
- Breaking changes or deprecations  
- Security updates or configuration changes
- Bug fixes affecting user workflow

**Regular Updates**:

- Performance improvements
- UI/UX enhancements
- Development process changes
- Architecture optimizations

### Content Guidelines

**Core Files**: Keep concise and focused on essential information  
**API Docs**: Auto-generate from schemas where possible  
**Examples**: All code examples must be tested and working  
**ADRs**: Document significant architectural decisions with context  
**Glossary**: Maintain canonical definitions for consistent terminology  

### Review Schedule

- **Monthly**: Review all core documentation for accuracy
- **Quarterly**: Update examples and verify all links
- **Release**: Update relevant docs with each version release
- **Annual**: Comprehensive audit and cleanup

## Getting Help {#help}

### Documentation Questions

- **Quick Reference**: Use search across documentation files
- **Development Issues**: Check [Bug Tracking](development/bug-tracking.md)
- **Architecture Questions**: Review [System Overview](../ARCHITECTURE.md#system-overview), [Data Flow](../ARCHITECTURE.md#data-flow), [Security](../ARCHITECTURE.md#security), and [ADRs](../DECISIONS/)
- **API Usage**: See [API Documentation](../API/) with examples

### Community Resources

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community support
- **Development Chat**: Real-time development discussions

### Contribution Process

1. Check existing documentation for gaps or outdated content
2. Follow [Documentation Standards](archive/obsolete-root-docs/DOCUMENTATION_STANDARDS.md)
3. Submit updates via pull request with proper review
4. Update this index when adding new documentation

---

**Documentation Philosophy**: Single source of truth, LLM-friendly structure, evidence-based updates

*Last Updated: January 9, 2025 | Next Review: February 9, 2025*
