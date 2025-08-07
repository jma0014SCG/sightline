import { Page, expect } from "@playwright/test";

/**
 * Utility functions for waiting and synchronization in E2E tests
 */

/**
 * Wait for server to be responsive
 */
export const waitForServer = async (page: Page) => {
  await page.waitForResponse(
    (response) => response.url().includes("/api/health") && response.ok(),
    { timeout: 30000 },
  );
};

/**
 * Wait for authentication to be ready
 */
export const waitForAuth = async (page: Page, shouldBeAuthenticated = true) => {
  if (shouldBeAuthenticated) {
    await page.waitForFunction(
      () => {
        const clerkLoaded = window.Clerk?.loaded;
        const userExists = window.Clerk?.user !== null;
        return clerkLoaded && userExists;
      },
      { timeout: 15000 },
    );
  } else {
    await page.waitForFunction(
      () => window.Clerk?.loaded && window.Clerk?.user === null,
      { timeout: 15000 },
    );
  }
};

/**
 * Wait for summary to load completely
 */
export const waitForSummaryLoad = async (page: Page) => {
  // Wait for the summary content to appear
  await page.waitForSelector('[data-testid="summary-content"]', {
    timeout: 30000,
  });

  // Wait for any loading indicators to disappear
  await page
    .waitForSelector('[data-testid="loading-spinner"]', {
      state: "detached",
      timeout: 5000,
    })
    .catch(() => {
      // Loading spinner might not exist, that's okay
    });

  // Ensure network is idle
  await page.waitForLoadState("networkidle");
};

/**
 * Wait for page to be fully loaded with all critical elements
 */
export const waitForPageLoad = async (page: Page, criticalSelector: string) => {
  // Wait for the main content
  await page.waitForSelector(criticalSelector, { timeout: 15000 });

  // Wait for network to settle
  await page.waitForLoadState("networkidle");

  // Wait a bit more for any dynamic content
  await page.waitForTimeout(1000);
};

/**
 * Wait for modal to be fully opened
 */
export const waitForModal = async (page: Page, modalSelector: string) => {
  await page.waitForSelector(modalSelector, {
    state: "visible",
    timeout: 10000,
  });

  // Wait for modal animation to complete
  await page.waitForTimeout(300);
};

/**
 * Wait for API call to complete with specific response
 */
export const waitForApiResponse = async (
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus = 200,
) => {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matchesPattern =
        typeof urlPattern === "string"
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      return matchesPattern && response.status() === expectedStatus;
    },
    { timeout: 30000 },
  );

  return response;
};

/**
 * Wait for element to be stable (not moving/changing)
 */
export const waitForElementStable = async (page: Page, selector: string) => {
  const element = page.locator(selector);
  await expect(element).toBeVisible();

  // Wait for element position to stabilize
  let previousBox = await element.boundingBox();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    await page.waitForTimeout(100);
    const currentBox = await element.boundingBox();

    if (
      previousBox &&
      currentBox &&
      previousBox.x === currentBox.x &&
      previousBox.y === currentBox.y &&
      previousBox.width === currentBox.width &&
      previousBox.height === currentBox.height
    ) {
      break;
    }

    previousBox = currentBox;
    attempts++;
  }
};

/**
 * Wait for form submission to complete
 */
export const waitForFormSubmission = async (
  page: Page,
  submitButtonSelector: string,
  successIndicator: string,
) => {
  // Click submit and wait for loading state
  await page.click(submitButtonSelector);

  // Wait for either success or error state
  const outcome = await Promise.race([
    page
      .waitForSelector(successIndicator, { timeout: 30000 })
      .then(() => "success"),
    page
      .waitForSelector('[data-testid="error-message"]', { timeout: 30000 })
      .then(() => "error"),
  ]);

  return outcome;
};

/**
 * Retry an action with exponential backoff
 */
export const retryWithBackoff = async <T>(
  action: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000,
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};
