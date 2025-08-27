import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: '/api/test',
    timestamp: new Date().toISOString(),
    message: 'Test API route working',
    environment: process.env.NODE_ENV || 'unknown'
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return NextResponse.json({
      status: 'ok',
      method: 'POST',
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Invalid JSON body' 
      },
      { status: 400 }
    )
  }
}