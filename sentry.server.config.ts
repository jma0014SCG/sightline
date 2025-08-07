// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

    // Integrations for server-side
    integrations: [
      // Automatic instrumentation for database queries
      Sentry.prismaIntegration(),
    ],

    // Server-specific error filtering
    ignoreErrors: [
      // Ignore client-side errors that somehow make it to server logs
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
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

      // Sanitize database errors
      if (
        event.exception?.values?.[0]?.type === "PrismaClientKnownRequestError"
      ) {
        // Don't expose database schema in error messages
        if (event.exception.values[0].value) {
          event.exception.values[0].value = "Database operation failed";
        }
      }

      return event;
    },
  });
}
