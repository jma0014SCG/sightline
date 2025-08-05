import { OpenAI } from 'openai'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// Lazy initialization to prevent module load failures
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
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
- PERSON: Individual people, influencers, creators, experts
- COMPANY: Organizations, businesses, brands
- TECHNOLOGY: Technologies, programming languages, platforms
- PRODUCT: Specific products, apps, services
- CONCEPT: Abstract concepts, methodologies, principles
- FRAMEWORK: Frameworks, libraries, systems
- TOOL: Tools, software, applications

RULES:
- Only use categories from the predefined list
- Focus on the most relevant and specific entities
- Prioritize well-known entities over generic terms
- Use proper capitalization for names

Respond with ONLY a valid JSON object in this format:
{
  "categories": ["Category1", "Category2"], 
  "tags": [
    {"name": "Entity Name", "type": "PERSON"},
    {"name": "Another Entity", "type": "COMPANY"}
  ]
}`

    console.log('🏷️ [CLASSIFICATION] Sending request to OpenAI...')
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Using the faster, cheaper model for classification
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 500
    })

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

    // Store the classification in database
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