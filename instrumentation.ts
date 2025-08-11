export async function register() {
  // OpenTelemetry kill switch - exit early if disabled
  if (process.env.NEXT_PUBLIC_OTEL !== '1' && process.env.OTEL_ENABLED !== '1') {
    console.log('📡 OpenTelemetry disabled via environment variables');
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
