// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === "development",

    // Edge runtime doesn't support all integrations
    integrations: [
      // Limited integrations available in edge runtime
    ],

    // Edge-specific error filtering
    ignoreErrors: [
      // Ignore non-actionable edge errors
      "Edge Runtime Error",
    ],

    // Before sending event
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.SENTRY_SEND_IN_DEV
      ) {
        console.error("[Sentry Dev]", hint.originalException || event);
        return null;
      }

      // Add edge context
      event.contexts = {
        ...event.contexts,
        runtime: {
          name: "edge",
        },
      };

      // Tag as edge error for filtering
      event.tags = {
        ...event.tags,
        runtime: "edge",
      };

      return event;
    },
  });
}
