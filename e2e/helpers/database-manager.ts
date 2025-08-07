import { PrismaClient, User, Summary } from "@prisma/client";

/**
 * Test database management utilities
 */
export class TestDatabaseManager {
  private static prisma = new PrismaClient();

  /**
   * Setup clean test database state
   */
  static async setupTestDatabase() {
    console.log("🔧 Setting up test database...");

    try {
      // Clean up any existing test data
      await this.cleanup();

      // Seed with predictable test data
      const testData = await this.seedTestData();

      console.log("✅ Test database setup complete");
      return testData;
    } catch (error) {
      console.error("❌ Failed to setup test database:", error);
      throw error;
    }
  }

  /**
   * Create predictable test data
   */
  static async seedTestData() {
    // Create test users
    const testUsers = await this.createTestUsers();

    // Create test summaries for each user
    const testSummaries = await this.createTestSummaries(testUsers);

    return { testUsers, testSummaries };
  }

  /**
   * Create test users with different plan types
   */
  static async createTestUsers(): Promise<User[]> {
    const users: User[] = [];

    // Anonymous user (represented as special test user)
    const anonymousUser = await this.prisma.user.create({
      data: {
        id: "test-anonymous-user",
        email: "anonymous@test.com",
        firstName: "Anonymous",
        lastName: "User",
        imageUrl: "https://avatars.githubusercontent.com/u/1234?v=4",
        plan: "FREE",
        summariesCreated: 1,
        summariesThisMonth: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    users.push(anonymousUser);

    // Free user
    const freeUser = await this.prisma.user.create({
      data: {
        id: "test-free-user",
        clerkId: "test-free-clerk-id",
        email: "free@test.com",
        firstName: "Free",
        lastName: "User",
        imageUrl: "https://avatars.githubusercontent.com/u/5678?v=4",
        plan: "FREE",
        summariesCreated: 2,
        summariesThisMonth: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    users.push(freeUser);

    // Pro user
    const proUser = await this.prisma.user.create({
      data: {
        id: "test-pro-user",
        clerkId: "test-pro-clerk-id",
        email: "pro@test.com",
        firstName: "Pro",
        lastName: "User",
        imageUrl: "https://avatars.githubusercontent.com/u/9012?v=4",
        plan: "PRO",
        stripeCustomerId: "cus_test_pro_customer",
        stripeSubscriptionId: "sub_test_pro_subscription",
        subscriptionStatus: "active",
        summariesCreated: 15,
        summariesThisMonth: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    users.push(proUser);

    return users;
  }

  /**
   * Create test summaries for users
   */
  static async createTestSummaries(users: User[]): Promise<Summary[]> {
    const summaries: Summary[] = [];

    // Create summaries for each user type
    for (const user of users) {
      const userSummaries = await this.createSummariesForUser(user);
      summaries.push(...userSummaries);
    }

    return summaries;
  }

  /**
   * Create summaries for a specific user
   */
  static async createSummariesForUser(user: User): Promise<Summary[]> {
    const summaries: Summary[] = [];
    const summaryCount = user.plan === "PRO" ? 3 : 2;

    for (let i = 0; i < summaryCount; i++) {
      const summary = await this.prisma.summary.create({
        data: {
          id: `test-summary-${user.id}-${i + 1}`,
          userId: user.id,
          url: `https://youtube.com/watch?v=test-${user.plan.toLowerCase()}-${i + 1}`,
          videoId: `test-${user.plan.toLowerCase()}-${i + 1}`,
          videoTitle: `Test Video ${i + 1} - ${user.plan} User`,
          channelName: "Test Channel",
          duration: 600 + i * 120, // 10+ minutes
          thumbnailUrl: `https://img.youtube.com/vi/test-${user.plan.toLowerCase()}-${i + 1}/maxresdefault.jpg`,
          status: "COMPLETED",
          summary: this.generateTestSummaryContent(user.plan, i + 1),
          tldr: `This is a test TL;DR for ${user.plan} user summary ${i + 1}`,
          keyInsights: [
            `Key insight ${i + 1} for ${user.plan} user`,
            `Important point ${i + 1} about the video content`,
          ],
          keyMoments: [
            { timestamp: "0:30", description: "Introduction and overview" },
            { timestamp: "2:15", description: "Main topic discussion" },
            { timestamp: "5:45", description: "Key takeaways and conclusion" },
          ],
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Stagger creation dates
          updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        },
      });

      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Generate test summary content
   */
  static generateTestSummaryContent(
    userPlan: string,
    summaryNumber: number,
  ): string {
    return `
# Test Summary ${summaryNumber} for ${userPlan} User

This is a comprehensive test summary that includes multiple sections and detailed content to simulate real video summaries.

## Main Topics Covered

1. **Introduction**: Overview of the main concepts
2. **Deep Dive**: Detailed analysis of key points  
3. **Practical Applications**: Real-world use cases
4. **Conclusion**: Final thoughts and takeaways

## Key Points

- Important concept #1 with detailed explanation
- Critical insight #2 that viewers should remember
- Actionable advice #3 for implementation

## Technical Details

The content covers various technical aspects including:
- Implementation strategies
- Best practices and recommendations
- Common pitfalls to avoid
- Future considerations

This test content is designed to be substantial enough to test rendering performance and content display functionality.
    `.trim();
  }

  /**
   * Clean up all test data
   */
  static async cleanup() {
    console.log("🧹 Cleaning up test database...");

    try {
      // Delete in correct order due to foreign key constraints
      await this.prisma.summary.deleteMany({
        where: {
          OR: [
            { userId: { startsWith: "test-" } },
            { videoId: { startsWith: "test-" } },
            { url: { contains: "test-" } },
          ],
        },
      });

      await this.prisma.user.deleteMany({
        where: {
          OR: [
            { id: { startsWith: "test-" } },
            { clerkId: { startsWith: "test-" } },
            { email: { endsWith: "@test.com" } },
          ],
        },
      });

      console.log("✅ Test database cleanup complete");
    } catch (error) {
      console.error("⚠️  Error during test database cleanup:", error);
      // Don't throw - cleanup errors shouldn't fail tests
    }
  }

  /**
   * Get test user by type
   */
  static async getTestUser(
    userType: "anonymous" | "free" | "pro",
  ): Promise<User | null> {
    const userId = `test-${userType === "anonymous" ? "anonymous-" : ""}${userType}-user`;
    return await this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Get test summaries for a user
   */
  static async getTestSummaries(userId: string): Promise<Summary[]> {
    return await this.prisma.summary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create a specific test scenario
   */
  static async createTestScenario(
    scenario: "empty-library" | "full-library" | "rate-limited",
  ) {
    await this.cleanup();

    switch (scenario) {
      case "empty-library":
        // Create user but no summaries
        await this.prisma.user.create({
          data: {
            id: "test-empty-user",
            clerkId: "test-empty-clerk-id",
            email: "empty@test.com",
            firstName: "Empty",
            lastName: "User",
            plan: "PRO",
            summariesCreated: 0,
            summariesThisMonth: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        break;

      case "full-library":
        // Create user with maximum summaries
        const fullUser = await this.prisma.user.create({
          data: {
            id: "test-full-user",
            clerkId: "test-full-clerk-id",
            email: "full@test.com",
            firstName: "Full",
            lastName: "User",
            plan: "PRO",
            summariesCreated: 100,
            summariesThisMonth: 25,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create many summaries for performance testing
        for (let i = 0; i < 50; i++) {
          await this.prisma.summary.create({
            data: {
              id: `test-full-summary-${i}`,
              userId: fullUser.id,
              url: `https://youtube.com/watch?v=full-test-${i}`,
              videoId: `full-test-${i}`,
              videoTitle: `Performance Test Video ${i + 1}`,
              channelName: "Performance Test Channel",
              duration: 300 + i * 60,
              status: "COMPLETED",
              summary: `Performance test summary ${i + 1}`,
              tldr: `Performance test TL;DR ${i + 1}`,
              createdAt: new Date(Date.now() - i * 60 * 60 * 1000),
              updatedAt: new Date(Date.now() - i * 60 * 60 * 1000),
            },
          });
        }
        break;

      case "rate-limited":
        // Create user who has hit their limit
        await this.prisma.user.create({
          data: {
            id: "test-limited-user",
            clerkId: "test-limited-clerk-id",
            email: "limited@test.com",
            firstName: "Limited",
            lastName: "User",
            plan: "FREE",
            summariesCreated: 3, // At FREE limit
            summariesThisMonth: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        break;
    }
  }

  /**
   * Disconnect from database
   */
  static async disconnect() {
    await this.prisma.$disconnect();
  }
}
