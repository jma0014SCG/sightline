import { PrismaClient } from '@prisma/client'
import { databaseMonitor } from '@/lib/monitoring/database-monitor'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with enhanced logging in development
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
          { level: 'info', emit: 'event' },
        ]
      : [
          { level: 'error', emit: 'event' }
        ],
  })

  // Add event handlers for monitoring in all environments
  client.$on('query', (e) => {
    // Track query metrics
    databaseMonitor.trackQuery(e.query, e.params, e.duration)
    
    // Only log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        component: 'prisma.query',
        query: e.query,
        params: e.params,
        duration: e.duration,
        message: `Query executed in ${e.duration}ms`
      }))
    }
  })

  client.$on('error', (e) => {
    // Track error in monitor
    databaseMonitor.trackError(e)
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      component: 'prisma.error',
      message: e.message,
      target: e.target
    }))
  })

  client.$on('warn', (e) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      component: 'prisma.warn',
      message: e.message
    }))
  })

  client.$on('info', (e) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      component: 'prisma.info',
      message: e.message
    }))
  })

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma