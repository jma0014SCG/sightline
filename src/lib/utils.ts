import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine and merge CSS classes with proper Tailwind CSS conflict resolution
 * 
 * Combines multiple class values using clsx and resolves Tailwind CSS class conflicts
 * with tailwind-merge. Essential utility for conditional styling and dynamic class
 * composition throughout the application.
 * 
 * @param {...ClassValue} inputs - Class values to combine (strings, objects, arrays, conditionals)
 * @returns {string} Merged and deduplicated class string
 * @example
 * ```typescript
 * // Basic usage
 * cn('px-4 py-2', 'bg-blue-500') // 'px-4 py-2 bg-blue-500'
 * 
 * // Conditional classes
 * cn('btn', { 'btn-primary': isPrimary, 'btn-disabled': isDisabled })
 * 
 * // Tailwind conflict resolution
 * cn('p-4', 'p-6') // 'p-6' (later class wins)
 * cn('text-red-500', 'text-blue-600') // 'text-blue-600'
 * ```
 * 
 * @category UI
 * @since 1.0.0
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}