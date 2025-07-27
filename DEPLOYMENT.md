# Deployment Guide

This guide covers deploying Sightline.ai to Vercel with all required configurations.

## Prerequisites

1. **Vercel CLI installed**: `npm install -g vercel`
2. **Environment variables configured**: Run `npm run env:setup`
3. **Database setup**: Neon PostgreSQL database ready
4. **API keys obtained**: Google OAuth, OpenAI, Stripe (see ENVIRONMENT.md)

## Quick Deployment

### 1. Link Project to Vercel

```bash
# Link your local project to Vercel
npm run vercel:link
```

### 2. Set Environment Variables

Option A - Upload from local:
```bash
# Set up environment variables in Vercel dashboard
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add OPENAI_API_KEY
# ... add all required variables
```

Option B - Use Vercel dashboard:
1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add all variables from your `.env.local`

### 3. Deploy

```bash
# Deploy to preview environment
npm run deploy:preview

# Deploy to production
npm run deploy
```

## Vercel Configuration

### vercel.json Features

- **Next.js Framework**: Optimized for Next.js 14 with App Router
- **Python Functions**: FastAPI backend support
- **CORS Headers**: API access configuration
- **Build Optimization**: Custom build and install commands
- **Regional Deployment**: US East (iad1) for optimal performance

### Build Process

1. **Install**: `npm install` (dependencies)
2. **Build**: `npm run build` (Next.js production build)
3. **Functions**: Python API functions deployed automatically
4. **Static**: Assets served from global CDN

## Environment-Specific Configuration

### Development
- Preview deployments for feature branches
- Test environment variables
- Debug mode enabled

### Production
- Production environment variables
- Optimized build output
- Error tracking enabled
- Analytics configured

## Database Setup

### Neon PostgreSQL

1. **Create Production Database**:
   ```bash
   # Create production branch in Neon
   # Update DATABASE_URL in Vercel environment variables
   ```

2. **Run Migrations**:
   ```bash
   # Deploy schema to production database
   npm run db:push
   ```

3. **Seed Data** (optional):
   ```bash
   npm run db:seed
   ```

## Custom Domain (Optional)

1. **Add Domain in Vercel**:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records

2. **Update Environment Variables**:
   ```bash
   # Update NEXTAUTH_URL to use custom domain
   vercel env add NEXTAUTH_URL production
   ```

## Monitoring & Analytics

### Built-in Vercel Features
- **Analytics**: User and performance metrics
- **Speed Insights**: Core Web Vitals tracking
- **Function Logs**: Serverless function monitoring

### External Services (Optional)
- **Sentry**: Error tracking and performance monitoring
- **LangSmith**: LLM observability and prompt tracking

## CI/CD with GitHub Actions

### Automatic Deployments
- **Pull Requests**: Automatic preview deployments
- **Main Branch**: Automatic production deployments
- **Environment Variables**: Managed through Vercel dashboard

### Manual Deployment Commands

```bash
# Preview deployment
npm run deploy:preview

# Production deployment  
npm run deploy

# Link local project
npm run vercel:link

# Pull environment variables
npm run vercel:env
```

## Troubleshooting

### Common Issues

**Build Failures**:
```bash
# Check build logs in Vercel dashboard
# Verify all dependencies are in package.json
# Test build locally: npm run build
```

**Environment Variable Issues**:
```bash
# Validate locally first
npm run env:validate

# Check Vercel environment variables
vercel env ls
```

**Database Connection**:
```bash
# Test database connection
npm run db:push

# Check connection string format
# Verify Neon database allows connections
```

**Function Timeouts**:
- Python functions: 30-second limit (configured in vercel.json)
- Upgrade to Pro plan for longer execution times if needed

### Performance Optimization

1. **Static Generation**: Use ISR for frequently accessed content
2. **Edge Functions**: Deploy critical functions to edge locations
3. **Image Optimization**: Use Next.js Image component
4. **Bundle Analysis**: Run `npm run analyze` to check bundle size

## Security Checklist

- [ ] Environment variables set in Vercel dashboard (not in code)
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] CORS configured appropriately
- [ ] API rate limiting implemented
- [ ] Authentication middleware configured
- [ ] Database connection secured with SSL

## Post-Deployment Steps

1. **Verify Deployment**:
   - Test OAuth flow
   - Test video summarization
   - Check database operations

2. **Configure Webhooks**:
   - Stripe webhook URL
   - Update redirect URIs in Google Console

3. **Monitor Performance**:
   - Check Vercel Analytics
   - Monitor error rates
   - Review function execution times

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Project Issues**: Check `Docs/Bug_tracking.md`