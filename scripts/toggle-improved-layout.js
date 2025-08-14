#!/usr/bin/env node

/**
 * Script to toggle the improved summary layout feature flag
 * Usage: 
 *   node scripts/toggle-improved-layout.js enable
 *   node scripts/toggle-improved-layout.js disable
 *   node scripts/toggle-improved-layout.js status
 */

const fs = require('fs');
const path = require('path');

const command = process.argv[2];

function updateEnvFile(enable) {
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    // File doesn't exist, create it
    envContent = '';
  }

  const flagName = 'NEXT_PUBLIC_IMPROVED_SUMMARY_LAYOUT';
  const flagRegex = new RegExp(`^${flagName}=.*$`, 'm');
  
  if (envContent.match(flagRegex)) {
    // Update existing flag
    envContent = envContent.replace(flagRegex, `${flagName}=${enable}`);
  } else {
    // Add new flag
    envContent += `\n${flagName}=${enable}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
}

switch (command) {
  case 'enable':
    updateEnvFile('true');
    console.log('✅ Improved summary layout ENABLED');
    console.log('   Restart your dev server for changes to take effect');
    break;
    
  case 'disable':
    updateEnvFile('false');
    console.log('❌ Improved summary layout DISABLED');
    console.log('   Restart your dev server for changes to take effect');
    break;
    
  case 'status':
    const envPath = path.join(__dirname, '..', '.env.local');
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^NEXT_PUBLIC_IMPROVED_SUMMARY_LAYOUT=(.*)$/m);
      if (match && match[1] === 'true') {
        console.log('📊 Status: Improved layout is ENABLED');
      } else {
        console.log('📊 Status: Improved layout is DISABLED');
      }
    } catch {
      console.log('📊 Status: Improved layout is DISABLED (default)');
    }
    break;
    
  default:
    console.log('Usage: node scripts/toggle-improved-layout.js [enable|disable|status]');
    process.exit(1);
}