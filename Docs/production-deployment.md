# Production Deployment Checklist

## Pre-Deployment

### 1. Environment Configuration
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Set all required environment variables
- [ ] Generate secure `NEXTAUTH_SECRET` with `openssl rand -base64 32`
- [ ] Configure production database URL
- [ ] Set up Stripe webhook endpoint and get webhook secret

### 2. Database
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Verify database schema is up to date
- [ ] Set up database backups
- [ ] Configure connection pooling for production load

### 3. Authentication
- [ ] Configure Google OAuth for production domain
- [ ] Add production URLs to Google Cloud Console
- [ ] Test authentication flow end-to-end

### 4. Payment Integration
- [ ] Switch to Stripe live mode keys
- [ ] Configure production webhook endpoints
- [ ] Test payment flows with real cards
- [ ] Set up proper error handling for failed payments

### 5. Security
- [ ] Enable HTTPS everywhere
- [ ] Configure security headers (CSP, HSTS, etc.)
- [ ] Set up rate limiting on API endpoints
- [ ] Review and remove all debug code
- [ ] Scan for exposed secrets

### 6. Performance
- [ ] Enable Next.js production optimizations
- [ ] Configure CDN for static assets
- [ ] Set up proper caching headers
- [ ] Optimize images and fonts
- [ ] Enable gzip/brotli compression

### 7. Monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure application monitoring
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up alerts for critical errors

## Deployment Steps

### Using Vercel (Recommended)

1. **Connect Repository**
   ```bash
   vercel link
   ```

2. **Configure Environment Variables**
   - Go to Vercel dashboard
   - Add all production environment variables
   - Ensure sensitive values are encrypted

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Custom Domain**
   - Add domain in Vercel dashboard
   - Update DNS records
   - Wait for SSL certificate provisioning

### Using Docker

1. **Build Production Image**
   ```bash
   docker build -t sightline:production .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 --env-file .env.production sightline:production
   ```

### Manual Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## Post-Deployment

### 1. Verification
- [ ] Test user registration flow
- [ ] Create a free summary (logged in)
- [ ] Test payment flow
- [ ] Verify webhook handling
- [ ] Check all critical user paths

### 2. Performance Testing
- [ ] Run load tests
- [ ] Check Core Web Vitals
- [ ] Verify API response times
- [ ] Test under various network conditions

### 3. Security Audit
- [ ] Run security headers test
- [ ] Check for exposed endpoints
- [ ] Verify authentication is required
- [ ] Test rate limiting

### 4. Monitoring Setup
- [ ] Verify error tracking is working
- [ ] Set up custom alerts
- [ ] Configure performance monitoring
- [ ] Test alert notifications

## Rollback Plan

1. **Immediate Rollback**
   ```bash
   vercel rollback
   ```

2. **Database Rollback**
   ```bash
   npx prisma migrate resolve --rolled-back
   ```

3. **Communication**
   - Notify users of any downtime
   - Update status page
   - Document issues for post-mortem

## Production Configuration

### Recommended Settings

```env
# Performance
NODE_OPTIONS="--max-old-space-size=4096"

# Security
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=[32+ character random string]

# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=5"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Security Headers (next.config.js)

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

## Support Contacts

- **Technical Issues**: tech@yourdomain.com
- **Payment Issues**: billing@yourdomain.com
- **Security Issues**: security@yourdomain.com

Remember to test everything thoroughly in a staging environment before deploying to production!