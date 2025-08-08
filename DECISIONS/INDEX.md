# Architectural Decision Records (ADRs)

This directory contains Architectural Decision Records (ADRs) for durable technical decisions made in the Sightline.ai platform development.

## What are ADRs?

ADRs document important architectural decisions, their context, and consequences. They provide historical insight into why certain technical choices were made and help inform future decisions.

## ADR Index

### Active Decisions

| ADR | Title | Status | Date | Next Review |
|-----|-------|--------|------|-------------|
| [ADR-0001](ADR-0001-dual-api-architecture.md) | Dual API Architecture (tRPC + FastAPI) | ✅ Accepted | 2024-08-15 | 2025-02-15 |
| [ADR-0002](ADR-0002-smart-collections-ai-classification.md) | Smart Collections AI Classification System | ✅ Accepted | 2024-09-01 | 2025-03-01 |
| [ADR-0003](ADR-0003-anonymous-user-browser-fingerprinting.md) | Anonymous User Browser Fingerprinting | ✅ Accepted | 2024-08-20 | 2025-02-20 |

### By Category

**Core Architecture**:
- [ADR-0001: Dual API Architecture](ADR-0001-dual-api-architecture.md)

**AI & Machine Learning**:
- [ADR-0002: Smart Collections AI Classification](ADR-0002-smart-collections-ai-classification.md)

**User Experience & Privacy**:
- [ADR-0003: Anonymous User Browser Fingerprinting](ADR-0003-anonymous-user-browser-fingerprinting.md)

## Creating New ADRs

### When to Create an ADR

Create an ADR for decisions that are:
- **Significant**: Affect system architecture, major components, or user experience
- **Durable**: Expected to have long-lasting impact
- **Controversial**: Where multiple valid approaches exist
- **Precedent-setting**: Establish patterns for future similar decisions

### ADR Process

1. **Copy Template**: Use [ADR-TEMPLATE.md](ADR-TEMPLATE.md)
2. **Assign Number**: Use next sequential number (ADR-00XX)
3. **Draft Decision**: Fill out all sections with context and rationale
4. **Review Process**: Discuss with team and stakeholders
5. **Status Update**: Mark as Accepted, Rejected, or Superseded
6. **Update Index**: Add to this index file

### ADR Template

```markdown
# ADR-[NUMBER]: [TITLE]

## Status
[Proposed | Accepted | Rejected | Deprecated | Superseded]

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing or implementing?

## Consequences
What becomes easier or more difficult to do?

## Alternatives Considered
What other options were evaluated?

## Implementation Notes
Specific technical details or migration steps.

## References
Supporting documentation and resources.
```

## Decision Status Definitions

- **Proposed**: Under consideration, not yet implemented
- **Accepted**: Approved and implemented
- **Rejected**: Considered but not adopted
- **Deprecated**: Previously accepted but no longer relevant
- **Superseded**: Replaced by a newer ADR

## Review Schedule

ADRs should be reviewed periodically to ensure they remain relevant:
- **Critical Decisions**: Every 6 months
- **Standard Decisions**: Annually
- **Legacy Decisions**: When technology or requirements change

---

*For questions about ADRs or to propose new architectural decisions, see [CONTRIBUTING.md](../CONTRIBUTING.md) or create a GitHub issue.*