#!/bin/bash

# Script to set all production environment variables in Vercel
echo "Setting production environment variables in Vercel..."

# Function to set environment variable
set_env() {
    echo "Setting $1..."
    echo "$2" | npx vercel env add "$1" production
}

# Set all environment variables
set_env "NEXTAUTH_URL" "https://sightline-in1aqbw5w-jma0014-gmailcoms-projects.vercel.app"
set_env "NEXTAUTH_SECRET" "M2pOAw8w2ED8+8Yk6Hof7+rMK6pb+wsTEHtbXmNsWRM="
set_env "DATABASE_URL" "postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-snowy-queen-aeq72lv5-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
set_env "GOOGLE_CLIENT_ID" "469475322510-5jem10bkoi98gk23ejpj7el5vl995qci.apps.googleusercontent.com"
set_env "GOOGLE_CLIENT_SECRET" "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"
set_env "OPENAI_API_KEY" "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"
set_env "STRIPE_SECRET_KEY" "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"
set_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "pk_live_51QvIZPCy13fiBRAHDra6NoGNaj2AzijZccJyRyADhmlIyVc2baNpylG8WiDmZvzZK5Q4PveXkXJCjIUatMWVNk4O00DujA6GjO"
set_env "YOUTUBE_API_KEY" "AIzaSyC2yA5v6TagCiBdvvs6cCwP6QIbiIDQDBY"
set_env "GUMLOOP_API_KEY" "b29a51e34c8d475b9a936d9dbc078d24"
set_env "GUMLOOP_FLOW_ID_ENHANCED" "3Vpp129QhZwNEnuhbQPGz2"

echo "All environment variables set!"