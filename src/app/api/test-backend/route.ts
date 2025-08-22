import { NextResponse } from 'next/server'

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_URL || 
                     'http://localhost:8000'
  
  console.log('Testing backend URL:', backendUrl)
  
  try {
    // Test 1: Check if backend URL is configured
    const urlCheck = {
      BACKEND_URL: process.env.BACKEND_URL || 'NOT SET',
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT SET',
      USED_URL: backendUrl
    }
    
    // Test 2: Try to fetch health endpoint
    let healthResponse = null
    let healthError = null
    try {
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const responseText = await response.text()
      
      if (response.ok) {
        try {
          healthResponse = JSON.parse(responseText)
        } catch {
          healthResponse = { raw: responseText, status: response.status }
        }
      } else {
        healthError = `Status ${response.status}: ${responseText}`
      }
    } catch (error) {
      healthError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Test 3: Try to make a POST to summarize endpoint
    let summarizeResponse = null
    let summarizeError = null
    try {
      const response = await fetch(`${backendUrl}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        })
      })
      
      const responseText = await response.text()
      
      if (response.ok) {
        try {
          summarizeResponse = JSON.parse(responseText)
        } catch {
          summarizeResponse = { raw: responseText, status: response.status }
        }
      } else {
        summarizeError = `Status ${response.status}: ${responseText}`
      }
    } catch (error) {
      summarizeError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json({
      success: true,
      environment: {
        ...urlCheck,
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
      tests: {
        health: {
          success: !!healthResponse,
          response: healthResponse,
          error: healthError
        },
        summarize: {
          success: !!summarizeResponse,
          response: summarizeResponse,
          error: summarizeError
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}