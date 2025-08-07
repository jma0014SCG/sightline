import { test, expect } from "@playwright/test";
import { SELECTORS } from "./helpers/selectors";
import { waitForPageLoad } from "./helpers/wait-utils";

test.describe("Landing Page", () => {
  test("displays landing page correctly", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

    // Check hero section - updated to match actual content
    await expect(page.getByText("Turn YouTube videos into")).toBeVisible();
    await expect(page.getByText("instant insights")).toBeVisible();

    // Check URL input form - using new selectors
    await expect(page.locator(SELECTORS.FORMS.urlInput)).toBeVisible();
    await expect(page.locator(SELECTORS.FORMS.submitButton)).toBeVisible();

    // Check subheadline
    await expect(
      page.getByText("Stop queuing videos. Start absorbing insights."),
    ).toBeVisible();
  });

  test("shows pricing information", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

    // Scroll to pricing section
    await page.locator("#pricing").scrollIntoViewIfNeeded();

    // Check pricing plans - be more specific with headings
    await expect(page.locator("#FREE")).toBeVisible();
    await expect(page.locator("#PRO")).toBeVisible();
    await expect(page.getByText("$9.99")).toBeVisible();
  });

  test("URL validation works correctly", async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

    // Using new centralized selectors
    const urlInput = page.locator(SELECTORS.FORMS.urlInput);
    const submitButton = page.locator(SELECTORS.FORMS.submitButton);

    // Test invalid URL
    await urlInput.fill("not-a-valid-url");
    await submitButton.click();
    await expect(page.locator(SELECTORS.ERRORS.message)).toBeVisible({
      timeout: 5000,
    });

    // Test non-YouTube URL
    await urlInput.fill("https://example.com");
    await submitButton.click();
    await expect(page.locator(SELECTORS.ERRORS.message)).toBeVisible({
      timeout: 5000,
    });

    // Test valid YouTube URL format
    await urlInput.fill("https://youtube.com/watch?v=dQw4w9WgXcQ");
    // Should not show validation error
    await expect(page.locator(SELECTORS.ERRORS.message)).not.toBeVisible();
  });

  test("responsive design works on mobile", async ({ page, isMobile }) => {
    if (!isMobile) return;

    await page.goto("/");
    await waitForPageLoad(page, SELECTORS.FORMS.summaryCreation);

    // Check mobile menu functionality
    const menuButton = page.getByRole("button", { name: /menu/i }).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(page.getByRole("navigation")).toBeVisible();
    }

    // Check responsive layout - updated to match actual content
    await expect(page.getByText("Turn YouTube videos into")).toBeVisible();
    await expect(page.locator(SELECTORS.FORMS.urlInput)).toBeVisible();
  });
});
