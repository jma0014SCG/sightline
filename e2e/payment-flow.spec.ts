import { test, expect } from '@playwright/test';

test.describe('Payment and Subscription Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.__clerk_user = {
        id: 'test-user-id',
        firstName: 'Test',
        lastName: 'User',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };
    });
  });

  test('free user can upgrade to pro', async ({ page }) => {
    // Mock free user subscription status
    await page.route('**/api/trpc/billing.getSubscription*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              status: 'inactive',
              plan: 'FREE',
              usageCount: 2,
              usageLimit: 3
            }
          }
        })
      });
    });

    // Mock Stripe checkout session creation
    await page.route('**/api/trpc/billing.createCheckoutSession*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              url: 'https://checkout.stripe.com/test-session'
            }
          }
        })
      });
    });

    await page.goto('/billing');

    // Should show current plan status
    await expect(page.getByText('Free Plan')).toBeVisible();
    await expect(page.getByText('2/3 summaries used')).toBeVisible();

    // Should show upgrade options
    await expect(page.getByText('Pro Plan')).toBeVisible();
    await expect(page.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible();

    // Click upgrade button
    await page.getByRole('button', { name: /Upgrade to Pro/i }).click();

    // Should navigate to Stripe checkout (in real test, we'd mock this)
    // For now, just check that the request was made
    const checkoutRequest = page.waitForRequest('**/api/trpc/billing.createCheckoutSession*');
    await checkoutRequest;
  });

  test('pro user can manage subscription', async ({ page }) => {
    // Mock pro user subscription
    await page.route('**/api/trpc/billing.getSubscription*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              status: 'active',
              plan: 'PRO',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
              usageCount: 15,
              usageLimit: 25
            }
          }
        })
      });
    });

    // Mock customer portal session
    await page.route('**/api/trpc/billing.createPortalSession*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              url: 'https://billing.stripe.com/test-portal'
            }
          }
        })
      });
    });

    await page.goto('/billing');

    // Should show current subscription
    await expect(page.getByText('Pro Plan')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('15/25 summaries used')).toBeVisible();

    // Should show management options
    await expect(page.getByRole('button', { name: /Manage Subscription/i })).toBeVisible();

    // Click manage subscription
    await page.getByRole('button', { name: /Manage Subscription/i }).click();

    // Should navigate to customer portal
    const portalRequest = page.waitForRequest('**/api/trpc/billing.createPortalSession*');
    await portalRequest;
  });

  test('user hits usage limits and sees upgrade prompts', async ({ page }) => {
    // Mock user at usage limit
    await page.route('**/api/trpc/billing.getSubscription*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              status: 'inactive',
              plan: 'FREE',
              usageCount: 3,
              usageLimit: 3
            }
          }
        })
      });
    });

    // Mock usage limit error on summary creation
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Usage limit exceeded. Upgrade to Pro for unlimited summaries.',
            code: 'USAGE_LIMIT_EXCEEDED'
          }
        })
      });
    });

    await page.goto('/');

    // Try to create a summary
    await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=test');
    await page.getByRole('button', { name: /Summarize/i }).click();

    // Should show usage limit error
    await expect(page.getByText(/Usage limit exceeded/)).toBeVisible();
    await expect(page.getByText(/Upgrade to Pro/)).toBeVisible();

    // Should show upgrade button or link
    await expect(page.getByRole('button', { name: /Upgrade/i })).toBeVisible();
  });

  test('subscription renewal and cancellation flows', async ({ page }) => {
    // Mock subscription with upcoming renewal
    await page.route('**/api/trpc/billing.getSubscription*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              status: 'active',
              plan: 'PRO',
              currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
              cancelAtPeriodEnd: false
            }
          }
        })
      });
    });

    await page.goto('/billing');

    // Should show renewal information
    await expect(page.getByText(/Renews/)).toBeVisible();
    await expect(page.getByText(/7 days/)).toBeVisible();

    // Test cancellation flow (mock only - actual cancellation happens via Stripe portal)
    await page.route('**/api/trpc/billing.createPortalSession*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              url: 'https://billing.stripe.com/test-portal'
            }
          }
        })
      });
    });

    // Click manage subscription to access cancellation
    await page.getByRole('button', { name: /Manage Subscription/i }).click();
    const portalRequest = page.waitForRequest('**/api/trpc/billing.createPortalSession*');
    await portalRequest;
  });

  test('handles payment failures gracefully', async ({ page }) => {
    // Mock failed payment status
    await page.route('**/api/trpc/billing.getSubscription*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              status: 'past_due',
              plan: 'PRO',
              currentPeriodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
              cancelAtPeriodEnd: false
            }
          }
        })
      });
    });

    await page.goto('/billing');

    // Should show payment failure status
    await expect(page.getByText(/Payment Failed/i)).toBeVisible();
    await expect(page.getByText(/Past Due/i)).toBeVisible();

    // Should show retry payment option
    await expect(page.getByRole('button', { name: /Update Payment/i })).toBeVisible();
  });

  test('displays correct pricing information', async ({ page }) => {
    await page.goto('/');

    // Scroll to pricing section
    await page.getByText('Choose Your Plan').scrollIntoViewIfNeeded();

    // Should show accurate pricing
    await expect(page.getByText('Free Plan')).toBeVisible();
    await expect(page.getByText('3 summaries')).toBeVisible();
    await expect(page.getByText('$0')).toBeVisible();

    await expect(page.getByText('Pro Plan')).toBeVisible();
    await expect(page.getByText('25 summaries/month')).toBeVisible();
    await expect(page.getByText(/\$\d+/)).toBeVisible(); // Should show actual price

    // Should show feature comparisons
    await expect(page.getByText(/Smart Collections/)).toBeVisible();
    await expect(page.getByText(/Export summaries/)).toBeVisible();
    await expect(page.getByText(/Priority support/)).toBeVisible();
  });
});