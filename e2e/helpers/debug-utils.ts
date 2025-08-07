import { Page, TestInfo, expect } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

/**
 * Debugging utilities for E2E tests
 */
export class DebugUtils {
  private static debugDir = "test-results/debug";

  /**
   * Initialize debug directory
   */
  static async init() {
    try {
      await fs.mkdir(this.debugDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create debug directory:", error);
    }
  }

  /**
   * Capture comprehensive failure artifacts
   */
  static async captureFailureArtifacts(
    page: Page,
    testInfo: TestInfo,
    error?: Error,
  ) {
    const timestamp = Date.now();
    const testName = testInfo.title.replace(/[^a-zA-Z0-9]/g, "-");
    const baseFileName = `${testName}-failure-${timestamp}`;

    console.log(`🔍 Capturing failure artifacts for test: ${testInfo.title}`);

    try {
      // Ensure debug directory exists
      await this.init();

      // Capture screenshot
      await this.captureScreenshot(page, baseFileName);

      // Capture network logs
      await this.captureNetworkLogs(page, baseFileName);

      // Capture console logs
      await this.captureConsoleLogs(page, baseFileName);

      // Capture DOM snapshot
      await this.captureDOMSnapshot(page, baseFileName);

      // Capture browser info
      await this.captureBrowserInfo(page, baseFileName);

      // Capture error details
      if (error) {
        await this.captureErrorDetails(error, baseFileName);
      }

      // Capture test context
      await this.captureTestContext(testInfo, baseFileName);

      console.log(
        `✅ Debug artifacts saved to: ${this.debugDir}/${baseFileName}*`,
      );
    } catch (debugError) {
      console.error("❌ Failed to capture debug artifacts:", debugError);
    }
  }

  /**
   * Capture full page screenshot with scroll
   */
  static async captureScreenshot(page: Page, baseFileName: string) {
    try {
      // Full page screenshot
      await page.screenshot({
        path: path.join(this.debugDir, `${baseFileName}-screenshot.png`),
        fullPage: true,
        type: "png",
      });

      // Viewport screenshot for comparison
      await page.screenshot({
        path: path.join(this.debugDir, `${baseFileName}-viewport.png`),
        fullPage: false,
        type: "png",
      });
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
    }
  }

  /**
   * Capture network activity logs
   */
  static async captureNetworkLogs(page: Page, baseFileName: string) {
    try {
      const networkLogs = await page.evaluate(() => {
        const logs = (window as any).__networkLogs || [];
        return logs;
      });

      await fs.writeFile(
        path.join(this.debugDir, `${baseFileName}-network.json`),
        JSON.stringify(networkLogs, null, 2),
      );
    } catch (error) {
      console.error("Failed to capture network logs:", error);
    }
  }

  /**
   * Start network monitoring for a page
   */
  static async startNetworkMonitoring(page: Page) {
    await page.addInitScript(() => {
      (window as any).__networkLogs = [];
    });

    page.on("request", (request) => {
      page.evaluate(
        (requestData) => {
          (window as any).__networkLogs.push({
            type: "request",
            url: requestData.url,
            method: requestData.method,
            headers: requestData.headers,
            timestamp: Date.now(),
          });
        },
        {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        },
      );
    });

    page.on("response", (response) => {
      page.evaluate(
        (responseData) => {
          (window as any).__networkLogs.push({
            type: "response",
            url: responseData.url,
            status: responseData.status,
            headers: responseData.headers,
            timestamp: Date.now(),
          });
        },
        {
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
        },
      );
    });
  }

  /**
   * Capture console logs
   */
  static async captureConsoleLogs(page: Page, baseFileName: string) {
    try {
      const consoleLogs = await page.evaluate(() => {
        const logs = (window as any).__consoleLogs || [];
        return logs;
      });

      await fs.writeFile(
        path.join(this.debugDir, `${baseFileName}-console.json`),
        JSON.stringify(consoleLogs, null, 2),
      );
    } catch (error) {
      console.error("Failed to capture console logs:", error);
    }
  }

  /**
   * Start console monitoring for a page
   */
  static async startConsoleMonitoring(page: Page) {
    await page.addInitScript(() => {
      (window as any).__consoleLogs = [];

      // Override console methods to capture logs
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args: any[]) => {
        (window as any).__consoleLogs.push({
          type: "log",
          message: args.join(" "),
          timestamp: Date.now(),
        });
        originalLog.apply(console, args);
      };

      console.error = (...args: any[]) => {
        (window as any).__consoleLogs.push({
          type: "error",
          message: args.join(" "),
          timestamp: Date.now(),
        });
        originalError.apply(console, args);
      };

      console.warn = (...args: any[]) => {
        (window as any).__consoleLogs.push({
          type: "warn",
          message: args.join(" "),
          timestamp: Date.now(),
        });
        originalWarn.apply(console, args);
      };
    });
  }

  /**
   * Capture DOM snapshot
   */
  static async captureDOMSnapshot(page: Page, baseFileName: string) {
    try {
      const html = await page.content();
      await fs.writeFile(
        path.join(this.debugDir, `${baseFileName}-dom.html`),
        html,
      );
    } catch (error) {
      console.error("Failed to capture DOM snapshot:", error);
    }
  }

  /**
   * Capture browser and environment info
   */
  static async captureBrowserInfo(page: Page, baseFileName: string) {
    try {
      const browserInfo = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
        location: window.location.href,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        cookies: document.cookie,
        timestamp: new Date().toISOString(),
      }));

      await fs.writeFile(
        path.join(this.debugDir, `${baseFileName}-browser.json`),
        JSON.stringify(browserInfo, null, 2),
      );
    } catch (error) {
      console.error("Failed to capture browser info:", error);
    }
  }

  /**
   * Capture error details
   */
  static async captureErrorDetails(error: Error, baseFileName: string) {
    try {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(this.debugDir, `${baseFileName}-error.json`),
        JSON.stringify(errorInfo, null, 2),
      );
    } catch (debugError) {
      console.error("Failed to capture error details:", debugError);
    }
  }

  /**
   * Capture test context information
   */
  static async captureTestContext(testInfo: TestInfo, baseFileName: string) {
    try {
      const contextInfo = {
        title: testInfo.title,
        file: testInfo.file,
        line: testInfo.line,
        column: testInfo.column,
        project: testInfo.project.name,
        timeout: testInfo.timeout,
        retry: testInfo.retry,
        timestamp: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(this.debugDir, `${baseFileName}-context.json`),
        JSON.stringify(contextInfo, null, 2),
      );
    } catch (error) {
      console.error("Failed to capture test context:", error);
    }
  }

  /**
   * Wait for element with detailed debugging info
   */
  static async waitForElementWithDebug(
    page: Page,
    selector: string,
    options: {
      timeout?: number;
      state?: "visible" | "attached" | "detached" | "hidden";
    } = {},
  ) {
    const { timeout = 10000, state = "visible" } = options;

    console.log(
      `🔍 Waiting for element: ${selector} (state: ${state}, timeout: ${timeout}ms)`,
    );

    try {
      await page.waitForSelector(selector, { timeout, state });
      console.log(`✅ Element found: ${selector}`);
      return true;
    } catch (error) {
      console.error(`❌ Element not found: ${selector}`);

      // Provide debugging information
      const allElements = await page.locator("*").count();
      const matchingElements = await page.locator(selector).count();

      console.log(`📊 Debug info for selector: ${selector}`);
      console.log(`   - Total elements on page: ${allElements}`);
      console.log(`   - Matching elements: ${matchingElements}`);

      if (matchingElements > 0) {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible().catch(() => false);
        const isAttached = await element.count().then((c) => c > 0);

        console.log(`   - First match visible: ${isVisible}`);
        console.log(`   - First match attached: ${isAttached}`);
      }

      // List similar selectors
      await this.findSimilarSelectors(page, selector);

      throw error;
    }
  }

  /**
   * Find similar selectors for debugging
   */
  static async findSimilarSelectors(page: Page, targetSelector: string) {
    try {
      // Extract parts of the selector for similarity matching
      const selectorParts = targetSelector
        .replace(/[\[\]"']/g, "")
        .split(/[-_=]/);

      const similarSelectors = await page.evaluate((parts) => {
        const allElements = document.querySelectorAll("*");
        const similar: string[] = [];

        allElements.forEach((el) => {
          const testId = el.getAttribute("data-testid");
          const id = el.id;
          const className = el.className;

          if (testId) {
            const testIdParts = testId.split(/[-_]/);
            if (parts.some((part) => testIdParts.includes(part))) {
              similar.push(`[data-testid="${testId}"]`);
            }
          }

          if (id) {
            const idParts = id.split(/[-_]/);
            if (parts.some((part) => idParts.includes(part))) {
              similar.push(`#${id}`);
            }
          }
        });

        return [...new Set(similar)].slice(0, 5); // Limit to 5 suggestions
      }, selectorParts);

      if (similarSelectors.length > 0) {
        console.log(`💡 Similar selectors found:`);
        similarSelectors.forEach((sel) => console.log(`   - ${sel}`));
      }
    } catch (error) {
      console.error("Error finding similar selectors:", error);
    }
  }

  /**
   * Enhanced click with debugging
   */
  static async clickWithDebug(page: Page, selector: string, options: any = {}) {
    console.log(`🖱️  Attempting to click: ${selector}`);

    try {
      // Wait for element to be available
      await this.waitForElementWithDebug(page, selector);

      // Check if element is clickable
      const element = page.locator(selector);
      const isEnabled = await element.isEnabled();
      const isVisible = await element.isVisible();

      console.log(`   - Element enabled: ${isEnabled}`);
      console.log(`   - Element visible: ${isVisible}`);

      if (!isEnabled) {
        throw new Error(`Element ${selector} is not enabled`);
      }

      if (!isVisible) {
        throw new Error(`Element ${selector} is not visible`);
      }

      // Perform click
      await element.click(options);
      console.log(`✅ Successfully clicked: ${selector}`);
    } catch (error) {
      console.error(`❌ Failed to click: ${selector}`);
      throw error;
    }
  }

  /**
   * Enhanced form fill with debugging
   */
  static async fillWithDebug(page: Page, selector: string, value: string) {
    console.log(`📝 Attempting to fill: ${selector} with "${value}"`);

    try {
      await this.waitForElementWithDebug(page, selector);

      const element = page.locator(selector);
      await element.fill(value);

      // Verify the value was set
      const actualValue = await element.inputValue();
      if (actualValue !== value) {
        console.warn(`⚠️  Expected "${value}" but got "${actualValue}"`);
      }

      console.log(`✅ Successfully filled: ${selector}`);
    } catch (error) {
      console.error(`❌ Failed to fill: ${selector}`);
      throw error;
    }
  }

  /**
   * Performance monitoring
   */
  static async measurePerformance(
    page: Page,
    operation: () => Promise<void>,
    operationName: string,
  ) {
    console.log(`⏱️  Measuring performance for: ${operationName}`);

    const startTime = Date.now();

    // Start performance monitoring
    await page.addInitScript(() => {
      (window as any).__performanceStart = performance.now();
    });

    try {
      await operation();

      const endTime = Date.now();
      const duration = endTime - startTime;

      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded:
            navigation?.domContentLoadedEventEnd -
            navigation?.domContentLoadedEventStart,
          loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
          firstContentfulPaint: performance.getEntriesByName(
            "first-contentful-paint",
          )[0]?.startTime,
          largestContentfulPaint: performance.getEntriesByType(
            "largest-contentful-paint",
          )[0]?.startTime,
        };
      });

      console.log(`📊 Performance metrics for ${operationName}:`);
      console.log(`   - Total duration: ${duration}ms`);
      console.log(
        `   - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`,
      );
      console.log(`   - Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(
        `   - First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`,
      );
      console.log(
        `   - Largest Contentful Paint: ${performanceMetrics.largestContentfulPaint}ms`,
      );

      return {
        duration,
        ...performanceMetrics,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ Performance measurement failed for ${operationName} after ${duration}ms:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Clean up debug artifacts older than specified days
   */
  static async cleanupOldArtifacts(daysOld = 7) {
    try {
      const files = await fs.readdir(this.debugDir);
      const cutoffDate = Date.now() - daysOld * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.debugDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️  Cleaned up old debug artifact: ${file}`);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old debug artifacts:", error);
    }
  }
}
