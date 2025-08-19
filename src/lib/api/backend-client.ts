/**
 * Optimized backend client with timeout management
 */
class BackendClient {
  private baseUrl: string
  private defaultTimeout: number

  constructor() {
    this.baseUrl = process.env.BACKEND_URL || 'http://localhost:8000'
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
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Backend API error: ${response.status} - ${errorText}`)
      }
      
      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Backend API timeout after ${timeout}ms`)
        }
        throw error
      }
      
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