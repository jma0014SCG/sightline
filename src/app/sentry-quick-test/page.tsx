"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryQuickTest() {
  const testSentry = () => {
    console.log("🔧 Testing Sentry from browser...");
    console.log("DSN available:", !!process.env.NEXT_PUBLIC_SENTRY_DSN);
    console.log("DSN value:", process.env.NEXT_PUBLIC_SENTRY_DSN);
    console.log("Sentry client:", !!Sentry.getClient());
    console.log("Environment:", process.env.NODE_ENV);
    console.log("SENTRY_SEND_IN_DEV:", process.env.SENTRY_SEND_IN_DEV);
    
    // Check if events are being filtered
    const client = Sentry.getClient();
    if (client) {
      console.log("Client options:", client.getOptions());
    }
    
    console.log("📤 Sending test message...");
    Sentry.captureMessage("Test message from browser - " + new Date().toISOString(), "info");
    
    console.log("📤 Sending test exception...");
    try {
      throw new Error("Test error from browser - " + new Date().toISOString());
    } catch (error) {
      Sentry.captureException(error);
    }
    
    // Test with custom scope
    console.log("📤 Sending with scope...");
    Sentry.withScope((scope) => {
      scope.setTag("test", "browser-debug");
      scope.setLevel("error");
      Sentry.captureMessage("Scoped test message - " + new Date().toISOString());
    });
    
    console.log("✅ All test events sent!");
    alert("Test events sent to Sentry! Check your dashboard and browser Network tab.");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sentry Quick Test</h1>
      <p className="mb-4">DSN: {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ Loaded' : '❌ Missing'}</p>
      <p className="mb-4">Environment: {process.env.NODE_ENV}</p>
      <button 
        onClick={testSentry}
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
      >
        Send Test Events to Sentry
      </button>
    </div>
  );
}