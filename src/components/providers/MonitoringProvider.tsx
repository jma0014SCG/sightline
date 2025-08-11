"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

// Use client-side monitoring utilities
import { startPerformanceMonitoring, monitoring } from "@/lib/monitoring.client";

// Lazy import client-side dependencies only
const lazySetSentryUser = () => import("../../../instrumentation-client").then(m => m.setSentryUser)

import { api } from "@/lib/api/trpc";

export function MonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const { data: dbUser } = api.auth.getCurrentUser.useQuery(undefined, {
    enabled: !!user && typeof window !== "undefined",
  });

  useEffect(() => {
    // Start performance monitoring
    startPerformanceMonitoring();

    // Set Sentry user context when auth state changes
    if (isLoaded) {
      if (user && dbUser) {
        lazySetSentryUser().then(({ setSentryUser }) => {
          setSentryUser({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.firstName || undefined,
            plan: dbUser.plan || "FREE",
          });
        }).catch(() => {
          console.log('📡 Sentry user context unavailable');
        });

        // Track user plan for monitoring
        monitoring.logMetric({
          name: "user_session",
          value: 1,
          tags: {
            plan: dbUser.plan || "FREE",
            status: dbUser.stripeSubscriptionId ? "active" : "inactive",
          },
        });
      } else {
        lazySetSentryUser().then(({ setSentryUser }) => {
          setSentryUser(null);
        }).catch(() => {
          // Silent fail for Sentry unavailable
        });
      }
    }
  }, [user, dbUser, isLoaded]);

  // Log page views for analytics
  useEffect(() => {
    if (typeof window !== "undefined") {
      monitoring.logUserAction("page_view", {
        path: window.location.pathname,
        referrer: document.referrer,
      });
    }
  }, []);

  return <>{children}</>;
}