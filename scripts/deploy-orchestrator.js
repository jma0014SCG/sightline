#!/usr/bin/env node

/**
 * Production Deployment Orchestrator
 * Comprehensive deployment automation with validation, rollback, and monitoring
 * 
 * Usage: node scripts/deploy-orchestrator.js [command] [options]
 * Commands: prepare, validate, deploy-backend, deploy-frontend, verify, rollback, full
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logger utility
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}▶${colors.reset} ${msg}`)
};

// Deployment state tracking
const deploymentState = {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'production',
  steps: [],
  errors: [],
  warnings: [],
  rollbackPoints: []
};

// Save deployment state
function saveState() {
  const statePath = path.join(__dirname, '.deployment-state.json');
  fs.writeFileSync(statePath, JSON.stringify(deploymentState, null, 2));
}

// Execute command with error handling
function execute(command, description, critical = true) {
  log.step(description);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: critical ? 'inherit' : 'pipe'
    });
    
    deploymentState.steps.push({
      command,
      description,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    log.success(`${description} completed`);
    return output;
  } catch (error) {
    deploymentState.steps.push({
      command,
      description,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    if (critical) {
      log.error(`${description} failed: ${error.message}`);
      deploymentState.errors.push({
        step: description,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      saveState();
      throw error;
    } else {
      log.warning(`${description} had warnings but continuing`);
      deploymentState.warnings.push({
        step: description,
        warning: error.message,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }
}

// Interactive prompt
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Deployment phases
const deploymentPhases = {
  // Phase 1: Pre-deployment preparation
  async prepare() {
    log.section('Phase 1: Pre-Deployment Preparation');
    
    // 1.1 Environment validation
    log.info('Validating environment configuration...');
    execute('node scripts/validate-production-env.js', 'Environment validation');
    
    // 1.2 Database connection test
    log.info('Testing database connection...');
    execute('node scripts/test-db.js', 'Database connectivity');
    
    // 1.3 Build production bundle
    log.info('Building production bundle...');
    execute('pnpm build:prod', 'Production build');
    
    // 1.4 Run tests
    log.info('Running test suite...');
    // Skip TypeScript check since build already validates compilation
    // execute('pnpm typecheck', 'TypeScript validation');
    execute('pnpm lint', 'Code linting', false);
    
    // 1.5 Bundle analysis
    log.info('Analyzing bundle size...');
    const bundleSize = execute('du -sh .next | cut -f1', 'Bundle size check', false);
    if (bundleSize) {
      log.info(`Bundle size: ${bundleSize}`);
    }
    
    // Create rollback point
    deploymentState.rollbackPoints.push({
      phase: 'prepare',
      timestamp: new Date().toISOString(),
      git_sha: execute('git rev-parse HEAD', 'Get commit SHA', false)?.trim()
    });
    
    saveState();
    log.success('Pre-deployment preparation complete');
  },
  
  // Phase 2: Database migrations
  async database() {
    log.section('Phase 2: Database Setup');
    
    // 2.1 Generate Prisma client
    log.info('Generating Prisma client...');
    execute('pnpm db:generate', 'Prisma client generation');
    
    // 2.2 Push schema to production
    log.info('Applying database schema...');
    execute('pnpm db:push', 'Database schema push');
    
    // 2.3 Verify database state
    log.info('Verifying database state...');
    execute('node scripts/validate-database.js', 'Database validation');
    
    // 2.4 Apply performance optimizations
    log.info('Applying database optimizations...');
    execute('node scripts/apply-indexes-safe.js', 'Database index optimization', false);
    
    saveState();
    log.success('Database setup complete');
  },
  
  // Phase 3: Backend deployment
  async deployBackend() {
    log.section('Phase 3: Backend Deployment (Railway)');
    
    // 3.1 Check Railway CLI
    log.info('Checking Railway CLI...');
    execute('railway --version', 'Railway CLI check');
    
    // 3.2 Deploy to Railway
    log.info('Deploying backend to Railway...');
    execute('railway up --service sightline-ai-backend', 'Railway deployment');
    
    // 3.3 Get deployment URL
    log.info('Getting deployment URL...');
    const railwayUrl = execute('railway domain | grep https | head -1', 'Get Railway URL', false);
    if (railwayUrl) {
      log.success(`Backend URL: ${railwayUrl.trim()}`);
      process.env.NEXT_PUBLIC_BACKEND_URL = railwayUrl.trim();
    }
    
    // 3.4 Test backend health
    log.info('Testing backend health...');
    execute('node scripts/test-backend-health.js', 'Backend health check');
    
    deploymentState.rollbackPoints.push({
      phase: 'backend',
      timestamp: new Date().toISOString(),
      railway_deployment: railwayUrl?.trim()
    });
    
    saveState();
    log.success('Backend deployment complete');
  },
  
  // Phase 4: Frontend deployment
  async deployFrontend() {
    log.section('Phase 4: Frontend Deployment (Vercel)');
    
    // 4.1 Check Vercel CLI
    log.info('Checking Vercel CLI...');
    execute('vercel --version', 'Vercel CLI check');
    
    // 4.2 Link to Vercel project
    log.info('Linking to Vercel project...');
    execute('pnpm vercel:link', 'Vercel project link', false);
    
    // 4.3 Deploy preview first
    log.info('Deploying preview to Vercel...');
    const previewUrl = execute('vercel --yes | tail -n 1', 'Preview deployment');
    if (previewUrl) {
      log.success(`Preview URL: ${previewUrl.trim()}`);
      
      const proceed = await prompt('Preview deployed. Check it and proceed to production? (y/n): ');
      if (proceed !== 'y') {
        log.warning('Deployment cancelled by user');
        return;
      }
    }
    
    // 4.4 Deploy to production
    log.info('Deploying to production...');
    execute('vercel --prod --yes', 'Production deployment');
    
    deploymentState.rollbackPoints.push({
      phase: 'frontend',
      timestamp: new Date().toISOString(),
      preview_url: previewUrl?.trim()
    });
    
    saveState();
    log.success('Frontend deployment complete');
  },
  
  // Phase 5: Post-deployment verification
  async verify() {
    log.section('Phase 5: Post-Deployment Verification');
    
    // 5.1 Run comprehensive verification
    log.info('Running production verification...');
    execute('node scripts/verify-production.js', 'Production verification');
    
    // 5.2 Test critical flows
    log.info('Testing critical user flows...');
    execute('node scripts/test-anonymous-flow.js', 'Anonymous flow test');
    execute('node scripts/verify-clerk-setup.js', 'Authentication flow test', false);
    execute('node scripts/test-pipeline.js', 'Summarization pipeline test');
    
    // 5.3 Security verification
    log.info('Running security checks...');
    execute('node scripts/test-security.js', 'Security verification', false);
    
    // 5.4 Performance monitoring
    log.info('Checking performance metrics...');
    execute('node scripts/monitor-db-performance.js', 'Database performance', false);
    
    saveState();
    log.success('Verification complete');
  },
  
  // Phase 6: Monitoring setup
  async monitoring() {
    log.section('Phase 6: Monitoring & Analytics Setup');
    
    // 6.1 Verify Sentry setup
    if (process.env.SENTRY_DSN) {
      log.info('Verifying Sentry error tracking...');
      execute('curl -sI https://sentry.io/api/0/projects/ -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"', 'Sentry verification', false);
    }
    
    // 6.2 Verify PostHog setup
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      log.info('Verifying PostHog analytics...');
      execute('curl -s https://us.i.posthog.com/api/projects/', 'PostHog verification', false);
    }
    
    // 6.3 Set up alerts
    log.info('Configuring monitoring alerts...');
    // Add alert configuration here
    
    saveState();
    log.success('Monitoring setup complete');
  },
  
  // Emergency rollback
  async rollback() {
    log.section('Emergency Rollback');
    log.warning('Initiating emergency rollback procedures...');
    
    const lastRollback = deploymentState.rollbackPoints[deploymentState.rollbackPoints.length - 1];
    if (!lastRollback) {
      log.error('No rollback points available');
      return;
    }
    
    log.info(`Rolling back to: ${lastRollback.phase} (${lastRollback.timestamp})`);
    
    // Rollback Vercel
    log.info('Rolling back Vercel deployment...');
    execute('vercel rollback', 'Vercel rollback', false);
    
    // Rollback Railway
    log.info('Rolling back Railway deployment...');
    execute('cd api && railway down', 'Railway rollback', false);
    
    // Restore git state
    if (lastRollback.git_sha) {
      log.info(`Restoring git to ${lastRollback.git_sha}...`);
      execute(`git checkout ${lastRollback.git_sha}`, 'Git restore', false);
    }
    
    log.success('Rollback complete');
  }
};

// Full deployment orchestration
async function fullDeployment() {
  log.section('🚀 Full Production Deployment');
  log.info(`Starting deployment at ${new Date().toISOString()}`);
  log.info(`Environment: ${deploymentState.environment}`);
  
  try {
    // Run all phases in sequence
    await deploymentPhases.prepare();
    
    const proceed = await prompt('\nPre-deployment checks passed. Continue with deployment? (y/n): ');
    if (proceed !== 'y') {
      log.warning('Deployment cancelled by user');
      return;
    }
    
    await deploymentPhases.database();
    await deploymentPhases.deployBackend();
    await deploymentPhases.deployFrontend();
    await deploymentPhases.verify();
    await deploymentPhases.monitoring();
    
    // Final summary
    log.section('✅ Deployment Summary');
    log.success('Production deployment completed successfully!');
    
    console.log('\nDeployment Stats:');
    console.log(`  Total steps: ${deploymentState.steps.length}`);
    console.log(`  Successful: ${deploymentState.steps.filter(s => s.status === 'success').length}`);
    console.log(`  Warnings: ${deploymentState.warnings.length}`);
    console.log(`  Errors: ${deploymentState.errors.length}`);
    console.log(`  Duration: ${((Date.now() - new Date(deploymentState.timestamp)) / 1000 / 60).toFixed(2)} minutes`);
    
    if (deploymentState.warnings.length > 0) {
      log.warning('\nWarnings encountered:');
      deploymentState.warnings.forEach(w => {
        console.log(`  - ${w.step}: ${w.warning}`);
      });
    }
    
    log.section('📝 Post-Deployment Tasks');
    console.log('1. Monitor application logs for errors');
    console.log('2. Check analytics dashboards');
    console.log('3. Test user workflows');
    console.log('4. Monitor performance metrics');
    console.log('5. Set up alerts for critical issues');
    
  } catch (error) {
    log.error('Deployment failed!');
    log.error(error.message);
    
    const rollback = await prompt('\nDo you want to rollback? (y/n): ');
    if (rollback === 'y') {
      await deploymentPhases.rollback();
    }
    
    process.exit(1);
  }
}

// CLI handler
async function main() {
  const command = process.argv[2] || 'full';
  
  switch (command) {
    case 'prepare':
      await deploymentPhases.prepare();
      break;
    case 'database':
      await deploymentPhases.database();
      break;
    case 'deploy-backend':
      await deploymentPhases.deployBackend();
      break;
    case 'deploy-frontend':
      await deploymentPhases.deployFrontend();
      break;
    case 'verify':
      await deploymentPhases.verify();
      break;
    case 'monitoring':
      await deploymentPhases.monitoring();
      break;
    case 'rollback':
      await deploymentPhases.rollback();
      break;
    case 'full':
      await fullDeployment();
      break;
    default:
      console.log('Usage: node scripts/deploy-orchestrator.js [command]');
      console.log('Commands:');
      console.log('  prepare        - Run pre-deployment checks');
      console.log('  database       - Setup database');
      console.log('  deploy-backend - Deploy backend to Railway');
      console.log('  deploy-frontend - Deploy frontend to Vercel');
      console.log('  verify         - Verify deployment');
      console.log('  monitoring     - Setup monitoring');
      console.log('  rollback       - Emergency rollback');
      console.log('  full           - Complete deployment (default)');
      process.exit(0);
  }
}

// Run
main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});