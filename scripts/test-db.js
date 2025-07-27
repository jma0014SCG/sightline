const { PrismaClient } = require('@prisma/client')

async function testDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Test query execution
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`
    console.log('✅ Database query successful:', result[0].current_time)
    
    // Test table creation (should already exist from schema push)
    const userCount = await prisma.user.count()
    console.log(`✅ User table accessible (current count: ${userCount})`)
    
    console.log('🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()