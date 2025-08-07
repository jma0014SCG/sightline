# Sightline.ai

## AI-Powered YouTube Video Summarization Platform

Transform long-form YouTube videos into actionable insights with AI-powered summarization, Smart Collections tagging, and intelligent content organization.

## 🎯 Core Features

- **⚡ Instant Summarization**: AI-powered summaries with structured content (TL;DR, key moments, frameworks, playbooks)
- **🧠 Smart Collections**: Automatic AI tagging with 7 entity types (PERSON, COMPANY, TECHNOLOGY, PRODUCT, CONCEPT, FRAMEWORK, TOOL) and 14 categories
- **👤 Anonymous Trial**: Try without signup (1 free summary with browser fingerprinting)
- **📊 Real-time Progress**: Live processing updates with UUID-based task tracking
- **🏷️ Intelligent Organization**: Filter by color-coded tags and categories with visual counts
- **📱 Responsive Design**: Multi-column layout optimized for all devices
- **🔒 Secure Authentication**: Modal-based Clerk authentication with seamless user experience
- **💳 Flexible Plans**: Free (3 lifetime), Pro (25/month), Complete (unlimited) tiers
- **🔗 Public Sharing**: Shareable summary links with SEO optimization

## 📁 Project Structure

```text
sightline/
├── src/                          # Application source code
│   ├── app/                      # Next.js 14 App Router
│   ├── components/               # React components (atomic design)
│   ├── lib/                      # Shared utilities and libraries
│   ├── server/                   # Server-side code (tRPC)
│   └── types/                    # TypeScript type definitions
├── api/                          # FastAPI backend
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
├── Docs/                         # Documentation
├── tests/                        # Test files
├── scripts/                      # Build and deployment scripts
└── config/                       # Configuration files
```

## 🛠 Tech Stack

### Frontend

- **Next.js 14** (App Router) - React framework with file-based routing
- **TypeScript** - Full type safety across the application
- **Tailwind CSS** + **shadcn/ui** - Modern styling with component library
- **TanStack Query** + **tRPC** - Type-safe API client with caching
- **Clerk** - Modern authentication and user management

### Backend

- **FastAPI** (Python) - High-performance API framework
- **LangChain** + **OpenAI** - AI processing and language models
- **tRPC** - End-to-end type-safe API layer
- **Vercel Functions** - Serverless deployment and scaling

### Database & Payments

- **Vercel Postgres** (Neon) - Serverless PostgreSQL database
- **Prisma** - Type-safe ORM with migrations
- **Stripe** - Secure payment processing and subscription management

### Infrastructure

- **Vercel** - Deployment and hosting platform
- **Upstash Redis** - Caching and session storage (optional)
- **Sentry** - Error tracking and monitoring (optional)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- pnpm

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sightline
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   pip install -r requirements.txt.disabled
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start development server**

   ```bash
   pnpm dev
   ```

## 📚 Documentation

**🗂️ [Documentation Index](DOCUMENTATION_INDEX.md)** - Complete guide to all documentation with navigation and quick-start paths

**📖 [Platform Documentation](Docs/architecture/platform-overview.md)** - Comprehensive technical reference (architecture, API, deployment)

### Key Resources

- **[Development Setup](CLAUDE.md)** - Claude Code development instructions  
- **[API Documentation](API_DOCUMENTATION.md)** - Complete tRPC and FastAPI reference
- **[Project Structure](Docs/architecture/project-structure.md)** - Codebase organization
- **[UI/UX Guidelines](Docs/architecture/ui-ux-guidelines.md)** - Design system and accessibility
- **[Testing Strategy](Docs/development/testing-strategy.md)** - Unit, E2E, performance, and security tests
- **[Security Policy](SECURITY.md)** - Security headers and best practices
- **[Production Operations Guide](PRODUCTION_OPERATIONS_GUIDE.md)** - Complete operations manual

## ✨ Latest Features

### Smart Collections (August 2025)

- **🤖 AI-Powered Tagging**: Automatic extraction of people, companies, technologies
- **🎨 Color-Coded Organization**: 7 distinct tag types with visual coding
- **🔍 Intelligent Filtering**: Filter library by tags and categories
- **📊 Usage Analytics**: Tag/category counts and insights

### Anonymous User Experience (August 2025)

- **🆓 Try Before Signup**: 1 free summary without registration
- **🔗 Modal Authentication**: Seamless in-app login flow
- **📱 Browser Fingerprinting**: Secure anonymous user tracking
- **🎯 Progressive Registration**: Experience value before commitment

### Core Platform

- **⚡ Real-time Progress**: Live processing updates with accurate stages
- **🔐 Clerk Authentication**: Modern, secure user management
- **💳 Stripe Integration**: Seamless Pro plan subscriptions ($9.99/month)
- **📊 Personal Library**: Searchable, organized summary collection

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## 🚀 Deployment

See [Deployment Guide](Docs/PRODUCTION_DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

[Add your license information here]

## 🔗 Links

- [Production App](https://sightline.ai)
- [Documentation](https://docs.sightline.ai)
- [API Documentation](https://api.sightline.ai/docs)