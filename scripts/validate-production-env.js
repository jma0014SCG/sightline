#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * 
 * Validates all required environment variables for production deployment
 * Checks format, connectivity, and configuration completeness
 * 
 * Usage: node scripts/validate-production-env.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

// Load environment variables
const envPath = process.env.ENV_FILE || '.env.local';
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  log.info(`Loaded environment from: ${envPath}`);
} else {
  log.warning(`No ${envPath} file found, using process environment`);
}

// Validation results
const results = {
  required: { passed: [], failed: [] },
  optional: { configured: [], missing: [] },
  format: { valid: [], invalid: [] },
  connectivity: { success: [], failed: [] }
};

// Required environment variables with validation rules
const requiredVars = {
  // Core
  DATABASE_URL: {
    pattern: /^postgresql:\/\/.+/,
    description: 'PostgreSQL connection string'
  },
  NEXT_PUBLIC_APP_URL: {
    pattern: /^https?:\/\/.+/,
    description: 'Application base URL'
  },
  
  // Clerk Authentication
  CLERK_SECRET_KEY: {
    pattern: /^sk_(live|test)_.+/,
    description: 'Clerk secret key'
  },
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {
    pattern: /^pk_(live|test)_.+/,
    description: 'Clerk publishable key'
  },
  CLERK_WEBHOOK_SECRET: {
    pattern: /^whsec_.+/,
    description: 'Clerk webhook secret'
  },
  
  // Stripe Payments
  STRIPE_SECRET_KEY: {
    pattern: /^sk_(live|test)_.+/,
    description: 'Stripe secret key'
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    pattern: /^pk_(live|test)_.+/,
    description: 'Stripe publishable key'
  },
  STRIPE_WEBHOOK_SECRET: {
    pattern: /^whsec_.+/,
    description: 'Stripe webhook secret'
  },
  NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: {
    pattern: /^price_.+/,
    description: 'Stripe Pro plan price ID'
  },
  NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID: {
    pattern: /^price_.+/,
    description: 'Stripe Enterprise plan price ID'
  },
  
  // AI Services
  OPENAI_API_KEY: {
    pattern: /^sk-.+/,
    description: 'OpenAI API key'
  },
  YOUTUBE_API_KEY: {
    pattern: /^[A-Za-z0-9_-]+$/,
    description: 'YouTube Data API key'
  }
};

// Optional but recommended environment variables
const optionalVars = {
  // Transcript Services
  GUMLOOP_API_KEY: {
    pattern: /^.+$/,
    description: 'Gumloop API key for enhanced transcripts'
  },
  OXYLABS_USERNAME: {
    pattern: /^.+$/,
    description: 'Oxylabs username for proxy service'
  },
  OXYLABS_PASSWORD: {
    pattern: /^.+$/,
    description: 'Oxylabs password'
  },
  
  // Monitoring
  SENTRY_DSN: {
    pattern: /^https:\/\/.+@.+\.ingest\.sentry\.io\/.+$/,
    description: 'Sentry error tracking DSN'
  },
  NEXT_PUBLIC_POSTHOG_KEY: {
    pattern: /^phc_.+/,
    description: 'PostHog analytics key'
  },
  
  // Caching
  UPSTASH_REDIS_URL: {
    pattern: /^https:\/\/.+\.upstash\.io/,
    description: 'Upstash Redis URL'
  },
  
  // Email
  MAILERLITE_API_KEY: {
    pattern: /^.+$/,
    description: 'MailerLite API key'
  }
};

// Validate required variables
log.section('Validating Required Environment Variables');

for (const [key, config] of Object.entries(requiredVars)) {
  const value = process.env[key];
  
  if (!value) {
    results.required.failed.push(key);
    log.error(`${key} is missing - ${config.description}`);
  } else if (config.pattern && !config.pattern.test(value)) {
    results.format.invalid.push(key);
    log.error(`${key} has invalid format - ${config.description}`);
  } else {
    results.required.passed.push(key);
    results.format.valid.push(key);
    log.success(`${key} is configured correctly`);
  }
}

// Check optional variables
log.section('Checking Optional Environment Variables');

for (const [key, config] of Object.entries(optionalVars)) {
  const value = process.env[key];
  
  if (!value) {
    results.optional.missing.push(key);
    log.warning(`${key} is not configured - ${config.description}`);
  } else if (config.pattern && !config.pattern.test(value)) {
    results.format.invalid.push(key);
    log.error(`${key} has invalid format - ${config.description}`);
  } else {
    results.optional.configured.push(key);
    log.success(`${key} is configured`);
  }
}

// Validate environment consistency
log.section('Validating Environment Consistency');

// Check if using production keys
const isProduction = process.env.NODE_ENV === 'production';
const clerkKey = process.env.CLERK_SECRET_KEY || '';
const stripeKey = process.env.STRIPE_SECRET_KEY || '';

if (isProduction) {
  if (clerkKey.includes('test')) {
    log.error('Using test Clerk keys in production environment!');
  }
  if (stripeKey.includes('test')) {
    log.error('Using test Stripe keys in production environment!');
  }
} else {
  if (clerkKey.includes('live')) {
    log.warning('Using live Clerk keys in non-production environment');
  }
  if (stripeKey.includes('live')) {
    log.warning('Using live Stripe keys in non-production environment');
  }
}

// Test database connection
log.section('Testing Database Connection');

async function testDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    log.error('Cannot test database - DATABASE_URL not set');
    return false;
  }
  
  try {
    const url = new URL(dbUrl);
    log.info(`Database host: ${url.hostname}`);
    log.info(`Database name: ${url.pathname.slice(1)}`);
    
    // Basic URL validation
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      log.error('Invalid database protocol - must be PostgreSQL');
      return false;
    }
    
    log.success('Database URL format is valid');
    return true;
  } catch (error) {
    log.error(`Invalid database URL: ${error.message}`);
    return false;
  }
}

// Test API endpoints accessibility
log.section('Testing API Endpoints');

async function testEndpoint(name, url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) {
      log.warning(`${name}: Invalid or missing URL`);
      resolve(false);
      return;
    }
    
    try {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'HEAD',
        timeout: 5000
      };
      
      const req = (urlObj.protocol === 'https:' ? https : require('http')).request(options, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          log.success(`${name}: Accessible`);
          results.connectivity.success.push(name);
          resolve(true);
        } else {
          log.warning(`${name}: Returned status ${res.statusCode}`);
          results.connectivity.failed.push(name);
          resolve(false);
        }
      });
      
      req.on('error', (error) => {
        log.error(`${name}: ${error.message}`);
        results.connectivity.failed.push(name);
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        log.error(`${name}: Connection timeout`);
        results.connectivity.failed.push(name);
        resolve(false);
      });
      
      req.end();
    } catch (error) {
      log.error(`${name}: ${error.message}`);
      results.connectivity.failed.push(name);
      resolve(false);
    }
  });
}

// Main validation
async function validate() {
  // Test database
  await testDatabase();
  
  // Test application URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    await testEndpoint('Application URL', process.env.NEXT_PUBLIC_APP_URL);
  }
  
  // Generate summary
  log.section('Validation Summary');
  
  const requiredPassed = results.required.passed.length;
  const requiredTotal = Object.keys(requiredVars).length;
  const optionalConfigured = results.optional.configured.length;
  const optionalTotal = Object.keys(optionalVars).length;
  
  console.log('\nRequired Variables:');
  console.log(`  ✓ Configured: ${requiredPassed}/${requiredTotal}`);
  if (results.required.failed.length > 0) {
    console.log(`  ✗ Missing: ${results.required.failed.join(', ')}`);
  }
  if (results.format.invalid.length > 0) {
    console.log(`  ⚠ Invalid format: ${results.format.invalid.join(', ')}`);
  }
  
  console.log('\nOptional Variables:');
  console.log(`  ✓ Configured: ${optionalConfigured}/${optionalTotal}`);
  if (results.optional.missing.length > 0) {
    console.log(`  ℹ Not configured: ${results.optional.missing.join(', ')}`);
  }
  
  // Overall result
  log.section('Overall Result');
  
  const isValid = results.required.failed.length === 0 && results.format.invalid.length === 0;
  
  if (isValid) {
    log.success('✅ Environment is ready for production deployment!');
    
    if (results.optional.missing.length > 0) {
      log.warning(`Consider configuring optional services for full functionality`);
    }
    
    process.exit(0);
  } else {
    log.error('❌ Environment validation failed!');
    log.error('Fix the issues above before deploying to production.');
    process.exit(1);
  }
}

// Run validation
validate().catch(error => {
  log.error(`Validation error: ${error.message}`);
  process.exit(1);
});