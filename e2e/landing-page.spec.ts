import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('displays landing page correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check hero section
    await expect(page.getByText('Speed-learn')).toBeVisible();
    await expect(page.getByText('anything on YouTube')).toBeVisible();
    
    // Check URL input form
    await expect(page.getByPlaceholder(/Enter YouTube URL/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Summarize/i })).toBeVisible();
    
    // Check features section
    await expect(page.getByText(/Quick Summaries/)).toBeVisible();
    await expect(page.getByText(/Key Insights/)).toBeVisible();
    await expect(page.getByText(/Time-Stamped Moments/)).toBeVisible();
  });

  test('shows pricing information', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to pricing section
    await page.getByText('Choose Your Plan').scrollIntoViewIfNeeded();
    
    // Check pricing plans
    await expect(page.getByText('Free Plan')).toBeVisible();
    await expect(page.getByText('Pro Plan')).toBeVisible();
    await expect(page.getByText(/\$\d+\/month/)).toBeVisible();
  });

  test('URL validation works correctly', async ({ page }) => {
    await page.goto('/');
    
    const urlInput = page.getByPlaceholder(/Enter YouTube URL/);
    const submitButton = page.getByRole('button', { name: /Summarize/i });
    
    // Test invalid URL
    await urlInput.fill('not-a-valid-url');
    await submitButton.click();
    await expect(page.getByText(/Please enter a valid YouTube URL/)).toBeVisible();
    
    // Test non-YouTube URL  
    await urlInput.fill('https://example.com');
    await submitButton.click();
    await expect(page.getByText(/Please enter a valid YouTube URL/)).toBeVisible();
    
    // Test valid YouTube URL format
    await urlInput.fill('https://youtube.com/watch?v=dQw4w9WgXcQ');
    // Should not show validation error
    await expect(page.getByText(/Please enter a valid YouTube URL/)).not.toBeVisible();
  });

  test('responsive design works on mobile', async ({ page, isMobile }) => {
    if (!isMobile) return;
    
    await page.goto('/');
    
    // Check mobile menu functionality
    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
    
    // Check responsive layout
    await expect(page.getByText('Speed-learn')).toBeVisible();
    await expect(page.getByPlaceholder(/Enter YouTube URL/)).toBeVisible();
  });
});