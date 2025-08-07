import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay  
  cls?: number; // Cumulative Layout Shift
  
  // Navigation Timing
  domContentLoaded: number;
  pageLoad: number;
  firstByte: number;
  
  // Resource Metrics
  resourceCount: number;
  totalResourceSize: number;
  jsSize: number;
  cssSize: number;
  imageSize: number;
  
  // Custom Metrics
  summaryProcessingTime?: number;
  apiResponseTime?: number;
}

/**
 * Collect comprehensive performance metrics from a page
 */
export async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  return await page.evaluate(() => {
    const timing = performance.timing;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Calculate resource sizes by type
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;
    let totalSize = 0;
    
    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      totalSize += size;
      
      if (resource.name.includes('.js') || resource.initiatorType === 'script') {
        jsSize += size;
      } else if (resource.name.includes('.css') || resource.initiatorType === 'css') {
        cssSize += size;
      } else if (resource.initiatorType === 'img') {
        imageSize += size;
      }
    });
    
    // Core Web Vitals (if available)
    const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0] as any;
    const clsEntries = performance.getEntriesByType('layout-shift') as any[];
    
    const cls = clsEntries
      .filter(entry => !entry.hadRecentInput)
      .reduce((sum, entry) => sum + entry.value, 0);
    
    return {
      // Core Web Vitals
      lcp: lcpEntry?.startTime,
      cls: cls,
      
      // Navigation Timing
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      pageLoad: timing.loadEventEnd - timing.navigationStart,
      firstByte: timing.responseStart - timing.navigationStart,
      
      // Resource Metrics
      resourceCount: resources.length,
      totalResourceSize: totalSize,
      jsSize: jsSize,
      cssSize: cssSize,
      imageSize: imageSize,
    };
  });
}

/**
 * Measure API response time
 */
export async function measureApiResponseTime(
  page: Page,
  urlPattern: string,
  action: () => Promise<void>
): Promise<number> {
  const startTime = Date.now();
  let endTime: number;
  
  // Listen for the API response
  page.on('response', (response) => {
    if (response.url().includes(urlPattern)) {
      endTime = Date.now();
    }
  });
  
  await action();
  
  // Wait for response to be captured
  await page.waitForFunction(() => typeof endTime !== 'undefined', { timeout: 30000 });
  
  return endTime! - startTime;
}

/**
 * Performance test helper for summary creation
 */
export async function performanceSummaryCreation(
  page: Page,
  videoUrl: string,
  expectedTitle: string
): Promise<{
  totalTime: number;
  apiResponseTime: number;
  renderTime: number;
}> {
  const startTime = Date.now();
  let apiResponseReceived: number;
  let renderComplete: number;
  
  // Monitor API response
  page.on('response', (response) => {
    if (response.url().includes('summary.createSummary')) {
      apiResponseReceived = Date.now();
    }
  });
  
  // Start summary creation
  await page.getByPlaceholder(/Enter YouTube URL/).fill(videoUrl);
  await page.getByRole('button', { name: /Summarize/i }).click();
  
  // Wait for completion
  await page.waitForSelector(`text=${expectedTitle}`, { timeout: 60000 });
  renderComplete = Date.now();
  
  return {
    totalTime: renderComplete - startTime,
    apiResponseTime: apiResponseReceived! - startTime,
    renderTime: renderComplete - apiResponseReceived!,
  };
}

/**
 * Assert performance thresholds
 */
export interface PerformanceThresholds {
  maxLoadTime?: number; // milliseconds
  maxLCP?: number; // milliseconds  
  maxCLS?: number; // score
  maxResourceCount?: number;
  maxResourceSize?: number; // bytes
}

export function assertPerformanceThresholds(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds
) {
  const failures: string[] = [];
  
  if (thresholds.maxLoadTime && metrics.pageLoad > thresholds.maxLoadTime) {
    failures.push(`Page load time ${metrics.pageLoad}ms exceeds threshold ${thresholds.maxLoadTime}ms`);
  }
  
  if (thresholds.maxLCP && metrics.lcp && metrics.lcp > thresholds.maxLCP) {
    failures.push(`LCP ${metrics.lcp}ms exceeds threshold ${thresholds.maxLCP}ms`);
  }
  
  if (thresholds.maxCLS && metrics.cls && metrics.cls > thresholds.maxCLS) {
    failures.push(`CLS ${metrics.cls} exceeds threshold ${thresholds.maxCLS}`);
  }
  
  if (thresholds.maxResourceCount && metrics.resourceCount > thresholds.maxResourceCount) {
    failures.push(`Resource count ${metrics.resourceCount} exceeds threshold ${thresholds.maxResourceCount}`);
  }
  
  if (thresholds.maxResourceSize && metrics.totalResourceSize > thresholds.maxResourceSize) {
    failures.push(`Total resource size ${metrics.totalResourceSize} bytes exceeds threshold ${thresholds.maxResourceSize} bytes`);
  }
  
  if (failures.length > 0) {
    throw new Error(`Performance thresholds exceeded:\n${failures.join('\n')}`);
  }
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(metrics: PerformanceMetrics): string {
  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb/1024).toFixed(1)}MB` : `${kb.toFixed(1)}KB`;
  };
  
  return `
Performance Report:
==================
Core Web Vitals:
  LCP: ${metrics.lcp ? `${metrics.lcp}ms` : 'N/A'}
  CLS: ${metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}

Navigation Timing:
  First Byte: ${metrics.firstByte}ms
  DOM Content Loaded: ${metrics.domContentLoaded}ms
  Page Load Complete: ${metrics.pageLoad}ms

Resource Analysis:
  Total Resources: ${metrics.resourceCount}
  Total Size: ${formatSize(metrics.totalResourceSize)}
  JavaScript: ${formatSize(metrics.jsSize)}
  CSS: ${formatSize(metrics.cssSize)}
  Images: ${formatSize(metrics.imageSize)}

Custom Metrics:
  Summary Processing: ${metrics.summaryProcessingTime ? `${metrics.summaryProcessingTime}ms` : 'N/A'}
  API Response Time: ${metrics.apiResponseTime ? `${metrics.apiResponseTime}ms` : 'N/A'}
  `;
}

/**
 * Setup performance monitoring for a page
 */
export async function setupPerformanceMonitoring(page: Page) {
  // Inject Web Vitals monitoring
  await page.addInitScript(() => {
    // Store performance entries
    (window as any).__performanceEntries = [];
    
    // Monitor CLS
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__performanceEntries.push({
          name: entry.name,
          entryType: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
          value: (entry as any).value,
          hadRecentInput: (entry as any).hadRecentInput,
        });
      }
    });
    
    observer.observe({ entryTypes: ['layout-shift', 'largest-contentful-paint', 'first-input'] });
  });
}

/**
 * Create performance test suite configuration
 */
export const performanceThresholds = {
  // Landing page thresholds
  landingPage: {
    maxLoadTime: 3000,
    maxLCP: 2500,
    maxCLS: 0.1,
    maxResourceCount: 30,
    maxResourceSize: 2 * 1024 * 1024, // 2MB
  },
  
  // Library page thresholds
  libraryPage: {
    maxLoadTime: 4000,
    maxLCP: 3000,
    maxCLS: 0.15,
    maxResourceCount: 40,
    maxResourceSize: 3 * 1024 * 1024, // 3MB
  },
  
  // Summary viewer thresholds
  summaryViewer: {
    maxLoadTime: 5000,
    maxLCP: 3500,
    maxCLS: 0.2,
    maxResourceCount: 50,
    maxResourceSize: 4 * 1024 * 1024, // 4MB
  },
  
  // API response thresholds
  apiResponse: {
    summaryCreation: 30000, // 30 seconds
    libraryLoad: 2000,      // 2 seconds
    userAuth: 1000,         // 1 second
  },
} as const;