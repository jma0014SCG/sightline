#!/usr/bin/env node

/**
 * Create unlimited test user for development/testing
 * Usage: node scripts/create-test-user.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestUser() {
  const testEmail = 'jma0014@gmail.com'
  const testUserId = 'user_test_unlimited_jma0014' // Mock Clerk ID
  
  try {
    console.log('🔄 Creating unlimited test user...')
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    })
    
    if (existingUser) {
      console.log('👤 User already exists, updating to unlimited plan...')
      
      // Update existing user to unlimited
      const updatedUser = await prisma.user.update({
        where: { email: testEmail },
        data: {
          plan: 'ENTERPRISE',
          summariesLimit: -1, // Unlimited
          summariesUsed: 0, // Reset usage
          role: 'USER'
        }
      })
      
      console.log('✅ Updated existing user to unlimited plan:')
      console.log(`   📧 Email: ${updatedUser.email}`)
      console.log(`   🎯 Plan: ${updatedUser.plan}`)
      console.log(`   📊 Limit: ${updatedUser.summariesLimit} (unlimited)`)
      console.log(`   📈 Used: ${updatedUser.summariesUsed}`)
      
    } else {
      console.log('👤 Creating new unlimited test user...')
      
      // Create new unlimited user
      const newUser = await prisma.user.create({
        data: {
          id: testUserId,
          email: testEmail,
          name: 'Test User (Unlimited)',
          plan: 'ENTERPRISE',
          summariesLimit: -1, // Unlimited
          summariesUsed: 0,
          role: 'USER',
          emailVerified: new Date(),
          // Stripe fields - leave null for test user
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
        }
      })
      
      console.log('✅ Created new unlimited test user:')
      console.log(`   🆔 ID: ${newUser.id}`)
      console.log(`   📧 Email: ${newUser.email}`)
      console.log(`   👤 Name: ${newUser.name}`)
      console.log(`   🎯 Plan: ${newUser.plan}`)
      console.log(`   📊 Limit: ${newUser.summariesLimit} (unlimited)`)
      console.log(`   📈 Used: ${newUser.summariesUsed}`)
    }
    
    console.log('')
    console.log('🎉 Test user ready! You can now:')
    console.log('   1. Sign up/sign in with jma0014@gmail.com')
    console.log('   2. Create unlimited summaries for testing')
    console.log('   3. Test all Gumloop rich content features')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error creating test user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createTestUser()