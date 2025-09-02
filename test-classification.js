#!/usr/bin/env node
/**
 * Test Classification Service
 * 
 * This script tests the classification service to diagnose tagging issues.
 * It tests:
 * 1. OpenAI API connectivity
 * 2. Classification function directly
 * 3. Database connectivity and operations
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { OpenAI } = require('openai')

async function testOpenAIConnection() {
  console.log('\n🔍 Testing OpenAI API Connection...')
  console.log('   API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 20)}...` : 'NOT SET')
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set in environment')
    return false
  }

  try {
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // 10 second timeout for test
      maxRetries: 1,
    })

    console.log('📡 Sending test request to OpenAI...')
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ 
        role: "user", 
        content: "Reply with only: OK" 
      }],
      max_tokens: 10,
      temperature: 0
    })

    if (response.choices[0]?.message?.content) {
      console.log('✅ OpenAI API is working:', response.choices[0].message.content.trim())
      return true
    } else {
      console.error('❌ Unexpected response format from OpenAI')
      return false
    }
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error.message)
    if (error.status === 401) {
      console.error('   → Invalid API key')
    } else if (error.status === 429) {
      console.error('   → Rate limit exceeded or quota exhausted')
    } else if (error.status === 500) {
      console.error('   → OpenAI server error')
    }
    return false
  }
}

async function testClassificationFunction() {
  console.log('\n🔍 Testing Classification Function...')
  
  try {
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45000,
      maxRetries: 2,
    })

    const testContent = `
      This video is about React hooks and state management. 
      Elon Musk recently discussed how Tesla is using AI and machine learning.
      We'll cover useState, useEffect, and custom hooks.
      The video also mentions OpenAI's GPT-4 and Microsoft Azure.
    `

    const prompt = `Analyze the following YouTube video content and classify it.

INPUT:
"""
Title: React Hooks Tutorial with AI Examples

Content: ${testContent}
"""

TASK:
1. Assign 2-4 broad categories from this list: Productivity, Technology, Business, Marketing, Finance, Health, Personal Development, Art & Design, Education, Entertainment, Science, Startup, Programming, AI & Machine Learning
2. Extract up to 8 specific entities (people, companies, products, technologies, concepts, frameworks, tools) and label their type.

ENTITY TYPES:
- PERSON: Individual people (use full names)
- COMPANY: Organizations, businesses
- TECHNOLOGY: Technologies, programming languages
- PRODUCT: Specific products, apps
- CONCEPT: Abstract concepts
- FRAMEWORK: Frameworks, libraries
- TOOL: Tools, software

Respond with ONLY a valid JSON object in this format:
{
  "categories": ["Category1", "Category2"], 
  "tags": [
    {"name": "Entity Name", "type": "PERSON"},
    {"name": "Another Entity", "type": "COMPANY"}
  ]
}`

    console.log('📡 Sending classification request to OpenAI...')
    const startTime = Date.now()
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500
    })

    const elapsed = Date.now() - startTime
    console.log(`⏱️  Classification took ${elapsed}ms`)

    if (!response.choices[0]?.message?.content) {
      console.error('❌ No response content from OpenAI')
      return false
    }

    console.log('📥 Raw response:', response.choices[0].message.content)
    
    try {
      const result = JSON.parse(response.choices[0].message.content)
      console.log('\n✅ Classification successful!')
      console.log('   Categories:', result.categories)
      console.log('   Tags:', result.tags)
      return true
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError.message)
      return false
    }

  } catch (error) {
    console.error('❌ Classification test failed:', error.message)
    return false
  }
}

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // Test connection
    console.log('📡 Connecting to database...')
    await prisma.$connect()
    console.log('✅ Database connected')

    // Check if categories exist
    const categoryCount = await prisma.category.count()
    console.log(`   Found ${categoryCount} categories in database`)

    // Check if tags exist
    const tagCount = await prisma.tag.count()
    console.log(`   Found ${tagCount} tags in database`)

    // Get recent summaries
    const recentSummaries = await prisma.summary.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        categories: true,
        tags: true
      }
    })

    console.log(`\n📚 Recent summaries (${recentSummaries.length}):`)
    recentSummaries.forEach((summary, i) => {
      console.log(`   ${i + 1}. ${summary.videoTitle}`)
      console.log(`      Categories: ${summary.categories.map(c => c.name).join(', ') || 'None'}`)
      console.log(`      Tags: ${summary.tags.map(t => `${t.name} (${t.type})`).join(', ') || 'None'}`)
      console.log(`      Created: ${summary.createdAt.toISOString()}`)
    })

    await prisma.$disconnect()
    return true
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('🏷️  Classification Service Diagnostic Tool')
  console.log('=' .repeat(50))
  
  const results = {
    openai: await testOpenAIConnection(),
    classification: false,
    database: await testDatabaseConnection()
  }

  // Only test classification if OpenAI is working
  if (results.openai) {
    results.classification = await testClassificationFunction()
  }

  console.log('\n' + '=' .repeat(50))
  console.log('📊 TEST RESULTS:')
  console.log('   OpenAI API:', results.openai ? '✅ PASS' : '❌ FAIL')
  console.log('   Classification:', results.classification ? '✅ PASS' : '❌ FAIL')
  console.log('   Database:', results.database ? '✅ PASS' : '❌ FAIL')

  if (!results.openai) {
    console.log('\n⚠️  DIAGNOSIS: OpenAI API is not accessible')
    console.log('   Possible causes:')
    console.log('   1. Invalid API key')
    console.log('   2. API key not set in environment')
    console.log('   3. OpenAI service issues')
    console.log('   4. Network connectivity issues')
  } else if (!results.classification) {
    console.log('\n⚠️  DIAGNOSIS: Classification function is failing')
    console.log('   Possible causes:')
    console.log('   1. OpenAI model issues')
    console.log('   2. Prompt format problems')
    console.log('   3. Response parsing errors')
  } else if (!results.database) {
    console.log('\n⚠️  DIAGNOSIS: Database operations are failing')
    console.log('   Possible causes:')
    console.log('   1. Database connection issues')
    console.log('   2. Schema not migrated')
    console.log('   3. Permission issues')
  } else {
    console.log('\n✅ All systems operational!')
  }
}

// Run tests
runAllTests().catch(console.error)