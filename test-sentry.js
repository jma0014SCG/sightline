// Simple Node.js script to test Sentry connectivity
const { init, captureMessage } = require('@sentry/nextjs');

console.log('🔧 Testing Sentry connectivity...');
console.log('DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN);

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: 'test',
  debug: true,
});

console.log('📤 Sending test message to Sentry...');

captureMessage('Test message from Node.js script', 'info');

console.log('✅ Message sent! Check your Sentry dashboard in a few seconds.');
console.log('Dashboard: https://sightline.sentry.io/projects/javascript-nextjs/');

// Give it time to send
setTimeout(() => {
  process.exit(0);
}, 2000);