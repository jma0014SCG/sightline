#!/usr/bin/env node

/**
 * Integration test for the video summarization pipeline
 * Tests the complete flow from URL input to summary generation
 */

const { execSync } = require('child_process');
const fetch = require('node-fetch');

const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Short test video
const API_BASE_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';

async function testAPIHealthCheck() {
  console.log('🔍 Testing API health check...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('✅ API health check passed');
      return true;
    } else {
      console.log('❌ API health check failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ API health check failed:', error.message);
    return false;
  }
}

async function testVideoSummarization() {
  console.log('🔍 Testing video summarization...');
  try {
    // Create a test JWT token (simplified for testing)
    const jwt = require('jsonwebtoken');
    const secret = process.env.NEXTAUTH_SECRET || 'test-secret';
    const testToken = jwt.sign(
      {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'USER'
      },
      secret,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const response = await fetch(`${API_BASE_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({ url: TEST_VIDEO_URL })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Video summarization test passed');
      console.log(`📝 Summary preview: ${data.summary.substring(0, 100)}...`);
      return true;
    } else {
      const errorData = await response.json();
      console.log('❌ Video summarization test failed:', errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Video summarization test failed:', error.message);
    return false;
  }
}

async function testFrontendConnection() {
  console.log('🔍 Testing frontend connection...');
  try {
    const response = await fetch(`${FRONTEND_URL}/api/health`);
    if (response.ok) {
      console.log('✅ Frontend connection test passed');
      return true;
    } else {
      console.log('❌ Frontend connection test failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend connection test failed:', error.message);
    console.log('ℹ️  Frontend might not be running');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Sightline.ai pipeline integration tests...\n');

  const results = [];
  
  // Test API health
  results.push(await testAPIHealthCheck());
  
  // Test video summarization (requires API keys)
  if (process.env.OPENAI_API_KEY) {
    results.push(await testVideoSummarization());
  } else {
    console.log('⚠️  Skipping summarization test (no OPENAI_API_KEY)');
    results.push(null);
  }
  
  // Test frontend connection
  results.push(await testFrontendConnection());

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.filter(r => r === true).length}`);
  console.log(`❌ Failed: ${results.filter(r => r === false).length}`);
  console.log(`⚠️  Skipped: ${results.filter(r => r === null).length}`);

  const allCriticalTestsPassed = results[0] === true; // API health is critical
  
  if (allCriticalTestsPassed) {
    console.log('\n🎉 Core pipeline is ready!');
    console.log('📋 Next steps:');
    console.log('   1. Set up environment variables (see ENVIRONMENT.md)');
    console.log('   2. Start both frontend and backend servers');
    console.log('   3. Test with a real YouTube video');
    console.log('   4. Implement library and sharing features');
  } else {
    console.log('\n❌ Pipeline has critical issues that need to be resolved');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAPIHealthCheck, testVideoSummarization, testFrontendConnection };