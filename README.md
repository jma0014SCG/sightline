# Sightline.ai

A YouTube video summarization platform that uses AI to create concise, accurate summaries of video content.

## 🚀 Features

- **Instant Summarization**: Generate summaries in under 15 seconds for 20-minute videos
- **YouTube Integration**: Direct URL processing with automatic transcript extraction
- **Smart Fallbacks**: Whisper AI for videos without captions
- **User Management**: Google OAuth authentication and personal libraries
- **Sharing & Export**: Copy to clipboard, export formats, and public sharing
- **Pro Features**: Batch channel processing, follow-up Q&A, analytics

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
- **Next.js 14** (App Router) - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** + **shadcn/ui** - Styling
- **TanStack Query** + **tRPC** - API state management

### Backend
- **FastAPI** (Python) - API framework
- **LangChain** + **OpenAI** - AI processing
- **Vercel Functions** - Serverless deployment

### Database
- **Vercel Postgres** (Neon) - Database
- **Prisma** - ORM

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
- [Project Structure](Docs/project_structure.md)
- [UI/UX Documentation](Docs/UI_UX_doc.md)
- [Deployment Guide](Docs/PRODUCTION_DEPLOYMENT.md)
- [Security Audit](Docs/SECURITY_AUDIT.md)

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