// Debug script to test frontend functionality
// Run this in the browser console on the homepage

console.log('🔍 Debugging Sightline.ai Frontend...');

// Check if user is authenticated
console.log('Authentication status:', window.location.href);

// Test URL validation
function testUrlValidation() {
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'invalid-url',
    ''
  ];
  
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}$/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=[\w-]{11}/
  ];
  
  console.log('🔍 Testing URL validation:');
  testUrls.forEach(url => {
    const isValid = patterns.some(pattern => pattern.test(url));
    console.log(`${isValid ? '✅' : '❌'} ${url} -> ${isValid ? 'Valid' : 'Invalid'}`);
  });
}

// Test if tRPC client is available
function testTRPCClient() {
  console.log('🔍 Testing tRPC client...');
  
  // Check if api object exists in window
  if (typeof window !== 'undefined') {
    console.log('Window object available');
    
    // Look for React DevTools or tRPC debugging info
    const reactFiber = document.querySelector('#__next')?._reactInternalFiber;
    if (reactFiber) {
      console.log('✅ React app is mounted');
    } else {
      console.log('❌ React app not found');
    }
  }
}

// Test authentication state
function testAuthState() {
  console.log('🔍 Testing authentication state...');
  
  // Check for NextAuth session
  fetch('/api/auth/session')
    .then(res => res.json())
    .then(session => {
      console.log('Session data:', session);
      if (session?.user) {
        console.log('✅ User is authenticated:', session.user.email);
      } else {
        console.log('❌ User is not authenticated');
      }
    })
    .catch(err => {
      console.error('❌ Failed to get session:', err);
    });
}

// Test tRPC health check
function testTRPCHealth() {
  console.log('🔍 Testing tRPC endpoint...');
  
  fetch('/api/trpc/auth.getSession')
    .then(res => res.json())
    .then(data => {
      console.log('✅ tRPC endpoint responding:', data);
    })
    .catch(err => {
      console.error('❌ tRPC endpoint failed:', err);
    });
}

// Test backend API directly
function testBackendAPI() {
  console.log('🔍 Testing backend API...');
  
  fetch('http://localhost:8000/api/health')
    .then(res => res.json())
    .then(data => {
      console.log('✅ Backend API responding:', data);
    })
    .catch(err => {
      console.error('❌ Backend API failed (might not be running):', err);
    });
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running all frontend debugging tests...\n');
  
  testUrlValidation();
  console.log('');
  
  testTRPCClient();
  console.log('');
  
  testAuthState();
  console.log('');
  
  testTRPCHealth();
  console.log('');
  
  testBackendAPI();
  
  console.log('\n📝 Instructions:');
  console.log('1. Copy this entire script');
  console.log('2. Open browser dev tools (F12)');
  console.log('3. Go to Console tab');
  console.log('4. Paste and press Enter');
  console.log('5. Check the output for any errors');
}

// Export for manual running
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testUrlValidation, testAuthState, testTRPCHealth, testBackendAPI };
} else {
  // Auto-run if in browser
  runAllTests();
}