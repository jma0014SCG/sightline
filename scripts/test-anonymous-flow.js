require('dotenv').config({ path: '.env.local' })

async function testAnonymousFlow() {
  console.log('🧪 Testing Anonymous Summary Flow...\n')
  
  // Test the tRPC createAnonymous endpoint
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // Rick Roll for testing
  const testFingerprint = 'test_fingerprint_' + Date.now()
  
  try {
    console.log('📝 Testing anonymous summary creation...')
    console.log('URL:', testUrl)
    console.log('Fingerprint:', testFingerprint)
    
    // Make request to the tRPC endpoint
    const response = await fetch('http://localhost:3000/api/trpc/summary.createAnonymous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          url: testUrl,
          browserFingerprint: testFingerprint
        }
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Anonymous summary created successfully!')
      console.log('Summary ID:', data.result?.data?.json?.id || 'N/A')
      console.log('Video Title:', data.result?.data?.json?.videoTitle || 'N/A')
      console.log('Is Anonymous:', data.result?.data?.json?.isAnonymous || false)
      
      // Test the 1-summary limit
      console.log('\n🚫 Testing 1-summary limit...')
      const response2 = await fetch('http://localhost:3000/api/trpc/summary.createAnonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            url: testUrl,
            browserFingerprint: testFingerprint
          }
        })
      })
      
      const data2 = await response2.json()
      
      if (!response2.ok && data2.error?.json?.message?.includes('already used')) {
        console.log('✅ 1-summary limit working correctly!')
        console.log('Error message:', data2.error.json.message)
      } else {
        console.log('❌ 1-summary limit not working properly')
        console.log('Response:', data2)
      }
      
    } else {
      console.log('❌ Anonymous summary creation failed')
      console.log('Error:', data.error?.json?.message || data)
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message)
  }
}

testAnonymousFlow()