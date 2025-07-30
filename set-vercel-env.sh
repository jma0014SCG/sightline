#!/bin/bash

# Script to set all production environment variables in Vercel
echo "Setting production environment variables in Vercel..."

# Function to set environment variable
set_env() {
    echo "Setting $1..."
    echo "$2" | npx vercel env add "$1" production
}

# Set all environment variables
set_env "NEXTAUTH_URL" "https://your-app.vercel.app"
set_env "NEXTAUTH_SECRET" "your-nextauth-secret"
set_env "DATABASE_URL" "your-database-url"
set_env "GOOGLE_CLIENT_ID" "your-google-client-id"
set_env "GOOGLE_CLIENT_SECRET" "your-google-client-secret"
set_env "OPENAI_API_KEY" "your-openai-api-key"
set_env "STRIPE_SECRET_KEY" "your-stripe-secret-key"
set_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "your-stripe-publishable-key"
set_env "YOUTUBE_API_KEY" "your-youtube-api-key"
set_env "GUMLOOP_API_KEY" "your-gumloop-api-key"
set_env "GUMLOOP_FLOW_ID_ENHANCED" "your-gumloop-flow-id"

echo "All environment variables set!"