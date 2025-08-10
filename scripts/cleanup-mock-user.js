#!/usr/bin/env node

/**
 * Clean up mock test user and prepare for proper Clerk authentication
 * Usage: node scripts/cleanup-mock-user.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupMockUser() {
  const testEmail = 'jma0014@gmail.com'
  const mockUserId = 'user_test_unlimited_jma0014'
  
  try {
    console.log('🔄 Cleaning up mock test user...')
    
    // Check if mock user exists
    const mockUser = await prisma.user.findUnique({
      where: { id: mockUserId }
    })
    
    if (mockUser) {
      console.log('👤 Found mock user, deleting...')
      
      // Delete mock user (this will cascade delete summaries)
      await prisma.user.delete({
        where: { id: mockUserId }
      })
      
      console.log('✅ Deleted mock user with ID:', mockUserId)
    } else {
      console.log('ℹ️ No mock user found with ID:', mockUserId)
    }
    
    // Check if there's a real Clerk user with the email
    const realUser = await prisma.user.findUnique({
      where: { email: testEmail }
    })
    
    if (realUser) {
      console.log('👤 Found real Clerk user:')
      console.log(`   🆔 ID: ${realUser.id}`)
      console.log(`   📧 Email: ${realUser.email}`)
      console.log(`   👤 Name: ${realUser.name}`)
      console.log(`   🎯 Plan: ${realUser.plan}`)
      console.log(`   📊 Limit: ${realUser.summariesLimit}`)
    } else {
      console.log('ℹ️ No real Clerk user found yet with email:', testEmail)
    }
    
    console.log('')
    console.log('🎉 Cleanup complete! Next steps:')
    console.log('   1. Go to your app and sign up with jma0014@gmail.com')
    console.log('   2. After signup, run: node scripts/setup-test-user.js')
    console.log('   3. This will upgrade the real Clerk user to unlimited')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
cleanupMockUser()