import { test, expect } from '@playwright/test';

test.describe('Authenticated User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Clerk authentication
    await page.addInitScript(() => {
      // Mock Clerk user object
      window.__clerk_user = {
        id: 'test-user-id',
        firstName: 'Test',
        lastName: 'User',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };
    });

    // Mock authenticated tRPC calls
    await page.route('**/api/trpc/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('auth.getUser')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                id: 'test-user-id',
                clerkId: 'clerk-test-id',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                subscription: {
                  status: 'active',
                  plan: 'PRO'
                }
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('authenticated user can access library', async ({ page }) => {
    // Mock library data
    await page.route('**/api/trpc/library.getUserSummaries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              summaries: [
                {
                  id: 'summary-1',
                  title: 'React Performance Tips',
                  url: 'https://youtube.com/watch?v=example1',
                  status: 'COMPLETED',
                  createdAt: new Date().toISOString(),
                  tags: [{ name: 'React', type: 'TECHNOLOGY' }],
                  categories: [{ name: 'Technology' }]
                },
                {
                  id: 'summary-2', 
                  title: 'JavaScript Best Practices',
                  url: 'https://youtube.com/watch?v=example2',
                  status: 'COMPLETED',
                  createdAt: new Date().toISOString(),
                  tags: [{ name: 'JavaScript', type: 'TECHNOLOGY' }],
                  categories: [{ name: 'Technology' }]
                }
              ],
              totalCount: 2
            }
          }
        })
      });
    });

    await page.goto('/library');

    // Should show library content
    await expect(page.getByText('Your Library')).toBeVisible();
    await expect(page.getByText('React Performance Tips')).toBeVisible();
    await expect(page.getByText('JavaScript Best Practices')).toBeVisible();

    // Should show filter controls
    await expect(page.getByText('Filter by Category')).toBeVisible();
    await expect(page.getByText('Filter by Tags')).toBeVisible();
  });

  test('authenticated user can create and save summaries', async ({ page }) => {
    // Mock summary creation
    await page.route('**/api/trpc/summary.createSummary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'new-summary-id',
              title: 'New Video Summary',
              url: 'https://youtube.com/watch?v=newvideo',
              status: 'COMPLETED',
              summary: 'This is a new summary for authenticated user.',
              createdAt: new Date().toISOString(),
            }
          }
        })
      });
    });

    await page.goto('/');

    // Create new summary
    await page.getByPlaceholder(/Enter YouTube URL/).fill('https://youtube.com/watch?v=newvideo');
    await page.getByRole('button', { name: /Summarize/i }).click();

    // Wait for summary to complete
    await expect(page.getByText('New Video Summary')).toBeVisible({ timeout: 30000 });
    
    // Should show save options
    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
    
    // Should show sharing options
    await expect(page.getByRole('button', { name: /Share/i })).toBeVisible();
  });

  test('authenticated user can use smart collections filtering', async ({ page }) => {
    // Mock library with tags and categories
    await page.route('**/api/trpc/library.getUserSummaries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              summaries: [
                {
                  id: 'summary-1',
                  title: 'React Hooks Tutorial',
                  status: 'COMPLETED',
                  tags: [
                    { name: 'React', type: 'TECHNOLOGY' },
                    { name: 'Dan Abramov', type: 'PERSON' }
                  ],
                  categories: [{ name: 'Technology' }]
                },
                {
                  id: 'summary-2',
                  title: 'Business Strategy Session',
                  status: 'COMPLETED',
                  tags: [
                    { name: 'Apple', type: 'COMPANY' },
                    { name: 'Strategy', type: 'CONCEPT' }
                  ],
                  categories: [{ name: 'Business' }]
                }
              ],
              totalCount: 2,
              tagCounts: [
                { name: 'React', type: 'TECHNOLOGY', count: 1 },
                { name: 'Dan Abramov', type: 'PERSON', count: 1 },
                { name: 'Apple', type: 'COMPANY', count: 1 }
              ],
              categoryCounts: [
                { name: 'Technology', count: 1 },
                { name: 'Business', count: 1 }
              ]
            }
          }
        })
      });
    });

    await page.goto('/library');

    // Should show smart collections UI
    await expect(page.getByText('Smart Collections')).toBeVisible();
    
    // Check tag filters with counts
    await expect(page.getByText('React (1)')).toBeVisible();
    await expect(page.getByText('Dan Abramov (1)')).toBeVisible();
    await expect(page.getByText('Apple (1)')).toBeVisible();
    
    // Check category filters
    await expect(page.getByText('Technology (1)')).toBeVisible();
    await expect(page.getByText('Business (1)')).toBeVisible();

    // Test filtering by clicking a tag
    await page.getByText('React (1)').click();
    
    // Should filter results
    await expect(page.getByText('React Hooks Tutorial')).toBeVisible();
    await expect(page.getByText('Business Strategy Session')).not.toBeVisible();
  });

  test('authenticated user can access settings and billing', async ({ page }) => {
    // Mock subscription data
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
              cancelAtPeriodEnd: false
            }
          }
        })
      });
    });

    // Test settings page
    await page.goto('/settings');
    await expect(page.getByText('Settings')).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();

    // Test billing page
    await page.goto('/billing');
    await expect(page.getByText('Billing')).toBeVisible();
    await expect(page.getByText('Pro Plan')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('authenticated user can share summaries', async ({ page }) => {
    // Mock summary with share data
    await page.route('**/api/trpc/summary.getSummary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 'shareable-summary',
              title: 'Shareable Video Summary',
              url: 'https://youtube.com/watch?v=shareable',
              status: 'COMPLETED',
              summary: 'This summary can be shared publicly.',
              share: {
                slug: 'shareable-slug',
                isPublic: true
              }
            }
          }
        })
      });
    });

    await page.goto('/library/shareable-summary');
    
    // Should show share button
    const shareButton = page.getByRole('button', { name: /Share/i });
    await expect(shareButton).toBeVisible();
    
    // Click share button
    await shareButton.click();
    
    // Should show share modal or copy link functionality
    await expect(
      page.getByText(/Copy link/i).or(page.getByText(/Share link/i))
    ).toBeVisible();
  });
});