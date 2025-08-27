#!/usr/bin/env node

/**
 * Deployment Health Dashboard
 * Real-time monitoring dashboard for production deployment status
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const deploymentConfig = require('../deployment.config');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Status indicators
const status = {
  healthy: `${colors.green}●${colors.reset}`,
  warning: `${colors.yellow}●${colors.reset}`,
  error: `${colors.red}●${colors.reset}`,
  unknown: `${colors.dim}●${colors.reset}`
};

// Dashboard state
const dashboardState = {
  services: {},
  metrics: {},
  alerts: [],
  lastUpdate: null
};

// Clear screen and move cursor to top
function clearScreen() {
  console.clear();
  process.stdout.write('\x1b[0;0H');
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format duration
function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  if (ms < 3600000) return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
  return Math.floor(ms / 3600000) + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
}

// Check endpoint health
async function checkEndpoint(name, url, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      const responseTime = Date.now() - startTime;
      
      dashboardState.services[name] = {
        status: res.statusCode < 400 ? 'healthy' : res.statusCode < 500 ? 'warning' : 'error',
        statusCode: res.statusCode,
        responseTime,
        lastCheck: new Date().toISOString()
      };
      
      resolve({
        name,
        status: dashboardState.services[name].status,
        statusCode: res.statusCode,
        responseTime
      });
    });
    
    req.on('error', (err) => {
      dashboardState.services[name] = {
        status: 'error',
        error: err.message,
        lastCheck: new Date().toISOString()
      };
      
      resolve({
        name,
        status: 'error',
        error: err.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      dashboardState.services[name] = {
        status: 'error',
        error: 'Timeout',
        lastCheck: new Date().toISOString()
      };
      
      resolve({
        name,
        status: 'error',
        error: 'Timeout'
      });
    });
  });
}

// Check database health
async function checkDatabase() {
  try {
    execSync('node scripts/test-db.js', { stdio: 'pipe' });
    dashboardState.services['Database'] = {
      status: 'healthy',
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    dashboardState.services['Database'] = {
      status: 'error',
      error: 'Connection failed',
      lastCheck: new Date().toISOString()
    };
  }
}

// Get system metrics
async function getSystemMetrics() {
  try {
    // Memory usage
    const memUsage = process.memoryUsage();
    dashboardState.metrics.memory = {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external)
    };
    
    // CPU usage
    const cpuUsage = process.cpuUsage();
    dashboardState.metrics.cpu = {
      user: (cpuUsage.user / 1000000).toFixed(2) + 's',
      system: (cpuUsage.system / 1000000).toFixed(2) + 's'
    };
    
    // Uptime
    dashboardState.metrics.uptime = formatDuration(process.uptime() * 1000);
    
  } catch (error) {
    console.error('Failed to get system metrics:', error);
  }
}

// Check all services
async function checkAllServices() {
  const checks = [
    checkEndpoint('Frontend', deploymentConfig.environments.production.url),
    checkEndpoint('Backend API', deploymentConfig.environments.production.backend + '/api'),
    checkEndpoint('Health Check', deploymentConfig.environments.production.backend + '/api/health'),
    checkDatabase()
  ];
  
  await Promise.all(checks);
  dashboardState.lastUpdate = new Date().toISOString();
}

// Render dashboard
function renderDashboard() {
  clearScreen();
  
  // Header
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + colors.cyan + '  📊 SIGHTLINE DEPLOYMENT HEALTH DASHBOARD' + colors.reset);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
  console.log();
  
  // Service Status
  console.log(colors.bright + '🔍 Service Status' + colors.reset);
  console.log('─'.repeat(40));
  
  for (const [name, service] of Object.entries(dashboardState.services)) {
    const statusIcon = status[service.status] || status.unknown;
    const statusText = service.status === 'healthy' ? colors.green : 
                      service.status === 'warning' ? colors.yellow : 
                      colors.red;
    
    console.log(`${statusIcon} ${name.padEnd(20)} ${statusText}${service.status.toUpperCase()}${colors.reset}`);
    
    if (service.responseTime) {
      console.log(`  └─ Response: ${service.responseTime}ms`);
    }
    if (service.statusCode) {
      console.log(`  └─ Status Code: ${service.statusCode}`);
    }
    if (service.error) {
      console.log(`  └─ ${colors.red}Error: ${service.error}${colors.reset}`);
    }
  }
  
  console.log();
  
  // System Metrics
  console.log(colors.bright + '📈 System Metrics' + colors.reset);
  console.log('─'.repeat(40));
  
  if (dashboardState.metrics.memory) {
    console.log('Memory Usage:');
    console.log(`  RSS:        ${dashboardState.metrics.memory.rss}`);
    console.log(`  Heap Used:  ${dashboardState.metrics.memory.heapUsed}`);
    console.log(`  Heap Total: ${dashboardState.metrics.memory.heapTotal}`);
  }
  
  if (dashboardState.metrics.cpu) {
    console.log('CPU Usage:');
    console.log(`  User:   ${dashboardState.metrics.cpu.user}`);
    console.log(`  System: ${dashboardState.metrics.cpu.system}`);
  }
  
  if (dashboardState.metrics.uptime) {
    console.log(`Uptime: ${dashboardState.metrics.uptime}`);
  }
  
  console.log();
  
  // Environment Info
  console.log(colors.bright + '🌍 Environment' + colors.reset);
  console.log('─'.repeat(40));
  console.log(`Environment:   ${deploymentConfig.environments.production.name}`);
  console.log(`Frontend URL:  ${deploymentConfig.environments.production.url}`);
  console.log(`Backend URL:   ${deploymentConfig.environments.production.backend}`);
  console.log(`Node Version:  ${process.version}`);
  
  console.log();
  
  // Recent Alerts
  if (dashboardState.alerts.length > 0) {
    console.log(colors.bright + colors.yellow + '⚠️  Recent Alerts' + colors.reset);
    console.log('─'.repeat(40));
    
    dashboardState.alerts.slice(-5).forEach(alert => {
      const alertColor = alert.severity === 'critical' ? colors.red :
                        alert.severity === 'warning' ? colors.yellow :
                        colors.blue;
      console.log(`${alertColor}[${alert.timestamp}] ${alert.message}${colors.reset}`);
    });
    
    console.log();
  }
  
  // Performance Summary
  const healthyCount = Object.values(dashboardState.services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(dashboardState.services).length;
  const healthPercentage = totalServices > 0 ? (healthyCount / totalServices * 100).toFixed(0) : 0;
  
  console.log(colors.bright + '📊 Overall Health' + colors.reset);
  console.log('─'.repeat(40));
  
  const healthColor = healthPercentage >= 90 ? colors.green :
                     healthPercentage >= 70 ? colors.yellow :
                     colors.red;
  
  console.log(`Health Score: ${healthColor}${healthPercentage}%${colors.reset} (${healthyCount}/${totalServices} services)`);
  
  // Health bar visualization
  const barLength = 30;
  const filledLength = Math.round(barLength * healthPercentage / 100);
  const healthBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`[${healthColor}${healthBar}${colors.reset}]`);
  
  console.log();
  
  // Footer
  console.log(colors.dim + '─'.repeat(60) + colors.reset);
  console.log(colors.dim + `Last updated: ${new Date(dashboardState.lastUpdate).toLocaleString()}` + colors.reset);
  console.log(colors.dim + 'Press Ctrl+C to exit | Refreshing every 10 seconds...' + colors.reset);
}

// Monitor alerts
function checkAlerts() {
  // Check for critical conditions
  const criticalServices = Object.entries(dashboardState.services)
    .filter(([_, service]) => service.status === 'error');
  
  if (criticalServices.length > 0) {
    dashboardState.alerts.push({
      timestamp: new Date().toISOString(),
      severity: 'critical',
      message: `${criticalServices.length} service(s) are down!`
    });
  }
  
  // Check for slow response times
  const slowServices = Object.entries(dashboardState.services)
    .filter(([_, service]) => service.responseTime > 3000);
  
  if (slowServices.length > 0) {
    dashboardState.alerts.push({
      timestamp: new Date().toISOString(),
      severity: 'warning',
      message: `${slowServices.length} service(s) have slow response times`
    });
  }
  
  // Keep only last 50 alerts
  if (dashboardState.alerts.length > 50) {
    dashboardState.alerts = dashboardState.alerts.slice(-50);
  }
}

// Main monitoring loop
async function startMonitoring() {
  console.log(colors.cyan + 'Starting deployment health monitoring...' + colors.reset);
  
  // Initial check
  await checkAllServices();
  await getSystemMetrics();
  checkAlerts();
  renderDashboard();
  
  // Set up refresh interval
  setInterval(async () => {
    await checkAllServices();
    await getSystemMetrics();
    checkAlerts();
    renderDashboard();
  }, 10000); // Refresh every 10 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n' + colors.yellow + 'Shutting down health dashboard...' + colors.reset);
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error(colors.red + 'Uncaught exception:' + colors.reset, error);
  dashboardState.alerts.push({
    timestamp: new Date().toISOString(),
    severity: 'critical',
    message: `Dashboard error: ${error.message}`
  });
});

// Start the dashboard
startMonitoring();