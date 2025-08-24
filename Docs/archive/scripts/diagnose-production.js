#!/usr/bin/env node

/**
 * Production Diagnostic Script
 * This script checks all critical components for the summarization flow
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function diagnoseProduction() {
  console.log('🔍 Production Environment Diagnostic')
  console.log('=====================================\n')

  // 1. Check Database Connection
  console.log('1️⃣ DATABASE CONNECTION')
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    console.log(`   Connection: ${process.env.DATABASE_URL?.substring(0, 50)}...`)
  } catch (error) {
    console.log('❌ Database connection failed:', error.message)
    return
  }

  // 2. Check Anonymous User
  console.log('\n2️⃣ ANONYMOUS USER CHECK')
  try {
    const anonymousUser = await prisma.user.findUnique({
      where: { id: 'ANONYMOUS_USER' }
    })
    
    if (anonymousUser) {
      console.log('✅ Anonymous user exists')
      console.log(`   ID: ${anonymousUser.id}`)
      console.log(`   Email: ${anonymousUser.email}`)
      console.log(`   Plan: ${anonymousUser.plan}`)
    } else {
      console.log('❌ Anonymous user MISSING - this will break anonymous summarization!')
      console.log('   Run: node scripts/init-anonymous-user.js')
    }
  } catch (error) {
    console.log('❌ Error checking anonymous user:', error.message)
  }

  // 3. Check Regular Users
  console.log('\n3️⃣ USER COUNT')
  try {
    const userCount = await prisma.user.count()
    console.log(`✅ Total users in database: ${userCount}`)
    
    const recentUsers = await prisma.user.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { email: true, plan: true, createdAt: true }
    })
    
    if (recentUsers.length > 0) {
      console.log('   Recent users:')
      recentUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.plan}) - ${u.createdAt.toISOString()}`)
      })
    }
  } catch (error) {
    console.log('❌ Error checking users:', error.message)
  }

  // 4. Check Summaries
  console.log('\n4️⃣ SUMMARY DATA')
  try {
    const summaryCount = await prisma.summary.count()
    console.log(`✅ Total summaries in database: ${summaryCount}`)
    
    const recentSummaries = await prisma.summary.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { 
        videoTitle: true, 
        createdAt: true,
        userId: true
      }
    })
    
    if (recentSummaries.length > 0) {
      console.log('   Recent summaries:')
      recentSummaries.forEach(s => {
        console.log(`   - "${s.videoTitle}" by ${s.userId} - ${s.createdAt.toISOString()}`)
      })
    }
  } catch (error) {
    console.log('❌ Error checking summaries:', error.message)
  }

  // 5. Check Environment Variables
  console.log('\n5️⃣ ENVIRONMENT VARIABLES')
  const requiredEnvVars = [
    'DATABASE_URL',
    'BACKEND_URL',
    'NEXT_PUBLIC_BACKEND_URL',
    'NEXT_PUBLIC_APP_URL',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  ]
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar]
    if (value) {
      console.log(`✅ ${envVar}: ${value.substring(0, 30)}...`)
    } else {
      console.log(`❌ ${envVar}: MISSING`)
    }
  })

  // 6. Test Backend API Connection
  console.log('\n6️⃣ BACKEND API CHECK')
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl}/api/health`)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend API is healthy:', data)
      } else {
        console.log('❌ Backend API returned error:', response.status)
      }
    } catch (error) {
      console.log('❌ Cannot connect to backend API:', error.message)
    }
  } else {
    console.log('❌ No backend URL configured')
  }

  console.log('\n=====================================')
  console.log('📋 DIAGNOSTIC COMPLETE')
  
  await prisma.$disconnect()
}

diagnoseProduction().catch(console.error)