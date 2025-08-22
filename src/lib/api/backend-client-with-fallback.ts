/**
 * Backend client with fallback for when Railway is down
 */

// Import the original backend client
import { backendClient as originalBackendClient } from './backend-client'

class BackendClientWithFallback {
  private baseClient = originalBackendClient
  
  async post<T = any>(
    path: string,
    body: any,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    try {
      // Try the real backend first
      const result = await this.baseClient.post<T>(path, body, options)
      console.log('✅ Backend call succeeded')
      return result
    } catch (error) {
      console.error('❌ Backend call failed:', error)
      
      // If it's the summarize endpoint and backend is down, return mock data
      if (path === '/api/summarize') {
        console.warn('⚠️ Using fallback mock data for summarization')
        
        // Extract video ID from URL
        const videoIdMatch = body.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        const videoId = videoIdMatch?.[1] || 'unknown'
        
        // Return mock response that matches expected structure
        const mockResponse = {
          task_id: `fallback_${Date.now()}`,
          video_id: videoId,
          video_url: body.url,
          video_title: 'Service Temporarily Unavailable',
          channel_name: 'System Message',
          channel_id: 'system',
          duration: 0,
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          summary: `
# Service Temporarily Unavailable

We're experiencing technical difficulties with our summarization service. 

## What's happening:
- The backend service is currently unreachable
- This is likely a temporary issue with our hosting provider
- Your request has been logged

## What you can do:
1. Try again in a few minutes
2. Check our status page for updates
3. Contact support if the issue persists

## Debug Information:
- Request URL: ${body.url}
- Timestamp: ${new Date().toISOString()}
- Error: Backend service unavailable

We apologize for the inconvenience.
          `.trim(),
          key_points: [
            'Backend service is temporarily unavailable',
            'Please try again in a few minutes',
            'This is a known issue we are working to resolve'
          ],
          metadata: {
            error: true,
            fallback: true,
            timestamp: new Date().toISOString()
          },
          // Include empty arrays for expected fields
          speakers: [],
          synopsis: null,
          key_moments: [],
          frameworks: [],
          debunked_assumptions: [],
          in_practice: [],
          playbooks: [],
          learning_pack: {
            flashcards: [],
            quiz: [],
            glossary: []
          },
          thinking_style: null,
          enrichment: null,
          processing_source: 'fallback',
          processing_version: 'v1.0',
          language: 'en'
        }
        
        return mockResponse as T
      }
      
      // For other endpoints, throw the original error
      throw error
    }
  }
  
  async get<T = any>(
    path: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    return this.baseClient.get<T>(path, options)
  }
  
  async request<T = any>(
    path: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    return this.baseClient.request<T>(path, options)
  }
}

// Export singleton instance with fallback
export const backendClientWithFallback = new BackendClientWithFallback()