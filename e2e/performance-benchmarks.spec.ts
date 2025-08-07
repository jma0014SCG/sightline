import { test, expect } from '@playwright/test';
import {
  collectPerformanceMetrics,
  measureApiResponseTime,
  performanceSummaryCreation,
  assertPerformanceThresholds,
  generatePerformanceReport,
  setupPerformanceMonitoring,
  performanceThresholds,
  type PerformanceMetrics
} from './helpers/performance-utils';

test.describe('Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    await setupPerformanceMonitoring(page);
  });

  test('landing page performance benchmark', async ({ page }) => {
    // Navigate to landing page and measure performance
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const metrics = await collectPerformanceMetrics(page);
    console.log(generatePerformanceReport(metrics));
    
    // Assert against thresholds
    assertPerformanceThresholds(metrics, performanceThresholds.landingPage);
    
    // Additional specific checks
    expect(metrics.pageLoad).toBeLessThan(3000);
    expect(metrics.domContentLoaded).toBeLessThan(2000);
    expect(metrics.firstByte).toBeLessThan(500);
    expect(metrics.resourceCount).toBeLessThan(30);
  });

  test('library page performance with large dataset', async ({ page }) => {
    // Mock large dataset
    await page.route('**/api/trpc/library.getUserSummaries*', async (route) => {
      const largeSummaries = Array(100).fill(null).map((_, i) => ({
        id: `summary-${i}`,
        title: `Performance Test Summary ${i}`,
        url: `https://youtube.com/watch?v=test${i}`,
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        tags: [
          { name: 'React', type: 'TECHNOLOGY' },
          { name: 'Performance', type: 'CONCEPT' }
        ],
        categories: [{ name: 'Technology' }]
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              summaries: largeSummaries,
              totalCount: largeSummaries.length,
              tagCounts: [
                { name: 'React', type: 'TECHNOLOGY', count: 100 },
                { name: 'Performance', type: 'CONCEPT', count: 100 }
              ],
              categoryCounts: [
                { name: 'Technology', count: 100 }
              ]
            }
          }
        })
      });
    });

    // Mock authenticated user
    await page.addInitScript(() => {
      window.__clerk_user = {
        id: 'perf-test-user',
        firstName: 'Performance',
        lastName: 'Tester',
      };
    });

    const apiResponseTime = await measureApiResponseTime(
      page,
      'library.getUserSummaries',
      async () => {
        await page.goto('/library', { waitUntil: 'networkidle' });
      }
    );

    const metrics = await collectPerformanceMetrics(page);
    metrics.apiResponseTime = apiResponseTime;

    console.log(generatePerformanceReport(metrics));
    console.log(`Library API Response Time: ${apiResponseTime}ms`);

    // Assert performance thresholds
    assertPerformanceThresholds(metrics, performanceThresholds.libraryPage);
    expect(apiResponseTime).toBeLessThan(performanceThresholds.apiResponse.libraryLoad);

    // Check that all summaries are rendered efficiently
    await expect(page.getByText('Performance Test Summary 0')).toBeVisible();
    await expect(page.getByText('100 summaries')).toBeVisible();
  });

  test('summary creation end-to-end performance', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for full E2E test

    // Mock realistic summary creation flow
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      // Simulate realistic processing time
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'perf-benchmark-summary',
              title: 'Performance Benchmark Video Summary',
              url: 'https://youtube.com/watch?v=perfbench',
              status: 'COMPLETED',
              summary: 'This is a performance benchmark summary with comprehensive content.',
              keyMoments: Array(20).fill(null).map((_, i) => ({
                timestamp: `${Math.floor(i/2)}:${(i%2)*30}`,
                description: `Key moment ${i + 1}`
              })),
              createdAt: new Date().toISOString(),
            }
          }
        })
      });
    });

    await page.goto('/');

    const performanceData = await performanceSummaryCreation(
      page,
      'https://youtube.com/watch?v=perfbench',
      'Performance Benchmark Video Summary'
    );

    console.log('Summary Creation Performance:');
    console.log(`Total Time: ${performanceData.totalTime}ms`);
    console.log(`API Response Time: ${performanceData.apiResponseTime}ms`);
    console.log(`Render Time: ${performanceData.renderTime}ms`);

    // Performance assertions
    expect(performanceData.totalTime).toBeLessThan(performanceThresholds.apiResponse.summaryCreation);
    expect(performanceData.apiResponseTime).toBeLessThan(25000); // 25 seconds for API
    expect(performanceData.renderTime).toBeLessThan(2000); // 2 seconds for rendering

    // Verify the summary loaded correctly
    await expect(page.getByText('Performance Benchmark Video Summary')).toBeVisible();
    await expect(page.getByText('Key moment 1')).toBeVisible();
  });

  test('summary viewer performance with rich content', async ({ page }) => {
    // Mock summary with extensive content
    const richContent = {
      id: 'rich-content-summary',
      title: 'Rich Content Performance Test',
      summary: 'Very long summary content. '.repeat(500), // ~12KB
      keyMoments: Array(50).fill(null).map((_, i) => ({
        timestamp: `${Math.floor(i/2)}:${(i%2)*30}`,
        description: `Detailed key moment ${i + 1} with comprehensive description`
      })),
      flashcards: Array(30).fill(null).map((_, i) => ({
        front: `Question ${i + 1}: What is the key concept discussed?`,
        back: `Answer ${i + 1}: Comprehensive explanation of the concept with detailed information`
      })),
      frameworks: Array(10).fill(null).map((_, i) => ({
        name: `Framework ${i + 1}`,
        description: `Detailed framework description ${i + 1}`
      })),
      glossary: Array(25).fill(null).map((_, i) => ({
        term: `Term ${i + 1}`,
        definition: `Comprehensive definition for term ${i + 1}`
      })),
      status: 'COMPLETED'
    };

    await page.route('**/api/trpc/summary.getSummary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: { data: richContent }
        })
      });
    });

    const startTime = Date.now();
    await page.goto('/library/rich-content-summary', { waitUntil: 'networkidle' });
    
    // Wait for main content to load
    await expect(page.getByText('Rich Content Performance Test')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    console.log(`Rich content load time: ${loadTime}ms`);

    const metrics = await collectPerformanceMetrics(page);
    console.log(generatePerformanceReport(metrics));

    // Performance assertions
    expect(loadTime).toBeLessThan(8000); // Should load in under 8 seconds
    assertPerformanceThresholds(metrics, performanceThresholds.summaryViewer);

    // Test scrolling performance
    const scrollStart = Date.now();
    await page.mouse.wheel(0, 2000);
    await page.mouse.wheel(0, -2000);
    const scrollTime = Date.now() - scrollStart;
    
    expect(scrollTime).toBeLessThan(500); // Smooth scrolling

    // Test tab switching performance
    const tabStart = Date.now();
    await page.getByText('Flashcards').click();
    await expect(page.getByText('Question 1')).toBeVisible();
    const tabTime = Date.now() - tabStart;
    
    expect(tabTime).toBeLessThan(1000); // Fast tab switching
  });

  test('concurrent user simulation', async ({ page, context }) => {
    test.setTimeout(180000); // 3 minutes

    // Create multiple tabs to simulate concurrent users
    const pages = [page];
    for (let i = 0; i < 4; i++) {
      pages.push(await context.newPage());
    }

    // Mock API responses for all tabs
    const mockSummaryForTab = (tabIndex: number) => ({
      id: `concurrent-summary-${tabIndex}`,
      title: `Concurrent Test Video ${tabIndex}`,
      status: 'COMPLETED',
      summary: `Summary for concurrent test ${tabIndex}`,
    });

    for (let i = 0; i < pages.length; i++) {
      await pages[i].route('**/api/trpc/summary.createSummary*', async (route) => {
        // Add realistic delay
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: { data: mockSummaryForTab(i) }
          })
        });
      });
    }

    // Start concurrent summary creation
    const startTime = Date.now();
    const promises = pages.map(async (p, index) => {
      await p.goto('/');
      await p.getByPlaceholder(/Enter YouTube URL/).fill(`https://youtube.com/watch?v=concurrent${index}`);
      await p.getByRole('button', { name: /Summarize/i }).click();
      return p.waitForSelector(`text=Concurrent Test Video ${index}`, { timeout: 30000 });
    });

    await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    console.log(`Concurrent test completed in: ${totalTime}ms`);
    
    // Should handle concurrent load efficiently
    expect(totalTime).toBeLessThan(45000); // All should complete within 45 seconds

    // Cleanup
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('mobile performance benchmark', async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ media: 'screen' });

    // Throttle network to simulate mobile conditions
    await page.route('**/*', async (route) => {
      // Add slight delay for mobile network simulation
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    const metrics = await collectPerformanceMetrics(page);
    console.log('Mobile Performance Report:');
    console.log(generatePerformanceReport(metrics));

    // Mobile-specific performance thresholds (more lenient)
    expect(metrics.pageLoad).toBeLessThan(5000);
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.firstByte).toBeLessThan(1000);

    // Test mobile interaction performance
    const tapStart = Date.now();
    await page.tap('input[placeholder*="Enter YouTube URL"]');
    const tapTime = Date.now() - tapStart;
    
    expect(tapTime).toBeLessThan(300); // Responsive touch interaction
  });

  test('memory usage benchmark', async ({ page }) => {
    await page.goto('/');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSMemory: (performance as any).memory.usedJSHeapSize,
        totalJSMemory: (performance as any).memory.totalJSHeapSize,
        jsMemoryLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory) {
      console.log('Initial Memory Usage:');
      console.log(`Used JS Memory: ${(initialMemory.usedJSMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Total JS Memory: ${(initialMemory.totalJSMemory / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory should be reasonable for a single page
      expect(initialMemory.usedJSMemory).toBeLessThan(50 * 1024 * 1024); // Under 50MB
    }

    // Navigate around the app and check for memory leaks
    const urls = ['/library', '/', '/billing', '/settings'];
    
    for (const url of urls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }

    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSMemory: (performance as any).memory.usedJSHeapSize,
        totalJSMemory: (performance as any).memory.totalJSHeapSize,
      } : null;
    });

    if (finalMemory && initialMemory) {
      const memoryIncrease = finalMemory.usedJSMemory - initialMemory.usedJSMemory;
      console.log(`Memory increase after navigation: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory increase should be reasonable (under 20MB for navigation)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    }
  });
});