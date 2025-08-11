#!/usr/bin/env node

// Debug script to compare summary content between anonymous and authenticated users
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'

async function debugSummaryContent() {
  console.log('🔍 Debugging summary content differences...\n')
  
  try {
    // Get recent anonymous summaries
    console.log('📊 Anonymous User Summaries:')
    const anonymousSummaries = await prisma.summary.findMany({
      where: {
        userId: ANONYMOUS_USER_ID
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        videoTitle: true,
        videoId: true,
        content: true,
        createdAt: true,
        metadata: true,
        frameworks: true,
        playbooks: true,
        keyMoments: true,
        debunkedAssumptions: true,
        inPractice: true,
        learningPack: true,
        enrichment: true,
        processingSource: true
      }
    })

    anonymousSummaries.forEach((summary, index) => {
      console.log(`\n${index + 1}. ${summary.videoTitle} (${summary.videoId})`)
      console.log(`   ID: ${summary.id}`)
      console.log(`   Created: ${summary.createdAt}`)
      console.log(`   Content Length: ${summary.content?.length || 0} characters`)
      console.log(`   Processing Source: ${summary.processingSource || 'unknown'}`)
      
      // Check for rich data
      const hasRichData = {
        metadata: !!summary.metadata,
        frameworks: !!summary.frameworks,
        playbooks: !!summary.playbooks,
        keyMoments: !!summary.keyMoments,
        debunkedAssumptions: !!summary.debunkedAssumptions,
        inPractice: !!summary.inPractice,
        learningPack: !!summary.learningPack,
        enrichment: !!summary.enrichment
      }
      
      console.log(`   Rich Data:`, hasRichData)
      
      if (summary.content) {
        const sections = summary.content.split(/^#+\s/gm).length - 1
        console.log(`   Markdown Sections: ${sections}`)
        
        // Show first 200 characters of content
        console.log(`   Content Preview: "${summary.content.substring(0, 200)}..."`)
      }
    })

    // Get recent authenticated summaries (not anonymous user)
    console.log('\n\n📊 Authenticated User Summaries:')
    const authenticatedSummaries = await prisma.summary.findMany({
      where: {
        userId: {
          not: ANONYMOUS_USER_ID
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        videoTitle: true,
        videoId: true,
        content: true,
        createdAt: true,
        userId: true,
        metadata: true,
        frameworks: true,
        playbooks: true,
        keyMoments: true,
        debunkedAssumptions: true,
        inPractice: true,
        learningPack: true,
        enrichment: true,
        processingSource: true
      }
    })

    authenticatedSummaries.forEach((summary, index) => {
      console.log(`\n${index + 1}. ${summary.videoTitle} (${summary.videoId})`)
      console.log(`   ID: ${summary.id}`)
      console.log(`   User: ${summary.userId}`)
      console.log(`   Created: ${summary.createdAt}`)
      console.log(`   Content Length: ${summary.content?.length || 0} characters`)
      console.log(`   Processing Source: ${summary.processingSource || 'unknown'}`)
      
      // Check for rich data
      const hasRichData = {
        metadata: !!summary.metadata,
        frameworks: !!summary.frameworks,
        playbooks: !!summary.playbooks,
        keyMoments: !!summary.keyMoments,
        debunkedAssumptions: !!summary.debunkedAssumptions,
        inPractice: !!summary.inPractice,
        learningPack: !!summary.learningPack,
        enrichment: !!summary.enrichment
      }
      
      console.log(`   Rich Data:`, hasRichData)
      
      if (summary.content) {
        const sections = summary.content.split(/^#+\s/gm).length - 1
        console.log(`   Markdown Sections: ${sections}`)
        
        // Show first 200 characters of content
        console.log(`   Content Preview: "${summary.content.substring(0, 200)}..."`)
      }
    })

    // Compare latest from each type
    if (anonymousSummaries.length > 0 && authenticatedSummaries.length > 0) {
      console.log('\n\n🔍 Content Comparison:')
      const latestAnon = anonymousSummaries[0]
      const latestAuth = authenticatedSummaries[0]
      
      console.log(`Anonymous content: ${latestAnon.content?.length || 0} chars`)
      console.log(`Authenticated content: ${latestAuth.content?.length || 0} chars`)
      console.log(`Difference: ${(latestAuth.content?.length || 0) - (latestAnon.content?.length || 0)} chars`)
      
      // Check rich data differences
      console.log('\n📊 Rich Data Comparison:')
      console.log('Anonymous rich data fields populated:', Object.values({
        metadata: !!latestAnon.metadata,
        frameworks: !!latestAnon.frameworks,
        playbooks: !!latestAnon.playbooks,
        keyMoments: !!latestAnon.keyMoments,
        debunkedAssumptions: !!latestAnon.debunkedAssumptions,
        inPractice: !!latestAnon.inPractice,
        learningPack: !!latestAnon.learningPack,
        enrichment: !!latestAnon.enrichment
      }).filter(Boolean).length, 'out of 8')
      
      console.log('Authenticated rich data fields populated:', Object.values({
        metadata: !!latestAuth.metadata,
        frameworks: !!latestAuth.frameworks,
        playbooks: !!latestAuth.playbooks,
        keyMoments: !!latestAuth.keyMoments,
        debunkedAssumptions: !!latestAuth.debunkedAssumptions,
        inPractice: !!latestAuth.inPractice,
        learningPack: !!latestAuth.learningPack,
        enrichment: !!latestAuth.enrichment
      }).filter(Boolean).length, 'out of 8')
    }

    // Check total counts
    const anonCount = await prisma.summary.count({
      where: { userId: ANONYMOUS_USER_ID }
    })
    const authCount = await prisma.summary.count({
      where: { userId: { not: ANONYMOUS_USER_ID } }
    })
    
    console.log(`\n📈 Summary Totals:`)
    console.log(`Anonymous summaries: ${anonCount}`)
    console.log(`Authenticated summaries: ${authCount}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSummaryContent().catch(console.error)