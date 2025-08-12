#!/usr/bin/env node

/**
 * Test script for structured logging and correlation ID propagation
 */

const fetch = require('node-fetch')

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

function generateCorrelationId() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

async function testTRPCWithCorrelation() {
  console.log('\n📝 Testing tRPC with correlation ID...')
  
  const correlationId = generateCorrelationId()
  console.log(`🔗 Correlation ID: ${correlationId}`)
  
  try {
    const response = await fetch(`${API_URL}/api/trpc/auth.getSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({ json: null }),
    })
    
    const responseCorrelationId = response.headers.get('x-correlation-id')
    console.log(`✅ Response correlation ID: ${responseCorrelationId}`)
    
    if (responseCorrelationId) {
      console.log('✨ Correlation ID propagated successfully!')
    } else {
      console.log('⚠️  No correlation ID in response')
    }
    
    const data = await response.json()
    console.log('📊 Response status:', response.status)
    
  } catch (error) {
    console.error('❌ tRPC test failed:', error.message)
  }
}

async function testBackendWithCorrelation() {
  console.log('\n🐍 Testing FastAPI with correlation ID...')
  
  const correlationId = generateCorrelationId()
  console.log(`🔗 Correlation ID: ${correlationId}`)
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      headers: {
        'x-correlation-id': correlationId,
      },
    })
    
    const responseCorrelationId = response.headers.get('x-correlation-id')
    console.log(`✅ Response correlation ID: ${responseCorrelationId}`)
    
    if (responseCorrelationId === correlationId) {
      console.log('✨ Correlation ID preserved in FastAPI!')
    } else {
      console.log('⚠️  Correlation ID mismatch or missing')
    }
    
    const data = await response.json()
    console.log('📊 Health check:', data)
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message)
  }
}

async function testSyntheticSummary() {
  console.log('\n🧪 Testing synthetic summary endpoint...')
  
  const correlationId = generateCorrelationId()
  console.log(`🔗 Correlation ID: ${correlationId}`)
  
  try {
    const response = await fetch(`${API_URL}/api/dev/synthetic-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        simulateDelay: 1000,
      }),
    })
    
    const responseCorrelationId = response.headers.get('x-correlation-id')
    const taskId = response.headers.get('x-task-id')
    
    console.log(`✅ Response correlation ID: ${responseCorrelationId}`)
    console.log(`📋 Task ID: ${taskId}`)
    
    const data = await response.json()
    console.log('📊 Summary ID:', data.id)
    console.log('🎯 Processing stages:', data.processingStages?.length || 0)
    
    if (data.debug) {
      console.log('🔍 Debug info:', data.debug)
    }
    
  } catch (error) {
    console.error('❌ Synthetic summary test failed:', error.message)
  }
}

async function main() {
  console.log('🚀 Starting logging and correlation ID tests...')
  console.log(`📍 API URL: ${API_URL}`)
  console.log(`📍 Backend URL: ${BACKEND_URL}`)
  
  // Run tests sequentially
  await testTRPCWithCorrelation()
  await testBackendWithCorrelation()
  
  if (process.env.NODE_ENV === 'development') {
    await testSyntheticSummary()
  } else {
    console.log('\n⚠️  Skipping synthetic summary test (not in development mode)')
  }
  
  console.log('\n✅ All tests completed!')
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testTRPCWithCorrelation, testBackendWithCorrelation, testSyntheticSummary }