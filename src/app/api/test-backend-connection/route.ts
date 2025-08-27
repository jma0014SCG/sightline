import { NextResponse } from 'next/server'
import { backendClient } from '@/lib/api/backend-client'

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    backendUrl: process.env.BACKEND_URL || 'not set',
    nextPublicBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'not set',
    isServer: typeof window === 'undefined',
    tests: {
      healthCheck: { status: 'pending', response: null as any, error: null as any },
      directFetch: { status: 'pending', response: null as any, error: null as any },
      backendClient: { status: 'pending', response: null as any, error: null as any },
    }
  }

  // Test 1: Direct fetch to health endpoint
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sightline-ai-backend-production.up.railway.app'
    const healthUrl = `${backendUrl}/health`
    
    console.log(`Testing direct fetch to: ${healthUrl}`)
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })
    
    const data = await response.json()
    diagnostics.tests.directFetch = {
      status: 'success',
      response: data,
      error: null,
    }
  } catch (error) {
    diagnostics.tests.directFetch = {
      status: 'failed',
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Test 2: Using backend client
  try {
    console.log('Testing backend client...')
    const healthData = await backendClient.get('/health')
    diagnostics.tests.backendClient = {
      status: 'success',
      response: healthData,
      error: null,
    }
  } catch (error) {
    diagnostics.tests.backendClient = {
      status: 'failed',
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Test 3: Test the actual summarize endpoint with a sample
  try {
    console.log('Testing summarize endpoint...')
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    
    // Don't actually process, just test connectivity
    const response = await fetch(`${process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sightline-ai-backend-production.up.railway.app'}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    diagnostics.tests.healthCheck = {
      status: response.ok ? 'success' : 'failed',
      response: response.ok ? await response.json() : null,
      error: response.ok ? null : `Status: ${response.status}`,
    }
  } catch (error) {
    diagnostics.tests.healthCheck = {
      status: 'failed',
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Determine overall status
  const allPassed = Object.values(diagnostics.tests).every(test => test.status === 'success')
  
  return NextResponse.json({
    ...diagnostics,
    overallStatus: allPassed ? 'healthy' : 'unhealthy',
    message: allPassed 
      ? '✅ Backend connection is working correctly' 
      : '❌ Backend connection issues detected'
  }, {
    status: allPassed ? 200 : 503
  })
}