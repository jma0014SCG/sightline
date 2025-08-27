import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Call Railway backend directly
    const result = await backendClient.post('/api/summarize', { url });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Direct summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create summary' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Direct summary endpoint is working',
    method: 'Use POST with { url: "youtube-url" }',
    backend: process.env.NEXT_PUBLIC_BACKEND_URL || 'not-configured'
  });
}