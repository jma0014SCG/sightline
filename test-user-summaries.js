#!/usr/bin/env node
/**
 * Test User Summaries
 * Check what summaries exist for the current user
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserSummaries() {
  const userId = 'user_30dt1jO1CPbVqbvogdrNEXF9Ias' // From the logs
  
  console.log('🔍 Checking summaries for user:', userId)
  console.log('=' .repeat(50))
  
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (user) {
      console.log('✅ User found in database:')
      console.log('   Email:', user.email)
      console.log('   Name:', user.name || 'Not set')
      console.log('   Plan:', user.plan)
      console.log('   Created:', user.createdAt)
    } else {
      console.log('❌ User NOT found in database')
    }
    
    console.log('\n📚 Checking summaries for this user...')
    const userSummaries = await prisma.summary.findMany({
      where: { userId },
      include: {
        categories: true,
        tags: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${userSummaries.length} summaries for this user`)
    
    if (userSummaries.length > 0) {
      console.log('\nUser summaries:')
      userSummaries.forEach((summary, i) => {
        console.log(`\n${i + 1}. ${summary.videoTitle}`)
        console.log(`   ID: ${summary.id}`)
        console.log(`   User ID: ${summary.userId}`)
        console.log(`   Categories: ${summary.categories.map(c => c.name).join(', ') || 'None'}`)
        console.log(`   Tags: ${summary.tags.map(t => `${t.name} (${t.type})`).join(', ') || 'None'}`)
      })
    }
    
    console.log('\n📊 Checking ALL summaries in database...')
    const allSummaries = await prisma.summary.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        categories: true,
        tags: true
      }
    })
    
    console.log(`\nTotal summaries in database: ${allSummaries.length}`)
    allSummaries.forEach((summary, i) => {
      console.log(`\n${i + 1}. ${summary.videoTitle}`)
      console.log(`   ID: ${summary.id}`)
      console.log(`   User ID: ${summary.userId || 'NULL (anonymous)'}`)
      console.log(`   Categories: ${summary.categories.map(c => c.name).join(', ') || 'None'}`)
      console.log(`   Tags: ${summary.tags.map(t => `${t.name} (${t.type})`).join(', ') || 'None'}`)
    })
    
    // Check for any summaries with a similar but different user ID
    console.log('\n🔎 Checking for user ID variations...')
    const allUserIds = await prisma.summary.findMany({
      select: { userId: true },
      distinct: ['userId'],
      where: { 
        userId: { 
          not: null 
        } 
      }
    })
    
    console.log('Unique user IDs in summaries:')
    const uniqueUserIds = [...new Set(allUserIds.map(s => s.userId))]
    uniqueUserIds.forEach(id => {
      console.log(`   - ${id}`)
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error:', error.message)
    await prisma.$disconnect()
  }
}

checkUserSummaries().catch(console.error)