#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production', override: false });

const https = require('https');

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sightline-ai-backend-production.up.railway.app';

console.log('🔍 Backend Health Check\n');
console.log(`Backend URL: ${backendUrl}`);

// Test the /api/health endpoint
const testUrl = `${backendUrl}/api/health`;

https.get(testUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(data);
        console.log('✅ Backend is healthy!');
        console.log('Response:', result);
        process.exit(0);
      } catch (e) {
        console.error('❌ Invalid JSON response:', data);
        process.exit(1);
      }
    } else {
      console.error(`❌ Backend returned status ${res.statusCode}`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Failed to connect to backend:', err.message);
  process.exit(1);
});