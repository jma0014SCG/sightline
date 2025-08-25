#!/bin/bash

# Script to approve safe pnpm lifecycle scripts
# This addresses the pnpm v10 security feature that blocks build scripts

echo "🔒 pnpm Build Script Approval"
echo "=============================="
echo ""
echo "This script will approve the following safe packages to run build scripts:"
echo ""
echo "Essential packages:"
echo "  ✅ @prisma/client - Database ORM client"
echo "  ✅ @prisma/engines - Database query engine"
echo "  ✅ prisma - Database CLI tools"
echo ""
echo "Auth & services:"
echo "  ✅ @clerk/shared - Authentication utilities"
echo "  ✅ @sentry/cli - Error tracking"
echo ""
echo "Build tools:"
echo "  ✅ esbuild - TypeScript/JavaScript bundler"
echo "  ✅ core-js - JavaScript polyfills"
echo ""
echo "Testing:"
echo "  ✅ msw - Mock Service Worker for API mocking"
echo "  ✅ unrs-resolver - Module resolver for Jest"
echo ""

read -p "Do you want to approve all these packages? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. You can run 'pnpm approve-builds' to approve individually."
    exit 0
fi

echo ""
echo "Approving packages..."
echo ""

# Create the approval configuration
cat > .pnpm-approval.json << 'EOF'
{
  "approvedBuilds": [
    "@prisma/client",
    "@prisma/engines",
    "prisma",
    "@clerk/shared",
    "@sentry/cli",
    "esbuild",
    "core-js",
    "msw",
    "unrs-resolver"
  ]
}
EOF

echo "✅ Created .pnpm-approval.json with approved packages"
echo ""

# Now reinstall to run the approved scripts
echo "Running pnpm install to execute approved scripts..."
pnpm install

echo ""
echo "✅ Done! Your packages should now be properly installed with their build scripts."
echo ""
echo "Next steps:"
echo "1. Run 'pnpm db:generate' to ensure Prisma client is generated"
echo "2. Commit .pnpm-approval.json to your repository for CI/CD"
echo "3. Continue with your development or deployment"
echo ""