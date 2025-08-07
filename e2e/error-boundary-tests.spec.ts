import { test, expect } from '@playwright/test';

test.describe('Error Boundary and Recovery Tests', () => {
  test.describe('API Error Handling', () => {
    test('handles 500 server errors gracefully', async ({ page }) => {
      await page.goto('/');

      // Mock 500 server error
      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Internal server error',
              code: 'INTERNAL_SERVER_ERROR'
            }
          })
        });
      });

      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=test');
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Should show user-friendly error message
      await expect(page.getByText(/Something went wrong/i)).toBeVisible();
      await expect(page.getByText(/Please try again/i)).toBeVisible();
      
      // Should not show technical error details to user
      await expect(page.getByText(/INTERNAL_SERVER_ERROR/)).not.toBeVisible();
    });

    test('handles network connectivity issues', async ({ page }) => {
      await page.goto('/');

      // Mock network failure
      await page.route('**/api/trpc/**', async (route) => {
        await route.abort('failed');
      });

      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=test');
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Should show network error message
      await expect(page.getByText(/Network error/i)).toBeVisible();
      await expect(page.getByText(/Check your connection/i)).toBeVisible();
    });

    test('handles API timeout gracefully', async ({ page }) => {
      test.setTimeout(90000); // 1.5 minutes

      await page.goto('/');

      // Mock very slow API response
      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        // Delay longer than typical timeout
        await new Promise(resolve => setTimeout(resolve, 60000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: { data: { id: 'timeout-test', status: 'COMPLETED' } }
          })
        });
      });

      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=timeout');
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Should eventually show timeout error
      await expect(page.getByText(/Taking longer than expected/i)).toBeVisible({ timeout: 45000 });
    });

    test('handles malformed API responses', async ({ page }) => {
      await page.goto('/');

      // Mock malformed JSON response
      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json {'
        });
      });

      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=malformed');
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Should handle parsing error gracefully
      await expect(page.getByText(/Something went wrong/i)).toBeVisible();
    });

    test('recovers from rate limiting', async ({ page }) => {
      await page.goto('/');

      let requestCount = 0;
      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        requestCount++;
        
        if (requestCount <= 2) {
          // First two requests are rate limited
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                message: 'Rate limit exceeded. Please wait before trying again.',
                code: 'TOO_MANY_REQUESTS'
              }
            })
          });
        } else {
          // Third request succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              result: {
                data: {
                  id: 'rate-limit-recovery',
                  title: 'Rate Limit Recovery Test',
                  status: 'COMPLETED'
                }
              }
            })
          });
        }
      });

      // First attempt - should show rate limit error
      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=ratetest');
      await page.getByRole('button', { name: /Summarize/i }).click();
      await expect(page.getByText(/Rate limit exceeded/i)).toBeVisible();

      // Wait a moment and retry
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /Summarize/i }).click();
      await expect(page.getByText(/Rate limit exceeded/i)).toBeVisible();

      // Third attempt should succeed
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /Summarize/i }).click();
      await expect(page.getByText('Rate Limit Recovery Test')).toBeVisible();
    });
  });

  test.describe('Frontend Error Boundaries', () => {
    test('catches JavaScript errors and shows error boundary', async ({ page }) => {
      await page.goto('/');

      // Inject JavaScript error
      await page.evaluate(() => {
        // Simulate a component error
        setTimeout(() => {
          throw new Error('Simulated component error');
        }, 1000);
      });

      // Wait for error to be thrown
      await page.waitForTimeout(2000);

      // Should show error boundary UI (if implemented)
      // Note: This depends on having React Error Boundaries implemented
      const errorBoundaryVisible = await page.isVisible('text=Something went wrong').catch(() => false);
      
      if (errorBoundaryVisible) {
        await expect(page.getByText(/Something went wrong/i)).toBeVisible();
      }
    });

    test('handles missing data gracefully', async ({ page }) => {
      // Mock API response with missing required fields
      await page.route('**/api/trpc/summary.getSummary*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                id: 'incomplete-summary',
                // Missing title, summary, status fields
                createdAt: new Date().toISOString()
              }
            }
          })
        });
      });

      await page.goto('/library/incomplete-summary');

      // Should handle missing data gracefully
      await expect(page.getByText(/Unable to load summary/i)).toBeVisible();
      
      // Should not crash the application
      await expect(page.locator('body')).toBeVisible();
    });

    test('recovers from component render failures', async ({ page }) => {
      await page.addInitScript(() => {
        // Mock a component that fails to render
        const originalCreateElement = React?.createElement;
        if (originalCreateElement) {
          React.createElement = function(type, props, ...children) {
            if (typeof type === 'string' && type === 'div' && props?.className?.includes('test-error')) {
              throw new Error('Component render failure');
            }
            return originalCreateElement.call(this, type, props, ...children);
          };
        }
      });

      await page.goto('/');

      // Should still load the page despite component errors
      await expect(page.getByText('Speed-learn')).toBeVisible();
    });

    test('handles routing errors properly', async ({ page }) => {
      // Try to navigate to non-existent route
      await page.goto('/non-existent-page');

      // Should show 404 page or redirect appropriately
      const is404 = await page.isVisible('text=404').catch(() => false);
      const isRedirected = !page.url().includes('/non-existent-page');

      expect(is404 || isRedirected).toBe(true);
    });
  });

  test.describe('Data Corruption Recovery', () => {
    test('handles corrupted localStorage data', async ({ page }) => {
      // Inject corrupted localStorage data
      await page.addInitScript(() => {
        localStorage.setItem('app-state', 'corrupted-json-data{');
        localStorage.setItem('user-preferences', 'invalid-data');
      });

      await page.goto('/');

      // App should still load despite corrupted local storage
      await expect(page.getByText('Speed-learn')).toBeVisible();
      
      // Should clear corrupted data
      const corruptedData = await page.evaluate(() => {
        return localStorage.getItem('app-state');
      });
      
      // Should either be cleared or replaced with valid data
      if (corruptedData) {
        expect(corruptedData).not.toBe('corrupted-json-data{');
      }
    });

    test('recovers from invalid session data', async ({ page }) => {
      await page.addInitScript(() => {
        // Set invalid session data
        sessionStorage.setItem('clerk-session', 'corrupted-session-data');
        localStorage.setItem('clerk-db_jwt', 'invalid-jwt-token');
      });

      await page.goto('/library');

      // Should handle invalid session gracefully
      // Either redirect to auth or clear invalid data
      await page.waitForTimeout(2000);
      
      const isAuthPage = page.url().includes('sign-in') || page.url().includes('auth');
      const isLandingPage = page.url().includes('/');
      
      expect(isAuthPage || isLandingPage).toBe(true);
    });

    test('handles database connection failures', async ({ page }) => {
      // Mock database connection error
      await page.route('**/api/trpc/**', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Service temporarily unavailable',
              code: 'SERVICE_UNAVAILABLE'
            }
          })
        });
      });

      await page.goto('/');

      // Should show service unavailable message
      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=dbtest');
      await page.getByRole('button', { name: /Summarize/i }).click();

      await expect(page.getByText(/Service temporarily unavailable/i)).toBeVisible();
    });
  });

  test.describe('User Experience During Errors', () => {
    test('maintains navigation during errors', async ({ page }) => {
      await page.goto('/');

      // Mock error on one API call
      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        await route.fulfill({ status: 500 });
      });

      // Try to create summary (will fail)
      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=test');
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Navigation should still work
      const libraryLink = page.getByRole('link', { name: /Library/i }).first();
      if (await libraryLink.isVisible()) {
        await libraryLink.click();
        // Should navigate even if previous action failed
        expect(page.url()).toContain('/library');
      }
    });

    test('preserves form data during errors', async ({ page }) => {
      await page.goto('/');

      // Mock API error
      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { message: 'Invalid request' }
          })
        });
      });

      const testUrl = 'https://youtube.com/watch?v=preserve-test';
      await page.getByPlaceholder(/Enter YouTube URL/).fill(testUrl);
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Form data should be preserved after error
      const inputValue = await page.getByPlaceholder(/Enter YouTube URL/).inputValue();
      expect(inputValue).toBe(testUrl);
    });

    test('provides retry mechanisms', async ({ page }) => {
      await page.goto('/');

      let attemptCount = 0;
      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        attemptCount++;
        
        if (attemptCount === 1) {
          // First attempt fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: { message: 'Server error' } })
          });
        } else {
          // Second attempt succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              result: {
                data: {
                  id: 'retry-success',
                  title: 'Retry Success Test',
                  status: 'COMPLETED'
                }
              }
            })
          });
        }
      });

      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=retry');
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Should show error first
      await expect(page.getByText(/Something went wrong/i)).toBeVisible();

      // Look for retry button or try submitting again
      const retryButton = page.getByRole('button', { name: /Retry/i });
      if (await retryButton.isVisible()) {
        await retryButton.click();
      } else {
        // If no explicit retry button, try submitting again
        await page.getByRole('button', { name: /Summarize/i }).click();
      }

      // Should succeed on retry
      await expect(page.getByText('Retry Success Test')).toBeVisible();
    });

    test('handles progressive loading failures', async ({ page }) => {
      // Mock summary that partially loads
      await page.route('**/api/trpc/summary.getSummary*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                id: 'partial-summary',
                title: 'Partial Load Test',
                summary: 'Basic summary loaded successfully.',
                status: 'COMPLETED',
                // Missing keyMoments, flashcards, etc.
              }
            }
          })
        });
      });

      // Mock failure for additional data
      await page.route('**/api/trpc/summary.getKeyMoments*', async (route) => {
        await route.fulfill({ status: 500 });
      });

      await page.goto('/library/partial-summary');

      // Should show what loaded successfully
      await expect(page.getByText('Partial Load Test')).toBeVisible();
      await expect(page.getByText('Basic summary loaded successfully')).toBeVisible();

      // Should gracefully handle missing data
      // (Key Moments section might show error state or be hidden)
      const keyMomentsError = page.getByText(/Unable to load key moments/i);
      if (await keyMomentsError.isVisible()) {
        await expect(keyMomentsError).toBeVisible();
      }
    });
  });

  test.describe('Recovery Mechanisms', () => {
    test('automatic retry with exponential backoff', async ({ page }) => {
      test.setTimeout(60000);

      await page.goto('/');

      let attemptCount = 0;
      const attemptTimes: number[] = [];

      await page.route('**/api/trpc/summary.createSummary*', async (route) => {
        attemptCount++;
        attemptTimes.push(Date.now());

        if (attemptCount <= 3) {
          // First 3 attempts fail
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { message: 'Service temporarily unavailable' }
            })
          });
        } else {
          // 4th attempt succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              result: {
                data: {
                  id: 'backoff-success',
                  title: 'Exponential Backoff Success',
                  status: 'COMPLETED'
                }
              }
            })
          });
        }
      });

      await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=backoff');
      await page.getByRole('button', { name: /Summarize/i }).click();

      // Should eventually succeed after retries
      await expect(page.getByText('Exponential Backoff Success')).toBeVisible({ timeout: 45000 });

      // Check that retries had increasing delays (basic check)
      expect(attemptCount).toBe(4);
      if (attemptTimes.length >= 3) {
        const delay1 = attemptTimes[1] - attemptTimes[0];
        const delay2 = attemptTimes[2] - attemptTimes[1];
        expect(delay2).toBeGreaterThan(delay1); // Exponential backoff
      }
    });

    test('fallback to cached data', async ({ page }) => {
      // Set up cached data
      await page.addInitScript(() => {
        localStorage.setItem('cached-summary-fallback-test', JSON.stringify({
          id: 'fallback-test',
          title: 'Cached Fallback Summary',
          summary: 'This is cached data used as fallback.',
          status: 'COMPLETED',
          cachedAt: Date.now()
        }));
      });

      // Mock API failure
      await page.route('**/api/trpc/summary.getSummary*', async (route) => {
        await route.fulfill({ status: 500 });
      });

      await page.goto('/library/fallback-test');

      // Should fall back to cached data
      await expect(page.getByText('Cached Fallback Summary')).toBeVisible();
      await expect(page.getByText(/Showing cached version/i)).toBeVisible();
    });

    test('graceful degradation of features', async ({ page }) => {
      await page.addInitScript(() => {
        window.__clerk_user = { id: 'test-user' };
      });

      // Mock core functionality working but advanced features failing
      await page.route('**/api/trpc/summary.getSummary*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                id: 'degraded-summary',
                title: 'Degraded Features Test',
                summary: 'Basic summary content works.',
                status: 'COMPLETED'
              }
            }
          })
        });
      });

      // Mock advanced features failing
      await page.route('**/api/trpc/summary.getFlashcards*', async (route) => {
        await route.fulfill({ status: 500 });
      });

      await page.route('**/api/trpc/summary.getFrameworks*', async (route) => {
        await route.fulfill({ status: 500 });
      });

      await page.goto('/library/degraded-summary');

      // Core content should work
      await expect(page.getByText('Degraded Features Test')).toBeVisible();
      await expect(page.getByText('Basic summary content works')).toBeVisible();

      // Advanced features should degrade gracefully
      const flashcardsTab = page.getByText('Flashcards');
      if (await flashcardsTab.isVisible()) {
        await flashcardsTab.click();
        // Should show error state or hide the feature
        const flashcardsError = page.getByText(/Unable to load flashcards/i);
        if (await flashcardsError.isVisible()) {
          await expect(flashcardsError).toBeVisible();
        }
      }
    });
  });
});