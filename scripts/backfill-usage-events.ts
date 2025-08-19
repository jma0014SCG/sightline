#!/usr/bin/env tsx
/**
 * Backfill Usage Events Script
 * 
 * Creates usage events for all existing summaries to maintain data integrity
 * after implementing the security fix for usage limit bypass vulnerability.
 * 
 * SECURITY NOTE: This script is critical for preventing users from bypassing
 * limits by deleting summaries before the usage events system was implemented.
 * 
 * Usage:
 *   npx tsx scripts/backfill-usage-events.ts
 *   pnpm run backfill:usage-events (if added to package.json)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillUsageEvents() {
  console.log('🚀 Starting usage events backfill...')
  
  try {
    // Get all existing summaries with user info
    const summaries = await prisma.summary.findMany({
      include: {
        user: {
          select: {
            id: true,
            plan: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Process oldest first to maintain chronological order
      }
    })

    console.log(`📊 Found ${summaries.length} summaries to process`)

    let processed = 0
    let skipped = 0
    let errors = 0

    for (const summary of summaries) {
      try {
        // Check if usage event already exists for this summary
        const existingEvent = await prisma.usageEvent.findFirst({
          where: {
            summaryId: summary.id,
            eventType: 'summary_created',
          }
        })

        if (existingEvent) {
          console.log(`⏭️  Skipping summary ${summary.id} - usage event already exists`)
          skipped++
          continue
        }

        // Extract metadata for the usage event
        const metadata: any = {
          plan: summary.user?.plan || 'FREE',
          videoTitle: summary.videoTitle,
          channelName: summary.channelName,
          duration: summary.duration,
          backfilled: true,
          backfilledAt: new Date().toISOString(),
        }

        // Add anonymous-specific metadata if applicable
        if (summary.userId === 'ANONYMOUS_USER') {
          const summaryMetadata = summary.metadata as any
          if (summaryMetadata?.browserFingerprint) {
            metadata.browserFingerprint = summaryMetadata.browserFingerprint
          }
          if (summaryMetadata?.clientIP) {
            metadata.clientIP = summaryMetadata.clientIP
          }
        }

        // Create the usage event with the same timestamp as the summary
        await prisma.usageEvent.create({
          data: {
            userId: summary.userId,
            eventType: 'summary_created',
            summaryId: summary.id,
            videoId: summary.videoId,
            metadata,
            createdAt: summary.createdAt, // Use original creation time
          }
        })

        processed++
        
        if (processed % 10 === 0) {
          console.log(`✅ Processed ${processed}/${summaries.length} summaries`)
        }

      } catch (error) {
        console.error(`❌ Error processing summary ${summary.id}:`, error)
        errors++
      }
    }

    console.log('\n📈 Backfill Summary:')
    console.log(`✅ Processed: ${processed}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📊 Total: ${summaries.length}`)

    // Verify the backfill by checking usage event counts
    console.log('\n🔍 Verification:')
    
    const totalUsageEvents = await prisma.usageEvent.count({
      where: {
        eventType: 'summary_created'
      }
    })
    
    const totalSummaries = await prisma.summary.count()
    
    console.log(`📊 Total summaries: ${totalSummaries}`)
    console.log(`📊 Total usage events: ${totalUsageEvents}`)
    
    if (totalUsageEvents >= totalSummaries) {
      console.log('✅ Backfill verification successful!')
    } else {
      console.log(`⚠️  Warning: ${totalSummaries - totalUsageEvents} summaries may be missing usage events`)
    }

    console.log('\n🎉 Usage events backfill completed successfully!')

  } catch (error) {
    console.error('💥 Fatal error during backfill:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Confirmation prompt for safety
async function confirmBackfill() {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  WARNING: Running in production environment!')
    console.log('📋 This script will create usage events for all existing summaries.')
    console.log('🔒 This is a one-time security fix to prevent usage limit bypass.')
    console.log('')
    
    // In production, require explicit confirmation
    const { confirm } = await import('readline/promises')
    const rl = confirm.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await rl.question('Do you want to proceed? (yes/no): ')
    rl.close()
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Backfill cancelled')
      process.exit(0)
    }
  }
  
  console.log('🚀 Starting backfill process...\n')
}

// Main execution
async function main() {
  await confirmBackfill()
  await backfillUsageEvents()
}

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

export { backfillUsageEvents }