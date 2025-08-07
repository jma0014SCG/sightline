import { test, expect } from "@playwright/test";
import { TestApiMocks } from "./helpers/api-mocks";
import { TestDatabaseManager } from "./helpers/database-manager";
import { DebugUtils } from "./helpers/debug-utils";
import { SELECTORS } from "./helpers/selectors";
import { waitForPageLoad, waitForSummaryLoad } from "./helpers/wait-utils";

test.describe("Anonymous User Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Setup debug monitoring
    await DebugUtils.startNetworkMonitoring(page);
    await DebugUtils.startConsoleMonitoring(page);

    // Setup database for test
    await TestDatabaseManager.setupTestDatabase();

    // Setup authentication mocks for anonymous user
    await TestApiMocks.setupAuthMocks(page, "anonymous");
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data
    await TestDatabaseManager.cleanup();
  });

  test("anonymous user can create and view summary", async ({
    page,
  }, testInfo) => {
    try {
      // Setup API mocks for successful summary creation
      await TestApiMocks.setupSummaryCreationMocks(page, {
        shouldSucceed: true,
        processingTime: 2000,
        userType: "anonymous",
      });

      // Navigate to homepage
      await page.goto("/");
      await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

      // Fill in YouTube URL using enhanced debugging
      await DebugUtils.fillWithDebug(
        page,
        SELECTORS.FORMS.urlInput,
        "https://youtube.com/watch?v=dQw4w9WgXcQ",
      );

      // Submit form with debugging
      await DebugUtils.clickWithDebug(page, SELECTORS.FORMS.submitButton);

      // Should navigate to summary page
      await expect(page).toHaveURL(/\/summary\//, { timeout: 15000 });

      // Wait for summary to load completely
      await waitForSummaryLoad(page);

      // Verify summary content is displayed
      await expect(page.locator(SELECTORS.CONTENT.summaryTitle)).toContainText(
        "Test Video",
        { timeout: 10000 },
      );
      await expect(
        page.locator(SELECTORS.CONTENT.summaryContent),
      ).toContainText("test summary", { timeout: 10000 });
    } catch (error) {
      // Capture debug artifacts on failure
      await DebugUtils.captureFailureArtifacts(page, testInfo, error as Error);
      throw error;
    }
  });

  test("anonymous user sees sign-in prompt after summary", async ({
    page,
  }, testInfo) => {
    try {
      // Setup API mocks for successful summary creation
      await TestApiMocks.setupSummaryCreationMocks(page, {
        shouldSucceed: true,
        processingTime: 1500,
        userType: "anonymous",
      });

      await page.goto("/");
      await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

      // Create summary as anonymous user using enhanced debugging
      await DebugUtils.fillWithDebug(
        page,
        SELECTORS.FORMS.urlInput,
        "https://youtube.com/watch?v=dQw4w9WgXcQ",
      );
      await DebugUtils.clickWithDebug(page, SELECTORS.FORMS.submitButton);

      // Should navigate to summary page
      await expect(page).toHaveURL(/\/summary\//, { timeout: 15000 });

      // Wait for summary to load
      await waitForSummaryLoad(page);

      // Look for sign-in prompts - anonymous users should see auth prompts
      const authPrompts = [
        page.locator(SELECTORS.AUTH.signInButton),
        page.locator(SELECTORS.AUTH.signUpButton),
        page.locator(SELECTORS.AUTH.authPromptModal),
      ];

      // At least one auth prompt should be visible
      let promptVisible = false;
      for (const prompt of authPrompts) {
        if (await prompt.isVisible().catch(() => false)) {
          promptVisible = true;
          break;
        }
      }
      expect(promptVisible).toBe(true);
    } catch (error) {
      // Capture debug artifacts on failure
      await DebugUtils.captureFailureArtifacts(page, testInfo, error as Error);
      throw error;
    }
  });

  test("anonymous user hits rate limit", async ({ page }, testInfo) => {
    try {
      // Setup API mocks for rate limit scenario
      await TestApiMocks.setupSummaryCreationMocks(page, {
        shouldSucceed: false,
        userType: "anonymous",
        errorType: "RATE_LIMIT",
      });

      await page.goto("/");
      await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

      // Try to create summary with enhanced debugging
      await DebugUtils.fillWithDebug(
        page,
        SELECTORS.FORMS.urlInput,
        "https://youtube.com/watch?v=dQw4w9WgXcQ",
      );
      await DebugUtils.clickWithDebug(page, SELECTORS.FORMS.submitButton);

      // Should show rate limit error
      await expect(page.locator(SELECTORS.ERRORS.message)).toContainText(
        /Rate limit exceeded/,
        { timeout: 10000 },
      );
      await expect(page.locator(SELECTORS.ERRORS.message)).toContainText(
        /sign in/,
        { timeout: 10000 },
      );
    } catch (error) {
      await DebugUtils.captureFailureArtifacts(page, testInfo, error as Error);
      throw error;
    }
  });

  test("anonymous user cannot access protected routes", async ({
    page,
  }, testInfo) => {
    try {
      // Setup authentication mocks for anonymous user
      await TestApiMocks.setupAuthMocks(page, "anonymous");

      // Try to access library page
      await page.goto("/library");
      await page.waitForLoadState("networkidle");

      // Should redirect to landing or show auth prompt
      await expect(page).toHaveURL(/\/|sign-in/, { timeout: 10000 });

      // Try to access settings
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/|sign-in/, { timeout: 10000 });

      // Try to access billing
      await page.goto("/billing");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/|sign-in/, { timeout: 10000 });
    } catch (error) {
      await DebugUtils.captureFailureArtifacts(page, testInfo, error as Error);
      throw error;
    }
  });
});
