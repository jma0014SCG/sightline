"use client";

export default function SentryTestPage() {
  const triggerError = () => {
    // This will throw: ReferenceError: myUndefinedFunction is not defined
    myUndefinedFunction();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sentry Error Test</h1>
      <button 
        onClick={triggerError}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Trigger Error
      </button>
    </div>
  );
}