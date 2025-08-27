/**
 * Production Deployment Configuration
 * Centralized configuration for all deployment-related settings
 */

module.exports = {
  // Environment configurations
  environments: {
    development: {
      name: 'Development',
      url: 'http://localhost:3000',
      backend: 'http://localhost:8000',
      database: 'postgresql://localhost/sightline_dev'
    },
    staging: {
      name: 'Staging',
      url: 'https://staging.sightlineai.io',
      backend: 'https://sightline-api-staging.railway.app',
      database: process.env.STAGING_DATABASE_URL
    },
    production: {
      name: 'Production',
      url: 'https://sightlineai.io',
      backend: 'https://sightline-api-production.up.railway.app',
      database: process.env.DATABASE_URL
    }
  },
  
  // Service configurations
  services: {
    vercel: {
      projectName: 'sightline',
      team: process.env.VERCEL_TEAM_ID,
      regions: ['iad1'], // US East
      framework: 'nextjs',
      buildCommand: 'pnpm build',
      outputDirectory: '.next',
      installCommand: 'pnpm install',
      devCommand: 'pnpm dev'
    },
    railway: {
      projectName: 'sightline-api',
      environment: 'production',
      region: 'us-west1',
      startCommand: 'uvicorn index:app --host 0.0.0.0 --port $PORT',
      healthCheckPath: '/api/health',
      healthCheckInterval: 30
    },
    neon: {
      projectName: 'sightline',
      region: 'us-west-2',
      autoscaling: {
        min_cu: 0.25,
        max_cu: 1
      },
      pooler: {
        enabled: true,
        mode: 'transaction'
      }
    }
  },
  
  // Deployment validation rules
  validation: {
    // Required environment variables by service
    required_env: {
      common: [
        'NODE_ENV',
        'DATABASE_URL',
        'NEXT_PUBLIC_APP_URL'
      ],
      clerk: [
        'CLERK_SECRET_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_WEBHOOK_SECRET'
      ],
      stripe: [
        'STRIPE_SECRET_KEY',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'NEXT_PUBLIC_STRIPE_PRO_PRICE_ID',
        'NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID'
      ],
      openai: [
        'OPENAI_API_KEY',
        'OPENAI_MODEL'
      ],
      youtube: [
        'YOUTUBE_API_KEY'
      ],
      optional: [
        'GUMLOOP_API_KEY',
        'OXYLABS_USERNAME',
        'OXYLABS_PASSWORD',
        'SENTRY_DSN',
        'SENTRY_AUTH_TOKEN',
        'NEXT_PUBLIC_POSTHOG_KEY',
        'NEXT_PUBLIC_POSTHOG_HOST',
        'UPSTASH_REDIS_URL',
        'UPSTASH_REDIS_TOKEN',
        'MAILERLITE_API_KEY'
      ]
    },
    
    // Performance budgets
    performance: {
      bundleSize: {
        warning: 500000, // 500KB
        error: 1000000    // 1MB
      },
      buildTime: {
        warning: 120,     // 2 minutes
        error: 300        // 5 minutes
      },
      lighthouse: {
        performance: 90,
        accessibility: 95,
        seo: 90,
        'best-practices': 90
      }
    },
    
    // Security checks
    security: {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'"
      },
      cors: {
        origin: ['https://sightlineai.io', 'https://staging.sightlineai.io'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      }
    }
  },
  
  // Monitoring and alerting
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    },
    posthog: {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      autocapture: true,
      capture_pageview: true
    },
    uptime: {
      checks: [
        {
          name: 'Frontend Health',
          url: 'https://sightlineai.io',
          interval: 60
        },
        {
          name: 'Backend Health',
          url: 'https://sightline-api-production.up.railway.app/api/health',
          interval: 30
        },
        {
          name: 'Database Connection',
          url: 'https://sightline-api-production.up.railway.app/api/db-check',
          interval: 120
        }
      ]
    }
  },
  
  // Rollback configuration
  rollback: {
    auto_rollback: {
      enabled: true,
      error_threshold: 10,     // Rollback if error rate > 10%
      response_time: 5000,     // Rollback if p95 > 5s
      health_check_fails: 3    // Rollback after 3 consecutive health check failures
    },
    retention: {
      deployments: 10,         // Keep last 10 deployments for rollback
      duration: 30             // Keep deployments for 30 days
    }
  },
  
  // Feature flags
  features: {
    maintenance_mode: false,
    rate_limiting: true,
    anonymous_summaries: true,
    smart_collections: true,
    ai_categorization: true,
    progress_tracking: true,
    public_sharing: true
  },
  
  // Rate limiting configuration
  rateLimits: {
    anonymous: {
      requests_per_minute: 10,
      requests_per_hour: 30,
      requests_per_day: 50
    },
    authenticated: {
      requests_per_minute: 60,
      requests_per_hour: 500,
      requests_per_day: 2000
    },
    pro: {
      requests_per_minute: 120,
      requests_per_hour: 1000,
      requests_per_day: 5000
    },
    enterprise: {
      requests_per_minute: 600,
      requests_per_hour: 10000,
      requests_per_day: 100000
    }
  },
  
  // Database configuration
  database: {
    migrations: {
      auto_run: false,         // Manual migrations for safety
      shadow_database: true,   // Use shadow database for migrations
      create_only: false       // Allow destructive migrations in dev only
    },
    connection: {
      connection_limit: 10,
      command_timeout: 10000,
      idle_in_transaction_session_timeout: 10000
    },
    maintenance: {
      vacuum_schedule: '0 3 * * 0',  // Weekly at 3 AM Sunday
      analyze_schedule: '0 4 * * *', // Daily at 4 AM
      backup_schedule: '0 2 * * *'   // Daily at 2 AM
    }
  },
  
  // CDN and caching
  caching: {
    cdn: {
      provider: 'vercel',
      regions: ['global'],
      cache_control: {
        static: 'public, max-age=31536000, immutable',
        dynamic: 'private, no-cache, no-store, must-revalidate',
        api: 's-maxage=60, stale-while-revalidate'
      }
    },
    redis: {
      provider: 'upstash',
      ttl: {
        session: 86400,        // 24 hours
        summary: 604800,       // 7 days
        transcript: 2592000    // 30 days
      }
    }
  },
  
  // Notification channels
  notifications: {
    slack: {
      webhook_url: process.env.SLACK_WEBHOOK_URL,
      channels: {
        deployments: '#deployments',
        errors: '#errors',
        security: '#security',
        performance: '#performance'
      }
    },
    email: {
      provider: 'mailerlite',
      from: 'noreply@sightlineai.io',
      admin_emails: ['admin@sightlineai.io']
    }
  }
};