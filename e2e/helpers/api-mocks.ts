import { Page, Route } from "@playwright/test";

/**
 * Comprehensive API mocking utilities for E2E tests
 */
export class TestApiMocks {
  /**
   * Setup mocks for summary creation flow
   */
  static async setupSummaryCreationMocks(
    page: Page,
    options: {
      shouldSucceed?: boolean;
      processingTime?: number;
      userType?: "anonymous" | "free" | "pro";
    } = {},
  ) {
    const {
      shouldSucceed = true,
      processingTime = 3000,
      userType = "anonymous",
    } = options;

    // Mock tRPC summary creation endpoint
    await page.route(
      "**/api/trpc/summary.createSummary*",
      async (route: Route) => {
        if (!shouldSucceed) {
          return route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                message: "Failed to process video",
                code: "INTERNAL_SERVER_ERROR",
              },
            }),
          });
        }

        // Simulate processing delay
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(processingTime, 5000)),
        );

        const summaryId = `test-summary-${Date.now()}`;
        const mockSummary = this.generateMockSummary(summaryId, userType);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: mockSummary,
            },
          }),
        });
      },
    );

    // Mock progress tracking endpoint
    await page.route("**/api/progress/**", async (route: Route) => {
      const progressStages = [
        { stage: "Extracting video information...", progress: 10 },
        { stage: "Downloading transcript...", progress: 30 },
        { stage: "Processing with AI...", progress: 60 },
        { stage: "Generating insights...", progress: 80 },
        { stage: "Finalizing summary...", progress: 95 },
        { stage: "Complete!", progress: 100 },
      ];

      // Simulate realistic progress updates
      const elapsed = Date.now() % processingTime;
      const progressIndex = Math.floor(
        (elapsed / processingTime) * progressStages.length,
      );
      const currentStage =
        progressStages[Math.min(progressIndex, progressStages.length - 1)];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentStage),
      });
    });
  }

  /**
   * Setup authentication mocks
   */
  static async setupAuthMocks(
    page: Page,
    userType: "anonymous" | "free" | "pro" = "anonymous",
  ) {
    if (userType === "anonymous") {
      // Mock anonymous user state
      await page.addInitScript(() => {
        // Clear any existing auth
        localStorage.clear();

        // Mock Clerk as not loaded/no user
        (window as any).__CLERK_PUBLISHABLE_KEY = "test-key";
        (window as any).Clerk = {
          loaded: true,
          user: null,
          session: null,
        };
      });
    } else {
      // Mock authenticated user
      const mockUser = this.generateMockUser(userType);

      await page.addInitScript(
        (userData) => {
          // Mock Clerk authentication
          (window as any).__CLERK_PUBLISHABLE_KEY = "test-key";
          (window as any).Clerk = {
            loaded: true,
            user: userData.user,
            session: userData.session,
          };

          // Set auth tokens
          localStorage.setItem("clerk-session", userData.sessionToken);
        },
        {
          user: mockUser.user,
          session: mockUser.session,
          sessionToken: mockUser.sessionToken,
        },
      );
    }

    // Mock auth-related API calls
    await page.route(
      "**/api/trpc/auth.getCurrentUser*",
      async (route: Route) => {
        if (userType === "anonymous") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: { data: null } }),
          });
        } else {
          const mockUser = this.generateMockUser(userType);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              result: {
                data: mockUser.dbUser,
              },
            }),
          });
        }
      },
    );
  }

  /**
   * Setup payment/billing mocks
   */
  static async setupPaymentMocks(page: Page) {
    // Mock Stripe checkout session creation
    await page.route(
      "**/api/trpc/billing.createCheckoutSession*",
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: {
                url: "https://checkout.stripe.com/test-session-url",
              },
            },
          }),
        });
      },
    );

    // Mock customer portal session
    await page.route(
      "**/api/trpc/billing.createPortalSession*",
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: {
                url: "https://billing.stripe.com/test-portal-url",
              },
            },
          }),
        });
      },
    );

    // Mock subscription status
    await page.route(
      "**/api/trpc/billing.getSubscription*",
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: {
                status: "active",
                currentPeriodEnd: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                plan: "PRO",
                cancelAtPeriodEnd: false,
              },
            },
          }),
        });
      },
    );
  }

  /**
   * Setup library/summary management mocks
   */
  static async setupLibraryMocks(page: Page, summaryCount = 5) {
    // Mock library summaries
    await page.route(
      "**/api/trpc/library.getSummaries*",
      async (route: Route) => {
        const mockSummaries = Array.from({ length: summaryCount }, (_, i) =>
          this.generateMockSummary(`library-summary-${i}`, "pro"),
        );

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: {
                summaries: mockSummaries,
                hasMore: false,
                total: summaryCount,
              },
            },
          }),
        });
      },
    );

    // Mock summary deletion
    await page.route(
      "**/api/trpc/library.deleteSummary*",
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: { data: { success: true } },
          }),
        });
      },
    );

    // Mock individual summary fetch
    await page.route(
      "**/api/trpc/summary.getSummary*",
      async (route: Route) => {
        const url = new URL(route.request().url());
        const summaryId = url.searchParams.get("input")?.includes("id")
          ? "detailed-test-summary"
          : "test-summary-1";

        const mockSummary = this.generateDetailedMockSummary(summaryId);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: { data: mockSummary },
          }),
        });
      },
    );
  }

  /**
   * Setup error scenarios for testing error boundaries
   */
  static async setupErrorMocks(
    page: Page,
    errorType: "500" | "404" | "timeout" | "network",
  ) {
    const mockError = (status: number, message: string) => ({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          message,
          code: status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
        },
      }),
    });

    switch (errorType) {
      case "500":
        await page.route("**/api/trpc/**", async (route: Route) => {
          await route.fulfill(mockError(500, "Internal server error"));
        });
        break;

      case "404":
        await page.route("**/api/trpc/**", async (route: Route) => {
          await route.fulfill(mockError(404, "Resource not found"));
        });
        break;

      case "timeout":
        await page.route("**/api/trpc/**", async (route: Route) => {
          // Delay longer than typical timeout
          await new Promise((resolve) => setTimeout(resolve, 35000));
          await route.fulfill(mockError(408, "Request timeout"));
        });
        break;

      case "network":
        await page.route("**/api/trpc/**", async (route: Route) => {
          await route.abort("failed");
        });
        break;
    }
  }

  /**
   * Generate mock summary data
   */
  private static generateMockSummary(id: string, userType: string) {
    return {
      id,
      userId: `test-${userType}-user`,
      url: `https://youtube.com/watch?v=${id}`,
      videoId: id,
      videoTitle: `Test Video - ${userType.charAt(0).toUpperCase() + userType.slice(1)} User`,
      channelName: "Test Channel",
      duration: 420, // 7 minutes
      thumbnailUrl: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      status: "COMPLETED",
      summary:
        "This is a test summary with multiple paragraphs of content to simulate a real video summary.",
      tldr: "Test TL;DR summary for E2E testing",
      keyInsights: [
        "Important insight #1",
        "Critical point #2",
        "Key takeaway #3",
      ],
      keyMoments: [
        { timestamp: "1:30", description: "Introduction and overview" },
        { timestamp: "3:45", description: "Main topic discussion" },
        { timestamp: "6:15", description: "Conclusion and next steps" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate detailed mock summary with rich content
   */
  private static generateDetailedMockSummary(id: string) {
    return {
      ...this.generateMockSummary(id, "pro"),
      summary: `
# Comprehensive Test Summary

This is a detailed test summary that includes multiple sections and rich content to test the summary viewer component.

## Main Topics Covered

1. **Introduction**: Overview of key concepts
2. **Deep Dive**: Detailed analysis and insights  
3. **Practical Applications**: Real-world use cases
4. **Conclusion**: Final thoughts and recommendations

## Key Points

- **Important Concept**: Detailed explanation of the first major point
- **Critical Insight**: Analysis of the second key insight
- **Actionable Advice**: Practical steps viewers can take

## Technical Details

The content includes technical information about:
- Implementation strategies and best practices
- Common challenges and how to overcome them
- Tools and resources for further learning

This test content is designed to be comprehensive enough to test all aspects of the summary viewer.
      `.trim(),
      categories: [
        { id: "cat-1", name: "Technology" },
        { id: "cat-2", name: "Education" },
      ],
      tags: [
        { id: "tag-1", name: "React", type: "TECHNOLOGY" },
        { id: "tag-2", name: "Testing", type: "CONCEPT" },
        { id: "tag-3", name: "JavaScript", type: "TECHNOLOGY" },
      ],
    };
  }

  /**
   * Generate mock user data
   */
  private static generateMockUser(userType: "free" | "pro") {
    const baseUser = {
      id: `test-${userType}-user`,
      clerkId: `test-${userType}-clerk-id`,
      email: `${userType}@test.com`,
      firstName: userType.charAt(0).toUpperCase() + userType.slice(1),
      lastName: "User",
      imageUrl: `https://avatars.githubusercontent.com/u/test-${userType}?v=4`,
      plan: userType.toUpperCase(),
      summariesCreated: userType === "pro" ? 15 : 2,
      summariesThisMonth: userType === "pro" ? 8 : 2,
    };

    return {
      user: {
        ...baseUser,
        primaryEmailAddress: { emailAddress: baseUser.email },
        firstName: baseUser.firstName,
        lastName: baseUser.lastName,
        imageUrl: baseUser.imageUrl,
      },
      session: {
        id: `test-session-${userType}`,
        userId: baseUser.id,
      },
      sessionToken: `test-session-token-${userType}-${Date.now()}`,
      dbUser: baseUser,
    };
  }

  /**
   * Clear all mocks
   */
  static async clearAllMocks(page: Page) {
    await page.unroute("**/*");
  }

  /**
   * Setup realistic network conditions
   */
  static async setupNetworkConditions(
    page: Page,
    condition: "slow" | "fast" | "offline",
  ) {
    switch (condition) {
      case "slow":
        // Simulate slow network
        await page.route("**/*", async (route: Route) => {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 + Math.random() * 2000),
          );
          await route.continue();
        });
        break;

      case "offline":
        // Simulate offline condition
        await page.route("**/*", async (route: Route) => {
          if (route.request().url().includes("api/")) {
            await route.abort("failed");
          } else {
            await route.continue();
          }
        });
        break;

      case "fast":
      default:
        // Normal network conditions (no additional delays)
        break;
    }
  }
}
