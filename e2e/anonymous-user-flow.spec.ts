import { test, expect } from '@playwright/test';

test.describe('Anonymous User Flow', () => {
  test('anonymous user can create and view summary', async ({ page }) => {
    await page.goto('/');
    
    // Mock the API endpoint to simulate successful summarization
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'test-summary-id',
              title: 'Test Video Summary',
              url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
              status: 'COMPLETED',
              summary: 'This is a test summary of the video content.',
              createdAt: new Date().toISOString(),
            }
          }
        })
      });
    });
    
    // Fill in YouTube URL
    const urlInput = page.getByPlaceholder(/Enter YouTube URL/);
    await urlInput.fill('https://youtube.com/watch?v=dQw4w9WgXcQ');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /Summarize/i });
    await submitButton.click();
    
    // Should navigate to summary page
    await expect(page).toHaveURL(/\/summary\//);
    
    // Should show progress initially
    await expect(page.getByText(/Processing/)).toBeVisible();
    
    // Wait for completion and check summary content
    await expect(page.getByText('Test Video Summary')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('This is a test summary')).toBeVisible();
  });

  test('anonymous user sees sign-in prompt after summary', async ({ page }) => {
    await page.goto('/');
    
    // Mock API response for summary creation
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'test-summary-id',
              title: 'Test Video Summary',
              url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
              status: 'COMPLETED',
              summary: 'This is a test summary.',
              createdAt: new Date().toISOString(),
            }
          }
        })
      });
    });
    
    // Create summary as anonymous user
    await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: /Summarize/i }).click();
    
    // Wait for summary to load
    await expect(page.getByText('Test Video Summary')).toBeVisible({ timeout: 30000 });
    
    // Look for sign-in prompts or calls-to-action
    const signInPrompts = [
      page.getByText(/Sign up/i),
      page.getByText(/Create account/i),
      page.getByText(/Save this summary/i),
      page.getByRole('button', { name: /Sign in/i })
    ];
    
    // At least one sign-in prompt should be visible
    let promptVisible = false;
    for (const prompt of signInPrompts) {
      if (await prompt.isVisible()) {
        promptVisible = true;
        break;
      }
    }
    expect(promptVisible).toBe(true);
  });

  test('anonymous user hits rate limit', async ({ page }) => {
    // This test simulates the rate limit for anonymous users
    await page.goto('/');
    
    // Mock rate limit response
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Rate limit exceeded. Anonymous users can create 1 summary. Please sign in for more.',
            code: 'TOO_MANY_REQUESTS'
          }
        })
      });
    });
    
    await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: /Summarize/i }).click();
    
    // Should show rate limit error
    await expect(page.getByText(/Rate limit exceeded/)).toBeVisible();
    await expect(page.getByText(/Please sign in/)).toBeVisible();
  });

  test('anonymous user cannot access protected routes', async ({ page }) => {
    // Try to access library page
    await page.goto('/library');
    
    // Should redirect to landing or show auth prompt
    await expect(page).toHaveURL(/\/|sign-in/);
    
    // Try to access settings
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/|sign-in/);
    
    // Try to access billing  
    await page.goto('/billing');
    await expect(page).toHaveURL(/\/|sign-in/);
  });
});