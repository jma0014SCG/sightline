/**
 * Optimized backend client with timeout management
 */
class BackendClient {
  private baseUrl: string
  private defaultTimeout: number

  constructor() {
    // In production, use the Railway backend URL
    // In development, fall back to localhost
    // IMPORTANT: For client-side code, only NEXT_PUBLIC_ vars are available
    const isServer = typeof window === 'undefined'
    
    if (isServer) {
      // Server-side: Can use both BACKEND_URL and NEXT_PUBLIC_BACKEND_URL
      this.baseUrl = process.env.BACKEND_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_URL || 
                     'http://localhost:8000'
    } else {
      // Client-side: Can only use NEXT_PUBLIC_ variables
      this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    }
    
    // Log the backend URL in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Backend URL:', this.baseUrl, '(isServer:', isServer, ')')
    }
    
    // Warn in production if backend URL is not configured
    if (process.env.NODE_ENV === 'production' && this.baseUrl === 'http://localhost:8000') {
      console.error('⚠️ WARNING: Backend URL not configured in production! Set NEXT_PUBLIC_BACKEND_URL environment variable.')
    }
    
    this.defaultTimeout = 300000 // 300 seconds (5 minutes) - increased for longer videos
  }

  /**
   * Make a request to the backend with connection pooling
   */
  async request<T = any>(
    path: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const timeout = options.timeout || this.defaultTimeout
    
    // Log the actual request being made
    console.log(`🔗 Backend Request: ${options.method || 'GET'} ${url}`)
    
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
      
      clearTimeout(timeoutId)
      
      // Log response status
      console.log(`📡 Backend Response: ${response.status} ${response.statusText}`)
      
      // Get response text first (so we can log it if parsing fails)
      const responseText = await response.text()
      console.log(`📄 Response body length: ${responseText.length} chars`)
      
      if (!response.ok) {
        console.error(`❌ Backend error response: ${responseText.substring(0, 500)}`)
        throw new Error(`Backend API error: ${response.status} - ${responseText || 'Empty response'}`)
      }
      
      // Try to parse JSON
      if (!responseText) {
        console.error('❌ Empty response body from backend')
        throw new Error('Backend returned empty response')
      }
      
      try {
        const data = JSON.parse(responseText)
        console.log('✅ Successfully parsed response')
        return data
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', responseText.substring(0, 500))
        throw new Error(`Invalid JSON response from backend: ${parseError}`)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`⏱️ Request timeout after ${timeout}ms`)
          throw new Error(`Backend API timeout after ${timeout}ms`)
        }
        console.error('❌ Request error:', error.message)
        throw error
      }
      
      console.error('❌ Unknown error:', error)
      throw new Error('Unknown backend API error')
    }
  }

  /**
   * POST request helper
   */
  async post<T = any>(
    path: string,
    body: any,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * GET request helper
   */
  async get<T = any>(
    path: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'GET',
    })
  }
}

// Export singleton instance
export const backendClient = new BackendClient()