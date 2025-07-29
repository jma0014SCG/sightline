// Performance monitoring utilities

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

// Web Vitals tracking
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    // In production, you could send this to analytics
    console.log('Web Vital:', metric)
  }
}

// Memory usage monitoring (for debugging)
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

// Lazy loading helper
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