#!/usr/bin/env node

/**
 * Find and upgrade user by Clerk ID (from server logs)
 * Usage: node scripts/find-user-by-id.js [clerk_user_id]
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function findAndUpgradeUser() {
  const clerkUserId = process.argv[2] || 'user_30dt1jO1CPbVqbvogdrNEXF9Ias' // Default from logs
  
  try {
    console.log('🔍 Looking for user with Clerk ID:', clerkUserId)
    
    // Find user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { id: clerkUserId }
    })
    
    if (user) {
      console.log('👤 Found user:')
      console.log(`   🆔 ID: ${user.id}`)
      console.log(`   📧 Email: ${user.email}`)
      console.log(`   👤 Name: ${user.name || 'Not set'}`)
      console.log(`   🎯 Current Plan: ${user.plan}`)
      console.log(`   📊 Current Limit: ${user.summariesLimit}`)
      
      if (user.email === 'jma0014@gmail.com' || user.email.includes('temp_')) {
        console.log('🔄 Upgrading to ENTERPRISE plan...')
        
        const updatedUser = await prisma.user.update({
          where: { id: clerkUserId },
          data: {
            plan: 'ENTERPRISE',
            summariesLimit: -1, // Unlimited
            summariesUsed: 0, // Reset usage
            role: 'USER',
            // Update email if it's a temp email
            ...(user.email.includes('temp_') ? { email: 'jma0014@gmail.com' } : {})
          }
        })
        
        console.log('✅ Successfully upgraded user:')
        console.log(`   🎯 Plan: ${updatedUser.plan}`)
        console.log(`   📊 Limit: ${updatedUser.summariesLimit} (unlimited)`)
        console.log(`   📧 Email: ${updatedUser.email}`)
        
        console.log('')
        console.log('🎉 Test user is ready! You can now:')
        console.log('   1. Create unlimited summaries')
        console.log('   2. Test YouTube metadata features')
        console.log('   3. Verify all Gumloop rich content')
        
      } else {
        console.log('⚠️ This user does not appear to be the test user')
        console.log('   Expected email: jma0014@gmail.com')
        console.log('   Actual email:', user.email)
      }
      
    } else {
      console.log('❌ No user found with ID:', clerkUserId)
    }
    
  } catch (error) {
    console.error('❌ Error finding user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
findAndUpgradeUser()