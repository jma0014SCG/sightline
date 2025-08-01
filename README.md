# Sightline.ai

A YouTube video summarization platform that uses AI to create concise, accurate summaries of video content.

## 🚀 Features

### Core Features
- **Instant Summarization**: Generate summaries in under 15 seconds for 20-minute videos
- **YouTube Integration**: Direct URL processing with automatic transcript extraction
- **Smart Fallbacks**: Whisper AI for videos without captions
- **Real-time Progress**: Live progress tracking with realistic stage updates
- **User Management**: Secure authentication with Clerk and personal libraries

### Pro Features
- **Unlimited Summaries**: No monthly limits on video processing
- **Advanced Export**: Markdown and PDF export capabilities
- **Personal Library**: Searchable, organized summary collection
- **Priority Support**: Dedicated support for Pro subscribers
- **Extended Video Length**: Process videos up to 2 hours

### User Experience
- **Responsive Design**: Optimized for desktop and mobile
- **Sharing & Export**: Copy to clipboard, public sharing links, data export
- **Comprehensive Settings**: Profile management, notification preferences, account controls
- **Secure Payments**: Integrated Stripe payment processing
- **Data Portability**: Complete data export and account management

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

- [Implementation Plan](Docs/Implementation.md)
- [Project Structure](Docs/project_structure.md) - Complete codebase organization
- [UI/UX Documentation](Docs/UI_UX_doc.md)
- [Deployment Guide](Docs/PRODUCTION_DEPLOYMENT.md) - Production deployment steps
- [Security Audit](Docs/SECURITY_AUDIT.md)
- [Troubleshooting Guide](Docs/TROUBLESHOOTING.md)

## ✨ Recent Updates

### August 2025
- **🎯 Complete Settings Page**: Profile management, notification preferences, and secure account deletion
- **💳 Stripe Payment Integration**: Fully functional Pro plan subscriptions with direct payment links  
- **📊 Enhanced User Management**: Data export, notification controls, and comprehensive account settings
- **🔒 Security Improvements**: Secure account deletion with confirmation requirements
- **🎨 UI/UX Enhancements**: Tabbed interface, real-time form updates, and success notifications

### Previous Updates
- **📈 Real-time Progress Tracking**: Live progress updates during video summarization with realistic stage feedback
- **🔐 Clerk Authentication**: Modern authentication system replacing NextAuth with improved security
- **⚡ Performance Optimizations**: Enhanced caching, faster load times, and improved user experience

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