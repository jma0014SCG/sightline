require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'

async function initAnonymousUser() {
  try {
    // Check if anonymous user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: ANONYMOUS_USER_ID }
    })

    if (existingUser) {
      console.log('✅ Anonymous user already exists')
      return
    }

    // Create anonymous user
    const anonymousUser = await prisma.user.create({
      data: {
        id: ANONYMOUS_USER_ID,
        email: 'anonymous@system.internal',
        name: 'Anonymous User',
        role: 'USER',
        plan: 'FREE',
        summariesLimit: 0, // No limit needed, we track in metadata
        summariesUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log('✅ Anonymous user created successfully:', anonymousUser.id)
  } catch (error) {
    console.error('❌ Error creating anonymous user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initAnonymousUser()