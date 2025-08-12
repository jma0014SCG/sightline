import { NextRequest, NextResponse } from 'next/server'
import { generateCorrelationId } from '@/lib/api/correlation'
import { createLogger } from '@/lib/logger'

// Only allow in development
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Synthetic summary data for testing
 */
const SYNTHETIC_SUMMARY = {
  id: 'synthetic-001',
  task_id: 'task-synthetic-001',
  title: 'How to Build Scalable Systems - Best Practices',
  videoId: 'dQw4w9WgXcQ',
  duration: 600,
  viewCount: 1234567,
  channelTitle: 'Tech Talks',
  publishedAt: new Date().toISOString(),
  transcript: `Welcome to this comprehensive guide on building scalable systems...`,
  summary: {
    tldr: 'Learn the fundamental principles of building scalable systems including microservices, caching strategies, and distributed architectures.',
    keyMoments: [
      { timestamp: '0:30', description: 'Introduction to scalability concepts' },
      { timestamp: '2:15', description: 'Microservices architecture patterns' },
      { timestamp: '4:00', description: 'Caching strategies and CDNs' },
      { timestamp: '6:30', description: 'Database optimization techniques' },
      { timestamp: '8:45', description: 'Monitoring and observability' },
    ],
    frameworks: [
      'SOLID Principles',
      'Domain-Driven Design',
      'Event-Driven Architecture',
    ],
    playbooks: [
      {
        title: 'Implementing Circuit Breakers',
        trigger: 'Service experiencing cascading failures',
        actions: [
          'Monitor error rates and response times',
          'Set threshold for circuit opening',
          'Implement fallback mechanisms',
          'Gradually test service recovery',
        ],
      },
      {
        title: 'Database Query Optimization',
        trigger: 'Slow query performance detected',
        actions: [
          'Analyze query execution plans',
          'Add appropriate indexes',
          'Consider query restructuring',
          'Implement caching layer',
        ],
      },
    ],
    sentiment: {
      overall: 'informative',
      confidence: 0.92,
      emotions: {
        educational: 0.85,
        technical: 0.78,
        practical: 0.72,
      },
    },
    tools: [
      { name: 'Kubernetes', category: 'Container Orchestration' },
      { name: 'Redis', category: 'Caching' },
      { name: 'Prometheus', category: 'Monitoring' },
      { name: 'PostgreSQL', category: 'Database' },
    ],
  },
  categories: ['Technology', 'Software Engineering', 'System Design'],
  tags: ['scalability', 'architecture', 'microservices', 'performance'],
  processingStages: [
    { stage: 'initialization', timestamp: Date.now() - 10000, duration: 500 },
    { stage: 'fetching_metadata', timestamp: Date.now() - 9500, duration: 1200 },
    { stage: 'extracting_transcript', timestamp: Date.now() - 8300, duration: 2000 },
    { stage: 'generating_summary', timestamp: Date.now() - 6300, duration: 3500 },
    { stage: 'classification', timestamp: Date.now() - 2800, duration: 1500 },
    { stage: 'enrichment', timestamp: Date.now() - 1300, duration: 1000 },
    { stage: 'completed', timestamp: Date.now() - 300, duration: 300 },
  ],
}

/**
 * Generate progress updates for synthetic summary
 */
function* generateProgressUpdates() {
  const stages = [
    { progress: 0, stage: 'Initializing...', status: 'processing' },
    { progress: 10, stage: 'Fetching video metadata...', status: 'processing' },
    { progress: 25, stage: 'Extracting transcript...', status: 'processing' },
    { progress: 40, stage: 'Analyzing content...', status: 'processing' },
    { progress: 60, stage: 'Generating summary...', status: 'processing' },
    { progress: 75, stage: 'Classifying content...', status: 'processing' },
    { progress: 90, stage: 'Adding enrichments...', status: 'processing' },
    { progress: 100, stage: 'Complete!', status: 'completed' },
  ]
  
  for (const update of stages) {
    yield update
  }
}

export async function POST(request: NextRequest) {
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 404 }
    )
  }

  const correlationId = generateCorrelationId('synthetic')
  const logger = createLogger({
    component: 'api.dev.synthetic',
    correlationId,
  })

  try {
    const body = await request.json()
    const { url, simulateError = false, simulateDelay = 0 } = body

    logger.info('Synthetic summary requested', {
      url,
      simulateError,
      simulateDelay,
    })

    // Simulate delay if requested
    if (simulateDelay > 0) {
      logger.info(`Simulating delay of ${simulateDelay}ms`)
      await new Promise(resolve => setTimeout(resolve, simulateDelay))
    }

    // Simulate error if requested
    if (simulateError) {
      logger.error('Simulating error as requested')
      throw new Error('Synthetic error for testing')
    }

    // Generate task ID
    const taskId = `synthetic-${Date.now()}`

    // Store progress updates (in real scenario, this would be in Redis/DB)
    const progressIterator = generateProgressUpdates()
    
    // Simulate async progress updates
    if (typeof window === 'undefined') {
      // Server-side: Set up progress simulation
      let currentProgress = progressIterator.next()
      const progressInterval = setInterval(() => {
        if (!currentProgress.done) {
          logger.stage(
            currentProgress.value.stage,
            currentProgress.value.progress,
            { taskId }
          )
          currentProgress = progressIterator.next()
        } else {
          clearInterval(progressInterval)
        }
      }, 1000)
    }

    // Return synthetic summary
    const response = {
      ...SYNTHETIC_SUMMARY,
      task_id: taskId,
      correlationId,
      timestamp: new Date().toISOString(),
      debug: {
        message: 'This is synthetic data for development/testing',
        correlationId,
        taskId,
        stages: SYNTHETIC_SUMMARY.processingStages,
      },
    }

    logger.info('Synthetic summary generated successfully', {
      taskId,
      summaryId: response.id,
    })

    return NextResponse.json(response, {
      headers: {
        'x-correlation-id': correlationId,
        'x-task-id': taskId,
      },
    })
  } catch (error) {
    logger.error('Failed to generate synthetic summary', error as Error)
    
    return NextResponse.json(
      {
        error: 'Failed to generate synthetic summary',
        message: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      },
      { 
        status: 500,
        headers: {
          'x-correlation-id': correlationId,
        },
      }
    )
  }
}

export async function GET(request: NextRequest) {
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 404 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    )
  }

  // Return progress for synthetic task
  const progress = Math.min(100, Math.floor(Math.random() * 20) + 80)
  const stage = progress === 100 ? 'Complete!' : 'Processing...'

  return NextResponse.json({
    taskId,
    progress,
    stage,
    status: progress === 100 ? 'completed' : 'processing',
    timestamp: new Date().toISOString(),
  })
}