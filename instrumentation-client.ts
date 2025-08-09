import * as Sentry from "@sentry/nextjs";

// Export the required router transition hook
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Client-side integrations
    integrations: [
      // Temporarily disabled replayIntegration due to compatibility issue
      // Sentry.replayIntegration({
      //   // Additional replay settings
      //   maskAllText: process.env.NODE_ENV === "production",
      //   blockAllMedia: process.env.NODE_ENV === "production",
      // }),
    ],

    // Client-specific error filtering
    ignoreErrors: [
      // Ignore known client-side errors
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "AbortError",
      "Non-Error promise rejection captured",
      "Network Error",
      "Load failed",
      "Script error",
      "ChunkLoadError",
      "Loading chunk",
      // Clerk authentication errors that are handled
      "ClerkJS: Failed to load user",
      "ClerkJS: Unable to complete OAuth flow",
    ],

    // Before sending event
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.NEXT_PUBLIC_SENTRY_SEND_IN_DEV
      ) {
        console.error("[Sentry Dev]", hint.originalException || event);
        return null;
      }

      return event;
    },
  });
}

// Helper to set user context in Sentry
export function setSentryUser(user: {
  id: string;
  email?: string;
  name?: string;
  plan?: string;
} | null) {
  Sentry.setUser(user ? {
    id: user.id,
    email: user.email,
    username: user.name,
    subscription: user.plan,
  } : null);
}

// Helper to capture client errors with context
export function captureClientError(
  error: Error,
  context: {
    component?: string;
    action?: string;
    userId?: string;
    [key: string]: any;
  },
) {
  Sentry.withScope((scope) => {
    scope.setTag("type", "client_error");
    scope.setContext("client", context);

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context.component) {
      scope.setTag("component", context.component);
    }

    Sentry.captureException(error);
  });
}

// Helper to track user interactions
export function trackUserInteraction(
  action: string,
  component: string,
  metadata?: Record<string, any>,
) {
  Sentry.addBreadcrumb({
    message: `User interaction: ${action}`,
    category: "ui.interaction",
    data: {
      component,
      ...metadata,
    },
    level: "info",
  });
}