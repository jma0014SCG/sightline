const { z } = require('zod');
require('dotenv').config({ path: '.env.local' });

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  
  // YouTube API
  YOUTUBE_API_KEY: z.string().optional(),
  
  // Stripe (make optional for initial testing)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  
  // Upstash Redis (optional for initial setup)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  LANGCHAIN_API_KEY: z.string().optional(),
  LANGCHAIN_PROJECT: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

console.log('🔍 Validating environment variables...\n');

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n');
  const errors = parsed.error.flatten().fieldErrors;
  
  Object.entries(errors).forEach(([key, messages]) => {
    console.error(`  ${key}:`);
    messages.forEach(msg => console.error(`    - ${msg}`));
  });
  
  console.error('\n📝 Please check your .env.local file and ensure all required variables are set correctly.');
  console.error('   You can copy from .env.example as a template.\n');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are valid!\n');
  console.log('📋 Configured services:');
  console.log('  - Database: PostgreSQL');
  console.log('  - Authentication: NextAuth with Google OAuth');
  console.log('  - AI: OpenAI API');
  
  if (process.env.YOUTUBE_API_KEY) {
    console.log('  - YouTube: API configured');
  }
  
  if (process.env.STRIPE_SECRET_KEY) {
    console.log('  - Payments: Stripe configured');
  }
  
  if (process.env.UPSTASH_REDIS_REST_URL) {
    console.log('  - Queue: Upstash Redis configured');
  }
  
  if (process.env.SENTRY_DSN) {
    console.log('  - Monitoring: Sentry configured');
  }
  
  console.log('\n🚀 Ready to start development!');
}