const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  eslint: {
    // Disable ESLint during builds (run separately in CI/scripts)
    ignoreDuringBuilds: false,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-markdown'],
  },
  // Bundle analyzer in development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        )
      }
      return config
    },
  }),
  images: {
    unoptimized: false, // Enable image optimization for better performance
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://img.clerk.com https://*.clerk.com; media-src 'self' https://www.youtube.com; connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.openai.com https://api.stripe.com wss://*.clerk.com https://clerk.com; frame-src 'self' https://www.youtube.com https://youtube.com https://accounts.google.com https://clerk.com https://*.clerk.accounts.dev https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
          }
        ],
      },
      // Cache static assets
      {
        source: '/(.*)\\.(js|css|woff|woff2|eot|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp|avif)$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      // Special headers for auth routes (no caching)
      {
        source: '/api/auth/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ],
      },
      // Cache other API responses for a short time
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60'
          }
        ],
      },
    ]
  },
}

// Wrap with Sentry config
module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Upload source maps to Sentry
    silent: true, // Suppresses all logs
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    
    // Configure source maps
    widenClientFileUpload: true, // Upload all client files
    transpileClientSDK: true, // Transpile SDK for compatibility
    
    // Hide source maps from public
    hideSourceMaps: true,
    
    // Ignore specific files
    ignore: ['node_modules', 'next.config.js'],
    
    // Release configuration
    release: {
      // Use Git commit SHA for release version
      name: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    },
  },
  {
    // Additional config options
    
    // Disable Sentry webpack plugin in development
    disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
    disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
    
    // Automatically tree-shake Sentry logger statements
    automaticVercelMonitors: true,
  }
)