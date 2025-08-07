import { FullConfig } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";

/**
 * Global setup for E2E tests
 * Ensures both servers are healthy before running tests
 */
export default async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting E2E test setup...");

  // Load environment variables
  dotenvConfig({ path: ".env.local" });
  dotenvConfig({ path: ".env" });

  // Wait for both servers to be healthy
  await waitForServerHealth();

  // Setup test database if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    await setupTestDatabase();
  } else {
    console.log("⚠️  DATABASE_URL not found, skipping database setup");
  }

  console.log("✅ E2E test setup complete");
}

async function waitForServerHealth() {
  const maxAttempts = 60; // 2 minutes total
  let attempts = 0;

  console.log("⏳ Waiting for servers to be healthy...");

  while (attempts < maxAttempts) {
    try {
      const fetch = (await import("node-fetch")).default;

      // Check frontend health
      const frontendResponse = await fetch("http://localhost:3000/api/health", {
        method: "GET",
        timeout: 5000,
      } as any);

      // Check backend health
      const backendResponse = await fetch("http://localhost:8000/health", {
        method: "GET",
        timeout: 5000,
      } as any);

      if (frontendResponse.ok && backendResponse.ok) {
        console.log("✅ Both servers are healthy");
        return;
      }
    } catch (error) {
      // Servers not ready yet, continue waiting
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
  }

  throw new Error("❌ Servers failed to become healthy within 2 minutes");
}

async function setupTestDatabase() {
  console.log("📊 Setting up test database...");

  try {
    // Reset database to clean state for tests
    const { execSync } = await import("child_process");
    execSync("pnpm db:push --force-reset", {
      stdio: "inherit",
      timeout: 30000,
    });

    console.log("✅ Test database setup complete");
  } catch (error) {
    console.error("❌ Failed to setup test database:", error);
    throw error;
  }
}
