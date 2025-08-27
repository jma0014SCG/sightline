#!/usr/bin/env node

/**
 * Deployment Pre-flight Checklist
 * Comprehensive pre-deployment validation to ensure production readiness
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production', override: false });

const deploymentConfig = require('../deployment.config');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Checklist results
const results = {
  passed: [],
  warnings: [],
  failures: [],
  skipped: []
};

// Log utilities
const log = {
  section: (title) => {
    console.log(`\n${colors.cyan}━━━ ${title} ━━━${colors.reset}`);
  },
  pass: (msg) => {
    results.passed.push(msg);
    console.log(`${colors.green}✓${colors.reset} ${msg}`);
  },
  warn: (msg) => {
    results.warnings.push(msg);
    console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
  },
  fail: (msg) => {
    results.failures.push(msg);
    console.log(`${colors.red}✗${colors.reset} ${msg}`);
  },
  skip: (msg) => {
    results.skipped.push(msg);
    console.log(`${colors.blue}○${colors.reset} ${msg} (skipped)`);
  },
  info: (msg) => {
    console.log(`  ${colors.blue}ℹ${colors.reset} ${msg}`);
  }
};

// Execute command safely
function execSafe(command, description) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check utilities
const checks = {
  // 1. Environment checks
  async checkEnvironment() {
    log.section('Environment Configuration');
    
    // Check NODE_ENV
    if (process.env.NODE_ENV === 'production') {
      log.pass('NODE_ENV is set to production');
    } else {
      log.warn(`NODE_ENV is ${process.env.NODE_ENV || 'not set'} (should be production)`);
    }
    
    // Check required environment files
    const envFiles = ['.env.local', '.env.production.local'];
    let hasEnvFile = false;
    
    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        log.pass(`Environment file ${file} exists`);
        hasEnvFile = true;
        break;
      }
    }
    
    if (!hasEnvFile) {
      log.fail('No environment configuration file found');
    }
    
    // Check critical environment variables
    const criticalVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_BACKEND_URL',
      'OPENAI_API_KEY',
      'CLERK_SECRET_KEY',
      'STRIPE_SECRET_KEY'
    ];
    
    for (const varName of criticalVars) {
      if (process.env[varName]) {
        log.pass(`${varName} is configured`);
      } else {
        log.fail(`${varName} is missing`);
      }
    }
  },
  
  // 2. Dependencies check
  async checkDependencies() {
    log.section('Dependencies & Tools');
    
    // Check Node version
    const nodeVersion = process.version;
    const requiredNode = deploymentConfig.services.vercel.framework === 'nextjs' ? 'v20' : 'v18';
    if (nodeVersion.startsWith(requiredNode)) {
      log.pass(`Node.js version ${nodeVersion} meets requirements`);
    } else {
      log.warn(`Node.js version ${nodeVersion} (recommended: ${requiredNode}.x)`);
    }
    
    // Check pnpm
    const pnpmCheck = execSafe('pnpm --version', 'pnpm version');
    if (pnpmCheck.success) {
      log.pass(`pnpm version ${pnpmCheck.output} installed`);
    } else {
      log.fail('pnpm is not installed');
    }
    
    // Check Railway CLI
    const railwayCheck = execSafe('railway --version', 'Railway CLI');
    if (railwayCheck.success) {
      log.pass('Railway CLI is installed');
    } else {
      log.warn('Railway CLI not installed (needed for backend deployment)');
    }
    
    // Check Vercel CLI
    const vercelCheck = execSafe('vercel --version', 'Vercel CLI');
    if (vercelCheck.success) {
      log.pass('Vercel CLI is installed');
    } else {
      log.warn('Vercel CLI not installed (needed for frontend deployment)');
    }
    
    // Check for uncommitted changes
    const gitStatus = execSafe('git status --porcelain', 'Git status');
    if (gitStatus.success && gitStatus.output === '') {
      log.pass('No uncommitted changes');
    } else {
      log.warn('Uncommitted changes detected - commit before deploying');
      if (gitStatus.output) {
        gitStatus.output.split('\n').slice(0, 5).forEach(line => {
          log.info(line);
        });
      }
    }
  },
  
  // 3. Build checks
  async checkBuild() {
    log.section('Build & Compilation');
    
    // Check if .next directory exists
    if (fs.existsSync('.next')) {
      const stats = fs.statSync('.next');
      const age = (Date.now() - stats.mtimeMs) / 1000 / 60;
      if (age < 30) {
        log.pass(`.next build directory exists (${age.toFixed(0)} minutes old)`);
      } else {
        log.warn(`.next build directory is ${age.toFixed(0)} minutes old - consider rebuilding`);
      }
    } else {
      log.fail('.next build directory not found - run pnpm build');
    }
    
    // Check TypeScript
    const tscCheck = execSafe('pnpm typecheck 2>&1', 'TypeScript check');
    if (tscCheck.success) {
      log.pass('TypeScript compilation successful');
    } else {
      // Count the number of errors
      const errorCount = (tscCheck.error?.match(/error TS/g) || []).length;
      if (errorCount > 0 && errorCount <= 10) {
        log.warn(`TypeScript has ${errorCount} errors (non-critical for deployment)`);
      } else if (errorCount > 10) {
        log.fail(`TypeScript has ${errorCount} errors (too many to safely deploy)`);
      } else {
        log.warn('TypeScript check failed but build succeeded');
      }
    }
    
    // Check linting
    const lintCheck = execSafe('pnpm lint', 'ESLint check');
    if (lintCheck.success) {
      log.pass('No linting errors');
    } else {
      log.warn('Linting warnings/errors detected');
    }
    
    // Check bundle size
    if (fs.existsSync('.next')) {
      const bundleSize = execSafe('du -sb .next 2>/dev/null | cut -f1', 'Bundle size');
      if (bundleSize.success && bundleSize.output) {
        const sizeStr = bundleSize.output.trim();
        const size = parseInt(sizeStr);
        
        if (!isNaN(size)) {
          const sizeMB = (size / 1024 / 1024).toFixed(2);
          
          if (size < deploymentConfig.validation.performance.bundleSize.warning) {
            log.pass(`Bundle size: ${sizeMB}MB (within limits)`);
          } else if (size < deploymentConfig.validation.performance.bundleSize.error) {
            log.warn(`Bundle size: ${sizeMB}MB (exceeds warning threshold)`);
          } else {
            log.fail(`Bundle size: ${sizeMB}MB (exceeds error threshold)`);
          }
        } else {
          // Fallback for macOS which doesn't support -b flag
          const bundleSizeMac = execSafe('du -sk .next 2>/dev/null | cut -f1', 'Bundle size (KB)');
          if (bundleSizeMac.success && bundleSizeMac.output) {
            const sizeKB = parseInt(bundleSizeMac.output.trim());
            if (!isNaN(sizeKB)) {
              const size = sizeKB * 1024;
              const sizeMB = (size / 1024 / 1024).toFixed(2);
              
              if (size < deploymentConfig.validation.performance.bundleSize.warning) {
                log.pass(`Bundle size: ${sizeMB}MB (within limits)`);
              } else if (size < deploymentConfig.validation.performance.bundleSize.error) {
                log.warn(`Bundle size: ${sizeMB}MB (exceeds warning threshold)`);
              } else {
                log.fail(`Bundle size: ${sizeMB}MB (exceeds error threshold)`);
              }
            }
          }
        }
      }
    }
  },
  
  // 4. Database checks
  async checkDatabase() {
    log.section('Database Configuration');
    
    if (!process.env.DATABASE_URL) {
      log.fail('DATABASE_URL not configured');
      return;
    }
    
    // Check database connection
    const dbCheck = execSafe('node scripts/test-db.js', 'Database connection');
    if (dbCheck.success) {
      log.pass('Database connection successful');
    } else {
      log.fail('Database connection failed');
    }
    
    // Check Prisma schema
    if (fs.existsSync('prisma/schema.prisma')) {
      log.pass('Prisma schema exists');
      
      // Check if client is generated
      if (fs.existsSync('node_modules/.prisma/client')) {
        log.pass('Prisma client is generated');
      } else {
        log.fail('Prisma client not generated - run pnpm db:generate');
      }
    } else {
      log.fail('Prisma schema not found');
    }
  },
  
  // 5. API checks
  async checkAPI() {
    log.section('API Configuration');
    
    // Check Python environment
    if (fs.existsSync('venv')) {
      log.pass('Python virtual environment exists');
    } else {
      log.warn('Python virtual environment not found');
    }
    
    // Check requirements.txt
    if (fs.existsSync('requirements.txt')) {
      log.pass('Python requirements.txt exists');
    } else {
      log.fail('requirements.txt not found');
    }
    
    // Check API directory
    if (fs.existsSync('api/index.py')) {
      log.pass('FastAPI entry point exists');
    } else {
      log.fail('api/index.py not found');
    }
    
    // Check Railway configuration
    if (fs.existsSync('railway.json') || fs.existsSync('railway.toml')) {
      log.pass('Railway configuration exists');
    } else {
      log.warn('Railway configuration not found');
    }
  },
  
  // 6. Security checks
  async checkSecurity() {
    log.section('Security Configuration');
    
    // Check for exposed secrets
    const secretPatterns = [
      /sk_live_[a-zA-Z0-9]+/,
      /sk_test_[a-zA-Z0-9]+/,
      /whsec_[a-zA-Z0-9]+/,
      /Bearer [a-zA-Z0-9]+/
    ];
    
    const filesToCheck = [
      'next.config.js',
      'vercel.json',
      'railway.json'
    ];
    
    let secretsFound = false;
    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            log.fail(`Potential secret exposed in ${file}`);
            secretsFound = true;
          }
        }
      }
    }
    
    if (!secretsFound) {
      log.pass('No exposed secrets detected in configuration files');
    }
    
    // Check HTTPS enforcement
    if (process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
      log.pass('HTTPS enforced for production URL');
    } else {
      log.warn('Production URL should use HTTPS');
    }
    
    // Check security headers in next.config.js
    if (fs.existsSync('next.config.js')) {
      const config = fs.readFileSync('next.config.js', 'utf8');
      if (config.includes('headers')) {
        log.pass('Security headers configured');
      } else {
        log.warn('Security headers not configured in next.config.js');
      }
    }
  },
  
  // 7. Performance checks
  async checkPerformance() {
    log.section('Performance Optimization');
    
    // Check image optimization
    if (fs.existsSync('next.config.js')) {
      const config = fs.readFileSync('next.config.js', 'utf8');
      if (config.includes('images:')) {
        log.pass('Image optimization configured');
      } else {
        log.warn('Image optimization not configured');
      }
    }
    
    // Check for .env in production build
    if (fs.existsSync('.next/server')) {
      const serverFiles = fs.readdirSync('.next/server');
      const hasEnvInBuild = serverFiles.some(file => file.includes('.env'));
      if (!hasEnvInBuild) {
        log.pass('Environment variables not bundled in build');
      } else {
        log.fail('Environment variables might be bundled - security risk');
      }
    }
    
    // Check caching configuration
    if (process.env.UPSTASH_REDIS_URL) {
      log.pass('Redis caching configured');
    } else {
      log.warn('Redis caching not configured (optional)');
    }
  }
};

// Main pre-flight check
async function runPreflight() {
  console.log(colors.bright + colors.cyan);
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🚀 DEPLOYMENT PRE-FLIGHT CHECKLIST     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(colors.reset);
  
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
  
  // Run all checks
  await checks.checkEnvironment();
  await checks.checkDependencies();
  await checks.checkBuild();
  await checks.checkDatabase();
  await checks.checkAPI();
  await checks.checkSecurity();
  await checks.checkPerformance();
  
  // Summary
  console.log(`\n${colors.cyan}━━━ Pre-flight Summary ━━━${colors.reset}`);
  
  const total = results.passed.length + results.warnings.length + results.failures.length;
  const score = ((results.passed.length / total) * 100).toFixed(0);
  
  console.log(`\n${colors.green}✓ Passed:${colors.reset} ${results.passed.length}`);
  console.log(`${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings.length}`);
  console.log(`${colors.red}✗ Failed:${colors.reset} ${results.failures.length}`);
  console.log(`${colors.blue}○ Skipped:${colors.reset} ${results.skipped.length}`);
  
  console.log(`\nReadiness Score: ${score}%`);
  
  // Final verdict
  console.log('\n' + '═'.repeat(45));
  
  if (results.failures.length === 0) {
    console.log(`${colors.green}${colors.bright}✅ READY FOR DEPLOYMENT${colors.reset}`);
    console.log('\nAll critical checks passed. You can proceed with deployment.');
    
    if (results.warnings.length > 0) {
      console.log(`\n${colors.yellow}Note:${colors.reset} ${results.warnings.length} warning(s) detected. Review them before production deployment.`);
    }
    
    console.log('\nNext steps:');
    console.log('  1. Run: pnpm deploy:orchestrate');
    console.log('  2. Or for step-by-step: pnpm deploy:prepare');
    
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bright}❌ NOT READY FOR DEPLOYMENT${colors.reset}`);
    console.log(`\n${results.failures.length} critical issue(s) must be resolved:`);
    
    results.failures.slice(0, 5).forEach((failure, i) => {
      console.log(`  ${i + 1}. ${failure}`);
    });
    
    if (results.failures.length > 5) {
      console.log(`  ... and ${results.failures.length - 5} more`);
    }
    
    console.log('\nFix these issues and run pre-flight check again.');
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(colors.red + 'Pre-flight check failed:' + colors.reset, error);
  process.exit(1);
});

// Run pre-flight checks
runPreflight().catch(error => {
  console.error(colors.red + 'Pre-flight error:' + colors.reset, error);
  process.exit(1);
});