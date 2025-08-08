# Documentation Index

**Central navigation hub for all Sightline.ai platform documentation**

## Quick Start Paths

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

## Core Documentation (LLM-Optimized Structure)

### Essential Files (Root Level)

| Document | Purpose | Audience | Status |
|----------|---------|----------|---------|
| **[README.md](../README.md)** | Project overview, what/why/how/run/links | All users | ✅ Active |
| **[ARCHITECTURE.md](../ARCHITECTURE.md)** | System diagrams, data flow, dependencies | Developers, Architects | ✅ Active |
| **[CONTRIBUTING.md](../CONTRIBUTING.md)** | Development workflow, testing, PR process | Contributors | ✅ Active |
| **[GLOSSARY.md](../GLOSSARY.md)** | Canonical terminology and definitions | All stakeholders | ✅ Active |

### Architectural Decision Records

| ADR | Title | Status | Review Date |
|-----|-------|--------|-------------|
| **[ADR-0001](../DECISIONS/ADR-0001-dual-api-architecture.md)** | Dual API Architecture (tRPC + FastAPI) | ✅ Accepted | 2025-02-15 |
| **[ADR-0002](../DECISIONS/ADR-0002-smart-collections-ai-classification.md)** | Smart Collections AI Classification | ✅ Accepted | 2025-03-01 |
| **[ADR-0003](../DECISIONS/ADR-0003-anonymous-user-browser-fingerprinting.md)** | Anonymous User Browser Fingerprinting | ✅ Accepted | 2025-02-20 |

### API Documentation (Schema-First)

| API Layer | Documentation | Purpose |
|-----------|---------------|---------|
| **tRPC** | [API/trpc/](../API/trpc/) | Type-safe frontend-backend communication |
| **FastAPI** | [API/fastapi/](../API/fastapi/) | High-performance AI processing |
| **Examples** | [API/examples/](../API/examples/) | Implementation patterns |

**Quick API Reference**:
- [Summary Procedures](../API/trpc/summary.md) - Video summarization API
- [Summarization Endpoint](../API/fastapi/summarization.md) - AI processing API
- [Progress Tracking](../API/examples/progress-tracking.md) - Real-time progress

## Detailed Documentation (Docs/ Directory)

### By Category

#### Architecture & Design
- **[Platform Overview](architecture/platform-overview.md)** - Comprehensive technical reference
- **[Project Structure](architecture/project-structure.md)** - Codebase organization
- **[UI/UX Guidelines](architecture/ui-ux-guidelines.md)** - Design system and accessibility

#### Development Resources
- **[Environment Setup](development/environment-setup.md)** - Detailed development configuration
- **[Bug Tracking](development/bug-tracking.md)** - Known issues and resolution process
- **[Testing Strategy](development/testing-strategy.md)** - Unit, E2E, performance tests
- **[Quick Reference](development/quick-reference.md)** - Development commands cheat sheet

#### Operations & Deployment
- **[Monitoring Guide](operations/monitoring.md)** - Error tracking and performance monitoring
- **[Rate Limits](operations/rate-limits.md)** - API rate limiting configuration
- **[Troubleshooting](operations/troubleshooting.md)** - Common issues and solutions
- **[Legacy Deployment](operations/legacy-deployment.md)** - Historical deployment docs

#### Project Reports
- **[Implementation Report](reports/implementation-report.md)** - Project implementation summary
- **[Test Reports](reports/)** - Testing analysis and improvement roadmaps

## Legacy Documentation (Archive)

### Archived Files
Files moved to `archive/` directory are no longer maintained but kept for historical reference:

- **Legacy Implementation Docs** - Superseded by current architecture
- **Old Deployment Guides** - Replaced by Production Operations Guide
- **Historical Feature Specs** - Implemented and integrated into main docs

## Documentation Status

### Active Documentation (7 Core Files)
✅ **README.md** - Entry point with what/why/how/run/links  
✅ **ARCHITECTURE.md** - Technical foundation with system diagrams  
✅ **CONTRIBUTING.md** - Complete developer workflow guide  
✅ **DECISIONS/** - Architectural decision records with ADR format  
✅ **API/** - Schema-first documentation (tRPC + FastAPI)  
✅ **GLOSSARY.md** - Canonical terminology reference  
✅ **docs/INDEX.md** - This navigation hub  

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

## Documentation Standards

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

## Getting Help

### Documentation Questions
- **Quick Reference**: Use search across documentation files
- **Development Issues**: Check [Bug Tracking](development/bug-tracking.md)
- **Architecture Questions**: Review [ARCHITECTURE.md](../ARCHITECTURE.md) and [ADRs](../DECISIONS/)
- **API Usage**: See [API Documentation](../API/) with examples

### Community Resources
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community support
- **Development Chat**: Real-time development discussions

### Contribution Process
1. Check existing documentation for gaps or outdated content
2. Follow [Documentation Standards](../DOCUMENTATION_STANDARDS.md)
3. Submit updates via pull request with proper review
4. Update this index when adding new documentation

---

**Documentation Philosophy**: Single source of truth, LLM-friendly structure, evidence-based updates

*Last Updated: January 9, 2025 | Next Review: February 9, 2025*