/**
 * Centralized tRPC type exports
 * Ensures consistent type inference across build environments
 */

import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server'
import { type AppRouter } from '@/server/api/root'

/**
 * Inference helpers for the app router
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

// Re-export AppRouter for convenience
export type { AppRouter }