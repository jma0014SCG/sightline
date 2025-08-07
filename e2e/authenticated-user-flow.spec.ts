import { test, expect } from "@playwright/test";
import { TestApiMocks } from "./helpers/api-mocks";
import { TestDatabaseManager } from "./helpers/database-manager";
import { DebugUtils } from "./helpers/debug-utils";
import { SELECTORS } from "./helpers/selectors";
import { waitForPageLoad, waitForSummaryLoad } from "./helpers/wait-utils";

test.describe("Authenticated User Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Setup debug monitoring
    await DebugUtils.startNetworkMonitoring(page);
    await DebugUtils.startConsoleMonitoring(page);

    // Setup database for test
    await TestDatabaseManager.setupTestDatabase();

    // Setup authentication mocks for pro user
    await TestApiMocks.setupAuthMocks(page, "pro");
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data
    await TestDatabaseManager.cleanup();
  });

  test("authenticated user can access library", async ({ page }, testInfo) => {
    try {
      // Setup library data mocks
      await TestApiMocks.setupLibraryMocks(page, {
        summaries: [
          {
            id: "summary-1",
            title: "React Performance Tips",
            url: "https://youtube.com/watch?v=example1",
            status: "COMPLETED",
            tags: [{ name: "React", type: "TECHNOLOGY" }],
            categories: [{ name: "Technology" }],
          },
          {
            id: "summary-2",
            title: "JavaScript Best Practices",
            url: "https://youtube.com/watch?v=example2",
            status: "COMPLETED",
            tags: [{ name: "JavaScript", type: "TECHNOLOGY" }],
            categories: [{ name: "Technology" }],
          },
        ],
      });

      await page.goto("/library");
      await waitForPageLoad(page, SELECTORS.LIBRARY.container);

      // Should show library content
      await expect(page.locator(SELECTORS.LIBRARY.title)).toContainText(
        "Your Library",
      );
      await expect(page.getByText("React Performance Tips")).toBeVisible();
      await expect(page.getByText("JavaScript Best Practices")).toBeVisible();

      // Should show filter controls
      await expect(
        page.locator(SELECTORS.LIBRARY.categoryFilter),
      ).toBeVisible();
      await expect(page.locator(SELECTORS.LIBRARY.tagFilter)).toBeVisible();
    } catch (error) {
      await DebugUtils.captureFailureArtifacts(page, testInfo, error as Error);
      throw error;
    }
  });

  test("authenticated user can create and save summaries", async ({
    page,
  }, testInfo) => {
    try {
      // Setup API mocks for successful summary creation
      await TestApiMocks.setupSummaryCreationMocks(page, {
        shouldSucceed: true,
        processingTime: 2000,
        userType: "pro",
      });

      await page.goto("/");
      await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

      // Create new summary using enhanced debugging
      await DebugUtils.fillWithDebug(
        page,
        SELECTORS.FORMS.urlInput,
        "https://youtube.com/watch?v=newvideo",
      );
      await DebugUtils.clickWithDebug(page, SELECTORS.FORMS.submitButton);

      // Should navigate to summary page
      await expect(page).toHaveURL(/\/summary\//, { timeout: 15000 });

      // Wait for summary to load completely
      await waitForSummaryLoad(page);

      // Wait for summary content to appear
      await expect(page.locator(SELECTORS.CONTENT.summaryTitle)).toContainText(
        "Test Video",
        { timeout: 15000 },
      );

      // Should show authenticated user actions
      await expect(page.locator(SELECTORS.ACTIONS.saveButton)).toBeVisible();
      await expect(page.locator(SELECTORS.ACTIONS.shareButton)).toBeVisible();
    } catch (error) {
      await DebugUtils.captureFailureArtifacts(page, testInfo, error as Error);
      throw error;
    }
  });

  test("authenticated user can use smart collections filtering", async ({
    page,
  }) => {
    // Mock library with tags and categories
    await page.route("**/api/trpc/library.getUserSummaries*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              summaries: [
                {
                  id: "summary-1",
                  title: "React Hooks Tutorial",
                  status: "COMPLETED",
                  tags: [
                    { name: "React", type: "TECHNOLOGY" },
                    { name: "Dan Abramov", type: "PERSON" },
                  ],
                  categories: [{ name: "Technology" }],
                },
                {
                  id: "summary-2",
                  title: "Business Strategy Session",
                  status: "COMPLETED",
                  tags: [
                    { name: "Apple", type: "COMPANY" },
                    { name: "Strategy", type: "CONCEPT" },
                  ],
                  categories: [{ name: "Business" }],
                },
              ],
              totalCount: 2,
              tagCounts: [
                { name: "React", type: "TECHNOLOGY", count: 1 },
                { name: "Dan Abramov", type: "PERSON", count: 1 },
                { name: "Apple", type: "COMPANY", count: 1 },
              ],
              categoryCounts: [
                { name: "Technology", count: 1 },
                { name: "Business", count: 1 },
              ],
            },
          },
        }),
      });
    });

    await page.goto("/library");

    // Should show smart collections UI
    await expect(page.getByText("Smart Collections")).toBeVisible();

    // Check tag filters with counts
    await expect(page.getByText("React (1)")).toBeVisible();
    await expect(page.getByText("Dan Abramov (1)")).toBeVisible();
    await expect(page.getByText("Apple (1)")).toBeVisible();

    // Check category filters
    await expect(page.getByText("Technology (1)")).toBeVisible();
    await expect(page.getByText("Business (1)")).toBeVisible();

    // Test filtering by clicking a tag
    await page.getByText("React (1)").click();

    // Should filter results
    await expect(page.getByText("React Hooks Tutorial")).toBeVisible();
    await expect(page.getByText("Business Strategy Session")).not.toBeVisible();
  });

  test("authenticated user can access settings and billing", async ({
    page,
  }) => {
    // Mock subscription data
    await page.route("**/api/trpc/billing.getSubscription*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              status: "active",
              plan: "PRO",
              currentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              cancelAtPeriodEnd: false,
            },
          },
        }),
      });
    });

    // Test settings page
    await page.goto("/settings");
    await expect(page.getByText("Settings")).toBeVisible();
    await expect(page.getByText("Test User")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();

    // Test billing page
    await page.goto("/billing");
    await expect(page.getByText("Billing")).toBeVisible();
    await expect(page.getByText("Pro Plan")).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
  });

  test("authenticated user can share summaries", async ({ page }) => {
    // Mock summary with share data
    await page.route("**/api/trpc/summary.getSummary*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              id: "shareable-summary",
              title: "Shareable Video Summary",
              url: "https://youtube.com/watch?v=shareable",
              status: "COMPLETED",
              summary: "This summary can be shared publicly.",
              share: {
                slug: "shareable-slug",
                isPublic: true,
              },
            },
          },
        }),
      });
    });

    await page.goto("/library/shareable-summary");

    // Should show share button
    const shareButton = page.getByRole("button", { name: /Share/i });
    await expect(shareButton).toBeVisible();

    // Click share button
    await shareButton.click();

    // Should show share modal or copy link functionality
    await expect(
      page.getByText(/Copy link/i).or(page.getByText(/Share link/i)),
    ).toBeVisible();
  });
});
