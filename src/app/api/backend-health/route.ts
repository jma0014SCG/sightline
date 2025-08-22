import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    backend: {
      BACKEND_URL: process.env.BACKEND_URL ? '✅ SET' : '❌ NOT SET',
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ? '✅ SET' : '❌ NOT SET',
    },
    database: {
      DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
    },
    apis: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET',
      YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ? '✅ SET' : '❌ NOT SET',
      GUMLOOP_API_KEY: process.env.GUMLOOP_API_KEY ? '✅ SET' : '❌ NOT SET',
    },
    tests: {}
  }
  
  // Test backend connectivity
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL
  if (backendUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch(`${backendUrl}/api/health`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        results.tests.backend = {
          status: '✅ CONNECTED',
          response: data
        }
      } else {
        results.tests.backend = {
          status: '❌ ERROR',
          statusCode: response.status,
          statusText: response.statusText
        }
      }
    } catch (error) {
      results.tests.backend = {
        status: '❌ FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  } else {
    results.tests.backend = {
      status: '❌ NO URL',
      message: 'Backend URL not configured'
    }
  }
  
  // Test database connectivity
  try {
    const { prisma } = await import('@/lib/db/prisma')
    await prisma.$queryRaw`SELECT 1`
    results.tests.database = {
      status: '✅ CONNECTED'
    }
  } catch (error) {
    results.tests.database = {
      status: '❌ FAILED',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Determine overall health
  const isHealthy = 
    results.tests.backend?.status?.includes('✅') &&
    results.tests.database?.status?.includes('✅')
  
  return NextResponse.json({
    healthy: isHealthy,
    ...results
  }, {
    status: isHealthy ? 200 : 503
  })
}