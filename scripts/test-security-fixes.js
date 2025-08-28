/**
 * Manual test script for security improvements
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testDistributedLock() {
  log('\n📦 Testing Distributed Lock...', 'blue')
  
  try {
    // Create a test lock
    const lockKey = `test:lock:${Date.now()}`
    const expiresAt = new Date(Date.now() + 30000) // 30 seconds
    
    // Try to acquire lock
    const lock = await prisma.lock.create({
      data: {
        key: lockKey,
        expiresAt
      }
    })
    
    log(`✅ Lock acquired: ${lock.id}`, 'green')
    
    // Try to acquire same lock (should fail)
    try {
      await prisma.lock.create({
        data: {
          key: lockKey,
          expiresAt
        }
      })
      log('❌ Should not have acquired duplicate lock', 'red')
    } catch (error) {
      if (error.code === 'P2002') {
        log('✅ Correctly prevented duplicate lock acquisition', 'green')
      } else {
        throw error
      }
    }
    
    // Clean up
    await prisma.lock.delete({ where: { id: lock.id } })
    log('✅ Lock released successfully', 'green')
    
  } catch (error) {
    log(`❌ Lock test failed: ${error.message}`, 'red')
  }
}

async function testOptimisticLocking() {
  log('\n📦 Testing Optimistic Locking...', 'blue')
  
  try {
    // Create a test user
    const testUser = await prisma.user.upsert({
      where: { email: 'optimistic-test@example.com' },
      update: {},
      create: {
        id: `test_user_${Date.now()}`,
        email: 'optimistic-test@example.com',
        name: 'Optimistic Test User',
        summariesUsed: 0,
        version: 0
      }
    })
    
    log(`✅ Test user created with version ${testUser.version}`, 'green')
    
    // Simulate concurrent updates
    const currentVersion = testUser.version
    
    // First update (should succeed)
    const updated1 = await prisma.user.update({
      where: {
        id: testUser.id,
        version: currentVersion
      },
      data: {
        summariesUsed: { increment: 1 },
        version: { increment: 1 }
      }
    })
    
    log(`✅ First update succeeded, version now ${updated1.version}`, 'green')
    
    // Second update with old version (should fail)
    try {
      await prisma.user.update({
        where: {
          id: testUser.id,
          version: currentVersion // Using old version
        },
        data: {
          summariesUsed: { increment: 1 },
          version: { increment: 1 }
        }
      })
      log('❌ Should not have allowed update with old version', 'red')
    } catch (error) {
      if (error.code === 'P2025') {
        log('✅ Correctly prevented concurrent modification', 'green')
      } else {
        throw error
      }
    }
    
    // Clean up
    await prisma.user.delete({ where: { id: testUser.id } })
    
  } catch (error) {
    log(`❌ Optimistic locking test failed: ${error.message}`, 'red')
  }
}

async function testWebhookQueue() {
  log('\n📦 Testing Webhook Queue...', 'blue')
  
  try {
    const webhookId = `webhook_test_${Date.now()}`
    const payload = {
      type: 'user.created',
      data: { id: 'test_user', email: 'test@example.com' }
    }
    
    // Add to queue
    const queued = await prisma.webhookQueue.create({
      data: {
        id: webhookId,
        payload,
        attempts: 0,
        maxAttempts: 5,
        status: 'pending'
      }
    })
    
    log(`✅ Webhook queued: ${queued.id}`, 'green')
    
    // Simulate processing
    await prisma.webhookQueue.update({
      where: { id: webhookId },
      data: {
        status: 'processing',
        attempts: { increment: 1 },
        processedAt: new Date()
      }
    })
    
    log('✅ Webhook marked as processing', 'green')
    
    // Simulate retry with exponential backoff
    const nextRetryAt = new Date(Date.now() + Math.pow(2, 1) * 1000)
    await prisma.webhookQueue.update({
      where: { id: webhookId },
      data: {
        status: 'pending',
        nextRetryAt,
        error: 'Simulated error for retry'
      }
    })
    
    log(`✅ Webhook scheduled for retry at ${nextRetryAt.toISOString()}`, 'green')
    
    // Clean up
    await prisma.webhookQueue.delete({ where: { id: webhookId } })
    
  } catch (error) {
    log(`❌ Webhook queue test failed: ${error.message}`, 'red')
  }
}

async function testIdempotentWebhook() {
  log('\n📦 Testing Idempotent Webhook (Upsert)...', 'blue')
  
  try {
    const userId = `clerk_test_${Date.now()}`
    const email = `test_${Date.now()}@example.com`
    
    // First webhook call (creates user)
    const created = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email,
        name: 'Webhook Test User',
        emailVerified: new Date()
      },
      create: {
        id: userId,
        email,
        name: 'Webhook Test User',
        emailVerified: new Date()
      }
    })
    
    log(`✅ First webhook created user: ${created.id}`, 'green')
    
    // Second webhook call (should update, not error)
    const updated = await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: 'Updated Name',
        emailVerified: new Date()
      },
      create: {
        id: userId,
        email,
        name: 'Should Not Create',
        emailVerified: new Date()
      }
    })
    
    log(`✅ Second webhook updated user: ${updated.name}`, 'green')
    
    // Verify no duplicate was created
    const count = await prisma.user.count({
      where: { id: userId }
    })
    
    if (count === 1) {
      log('✅ No duplicate user created (idempotent)', 'green')
    } else {
      log(`❌ Unexpected user count: ${count}`, 'red')
    }
    
    // Clean up
    await prisma.user.delete({ where: { id: userId } })
    
  } catch (error) {
    log(`❌ Idempotent webhook test failed: ${error.message}`, 'red')
  }
}

async function testAtomicTransaction() {
  log('\n📦 Testing Atomic Transactions...', 'blue')
  
  try {
    const userId = `atomic_test_${Date.now()}`
    const email = `atomic_${Date.now()}@example.com`
    
    // Create user with atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          id: userId,
          email,
          name: 'Atomic Test User',
          summariesUsed: 0,
          summariesLimit: 3,
          version: 0
        }
      })
      
      // Create usage event
      const event = await tx.usageEvent.create({
        data: {
          userId,
          eventType: 'user_signup',
          metadata: { source: 'test_script' }
        }
      })
      
      return { user, event }
    })
    
    log(`✅ Atomic transaction created user and event`, 'green')
    
    // Test rollback on error
    try {
      await prisma.$transaction(async (tx) => {
        // This should succeed
        await tx.user.update({
          where: { id: userId },
          data: { summariesUsed: { increment: 1 } }
        })
        
        // Force an error
        throw new Error('Simulated error for rollback')
      })
      
      log('❌ Transaction should have rolled back', 'red')
    } catch (error) {
      if (error.message === 'Simulated error for rollback') {
        // Check that the update was rolled back
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (user.summariesUsed === 0) {
          log('✅ Transaction correctly rolled back on error', 'green')
        } else {
          log('❌ Transaction did not roll back properly', 'red')
        }
      }
    }
    
    // Clean up
    await prisma.usageEvent.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    
  } catch (error) {
    log(`❌ Atomic transaction test failed: ${error.message}`, 'red')
  }
}

async function runAllTests() {
  log('\n🔒 Security Improvements Test Suite', 'yellow')
  log('=====================================', 'yellow')
  
  try {
    await testDistributedLock()
    await testOptimisticLocking()
    await testWebhookQueue()
    await testIdempotentWebhook()
    await testAtomicTransaction()
    
    log('\n✅ All security tests completed!', 'green')
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
runAllTests()