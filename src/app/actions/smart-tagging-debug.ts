"use server";

import { prisma } from '@/lib/db/prisma';

export async function getSmartTaggingStatus() {
  try {
    // Check if Tag and Category tables exist and have data
    const [tagCount, categoryCount] = await Promise.all([
      prisma.tag.count(),
      prisma.category.count()
    ]);
    
    // Get recent summaries and their classifications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSummaries = await prisma.summary.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        categories: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get all available tags with their usage counts
    const allTags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            summaries: true
          }
        }
      },
      orderBy: [
        {
          summaries: {
            _count: 'desc'
          }
        },
        {
          createdAt: 'desc'
        }
      ],
      take: 20
    });

    // Get all available categories with usage counts  
    const allCategories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            summaries: true
          }
        }
      },
      orderBy: [
        {
          summaries: {
            _count: 'desc'
          }
        },
        {
          createdAt: 'desc'
        }
      ],
      take: 20
    });

    // Check for summaries without any classifications
    const unclassifiedSummaries = await prisma.summary.findMany({
      where: {
        AND: [
          {
            createdAt: {
              gte: sevenDaysAgo
            }
          },
          {
            tags: {
              none: {}
            }
          },
          {
            categories: {
              none: {}
            }
          }
        ]
      },
      select: {
        id: true,
        videoTitle: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return {
      success: true,
      data: {
        summary: {
          totalTags: tagCount,
          totalCategories: categoryCount,
          recentSummariesCount: recentSummaries.length,
          unclassifiedCount: unclassifiedSummaries.length
        },
        recentSummaries: recentSummaries.map(s => ({
          id: s.id,
          title: s.videoTitle,
          createdAt: s.createdAt.toISOString(),
          userId: s.userId,
          tags: s.tags.map(t => t.name),
          tagTypes: s.tags.map(t => t.type),
          categories: s.categories.map(c => c.name)
        })),
        allTags: allTags.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          createdAt: t.createdAt.toISOString(),
          usageCount: t._count.summaries
        })),
        allCategories: allCategories.map(c => ({
          id: c.id,
          name: c.name,
          createdAt: c.createdAt.toISOString(),
          usageCount: c._count.summaries
        })),
        unclassifiedSummaries: unclassifiedSummaries.map(s => ({
          id: s.id,
          title: s.videoTitle,
          createdAt: s.createdAt.toISOString()
        }))
      }
    };

  } catch (error) {
    console.error('Smart tagging diagnostic error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function testClassificationService() {
  try {
    const { classifySummaryContent } = await import('@/lib/classificationService');
    
    // Test classification with sample content
    const testContent = `
      This is a comprehensive React tutorial covering the latest features in React 18. 
      We'll explore hooks, state management, and how to build modern web applications.
      The tutorial covers TypeScript integration, Next.js framework usage, and deployment strategies.
      We'll also discuss popular libraries like Tailwind CSS for styling and performance optimization techniques.
    `;
    
    const testTitle = "Complete React 18 Tutorial - Build Modern Web Apps with TypeScript and Next.js";
    const testSummaryId = "test-summary-" + Date.now();
    
    console.log('🧪 [TEST] Starting classification test...');
    const result = await classifySummaryContent(testSummaryId, testContent, testTitle);
    
    return {
      success: true,
      data: {
        summaryId: testSummaryId,
        result: result,
        contentLength: testContent.length,
        title: testTitle
      }
    };
    
  } catch (error) {
    console.error('🧪 [TEST] Classification test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function testOpenAIConnection() {
  try {
    // Test if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'OPENAI_API_KEY not found in environment variables'
      };
    }

    // Test a simple OpenAI call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test connection. Respond with just "OK".' }],
        max_tokens: 5
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        model: data.model,
        response: data.choices?.[0]?.message?.content || 'No response',
        usage: data.usage
      }
    };

  } catch (error) {
    console.error('OpenAI connection test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}