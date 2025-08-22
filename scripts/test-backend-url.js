#!/usr/bin/env node

/**
 * Quick test to verify backend URL configuration
 */

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT SET';
const nodeEnv = process.env.NODE_ENV || 'development';

console.log('🔍 Backend URL Configuration Test\n');
console.log('NODE_ENV:', nodeEnv);
console.log('NEXT_PUBLIC_BACKEND_URL:', backendUrl);

if (backendUrl === 'NOT SET') {
  console.log('\n❌ ERROR: NEXT_PUBLIC_BACKEND_URL is not set!');
  console.log('\nTo fix this:');
  console.log('1. Add to .env.local:');
  console.log('   NEXT_PUBLIC_BACKEND_URL=https://sightline-api-production.up.railway.app');
  console.log('\n2. Or set in Vercel dashboard:');
  console.log('   Project Settings > Environment Variables > Add NEXT_PUBLIC_BACKEND_URL');
  process.exit(1);
} else if (backendUrl === 'http://localhost:8000' && nodeEnv === 'production') {
  console.log('\n⚠️  WARNING: Using localhost URL in production!');
  console.log('This will not work. Set NEXT_PUBLIC_BACKEND_URL to your Railway URL.');
  process.exit(1);
} else {
  console.log('\n✅ Backend URL is configured:', backendUrl);
  
  // Try to fetch health endpoint
  const https = require('https');
  const http = require('http');
  const url = new URL(backendUrl + '/api/health');
  const client = url.protocol === 'https:' ? https : http;
  
  console.log('\n🔗 Testing connection to:', url.href);
  
  client.get(url.href, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Backend is reachable and healthy!');
    } else {
      console.log(`⚠️  Backend returned status ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.log('❌ Could not connect to backend:', err.message);
    console.log('\nMake sure your Railway backend is deployed and running.');
  });
}