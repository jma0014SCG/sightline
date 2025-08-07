#!/usr/bin/env node
/**
 * Test PostHog and MailerLite integration
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

console.log('🧪 Testing Analytics and Email Integration...\n')

// Test environment variables
console.log('📋 Environment Variables Check:')
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
const mailerLiteKey = process.env.MAILERLITE_API_KEY

console.log(`✅ PostHog Key: ${posthogKey ? posthogKey.substring(0, 10) + '...' : '❌ Not set'}`)
console.log(`✅ PostHog Host: ${posthogHost || '❌ Not set'}`)
console.log(`✅ MailerLite Key: ${mailerLiteKey ? mailerLiteKey.substring(0, 20) + '...' : '❌ Not set'}`)

// Test PostHog connectivity
if (posthogKey && posthogHost) {
  console.log('\n🎯 Testing PostHog Connection...')
  
  const fetch = require('node-fetch').default || require('node-fetch')
  
  // Simple test event
  const testEvent = {
    api_key: posthogKey,
    event: 'test_connection',
    properties: {
      test: true,
      timestamp: new Date().toISOString()
    },
    distinct_id: 'test_user_' + Date.now()
  }

  fetch(`${posthogHost}/capture/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PostHog Node.js (Sightline Test)'
    },
    body: JSON.stringify(testEvent)
  })
  .then(response => {
    if (response.ok) {
      console.log('✅ PostHog connection successful!')
    } else {
      console.log(`❌ PostHog connection failed: ${response.status}`)
    }
  })
  .catch(error => {
    console.log(`❌ PostHog connection error: ${error.message}`)
  })
}

// Test MailerLite API
if (mailerLiteKey) {
  console.log('\n📧 Testing MailerLite Connection...')
  
  const fetch = require('node-fetch').default || require('node-fetch')
  
  fetch('https://connect.mailerlite.com/api/subscribers', {
    headers: {
      'Authorization': `Bearer ${mailerLiteKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
  .then(response => {
    if (response.ok) {
      console.log('✅ MailerLite connection successful!')
      return response.json().then(data => {
        console.log(`📊 Connected to MailerLite API successfully`)
        if (data.data) {
          console.log(`📧 Found ${data.data.length} subscribers`)
        }
      }).catch(err => {
        console.log('✅ MailerLite API accessible (connection verified)')
      })
    } else {
      console.log(`❌ MailerLite connection failed: ${response.status}`)
    }
  })
  .catch(error => {
    console.log(`❌ MailerLite connection error: ${error.message}`)
  })
}

console.log('\n🎉 Integration test complete!')
console.log('\nNext steps:')
console.log('1. Start development server: pnpm dev')
console.log('2. Test creating a summary to trigger analytics events')
console.log('3. Check PostHog dashboard for events')
console.log('4. Check MailerLite for any subscriber updates')