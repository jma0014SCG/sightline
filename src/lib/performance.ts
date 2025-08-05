// Performance monitoring utilities

/**
 * Measure the execution time of a synchronous function
 * 
 * Wraps a function execution with performance timing, logging the duration to console.
 * Only measures performance when running in a browser environment with performance API available.
 * Useful for identifying performance bottlenecks in synchronous operations.
 * 
 * @template T - The return type of the function being measured
 * @param {string} name - A descriptive name for the operation being measured
 * @param {() => T} fn - The function to execute and measure
 * @returns {T} The result of the function execution
 * @example
 * ```typescript
 * const result = measurePerformance('data-processing', () => {
 *   return expensiveDataProcessing(data)
 * })
 * // Console: "Performance [data-processing]: 45.23ms"
 * ```
 * 
 * @category Performance
 * @since 1.0.0
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`)
    return result
  }
  return fn()
}

/**
 * Measure the execution time of an asynchronous function
 * 
 * Wraps an async function execution with performance timing, logging the duration to console.
 * Only measures performance when running in a browser environment with performance API available.
 * Useful for identifying performance bottlenecks in asynchronous operations like API calls.
 * 
 * @template T - The return type of the async function being measured
 * @param {string} name - A descriptive name for the operation being measured
 * @param {() => Promise<T>} fn - The async function to execute and measure
 * @returns {Promise<T>} A promise that resolves to the result of the function execution
 * @example
 * ```typescript
 * const data = await measureAsyncPerformance('api-call', async () => {
 *   return fetch('/api/data').then(res => res.json())
 * })
 * // Console: "Performance [api-call]: 234.56ms"
 * ```
 * 
 * @category Performance
 * @since 1.0.0
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`)
    return result
  }
  return await fn()
}

/**
 * Report Web Vitals metrics for performance monitoring
 * 
 * Processes and logs Web Vitals metrics (LCP, FID, CLS, FCP, TTFB) for performance tracking.
 * In production, these metrics can be sent to analytics services for monitoring.
 * Essential for tracking real user performance and Core Web Vitals compliance.
 * 
 * @param {any} metric - Web Vitals metric object containing name, value, and other properties
 * @returns {void}
 * @example
 * ```typescript
 * // Used with Next.js reportWebVitals in _app.tsx
 * export function reportWebVitals(metric) {
 *   reportWebVitals(metric)
 * }
 * 
 * // Metric object structure:
 * // { name: 'LCP', value: 1234.5, id: 'v3-123', ... }
 * ```
 * 
 * @category Performance
 * @since 1.0.0
 */
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    // In production, you could send this to analytics
    console.log('Web Vital:', metric)
  }
}

/**
 * Log current memory usage for debugging purposes
 * 
 * Displays JavaScript heap memory usage including used, total, and limit values.
 * Only works in browsers that support the performance.memory API (Chrome-based browsers).
 * Useful for identifying memory leaks and optimizing memory consumption.
 * 
 * @param {string} label - A descriptive label for the memory measurement
 * @returns {void}
 * @example
 * ```typescript
 * logMemoryUsage('after-data-load')
 * // Console: "Memory [after-data-load]: { used: '45 MB', total: '67 MB', limit: '4096 MB' }"
 * 
 * // Use at key points to track memory usage
 * logMemoryUsage('app-startup')
 * // ... perform operations
 * logMemoryUsage('after-heavy-operation')
 * ```
 * 
 * @category Performance
 * @since 1.0.0
 */
export function logMemoryUsage(label: string) {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
    const memory = (performance as any).memory
    console.log(`Memory [${label}]:`, {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`,
    })
  }
}

/**
 * Create an Intersection Observer for lazy loading and viewport detection
 * 
 * Creates an IntersectionObserver instance with sensible defaults for lazy loading scenarios.
 * Returns null if running on server-side or if IntersectionObserver API is not available.
 * Uses default settings optimized for lazy loading with 50px root margin and 0.1 threshold.
 * 
 * @param {IntersectionObserverCallback} callback - Function called when intersection changes occur
 * @param {IntersectionObserverInit} [options] - Additional options to override defaults
 * @returns {IntersectionObserver | null} The created observer instance, or null if unavailable
 * @example
 * ```typescript
 * const observer = createIntersectionObserver((entries) => {
 *   entries.forEach(entry => {
 *     if (entry.isIntersecting) {
 *       // Load image or component
 *       loadLazyContent(entry.target)
 *       observer?.unobserve(entry.target)
 *     }
 *   })
 * })
 * 
 * // Observe elements for lazy loading
 * if (observer) {
 *   document.querySelectorAll('[data-lazy]').forEach(el => {
 *     observer.observe(el)
 *   })
 * }
 * ```
 * 
 * @category Performance
 * @since 1.0.0
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null
  }
  
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  })
}