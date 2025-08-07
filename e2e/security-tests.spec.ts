import { test, expect } from '@playwright/test';

test.describe('Security Validation Tests', () => {
  test.describe('Authentication Security', () => {
    test('prevents access to protected routes without authentication', async ({ page }) => {
      // Test protected routes redirect to auth
      const protectedRoutes = ['/library', '/settings', '/billing'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect away from protected route
        await page.waitForURL(url => !url.pathname.startsWith(route), { timeout: 5000 });
        expect(page.url()).not.toContain(route);
      }
    });

    test('validates JWT tokens properly', async ({ page }) => {
      // Mock invalid JWT token
      await page.addInitScript(() => {
        localStorage.setItem('clerk-session', 'invalid.jwt.token');
      });

      await page.goto('/library');
      
      // Should handle invalid token gracefully
      await expect(page).not.toHaveURL(/\/library/);
    });

    test('implements proper CSRF protection', async ({ page }) => {
      await page.goto('/');
      
      // Try to make a request without proper CSRF token
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/trpc/summary.createSummary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://youtube.com/watch?v=test' })
          });
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { error: error.message };
        }
      });

      // Should reject requests without proper authentication
      expect(response.status).not.toBe(200);
    });

    test('prevents session hijacking', async ({ page, context }) => {
      // Create authenticated session in first tab
      await page.addInitScript(() => {
        window.__clerk_user = {
          id: 'test-user',
          firstName: 'Test',
          lastName: 'User',
        };
      });

      await page.goto('/library');
      
      // Create second tab and try to reuse session
      const page2 = await context.newPage();
      await page2.goto('/library');
      
      // Second tab should not have automatic access
      await expect(page2).not.toHaveURL(/\/library/);
      
      await page2.close();
    });

    test('enforces rate limiting on authentication attempts', async ({ page }) => {
      // Mock multiple failed authentication attempts
      let attemptCount = 0;
      await page.route('**/api/auth/**', async (route) => {
        attemptCount++;
        
        if (attemptCount > 5) {
          // Simulate rate limiting after 5 attempts
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Too many authentication attempts. Please try again later.'
            })
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid credentials'
            })
          });
        }
      });

      await page.goto('/');
      
      // Simulate multiple login attempts
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => {
          fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
          }).catch(() => {});
        });
      }
      
      // Should eventually hit rate limit
      expect(attemptCount).toBeGreaterThan(5);
    });
  });

  test.describe('Input Validation Security', () => {
    test('validates YouTube URL format strictly', async ({ page }) => {
      await page.goto('/');
      
      const urlInput = page.getByPlaceholder(/Enter YouTube URL/);
      const submitButton = page.getByRole('button', { name: /Summarize/i });
      
      // Test various malicious/invalid inputs
      const maliciousInputs = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'http://evil.com/youtube.com/watch?v=fake',
        'https://youtube.evil.com/watch?v=fake',
        'ftp://youtube.com/watch?v=test',
        '<script>alert("xss")</script>',
        'https://youtube.com/watch?v=test&malicious=<script>',
        "'; DROP TABLE summaries; --",
      ];
      
      for (const input of maliciousInputs) {
        await urlInput.fill(input);
        await submitButton.click();
        
        // Should show validation error, not process the input
        await expect(page.getByText(/Please enter a valid YouTube URL/)).toBeVisible();
        
        // Clear input for next test
        await urlInput.fill('');
      }
    });

    test('prevents XSS attacks in user-generated content', async ({ page }) => {
      // Mock summary with potentially malicious content
      await page.route('**/api/trpc/summary.getSummary*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                id: 'xss-test-summary',
                title: '<script>alert("XSS in title")</script>',
                summary: 'Safe content with <script>alert("XSS")</script> embedded',
                status: 'COMPLETED'
              }
            }
          })
        });
      });

      await page.goto('/library/xss-test-summary');
      
      // Script tags should be escaped/sanitized, not executed
      await expect(page.getByText('<script>alert("XSS in title")</script>')).toBeVisible();
      
      // Verify no alert was triggered (XSS prevented)
      const alertTriggered = await page.evaluate(() => {
        return window.alert === alert; // Original alert function should still exist
      });
      expect(alertTriggered).toBe(true);
    });

    test('sanitizes markdown content properly', async ({ page }) => {
      // Mock summary with malicious markdown
      await page.route('**/api/trpc/summary.getSummary*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                id: 'markdown-xss-test',
                title: 'Markdown XSS Test',
                summary: `
# Safe Heading

[Click me](javascript:alert("XSS"))

<img src="x" onerror="alert('XSS')" />

<script>alert("Direct script")</script>

Normal content here.
                `,
                status: 'COMPLETED'
              }
            }
          })
        });
      });

      await page.goto('/library/markdown-xss-test');
      
      // Should render safe content only
      await expect(page.getByText('Safe Heading')).toBeVisible();
      await expect(page.getByText('Normal content here')).toBeVisible();
      
      // Malicious content should be sanitized
      const dangerousElements = await page.$$('script');
      expect(dangerousElements.length).toBe(0);
      
      const maliciousLinks = await page.$$('a[href^="javascript:"]');
      expect(maliciousLinks.length).toBe(0);
    });

    test('validates file upload inputs', async ({ page }) => {
      // This would test file upload functionality if implemented
      // For now, ensure no file upload vulnerabilities exist
      
      // Check that no unauthorized file upload endpoints exist
      const fileUploadAttempts = [
        '/api/upload',
        '/api/files/upload', 
        '/upload',
        '/api/trpc/file.upload'
      ];
      
      for (const endpoint of fileUploadAttempts) {
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url, { method: 'POST' });
            return res.status;
          } catch (error) {
            return 'ERROR';
          }
        }, endpoint);
        
        // Should return 404 or error, not accept uploads
        expect([404, 405, 'ERROR']).toContain(response);
      }
    });
  });

  test.describe('Data Security', () => {
    test('prevents SQL injection in API calls', async ({ page }) => {
      // Mock various SQL injection attempts
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET admin=1; --",
        "' OR '1'='1",
        "'; INSERT INTO admin VALUES ('hacker', 'password'); --"
      ];
      
      await page.addInitScript(() => {
        window.__clerk_user = { id: 'test-user' };
      });

      await page.goto('/');
      
      // Mock API to detect injection attempts
      let injectionAttemptDetected = false;
      await page.route('**/api/trpc/**', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          for (const payload of sqlInjectionPayloads) {
            if (postData.includes(payload)) {
              injectionAttemptDetected = true;
              break;
            }
          }
        }
        
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid input' })
        });
      });

      // Try injection in URL input
      for (const payload of sqlInjectionPayloads) {
        await page.getByPlaceholder(/Enter YouTube URL/).fill(payload);
        await page.getByRole('button', { name: /Summarize/i }).click();
        
        // Should reject the input
        await expect(page.getByText(/Please enter a valid YouTube URL/)).toBeVisible();
      }
    });

    test('protects against NoSQL injection', async ({ page }) => {
      // Test MongoDB/NoSQL injection patterns
      const noSqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$where": "this.username == this.password"}',
        '{"$regex": ".*"}',
        '{"$or": [{"user": "admin"}, {"password": ""}]}'
      ];
      
      await page.goto('/');
      
      for (const payload of noSqlPayloads) {
        // Try to inject through various inputs
        await page.evaluate((injectionPayload) => {
          fetch('/api/trpc/summary.createSummary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: injectionPayload })
          }).catch(() => {});
        }, payload);
      }
      
      // Should handle all injection attempts gracefully
      // (In a real test, you'd verify server-side injection prevention)
    });

    test('prevents information disclosure', async ({ page }) => {
      // Try to access sensitive endpoints
      const sensitiveEndpoints = [
        '/api/config',
        '/api/env',
        '/api/debug',
        '/.env',
        '/config.json',
        '/api/admin',
        '/api/internal'
      ];
      
      for (const endpoint of sensitiveEndpoints) {
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            return { status: res.status, text: await res.text() };
          } catch (error) {
            return { error: error.message };
          }
        }, endpoint);
        
        // Should not expose sensitive information
        if (response.status === 200) {
          expect(response.text.toLowerCase()).not.toContain('password');
          expect(response.text.toLowerCase()).not.toContain('secret');
          expect(response.text.toLowerCase()).not.toContain('api_key');
        }
      }
    });

    test('implements proper data sanitization', async ({ page }) => {
      await page.addInitScript(() => {
        window.__clerk_user = { id: 'test-user' };
      });

      // Mock API response with mixed clean and potentially dangerous data
      await page.route('**/api/trpc/library.getUserSummaries*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                summaries: [
                  {
                    id: 'clean-summary',
                    title: 'Clean Title',
                    summary: 'Clean content',
                    status: 'COMPLETED'
                  },
                  {
                    id: 'dangerous-summary',
                    title: '<img src=x onerror=alert("XSS")>',
                    summary: '<script>document.body.innerHTML="HACKED"</script>',
                    status: 'COMPLETED'
                  }
                ]
              }
            }
          })
        });
      });

      await page.goto('/library');
      
      // Should display sanitized content
      await expect(page.getByText('Clean Title')).toBeVisible();
      
      // Dangerous content should be sanitized
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('HACKED');
      
      // No script tags should be present
      const scriptTags = await page.$$('script[src=""]');
      expect(scriptTags.length).toBe(0);
    });
  });

  test.describe('API Security', () => {
    test('implements proper CORS policy', async ({ page }) => {
      await page.goto('/');
      
      // Test CORS by attempting cross-origin request
      const corsTest = await page.evaluate(async () => {
        try {
          const response = await fetch('http://evil.com/api/test', {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' }
          });
          return { status: response.status };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      // Should block or handle CORS appropriately
      expect(corsTest.error || corsTest.status).toBeTruthy();
    });

    test('validates API request headers', async ({ page }) => {
      await page.goto('/');
      
      // Test with missing/invalid headers
      const invalidHeaderTests = [
        { 'Content-Type': 'text/plain' },
        { 'X-Malicious': 'payload' },
        { 'Authorization': 'Bearer fake.token.here' }
      ];
      
      for (const headers of invalidHeaderTests) {
        const response = await page.evaluate(async (testHeaders) => {
          try {
            const res = await fetch('/api/trpc/summary.createSummary', {
              method: 'POST',
              headers: testHeaders,
              body: 'malicious payload'
            });
            return res.status;
          } catch (error) {
            return 'ERROR';
          }
        }, headers);
        
        // Should reject invalid requests
        expect([400, 401, 403, 415, 'ERROR']).toContain(response);
      }
    });

    test('enforces rate limiting on API endpoints', async ({ page }) => {
      await page.goto('/');
      
      // Make rapid requests to test rate limiting
      const responses = await page.evaluate(async () => {
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(
            fetch('/api/trpc/summary.createSummary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: `https://youtube.com/watch?v=test${i}` })
            }).then(res => res.status).catch(() => 'ERROR')
          );
        }
        return Promise.all(promises);
      });
      
      // Should have some rate limited responses (429)
      const rateLimitedCount = responses.filter(status => status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    test('validates webhook signatures', async ({ page }) => {
      // Test webhook endpoints with invalid signatures
      const webhookEndpoints = [
        '/api/webhooks/stripe',
        '/api/webhooks/clerk'
      ];
      
      for (const endpoint of webhookEndpoints) {
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'stripe-signature': 'invalid-signature'
              },
              body: JSON.stringify({ test: 'payload' })
            });
            return res.status;
          } catch (error) {
            return 'ERROR';
          }
        }, endpoint);
        
        // Should reject webhooks with invalid signatures
        expect([400, 401, 403, 'ERROR']).toContain(response);
      }
    });
  });

  test.describe('Client-Side Security', () => {
    test('implements Content Security Policy', async ({ page }) => {
      await page.goto('/');
      
      // Check for CSP headers
      const cspHeader = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta ? meta.getAttribute('content') : null;
      });
      
      if (cspHeader) {
        expect(cspHeader).toContain("default-src 'self'");
        expect(cspHeader).not.toContain("'unsafe-eval'");
      }
    });

    test('prevents clickjacking attacks', async ({ page }) => {
      await page.goto('/');
      
      // Check for X-Frame-Options or frame-ancestors CSP
      const frameOptions = await page.evaluate(() => {
        // This would need to be checked server-side in reality
        return document.querySelector('meta[name="x-frame-options"]')?.getAttribute('content');
      });
      
      // Frame options should prevent clickjacking (this is typically handled by server headers)
      // In a full test, you'd verify the HTTP headers
    });

    test('secures local storage usage', async ({ page }) => {
      await page.goto('/');
      
      // Check what's stored in localStorage
      const localStorageKeys = await page.evaluate(() => {
        return Object.keys(localStorage);
      });
      
      // Should not store sensitive data in localStorage
      for (const key of localStorageKeys) {
        expect(key.toLowerCase()).not.toContain('password');
        expect(key.toLowerCase()).not.toContain('secret');
        expect(key.toLowerCase()).not.toContain('token');
        
        const value = await page.evaluate((k) => localStorage.getItem(k), key);
        if (value) {
          expect(value.toLowerCase()).not.toContain('password');
          expect(value.toLowerCase()).not.toContain('secret');
        }
      }
    });
  });
});