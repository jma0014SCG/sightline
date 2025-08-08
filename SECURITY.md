---
title: "Security Policy"
description: "Security measures, vulnerability reporting, and protection protocols for Sightline.ai platform"
type: "reference"
canonical_url: "/security"
version: "1.0"
last_updated: "2025-01-09"
audience: ["security-team", "developers", "operators"]
complexity: "advanced"
tags: ["security", "policy", "vulnerabilities", "protection", "compliance"]
security_level: "critical"
review_schedule: "quarterly"
related_docs: ["/architecture#security"]
---

# Security Policy

## Overview

This document outlines the security measures implemented in the Sightline.ai platform to protect user data and prevent common web vulnerabilities.

## Security Headers

The following security headers are configured in `next.config.js`:

### Content Security Policy (CSP)

Prevents XSS attacks by controlling which resources can be loaded.

**Configuration:**

- `default-src 'self'` - Only allow resources from the same origin by default
- `script-src` - Allows scripts from self, Clerk, YouTube, and CloudFlare (for authentication and video embedding)
- `style-src` - Allows styles from self and Google Fonts
- `img-src` - Allows images from self, YouTube thumbnails, and Clerk
- `connect-src` - Allows API connections to Clerk, OpenAI, and Stripe
- `frame-src` - Allows embedding YouTube videos and Clerk/Stripe iframes
- `object-src 'none'` - Prevents Flash and other plugins
- `upgrade-insecure-requests` - Forces HTTPS connections

### Other Security Headers

1. **Strict-Transport-Security (HSTS)**
   - Forces HTTPS connections for 2 years
   - Includes subdomains and preload list

2. **X-Frame-Options: SAMEORIGIN**
   - Prevents clickjacking attacks
   - Only allows framing from same origin

3. **X-Content-Type-Options: nosniff**
   - Prevents MIME type sniffing
   - Forces browsers to respect Content-Type headers

4. **X-XSS-Protection: 1; mode=block**
   - Legacy XSS protection for older browsers
   - Blocks page if XSS is detected

5. **Referrer-Policy: origin-when-cross-origin**
   - Controls referrer information sent with requests
   - Sends full URL only to same-origin requests

6. **Permissions-Policy**
   - Disables camera, microphone, and geolocation APIs
   - Reduces attack surface

## Input Validation

### XSS Prevention

All user inputs are sanitized using DOMPurify:

```typescript
// src/lib/security.ts
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
}
```

### URL Validation

YouTube URLs are validated before processing:

```typescript
export function isValidYouTubeURL(url: string): boolean {
  // Validates against approved YouTube URL patterns
}
```

## Authentication Security

- **Provider**: Clerk with JWT tokens
- **Session Management**: Server-side verification on all protected routes
- **Webhook Security**: Signature verification for Clerk and Stripe webhooks

## API Security

### Rate Limiting

- Anonymous users: 1 summary per browser fingerprint + IP
- Authenticated users: Plan-based limits enforced
- See [RATE_LIMITS.md](./RATE_LIMITS.md) for specific limits

### Request Validation

- All API endpoints use Zod schemas for input validation
- Type-safe validation with tRPC
- Proper error handling with appropriate HTTP status codes

## Data Protection

### Encryption

- All data in transit encrypted with TLS 1.2+
- Sensitive data (API keys) stored as environment variables
- No sensitive data logged to console or error tracking

### Privacy

- User data exportable via API
- Account deletion cascades to all related data
- No tracking cookies without consent

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please email <security@sightline.ai> with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 48 hours and will keep you updated on the fix progress.

## Security Audit Schedule

- Quarterly dependency updates
- Annual penetration testing
- Continuous monitoring with Sentry (when configured)
- Regular review of security headers and policies
