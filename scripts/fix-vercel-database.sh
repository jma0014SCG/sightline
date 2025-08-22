#!/bin/bash

echo "🔧 Updating Vercel to use the CORRECT original database"
echo "========================================================"

# Remove the wrong database URLs from Vercel
echo "Removing incorrect database URLs..."
vercel env rm DATABASE_URL production -y 2>/dev/null
vercel env rm DATABASE_URL_UNPOOLED production -y 2>/dev/null

# Add the CORRECT database URLs
echo "Adding correct database URLs..."
echo "postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" | vercel env add DATABASE_URL production

echo "postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-plain-king-aec6xvqs.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" | vercel env add DATABASE_URL_UNPOOLED production

echo ""
echo "✅ Database URLs updated!"
echo ""
echo "Now redeploy with: vercel --prod"