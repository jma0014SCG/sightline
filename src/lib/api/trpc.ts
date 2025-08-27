/**
 * tRPC Client Setup
 * Centralized tRPC client configuration with explicit type imports
 */

import { createTRPCReact } from '@trpc/react-query'
import { type AppRouter } from './types'

/**
 * Create typed tRPC React client
 * This ensures consistent type inference across all environments
 */
export const api = createTRPCReact<AppRouter>()

// Export type helpers for use in components
export type { RouterInputs, RouterOutputs, AppRouter } from './types'