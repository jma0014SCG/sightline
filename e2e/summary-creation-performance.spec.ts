import { test, expect } from '@playwright/test';

test.describe('Summary Creation Performance', () => {
  test('summary creation completes within reasonable time', async ({ page }) => {
    // Set longer timeout for performance test
    test.setTimeout(120000); // 2 minutes
    
    await page.goto('/');

    // Mock realistic API response with timing
    let startTime: number;
    let endTime: number;
    
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      startTime = Date.now();
      
      // Simulate processing delay (3-5 seconds is realistic)
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      endTime = Date.now();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'perf-test-summary',
              title: 'Performance Test Video',
              url: 'https://youtube.com/watch?v=perftest',
              status: 'COMPLETED',
              summary: 'This is a performance test summary that should load quickly.',
              createdAt: new Date().toISOString(),
            }
          }
        })
      });
    });

    // Measure UI interaction time
    const uiStartTime = Date.now();
    
    await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=perftest');
    await page.getByRole('button', { name: /Summarize/i }).click();
    
    // Should show progress quickly
    await expect(page.getByText(/Processing/)).toBeVisible({ timeout: 5000 });
    
    // Wait for completion
    await expect(page.getByText('Performance Test Video')).toBeVisible({ timeout: 30000 });
    
    const uiEndTime = Date.now();
    const totalTime = uiEndTime - uiStartTime;
    
    // Performance assertions
    expect(totalTime).toBeLessThan(30000); // Should complete in under 30 seconds
    console.log(`Summary creation took: ${totalTime}ms`);
  });

  test('progress tracking provides meaningful updates', async ({ page }) => {
    await page.goto('/');

    // Mock progress endpoint
    let progressCallCount = 0;
    await page.route('**/api/progress/**', async (route) => {
      progressCallCount++;
      
      const progressStages = [
        { stage: 'Extracting video info', progress: 20 },
        { stage: 'Fetching transcript', progress: 40 },
        { stage: 'Processing content', progress: 60 },
        { stage: 'Generating summary', progress: 80 },
        { stage: 'Finalizing', progress: 95 }
      ];
      
      const currentStage = Math.min(progressCallCount - 1, progressStages.length - 1);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(progressStages[currentStage])
      });
    });

    // Mock final summary result
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      // Delay to allow progress calls
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'progress-test-summary',
              title: 'Progress Test Video',
              status: 'COMPLETED',
              summary: 'Summary with progress tracking.',
            }
          }
        })
      });
    });

    await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=progresstest');
    await page.getByRole('button', { name: /Summarize/i }).click();

    // Should show various progress stages
    await expect(page.getByText(/Extracting video info/)).toBeVisible();
    await expect(page.getByText(/Fetching transcript/)).toBeVisible();
    await expect(page.getByText(/Processing content/)).toBeVisible();
    
    // Should complete successfully
    await expect(page.getByText('Progress Test Video')).toBeVisible({ timeout: 15000 });
    
    // Should have made multiple progress calls
    expect(progressCallCount).toBeGreaterThan(2);
  });

  test('handles slow network conditions gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async (route) => {
      // Add artificial delay to all requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Should still load within reasonable time despite slow network
    await expect(page.getByText('Speed-learn')).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder(/Enter YouTube URL/)).toBeVisible();
  });

  test('measures critical rendering performance', async ({ page }) => {
    await page.goto('/');

    // Measure page load performance
    const performanceMetrics = await page.evaluate(() => {
      return {
        // Web Vitals
        lcpTime: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0,
        fmpTime: performance.getEntriesByType('paint').find(entry => entry.name === 'first-meaningful-paint')?.startTime || 0,
        
        // Navigation timing
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        pageLoad: performance.timing.loadEventEnd - performance.timing.navigationStart,
        
        // Resource timing
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    console.log('Performance Metrics:', performanceMetrics);

    // Performance assertions
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // Under 3 seconds
    expect(performanceMetrics.pageLoad).toBeLessThan(5000); // Under 5 seconds
    expect(performanceMetrics.resourceCount).toBeLessThan(50); // Reasonable resource count
  });

  test('summary viewer loads efficiently with large content', async ({ page }) => {
    // Mock large summary content
    const largeSummary = 'This is a very long summary. '.repeat(1000); // ~30KB of text
    
    await page.route('**/api/trpc/summary.getSummary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'large-summary',
              title: 'Large Content Test',
              summary: largeSummary,
              status: 'COMPLETED',
              keyMoments: Array(50).fill(null).map((_, i) => ({
                timestamp: `${Math.floor(i/2)}:${(i%2)*30}`,
                description: `Key moment ${i + 1}`
              })),
              flashcards: Array(25).fill(null).map((_, i) => ({
                front: `Question ${i + 1}`,
                back: `Answer ${i + 1}`
              }))
            }
          }
        })
      });
    });

    const startTime = Date.now();
    await page.goto('/library/large-summary');

    // Should load large content efficiently
    await expect(page.getByText('Large Content Test')).toBeVisible({ timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(8000); // Should load in under 8 seconds

    // Check that UI remains responsive
    await page.getByText('Key Moments').click();
    await expect(page.getByText('Key moment 1')).toBeVisible();
    
    // Scroll performance test
    await page.mouse.wheel(0, 1000);
    await page.mouse.wheel(0, -1000);
    
    // Should still be responsive after scrolling
    await expect(page.getByText('Large Content Test')).toBeVisible();
  });

  test('concurrent summary creation handling', async ({ page, context }) => {
    // Open multiple tabs to simulate concurrent usage
    const page2 = await context.newPage();
    
    // Mock API responses for both tabs
    const mockSummaryResponse = (id: string, title: string) => {
      return {
        result: {
          data: {
            id: id,
            title: title,
            status: 'COMPLETED',
            summary: `Summary for ${title}`,
            createdAt: new Date().toISOString(),
          }
        }
      };
    };

    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSummaryResponse('summary-1', 'Video 1'))
      });
    });

    await page2.route('**/api/trpc/summary.createSummary*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSummaryResponse('summary-2', 'Video 2'))
      });
    });

    // Navigate both tabs
    await Promise.all([
      page.goto('/'),
      page2.goto('/')
    ]);

    // Start summary creation simultaneously
    const startTime = Date.now();
    
    await Promise.all([
      (async () => {
        await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=video1');
        await page.getByRole('button', { name: /Summarize/i }).click();
      })(),
      (async () => {
        await page2.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=video2');
        await page2.getByRole('button', { name: /Summarize/i }).click();
      })()
    ]);

    // Both should complete successfully
    await Promise.all([
      expect(page.getByText('Video 1')).toBeVisible({ timeout: 15000 }),
      expect(page2.getByText('Video 2')).toBeVisible({ timeout: 15000 })
    ]);

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(20000); // Should handle concurrent requests efficiently

    await page2.close();
  });
});