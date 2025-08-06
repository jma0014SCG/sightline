# Sightline.ai

**AI-Powered YouTube Video Summarization Platform**

Transform long-form YouTube videos into actionable insights with AI-powered summarization, Smart Collections tagging, and intelligent content organization.

## 🎯 Core Features

- **⚡ Instant Summarization**: AI-powered summaries in 15-30 seconds
- **🧠 Smart Collections**: Automatic AI tagging and categorization  
- **👤 Anonymous Trial**: Try without signup (1 free summary)
- **📊 Real-time Progress**: Live processing updates
- **🏷️ Intelligent Organization**: Filter by people, companies, technologies
- **📱 Responsive Design**: Optimized for all devices
- **🔒 Secure Authentication**: Clerk-powered user management

## 📁 Project Structure

```
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

**📖 [Complete Platform Documentation](SIGHTLINE_PLATFORM_DOCUMENTATION.md)** - Comprehensive technical documentation

### Additional Resources
- [Development Setup](CLAUDE.md) - Claude Code development instructions
- [Project Structure](Docs/project_structure.md) - Detailed codebase organization  
- [UI/UX Guidelines](Docs/UI_UX_doc.md) - Design system and patterns
- [Production Deployment](Docs/PRODUCTION_DEPLOYMENT.md) - Deployment procedures
- [Troubleshooting](Docs/TROUBLESHOOTING.md) - Common issues and solutions

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