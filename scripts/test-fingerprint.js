// Test browser fingerprinting functionality
const crypto = require('crypto')

// Simulate the browser fingerprinting logic from our implementation
function generateTestFingerprint() {
  const components = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', // user agent
    '1920x1080', // screen resolution
    '1920x1055', // available resolution  
    '24', // color depth
    'America/New_York', // timezone
    '-240', // timezone offset
    'en-US', // language
    'en-US,en', // languages
    'MacIntel', // platform
    '8', // hardware concurrency
    'canvas-test-data' // canvas fingerprint
  ]
  
  const fingerprint = components.join('|||')
  
  // Simple hash function (same as in our code)
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

console.log('🔍 Testing Browser Fingerprinting...')
const fingerprint1 = generateTestFingerprint()
const fingerprint2 = generateTestFingerprint()

console.log('Fingerprint 1:', fingerprint1)
console.log('Fingerprint 2:', fingerprint2)
console.log('Consistent:', fingerprint1 === fingerprint2 ? '✅' : '❌')

// Test localStorage simulation
const testStorage = {}
function markFreeSummaryUsed() {
  testStorage.hasUsedFreeSummary = 'true'
  testStorage.freeSummaryUsedAt = new Date().toISOString()
}

function hasUsedFreeSummary() {
  return testStorage.hasUsedFreeSummary === 'true'
}

console.log('\n📱 Testing localStorage simulation...')
console.log('Initial state:', hasUsedFreeSummary() ? '❌ Already used' : '✅ Available')
markFreeSummaryUsed()
console.log('After use:', hasUsedFreeSummary() ? '✅ Marked as used' : '❌ Not marked')
console.log('Storage:', testStorage)