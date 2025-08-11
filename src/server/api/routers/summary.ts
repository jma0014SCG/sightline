/**
 * Summary Router - Legacy compatibility wrapper
 * 
 * This file maintains backward compatibility while using the new modular architecture.
 * The actual router implementation is now in summaryRouter.ts with dependency injection.
 */
import { createDefaultSummaryRouter } from './summaryRouter'

// Export the router using the legacy pattern for compatibility
export const summaryRouter = createDefaultSummaryRouter()