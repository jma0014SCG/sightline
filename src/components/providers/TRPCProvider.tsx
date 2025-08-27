'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useState } from 'react'
import superjson from 'superjson'
import { type AppRouter } from '@/server/api/root'

export const api = createTRPCReact<AppRouter>()

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes instead of 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
            retry: 2, // Reduce retries for faster failure
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false, // Disable aggressive refetching
          },
          mutations: {
            retry: 1, // Single retry for mutations
          },
        },
      })
  )

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers: () => {
            return {
              'x-trpc-source': 'client',
            }
          },
        }),
      ],
    })
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  )
}

function getBaseUrl() {
  if (typeof window !== 'undefined') return '' // browser: use relative URL
  // Vercel provides this automatically
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  // Fallback to explicit app URL for production
  if (process.env.APP_URL) return process.env.APP_URL // e.g., https://sightlineai.io
  // Local development fallback
  return `http://localhost:${process.env.PORT ?? 3000}`
}