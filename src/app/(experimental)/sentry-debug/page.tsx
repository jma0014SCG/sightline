"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

export default function SentryDebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Check if Sentry is initialized
    const client = Sentry.getClient();
    addLog(`Sentry Client: ${client ? 'Initialized ✅' : 'Not Found ❌'}`);
    addLog(`DSN: ${process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Set ✅' : 'Missing ❌'}`);
    addLog(`Environment: ${process.env.NODE_ENV}`);
  }, []);

  const testCaptureException = () => {
    addLog("Testing Sentry.captureException...");
    try {
      throw new Error("Manual test error from debug page");
    } catch (error) {
      Sentry.captureException(error);
      addLog("Exception sent to Sentry ✅");
    }
  };

  const testCaptureMessage = () => {
    addLog("Testing Sentry.captureMessage...");
    Sentry.captureMessage("Test message from Sentry debug page", "info");
    addLog("Message sent to Sentry ✅");
  };

  const testUndefinedFunction = () => {
    addLog("Testing undefined function...");
    try {
      // @ts-ignore - intentional error
      myUndefinedFunction();
    } catch (error) {
      addLog(`Caught error: ${error.message}`);
      Sentry.captureException(error);
    }
  };

  const testWithScope = () => {
    addLog("Testing with custom scope...");
    Sentry.withScope((scope) => {
      scope.setTag("test-type", "debug-page");
      scope.setContext("test-info", {
        page: "sentry-debug",
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      Sentry.captureMessage("Test with custom scope and context", "warning");
    });
    addLog("Scoped message sent ✅");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sentry Debug Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button 
          onClick={testCaptureException}
          className="bg-red-600 text-white px-4 py-3 rounded hover:bg-red-700"
        >
          Test Exception
        </button>
        
        <button 
          onClick={testCaptureMessage}
          className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700"
        >
          Test Message
        </button>
        
        <button 
          onClick={testUndefinedFunction}
          className="bg-purple-600 text-white px-4 py-3 rounded hover:bg-purple-700"
        >
          Test Undefined Function
        </button>
        
        <button 
          onClick={testWithScope}
          className="bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700"
        >
          Test With Scope
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-3">Debug Logs:</h2>
        <div className="space-y-1 font-mono text-sm max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="border-b border-gray-200 pb-1">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">Debugging Checklist:</h3>
        <ul className="text-yellow-700 space-y-1">
          <li>1. Check browser console for any Sentry initialization errors</li>
          <li>2. Verify your Sentry project exists and DSN is correct</li>
          <li>3. Check if errors appear in Sentry within 5-10 seconds</li>
          <li>4. Look in: Issues → All Issues in your Sentry dashboard</li>
          <li>5. Check your project's "Settings → Client Keys (DSN)" for the correct URL</li>
        </ul>
      </div>
    </div>
  );
}