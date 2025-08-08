#!/bin/bash

# Environment Setup Script for Sightline.ai
echo "🚀 Setting up Sightline.ai environment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: Please update the following variables in .env.local:"
    echo "   - DATABASE_URL (get from Neon)"
    echo "   - CLERK_SECRET_KEY & NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk)"
    echo "   - CLERK_WEBHOOK_SECRET (from Clerk Webhooks)"
    echo "   - OPENAI_API_KEY (from OpenAI Platform)"
    echo "   - STRIPE_SECRET_KEY & NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (from Stripe)"
    echo ""
else
    echo "✅ .env.local already exists"
fi

# Check Clerk configuration
if grep -q "your-clerk-secret-key" .env.local; then
    echo "🔐 Clerk configuration needed..."
    echo "⚠️  Please configure Clerk authentication:"
    echo "   1. Create account at https://clerk.com/"
    echo "   2. Create new application"
    echo "   3. Copy API keys from Dashboard → API Keys"
    echo "   4. Update CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local"
else
    echo "✅ Clerk configuration detected"
fi

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then 
    echo "✅ Node.js version $NODE_VERSION is compatible"
else
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ or 20+"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo "❌ Neither pnpm nor npm found. Please install Node.js package manager."
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your actual API keys"
echo "2. Set up a Neon database and update DATABASE_URL"
echo "3. Run 'pnpm db:push' to sync the database schema"
echo "4. Run 'pnpm dev' to start the development server"
echo "5. Run 'pnpm env:validate' to verify all environment variables"
echo ""