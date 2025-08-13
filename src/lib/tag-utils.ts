/**
 * Tag utilities for consistent tag color and type management
 * across the application
 */

export enum TagType {
  PERSON = 'PERSON',
  COMPANY = 'COMPANY',
  TECHNOLOGY = 'TECHNOLOGY',
  PRODUCT = 'PRODUCT',
  CONCEPT = 'CONCEPT',
  FRAMEWORK = 'FRAMEWORK',
  TOOL = 'TOOL',
  DEFAULT = 'DEFAULT'
}

export const TAG_COLORS = {
  [TagType.PERSON]: 'bg-blue-100 text-blue-700 border-blue-200',
  [TagType.COMPANY]: 'bg-green-100 text-green-700 border-green-200',
  [TagType.TECHNOLOGY]: 'bg-orange-100 text-orange-700 border-orange-200',
  [TagType.PRODUCT]: 'bg-pink-100 text-pink-700 border-pink-200',
  [TagType.CONCEPT]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  [TagType.FRAMEWORK]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [TagType.TOOL]: 'bg-teal-100 text-teal-700 border-teal-200',
  [TagType.DEFAULT]: 'bg-gray-100 text-gray-700 border-gray-200'
} as const

export const TAG_COLORS_HOVER = {
  [TagType.PERSON]: 'hover:bg-blue-200 hover:border-blue-300',
  [TagType.COMPANY]: 'hover:bg-green-200 hover:border-green-300',
  [TagType.TECHNOLOGY]: 'hover:bg-orange-200 hover:border-orange-300',
  [TagType.PRODUCT]: 'hover:bg-pink-200 hover:border-pink-300',
  [TagType.CONCEPT]: 'hover:bg-indigo-200 hover:border-indigo-300',
  [TagType.FRAMEWORK]: 'hover:bg-yellow-200 hover:border-yellow-300',
  [TagType.TOOL]: 'hover:bg-teal-200 hover:border-teal-300',
  [TagType.DEFAULT]: 'hover:bg-gray-200 hover:border-gray-300'
} as const

/**
 * Get the color classes for a tag based on its type
 * @param type - The tag type
 * @returns CSS classes for the tag
 */
export const getTagColor = (type: string): string => {
  return TAG_COLORS[type as TagType] || TAG_COLORS[TagType.DEFAULT]
}

/**
 * Get the hover color classes for a tag based on its type
 * @param type - The tag type
 * @returns CSS hover classes for the tag
 */
export const getTagHoverColor = (type: string): string => {
  return TAG_COLORS_HOVER[type as TagType] || TAG_COLORS_HOVER[TagType.DEFAULT]
}

/**
 * Get the color classes for a category
 * @returns CSS classes for categories
 */
export const getCategoryColor = () => 'bg-purple-100 text-purple-700 border-purple-200'

/**
 * Get the hover color classes for a category
 * @returns CSS hover classes for categories
 */
export const getCategoryHoverColor = () => 'hover:bg-purple-200 hover:border-purple-300'

/**
 * Format a count for display (e.g., 1.2K, 45M)
 * @param count - The number to format
 * @returns Formatted string
 */
export const formatCount = (count: number | null | undefined): string | null => {
  if (!count || count === 0) return null
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}