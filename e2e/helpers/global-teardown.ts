import { FullConfig } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";

/**
 * Global teardown for E2E tests
 * Cleanup after all tests complete
 */
export default async function globalTeardown(config: FullConfig) {
  console.log("🧹 Starting E2E test teardown...");

  // Load environment variables
  dotenvConfig({ path: ".env.local" });
  dotenvConfig({ path: ".env" });

  // Cleanup test database if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    await cleanupTestDatabase();
  } else {
    console.log("⚠️  DATABASE_URL not found, skipping database cleanup");
  }

  console.log("✅ E2E test teardown complete");
}

async function cleanupTestDatabase() {
  console.log("🗑️  Cleaning up test database...");

  try {
    // Clean up any test data that might remain
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    // Remove test users and related data
    await prisma.summary.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: "test-" } },
          { videoTitle: { contains: "test" } },
          { url: { contains: "test" } },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { startsWith: "test-" } },
          { clerkId: { startsWith: "test-" } },
        ],
      },
    });

    await prisma.$disconnect();
    console.log("✅ Test database cleanup complete");
  } catch (error) {
    console.error("⚠️  Error during database cleanup:", error);
    // Don't throw - cleanup errors shouldn't fail the test suite
  }
}
