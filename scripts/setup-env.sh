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
    echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "   - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (from Google Console)"
    echo "   - OPENAI_API_KEY (from OpenAI Platform)"
    echo ""
else
    echo "✅ .env.local already exists"
fi

# Generate NextAuth secret if needed
if ! grep -q "NEXTAUTH_SECRET=" .env.local || grep -q "your-secret-key-here" .env.local; then
    echo "🔐 Generating NextAuth secret..."
    if command -v openssl &> /dev/null; then
        SECRET=$(openssl rand -base64 32)
        sed -i.bak "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$SECRET\"/" .env.local
        rm .env.local.bak 2>/dev/null || true
        echo "✅ Generated new NextAuth secret"
    else
        echo "⚠️  OpenSSL not found. Please manually generate a 32+ character secret for NEXTAUTH_SECRET"
    fi
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
echo "3. Run 'npm run db:push' to sync the database schema"
echo "4. Run 'npm run dev' to start the development server"
echo ""