import { defineConfig, devices } from "@playwright/test";

/**
 * Health check utility for servers
 */
async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const fetch = await import("node-fetch").then((m) => m.default);
    const response = await fetch(url, { timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel - reduce for stability */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Enhanced retry strategy */
  retries: process.env.CI ? 3 : 1,
  /* Reduce workers for better stability */
  workers: process.env.CI ? 2 : 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
    ["list"],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Capture screenshot after each test failure */
    screenshot: "only-on-failure",

    /* Record video for failed tests */
    video: "retain-on-failure",

    /* Enhanced timeouts for stability */
    actionTimeout: 15000,
    navigationTimeout: 30000,

    /* Wait for network to be idle */
    waitUntil: "networkidle",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    /* Test against branded browsers. */
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],

  /* Run your local dev servers before starting the tests */
  webServer: {
    command: "pnpm dev:full",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // 3 minutes to start both servers
  },

  /* Global setup and teardown - temporarily disabled for testing */
  // globalSetup: './e2e/helpers/global-setup.ts',
  // globalTeardown: './e2e/helpers/global-teardown.ts',
});
