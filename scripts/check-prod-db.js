#!/usr/bin/env node

/**
 * Check production database using the production DATABASE_URL
 */

// Load production environment
require('dotenv').config({ path: '.env.production' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkProdDatabase() {
  console.log('🔍 Checking Production Database')
  console.log('================================\n')

  try {
    // Check anonymous user
    const anonymousUser = await prisma.user.findUnique({
      where: { id: 'ANONYMOUS_USER' }
    })
    
    if (anonymousUser) {
      console.log('✅ Anonymous user EXISTS in production')
      console.log(`   Email: ${anonymousUser.email}`)
      console.log(`   Plan: ${anonymousUser.plan}`)
    } else {
      console.log('❌ Anonymous user MISSING in production!')
      console.log('   This will break anonymous summarization')
    }

    // Check user count
    const userCount = await prisma.user.count()
    console.log(`\n📊 Total users: ${userCount}`)

    // Check summary count  
    const summaryCount = await prisma.summary.count()
    console.log(`📊 Total summaries: ${summaryCount}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProdDatabase()