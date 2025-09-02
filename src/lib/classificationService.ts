import { OpenAI } from 'openai'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// Lazy initialization to prevent module load failures
let openai: OpenAI | null = null

/**
 * Get or initialize the OpenAI client instance
 * 
 * Uses lazy initialization to prevent module load failures when OpenAI API key
 * is not available. Returns null if the API key is missing or initialization fails.
 * 
 * @returns {OpenAI | null} The OpenAI client instance, or null if unavailable
 * @example
 * ```typescript
 * const client = getOpenAIClient()
 * if (client) {
 *   // Use client for API calls
 * }
 * ```
 * 
 * @category AI
 * @since 1.0.0
 */
function getOpenAIClient(): OpenAI | null {
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY,
        // Reduced timeout to work within Vercel's 60-second limit
        timeout: 35000, // 35 seconds (leaving buffer for Vercel and database operations)
        maxRetries: 1, // Single retry to stay within time limit
      })
    } catch (error) {
      logger.error('Failed to initialize OpenAI client', { error })
      return null
    }
  }
  return openai
}

interface ClassificationResult {
  categories: string[]
  tags: { name: string; type: string }[]
}

const PREDEFINED_CATEGORIES = [
  'Productivity',
  'Technology', 
  'Business',
  'Marketing',
  'Finance',
  'Health',
  'Personal Development',
  'Art & Design',
  'Education',
  'Entertainment',
  'Science',
  'Startup',
  'Programming',
  'AI & Machine Learning'
]

const TAG_TYPES = {
  PERSON: 'PERSON',
  COMPANY: 'COMPANY', 
  TECHNOLOGY: 'TECHNOLOGY',
  PRODUCT: 'PRODUCT',
  CONCEPT: 'CONCEPT',
  FRAMEWORK: 'FRAMEWORK',
  TOOL: 'TOOL'
} as const

/**
 * Classify video summary content using AI to extract categories and tags
 * 
 * Uses OpenAI's GPT-4o-mini model to analyze video content and automatically extract
 * relevant categories and entity tags. Handles the complete workflow from AI analysis
 * to database storage. Gracefully handles failures without breaking summary creation.
 * 
 * NOTE: Timeouts are limited to 45 seconds due to Vercel's 60-second function execution limit.
 * If classification takes longer, it will timeout gracefully without affecting summary creation.
 * 
 * @param {string} summaryId - The unique identifier of the summary to classify
 * @param {string} content - The video summary content to analyze
 * @param {string} [videoTitle] - Optional video title for additional context
 * @returns {Promise<ClassificationResult | null>} Classification results or null if failed
 * @example
 * ```typescript
 * const result = await classifySummaryContent(
 *   'summary-123',
 *   'This video covers React hooks and state management...',
 *   'React Hooks Tutorial'
 * )
 * 
 * if (result) {
 *   console.log('Categories:', result.categories)
 *   console.log('Tags:', result.tags)
 * }
 * ```
 * 
 * @category AI
 * @since 1.0.0
 */
export async function classifySummaryContent(summaryId: string, content: string, videoTitle?: string) {
  try {
    console.log('🏷️ [CLASSIFICATION] Starting classification for summary:', summaryId)
    console.log('🏷️ [CLASSIFICATION] Video title:', videoTitle)
    console.log('🏷️ [CLASSIFICATION] Content length:', content.length)
    
    // Get OpenAI client (lazy-loaded)
    const client = getOpenAIClient()
    if (!client) {
      console.warn('🏷️ [CLASSIFICATION] OpenAI client not available, skipping classification', { summaryId })
      logger.warn('OpenAI client not available, skipping classification', { summaryId })
      return null
    }

    console.log('🏷️ [CLASSIFICATION] OpenAI client available, proceeding with classification')
    logger.info('Starting content classification', { summaryId })
    
    // Create input text from content and title
    const inputText = `${videoTitle ? `Title: ${videoTitle}\n\n` : ''}Content: ${content}`
    
    // Limit content length to avoid token limits
    const truncatedContent = inputText.slice(0, 8000)
    
    const prompt = `Analyze the following YouTube video content and classify it.

INPUT:
"""
${truncatedContent}
"""

TASK:
1. Assign 2-4 broad categories from this list: ${PREDEFINED_CATEGORIES.join(', ')}
2. Extract up to 8 specific entities (people, companies, products, technologies, concepts, frameworks, tools) and label their type.

ENTITY TYPES:
- PERSON: Individual people, influencers, creators, experts (ALWAYS use full names, never just first names)
- COMPANY: Organizations, businesses, brands (use official/complete names)
- TECHNOLOGY: Technologies, programming languages, platforms, protocols
- PRODUCT: Specific products, apps, services (use official product names)
- CONCEPT: Abstract concepts, methodologies, principles, theories
- FRAMEWORK: Frameworks, libraries, systems (include version if mentioned)
- TOOL: Tools, software, applications (use official tool names)

CRITICAL RULES:
- Only use categories from the predefined list
- For PERSON entities: ALWAYS use complete full names (e.g., "Elon Musk" not "Elon", "Steve Jobs" not "Steve")
- Focus on the most important and relevant entities mentioned multiple times
- Prioritize specific, recognizable entities over generic terms
- Use proper capitalization and official naming conventions
- Quality over quantity: Better to have 4 high-quality tags than 8 mediocre ones
- Only extract entities that are substantively discussed, not just mentioned in passing

Respond with ONLY a valid JSON object in this format:
{
  "categories": ["Category1", "Category2"], 
  "tags": [
    {"name": "Entity Name", "type": "PERSON"},
    {"name": "Another Entity", "type": "COMPANY"}
  ]
}`

    console.log('🏷️ [CLASSIFICATION] Sending request to OpenAI...')
    const startTime = Date.now()
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Using the faster, cheaper model for classification
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 500
    }, {
      // Reduced timeout to work within Vercel's 60-second limit
      timeout: 35000, // 35 seconds (leaving buffer for Vercel and database operations)
    })
    
    const apiDuration = Date.now() - startTime
    console.log(`🏷️ [CLASSIFICATION] OpenAI API call took ${apiDuration}ms`)

    console.log('🏷️ [CLASSIFICATION] Received response from OpenAI')

    if (!response.choices[0]?.message?.content) {
      console.error('🏷️ [CLASSIFICATION] No response content from OpenAI')
      throw new Error('No response from OpenAI')
    }

    console.log('🏷️ [CLASSIFICATION] Raw response:', response.choices[0].message.content)
    const result = JSON.parse(response.choices[0].message.content) as ClassificationResult
    console.log('🏷️ [CLASSIFICATION] Parsed result:', result)

    // Validate the response structure
    if (!result.categories || !Array.isArray(result.categories)) {
      throw new Error('Invalid categories in response')
    }
    if (!result.tags || !Array.isArray(result.tags)) {
      throw new Error('Invalid tags in response')
    }

    // Filter categories to only include predefined ones
    const validCategories = result.categories
      .filter(cat => PREDEFINED_CATEGORIES.includes(cat))
      .slice(0, 4) // Limit to 4 categories max

    // Validate and clean tags
    const validTags = result.tags
      .filter(tag => 
        tag.name && 
        tag.type && 
        Object.values(TAG_TYPES).includes(tag.type as any) &&
        tag.name.length <= 100 // Reasonable length limit
      )
      .slice(0, 8) // Limit to 8 tags max

    console.log('🏷️ [CLASSIFICATION] Valid categories:', validCategories)
    console.log('🏷️ [CLASSIFICATION] Valid tags:', validTags)
    
    logger.info('Classification completed', { 
      summaryId, 
      categoriesCount: validCategories.length,
      tagsCount: validTags.length
    })

    // Store the classification in database with increased timeout
    console.log('🏷️ [CLASSIFICATION] Starting database transaction...')
    await prisma.$transaction(async (tx) => {
      // Connect categories
      if (validCategories.length > 0) {
        console.log('🏷️ [CLASSIFICATION] Connecting categories:', validCategories)
        await tx.summary.update({
          where: { id: summaryId },
          data: {
            categories: {
              connectOrCreate: validCategories.map(name => ({
                where: { name },
                create: { name },
              })),
            },
          },
        })
        console.log('🏷️ [CLASSIFICATION] Categories connected successfully')
      }

      // Connect tags
      if (validTags.length > 0) {
        console.log('🏷️ [CLASSIFICATION] Connecting tags:', validTags)
        await tx.summary.update({
          where: { id: summaryId },
          data: {
            tags: {
              connectOrCreate: validTags.map(tag => ({
                where: { name: tag.name },
                create: { 
                  name: tag.name, 
                  type: tag.type 
                },
              })),
            },
          },
        })
        console.log('🏷️ [CLASSIFICATION] Tags connected successfully')
      }
    }, {
      maxWait: 5000, // Maximum time to wait for a transaction slot (5 seconds)
      timeout: 5000, // Maximum time the transaction can run (5 seconds)
    })

    console.log('🏷️ [CLASSIFICATION] Database transaction completed successfully')
    logger.info('Classification stored successfully', { 
      summaryId,
      categories: validCategories,
      tags: validTags.map(t => `${t.name} (${t.type})`)
    })

    console.log('🏷️ [CLASSIFICATION] ✅ Classification completed successfully for summary:', summaryId)
    return {
      categories: validCategories,
      tags: validTags
    }

  } catch (error) {
    console.error('🏷️ [CLASSIFICATION] ❌ Classification failed for summary:', summaryId, error)
    logger.error('Failed to classify summary content', { 
      summaryId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Don't throw - classification failures shouldn't break summary creation
    // Just log the error and continue
    return null
  }
}

/**
 * Get all tags associated with a user's summaries
 * 
 * Retrieves tags from summaries belonging to the specified user, including usage counts.
 * Tags are ordered by frequency (most used first) then alphabetically. Skips processing
 * for anonymous users and handles database errors gracefully.
 * 
 * @param {string} userId - The user ID to fetch tags for
 * @returns {Promise<Array<{id: string, name: string, type: string, count: number}>>} Array of tags with usage counts
 * @example
 * ```typescript
 * const userTags = await getTagsForUser('user-123')
 * userTags.forEach(tag => {
 *   console.log(`${tag.name} (${tag.type}): used ${tag.count} times`)
 * })
 * ```
 * 
 * @category AI
 * @since 1.0.0
 */
export async function getTagsForUser(userId: string) {
  try {
    // Skip for anonymous users
    if (userId === 'ANONYMOUS_USER') {
      return []
    }

    const tags = await prisma.tag.findMany({
      where: {
        summaries: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        _count: {
          select: {
            summaries: {
              where: {
                userId: userId
              }
            }
          }
        }
      },
      orderBy: [
        {
          summaries: {
            _count: 'desc'
          }
        },
        { name: 'asc' }
      ]
    })

    return tags.map(tag => ({
      ...tag,
      count: tag._count.summaries
    }))
  } catch (error) {
    logger.error('Failed to fetch user tags', { userId, error })
    return []
  }
}

/**
 * Get all categories associated with a user's summaries
 * 
 * Retrieves categories from summaries belonging to the specified user, including usage counts.
 * Categories are ordered by frequency (most used first) then alphabetically. Skips processing
 * for anonymous users and handles database errors gracefully.
 * 
 * @param {string} userId - The user ID to fetch categories for
 * @returns {Promise<Array<{id: string, name: string, count: number}>>} Array of categories with usage counts
 * @example
 * ```typescript
 * const userCategories = await getCategoriesForUser('user-123')
 * userCategories.forEach(category => {
 *   console.log(`${category.name}: used ${category.count} times`)
 * })
 * ```
 * 
 * @category AI
 * @since 1.0.0
 */
export async function getCategoriesForUser(userId: string) {
  try {
    // Skip for anonymous users
    if (userId === 'ANONYMOUS_USER') {
      return []
    }

    const categories = await prisma.category.findMany({
      where: {
        summaries: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        _count: {
          select: {
            summaries: {
              where: {
                userId: userId
              }
            }
          }
        }
      },
      orderBy: [
        {
          summaries: {
            _count: 'desc'
          }
        },
        { name: 'asc' }
      ]
    })

    return categories.map(category => ({
      ...category,
      count: category._count.summaries
    }))
  } catch (error) {
    logger.error('Failed to fetch user categories', { userId, error })
    return []
  }
}