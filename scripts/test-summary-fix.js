#!/usr/bin/env node

// Test script to verify the summary fix works
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testSummaryFix() {
  console.log('🧪 Testing summary fix...\n')
  
  try {
    // Get the most recent authenticated summary
    console.log('📊 Getting most recent authenticated summary...')
    const recentSummary = await prisma.summary.findFirst({
      where: {
        userId: {
          not: 'ANONYMOUS_USER'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        videoTitle: true,
        videoId: true,
        content: true,
        createdAt: true,
        processingSource: true,
        metadata: true,
        frameworks: true,
        playbooks: true
      }
    })

    if (!recentSummary) {
      console.log('❌ No authenticated summaries found')
      return
    }

    console.log(`\n📝 Most Recent Summary:`)
    console.log(`   Title: ${recentSummary.videoTitle}`)
    console.log(`   ID: ${recentSummary.id}`)
    console.log(`   Created: ${recentSummary.createdAt}`)
    console.log(`   Content Length: ${recentSummary.content?.length || 0} characters`)
    console.log(`   Processing Source: ${recentSummary.processingSource || 'unknown'}`)
    console.log(`   Has Metadata: ${!!recentSummary.metadata}`)
    console.log(`   Has Frameworks: ${!!recentSummary.frameworks}`)
    console.log(`   Has Playbooks: ${!!recentSummary.playbooks}`)

    // Analyze the fix
    const isFixed = recentSummary.content && recentSummary.content.length > 0 && 
                   recentSummary.processingSource && recentSummary.processingSource !== 'unknown'
    
    if (isFixed) {
      console.log(`\n✅ Summary appears to be working correctly!`)
      console.log(`   - Has content (${recentSummary.content.length} chars)`)
      console.log(`   - Has processing source (${recentSummary.processingSource})`)
    } else {
      console.log(`\n❌ Summary still has issues:`)
      if (!recentSummary.content || recentSummary.content.length === 0) {
        console.log(`   - No content (${recentSummary.content?.length || 0} chars)`)
      }
      if (!recentSummary.processingSource || recentSummary.processingSource === 'unknown') {
        console.log(`   - Unknown processing source (${recentSummary.processingSource || 'unknown'})`)
      }
      
      console.log(`\n💡 Next steps:`)
      console.log(`   1. Try creating a new summary to test the fix`)
      console.log(`   2. Check backend logs for any errors`)
      console.log(`   3. Verify the backend is receiving and processing requests correctly`)
    }

    // Show quick comparison with working summaries
    const workingSummary = await prisma.summary.findFirst({
      where: {
        userId: { not: 'ANONYMOUS_USER' },
        content: { not: '' },
        processingSource: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: { content: true, processingSource: true, createdAt: true, videoTitle: true }
    })

    if (workingSummary && workingSummary.id !== recentSummary.id) {
      console.log(`\n🔍 Comparison with working summary:`)
      console.log(`   Working: "${workingSummary.videoTitle}" - ${workingSummary.content.length} chars (${workingSummary.processingSource})`)
      console.log(`   Recent: "${recentSummary.videoTitle}" - ${recentSummary.content?.length || 0} chars (${recentSummary.processingSource || 'unknown'})`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSummaryFix().catch(console.error)