#!/usr/bin/env node

/**
 * Set up unlimited test user after natural Clerk signup
 * Usage: 
 * 1. First sign up at your app with jma0014@gmail.com
 * 2. Then run: node scripts/setup-test-user.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupTestUser() {
  const testEmail = 'jma0014@gmail.com'
  
  try {
    console.log('🔄 Setting up unlimited test user...')
    
    // Find user by email (should exist after Clerk signup)
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    })
    
    if (existingUser) {
      console.log('👤 Found Clerk user, upgrading to unlimited plan...')
      console.log(`   🆔 Current ID: ${existingUser.id}`)
      console.log(`   📧 Email: ${existingUser.email}`)
      console.log(`   🎯 Current Plan: ${existingUser.plan}`)
      
      // Update existing user to unlimited ENTERPRISE plan
      const updatedUser = await prisma.user.update({
        where: { email: testEmail },
        data: {
          plan: 'ENTERPRISE',
          summariesLimit: -1, // Unlimited
          summariesUsed: 0, // Reset usage
          role: 'USER'
        }
      })
      
      console.log('✅ Successfully upgraded user to unlimited plan:')
      console.log(`   🆔 Clerk ID: ${updatedUser.id}`)
      console.log(`   📧 Email: ${updatedUser.email}`)
      console.log(`   👤 Name: ${updatedUser.name || 'Not set'}`)
      console.log(`   🎯 Plan: ${updatedUser.plan}`)
      console.log(`   📊 Limit: ${updatedUser.summariesLimit} (unlimited)`)
      console.log(`   📈 Used: ${updatedUser.summariesUsed}`)
      
    } else {
      console.log('❌ No user found with email:', testEmail)
      console.log('')
      console.log('📋 Please follow these steps:')
      console.log('   1. Go to http://localhost:3000')
      console.log('   2. Click "Sign Up" and create account with jma0014@gmail.com')
      console.log('   3. Complete the signup process')
      console.log('   4. Then run this script again')
      console.log('')
      process.exit(1)
    }
    
    console.log('')
    console.log('🎉 Test user is ready! You can now:')
    console.log('   1. Sign in with jma0014@gmail.com')
    console.log('   2. Create unlimited summaries for testing')
    console.log('   3. Test all YouTube metadata features')
    console.log('   4. Verify Gumloop rich content display')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error setting up test user:', error)
    if (error.code === 'P2025') {
      console.log('ℹ️ User not found - make sure to sign up first!')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
setupTestUser()