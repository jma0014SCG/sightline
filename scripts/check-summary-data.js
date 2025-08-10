#!/usr/bin/env node

/**
 * Check YouTube metadata in existing summaries
 * Usage: node scripts/check-summary-data.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSummaryData() {
  const testEmail = 'jma0014@gmail.com'
  
  try {
    console.log('🔍 Checking summary data for user:', testEmail)
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        summaries: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            videoTitle: true,
            channelName: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            uploadDate: true,
            speakers: true,
            metadata: true,
            createdAt: true,
          }
        }
      }
    })
    
    if (!user) {
      console.log('❌ User not found:', testEmail)
      return
    }
    
    console.log(`👤 Found user: ${user.email} (${user.summaries.length} summaries)`)
    console.log('')
    
    user.summaries.forEach((summary, index) => {
      console.log(`📝 Summary ${index + 1}:`)
      console.log(`   🆔 ID: ${summary.id}`)
      console.log(`   📹 Title: ${summary.videoTitle}`)
      console.log(`   📺 Channel: ${summary.channelName}`)
      console.log(`   👀 Views: ${summary.viewCount || 'NULL'}`)
      console.log(`   👍 Likes: ${summary.likeCount || 'NULL'}`)
      console.log(`   💬 Comments: ${summary.commentCount || 'NULL'}`)
      console.log(`   📅 Upload Date: ${summary.uploadDate || 'NULL'}`)
      console.log(`   🎤 Speakers: [${summary.speakers.join(', ') || 'NONE'}]`)
      console.log(`   📊 Metadata: ${summary.metadata ? 'HAS DATA' : 'NULL'}`)
      
      if (summary.metadata && typeof summary.metadata === 'object') {
        const metadata = summary.metadata
        console.log(`   📊 Metadata Speakers: [${metadata.speakers?.join(', ') || 'NONE'}]`)
        console.log(`   📊 Metadata Title: ${metadata.title || 'N/A'}`)
        console.log(`   📊 Metadata Channel: ${metadata.channel || 'N/A'}`)
      }
      
      console.log(`   🕐 Created: ${summary.createdAt}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error checking summary data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSummaryData()