#!/usr/bin/env node
/**
 * Test Classification Integration
 * 
 * This script tests that classification is properly integrated into the summary creation flow.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testRecentSummaryClassification() {
  console.log('\n🔍 Testing Recent Summary Classification...')
  
  try {
    // Get the most recent summaries
    const recentSummaries = await prisma.summary.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        categories: true,
        tags: true
      }
    })

    console.log(`\n📚 Checking ${recentSummaries.length} recent summaries:\n`)
    
    let classifiedCount = 0
    let unclassifiedCount = 0
    
    for (const summary of recentSummaries) {
      const hasClassification = summary.categories.length > 0 || summary.tags.length > 0
      
      if (hasClassification) {
        classifiedCount++
        console.log(`✅ ${summary.videoTitle}`)
        console.log(`   Created: ${summary.createdAt.toISOString()}`)
        console.log(`   Categories: ${summary.categories.map(c => c.name).join(', ')}`)
        console.log(`   Tags: ${summary.tags.map(t => `${t.name} (${t.type})`).join(', ')}`)
      } else {
        unclassifiedCount++
        console.log(`❌ ${summary.videoTitle}`)
        console.log(`   Created: ${summary.createdAt.toISOString()}`)
        console.log(`   Categories: None`)
        console.log(`   Tags: None`)
      }
      console.log()
    }
    
    console.log('📊 Summary:')
    console.log(`   Classified: ${classifiedCount}`)
    console.log(`   Unclassified: ${unclassifiedCount}`)
    
    if (unclassifiedCount > 0) {
      console.log('\n⚠️  Some summaries are missing classifications!')
      console.log('   This could be due to:')
      console.log('   1. Classification timing out')
      console.log('   2. OpenAI API errors')
      console.log('   3. Database transaction failures')
      console.log('   4. The fix not being deployed yet')
    }
    
    await prisma.$disconnect()
    return classifiedCount > 0
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    await prisma.$disconnect()
    return false
  }
}

async function manuallyClassifyUntaggedSummaries() {
  console.log('\n🔧 Manually Classifying Untagged Summaries...')
  
  try {
    // Find summaries without tags or categories
    const untaggedSummaries = await prisma.summary.findMany({
      where: {
        AND: [
          { categories: { none: {} } },
          { tags: { none: {} } }
        ]
      },
      take: 3, // Process up to 3 at a time
      orderBy: { createdAt: 'desc' }
    })
    
    if (untaggedSummaries.length === 0) {
      console.log('✅ All summaries are already classified!')
      return true
    }
    
    console.log(`Found ${untaggedSummaries.length} untagged summaries. Processing...`)
    
    // Import and use the classification service
    const { classifySummaryContent } = require('./src/lib/classificationService.ts')
    
    for (const summary of untaggedSummaries) {
      console.log(`\n🏷️  Classifying: ${summary.videoTitle}`)
      
      try {
        const result = await classifySummaryContent(
          summary.id,
          summary.content,
          summary.videoTitle
        )
        
        if (result) {
          console.log(`   ✅ Successfully classified!`)
          console.log(`      Categories: ${result.categories.join(', ')}`)
          console.log(`      Tags: ${result.tags.map(t => `${t.name} (${t.type})`).join(', ')}`)
        } else {
          console.log(`   ❌ Classification returned null`)
        }
      } catch (error) {
        console.log(`   ❌ Classification failed: ${error.message}`)
      }
    }
    
    await prisma.$disconnect()
    return true
  } catch (error) {
    console.error('❌ Manual classification failed:', error.message)
    await prisma.$disconnect()
    return false
  }
}

async function runTests() {
  console.log('🏷️  Classification Integration Test')
  console.log('=' .repeat(50))
  
  // First check recent summaries
  const hasClassified = await testRecentSummaryClassification()
  
  // Optionally run manual classification
  if (process.argv.includes('--fix-untagged')) {
    await manuallyClassifyUntaggedSummaries()
    // Check again after manual classification
    await testRecentSummaryClassification()
  }
  
  console.log('\n' + '=' .repeat(50))
  if (hasClassified) {
    console.log('✅ Classification system is working!')
  } else {
    console.log('⚠️  Classification may need attention')
    console.log('   Run with --fix-untagged to manually classify recent summaries')
  }
}

// Run tests
runTests().catch(console.error)