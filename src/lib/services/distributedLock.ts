import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

interface Lock {
  id: string
  key: string
  expiresAt: Date
}

interface LockOptions {
  ttl?: number // Time to live in milliseconds (default: 30 seconds)
  retries?: number // Number of retries (default: 3)
  retryDelay?: number // Delay between retries in ms (default: 100ms)
}

/**
 * Acquires a distributed lock using the database
 * Prevents concurrent operations on critical resources
 */
export async function acquireLock(
  key: string,
  options: LockOptions = {}
): Promise<string | null> {
  const {
    ttl = 30000, // 30 seconds default
    retries = 3,
    retryDelay = 100,
  } = options

  const lockId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + ttl)

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // First, clean up expired locks
      await prisma.$executeRaw`
        DELETE FROM "Lock" 
        WHERE key = ${key} 
        AND "expiresAt" < NOW()
      `

      // Try to acquire the lock
      await prisma.$executeRaw`
        INSERT INTO "Lock" (id, key, "expiresAt", "acquiredAt")
        VALUES (${lockId}, ${key}, ${expiresAt}, NOW())
        ON CONFLICT (key) DO NOTHING
      `

      // Check if we got the lock
      const lock = await prisma.$queryRaw<Lock[]>`
        SELECT id, key, "expiresAt" 
        FROM "Lock" 
        WHERE key = ${key} 
        AND id = ${lockId}
        LIMIT 1
      `

      if (lock && lock.length > 0) {
        return lockId
      }

      // Wait before retrying
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    } catch (error) {
      console.error(`Failed to acquire lock for ${key}:`, error)
      if (attempt === retries - 1) {
        throw error
      }
    }
  }

  return null
}

/**
 * Releases a distributed lock
 */
export async function releaseLock(lockId: string): Promise<boolean> {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "Lock" 
      WHERE id = ${lockId}
    `
    return result > 0
  } catch (error) {
    console.error(`Failed to release lock ${lockId}:`, error)
    return false
  }
}

/**
 * Executes a function with a distributed lock
 * Automatically acquires and releases the lock
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options?: LockOptions
): Promise<T> {
  const lockId = await acquireLock(key, options)
  
  if (!lockId) {
    throw new Error(`Failed to acquire lock for ${key}`)
  }

  try {
    return await fn()
  } finally {
    await releaseLock(lockId)
  }
}

/**
 * Checks if a lock exists and is still valid
 */
export async function isLocked(key: string): Promise<boolean> {
  const lock = await prisma.$queryRaw<Lock[]>`
    SELECT id, key, "expiresAt" 
    FROM "Lock" 
    WHERE key = ${key} 
    AND "expiresAt" > NOW()
    LIMIT 1
  `
  return lock && lock.length > 0
}

/**
 * Force releases all expired locks (maintenance function)
 */
export async function cleanupExpiredLocks(): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE FROM "Lock" 
    WHERE "expiresAt" < NOW()
  `
  return result
}