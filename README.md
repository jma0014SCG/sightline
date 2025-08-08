---
title: "Sightline.ai"
description: "AI-Powered YouTube Video Summarization Platform - Transform long-form videos into actionable insights"
type: "guide"
canonical_url: "/readme"
version: "1.0"
last_updated: "2025-01-09"
audience: ["all-users", "new-users", "developers"]
complexity: "beginner"
tags: ["overview", "getting-started", "features", "setup"]
quick_start: true
estimated_time: "5 minutes read"
---

## Sightline.ai

## AI-Powered YouTube Video Summarization Platform

Transform long-form YouTube videos into actionable insights with structured AI summaries,
intelligent tagging, and seamless organization.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)

## What

Sightline.ai converts YouTube videos into structured summaries featuring:

- **Instant AI Summaries** - TL;DR, key moments, frameworks, and playbooks extracted from video content
- **Smart Collections** - Automatic tagging with 7 entity types
  (Person, Company, Technology, Product, Concept, Framework, Tool)
- **Anonymous Trial** - Try with 1 free summary, no signup required
- **Real-time Progress** - Live processing updates with accurate stage tracking
- **Personal Library** - Searchable collection with intelligent filtering
- **Public Sharing** - Generate shareable links for any summary

## Why

**Problem**: YouTube videos contain valuable insights buried in hours of content,
making knowledge extraction time-consuming and inconsistent.

**Solution**: AI-powered analysis that converts video content into structured, searchable, and actionable formats.

**Value**:

- Save 90% of time typically spent watching educational content
- Never lose track of valuable insights from videos
- Organize knowledge with intelligent, automatic categorization
- Share discoveries easily with teammates and communities

## How

### Quick Start

1. **Try Without Signup** - Visit the homepage, paste any YouTube URL, get instant summary
2. **Sign Up for More** - Create account for personal library and advanced features
3. **Choose Your Plan** - Free (3 lifetime), Pro (25/month), or Complete (unlimited)

### Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + tRPC
- **Backend**: FastAPI + Python + LangChain + OpenAI
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Clerk (modal-based authentication)
- **Payments**: Stripe
- **Deployment**: Vercel

### Architecture

```text
User → Next.js Frontend → tRPC API → FastAPI → OpenAI → Structured Summary
                       ↓
                   PostgreSQL Database
```

## Run

### Prerequisites

- **Node.js** 18+ and **pnpm** package manager
- **Python** 3.12+ for FastAPI backend
- **PostgreSQL** database (Neon recommended)
- **API Keys**: OpenAI, Clerk, Stripe (see [Environment Setup](Docs/development/environment-setup.md))

### Development Setup

```bash
# Clone and install dependencies
git clone https://github.com/jma0014SCG/sightline.git
cd sightline
pnpm install

# Set up Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Environment setup
cp .env.example .env.local
# Add your API keys to .env.local (see Environment Setup guide)

# Database setup
pnpm db:generate
pnpm db:push

# Start development servers
pnpm dev:full  # Both frontend (3000) and backend (8000)
```

### Essential Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Frontend development server |
| `pnpm api:dev` | FastAPI backend server |
| `pnpm dev:full` | Both servers concurrently |
| `pnpm lint` | Code quality checks |
| `pnpm typecheck` | TypeScript validation |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests |
| `pnpm build` | Production build |
| `pnpm db:studio` | Database GUI |

### Quality Assurance

Before committing:

```bash
pnpm lint && pnpm typecheck && pnpm format:check
```

## Links

### 📖 Documentation

- **[Architecture Guide](ARCHITECTURE.md)** - Technical architecture, data flow, dependencies
- **[Contributing Guide](CONTRIBUTING.md)** - Development workflow, testing, PR process
- **[API Documentation](API/)** - Complete tRPC and FastAPI reference
- **[Documentation Index](Docs/INDEX.md)** - Complete navigation hub

### 🏗️ Development Resources

- **[Environment Setup](Docs/development/environment-setup.md)** - Complete configuration guide
- **[Glossary](GLOSSARY.md)** - Canonical terminology and definitions
- **[Architectural Decisions](DECISIONS/)** - ADRs for key technical decisions
- **[Bug Tracking](Docs/development/bug-tracking.md)** - Known issues and resolutions
- **[Testing Strategy](Docs/development/testing-strategy.md)** - Comprehensive testing approach

### 🚀 Production & Operations

- **[Production Operations](PRODUCTION_OPERATIONS_GUIDE.md)** - Complete deployment and operations guide
- **[Security Policy](SECURITY.md)** - Security implementation and compliance
- **[Monitoring](Docs/operations/monitoring.md)** - Error tracking and performance monitoring

### 🤝 Community

- **[Issues](https://github.com/jma0014SCG/sightline/issues)** - Bug reports and feature requests
- **[Discussions](https://github.com/jma0014SCG/sightline/discussions)** - General questions and community support
- **[Contributing](CONTRIBUTING.md)** - How to contribute to the project

## Features

### Smart Collections

AI-powered automatic categorization system that extracts entities and assigns categories to video
summaries. See [Architecture Documentation](ARCHITECTURE.md#smart-collections-processing) for detailed
technical specifications.

- **7 Entity Types**: Person, Company, Technology, Product, Concept, Framework, Tool
- **14 Categories**: Technology, Business, Marketing, Productivity, Education, Health, etc.
- **Color-coded Tags**: Visual organization with distinct colors for each entity type
- **Intelligent Filtering**: Filter library by tags and categories with visual counts

### Anonymous User Support

- **Browser Fingerprinting**: No cookies required for anonymous usage tracking
- **1 Free Summary**: Try the platform without creating an account
- **Seamless Upgrade**: Convert anonymous summaries to saved summaries after signup

### Real-time Progress Tracking

- **UUID-based Tasks**: Track long-running operations with unique identifiers
- **Live Updates**: Real-time progress updates during AI processing
- **7 Processing Stages**: From initialization to completion with descriptive messaging

### Dual API Architecture

- **tRPC Layer**: Type-safe user operations with automatic TypeScript validation
- **FastAPI Layer**: High-performance AI processing with Python and LangChain
- **Optimized Performance**: Serverless functions with edge deployment

## Roadmap

- [ ] **Enhanced AI Models**: Support for additional LLM providers
- [ ] **Multi-language Support**: International video summarization
- [ ] **Team Collaboration**: Shared workspaces and collaborative features
- [ ] **Advanced Analytics**: Usage insights and learning progress tracking
- [ ] **Mobile App**: Native iOS and Android applications
- [ ] **API Access**: Public API for third-party integrations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Start with our [Documentation Index](Docs/INDEX.md)
- **Issues**: Report bugs or request features in [GitHub Issues](https://github.com/jma0014SCG/sightline/issues)
- **Discussions**: Join the community in [GitHub Discussions](https://github.com/jma0014SCG/sightline/discussions)

---

**Built with ❤️ by the Sightline.ai team** | **Version**: 1.0.0 | **Last Updated**: January 2025
