#!/usr/bin/env node

/**
 * Test script to verify the full flow from URL input to library storage
 */

async function testFullFlow() {
  const testUrl = 'https://www.youtube.com/watch?v=Xq0xJl-2D_s';
  
  console.log('🧪 Testing Full Flow');
  console.log('==================');
  console.log(`Test URL: ${testUrl}`);
  console.log();

  // Step 1: Test backend directly
  console.log('1️⃣ Testing FastAPI Backend directly...');
  try {
    const backendResponse = await fetch('http://localhost:8000/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });
    
    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log('✅ Backend response OK');
      console.log(`   - Video Title: ${data.video_title}`);
      console.log(`   - Summary Length: ${data.summary?.length || 0} characters`);
      console.log(`   - Key Points: ${data.key_points?.length || 0} items`);
    } else {
      console.error('❌ Backend error:', await backendResponse.text());
      return;
    }
  } catch (error) {
    console.error('❌ Backend request failed:', error.message);
    return;
  }

  console.log();

  // Step 2: Test frontend API route
  console.log('2️⃣ Testing Frontend tRPC endpoint...');
  try {
    const frontendResponse = await fetch('http://localhost:3000/api/trpc/summary.create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: { url: testUrl },
      }),
    });
    
    if (frontendResponse.ok) {
      const data = await frontendResponse.json();
      console.log('✅ Frontend response OK');
      if (data.result?.data?.json) {
        const summary = data.result.data.json;
        console.log(`   - Summary ID: ${summary.id}`);
        console.log(`   - Video Title: ${summary.videoTitle}`);
        console.log(`   - Created At: ${summary.createdAt}`);
      }
    } else {
      const errorText = await frontendResponse.text();
      console.error('❌ Frontend error:', errorText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.json?.message) {
          console.error('   Error message:', errorData.error.json.message);
        }
      } catch (e) {
        // Ignore parse error
      }
    }
  } catch (error) {
    console.error('❌ Frontend request failed:', error.message);
  }

  console.log();
  console.log('🏁 Test complete');
  console.log();
  console.log('💡 To test in browser:');
  console.log('   1. Open http://localhost:3000');
  console.log('   2. Paste this URL:', testUrl);
  console.log('   3. Click "Summarize"');
  console.log('   4. Check browser console for errors');
}

// Run the test
testFullFlow().catch(console.error);