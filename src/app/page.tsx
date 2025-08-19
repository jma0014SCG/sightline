'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { URLInput } from '@/components/molecules/URLInput'
import { SummaryViewer } from '@/components/organisms/SummaryViewer'
import { PricingPlans } from '@/components/organisms/PricingPlans'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProgressTracking } from '@/lib/hooks/useProgressTracking'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useToast } from '@/components/providers/ToastProvider'
import { api } from '@/components/providers/TRPCProvider'
import { DebugPanel } from '@/components/debug/DebugPanel'
import { SignInModal } from '@/components/modals/SignInModal'
import { AuthPromptModal } from '@/components/modals/AuthPromptModal'
import { getBrowserFingerprint, markFreeSummaryUsed } from '@/lib/browser-fingerprint'
import { getSimpleFingerprint, hasReachedFreeLimit, incrementFreeSummariesUsed } from '@/lib/anonUsage'
import { 
  Zap, 
  BookOpen, 
  Share2,
  Clock, 
  Users, 
  CheckCircle,
  Sparkles,
  Play,
  BarChart3,
  Quote,
  PlayCircle,
  Volume2,
  ChevronDown,
  Shield,
  Lock,
  Award,
  Briefcase,
  Search,
  X
} from 'lucide-react'

// Social proof notification data
const socialProofMessages = [
  { name: "Sarah J.", action: "saved 2.5 hours on a React tutorial", time: "3 minutes ago" },
  { name: "Mike T.", action: "summarized a 3-hour podcast in 45 seconds", time: "7 minutes ago" },
  { name: "Anna K.", action: "extracted key insights from a conference talk", time: "12 minutes ago" },
  { name: "David L.", action: "got the TL;DR from a coding tutorial", time: "18 minutes ago" },
  { name: "Emma R.", action: "saved 1.5 hours on market research", time: "25 minutes ago" },
]

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user, authModal, openAuthModal, closeAuthModal } = useAuth()
  const analytics = useAnalytics()
  
  // Query usage stats for authenticated users
  const { data: usageStats } = api.billing.getUsageStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  )
  
  const [currentSummary, setCurrentSummary] = useState<any>(null)
  const [animatedText, setAnimatedText] = useState('')
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  const [metricsVisible, setMetricsVisible] = useState(false)
  const [counters, setCounters] = useState({
    hoursView: 0,
    usersView: 0,
    satisfactionView: 0
  })
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showStickyNav, setShowStickyNav] = useState(false)
  const [showFloatingButton, setShowFloatingButton] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [anonymousSummaryId, setAnonymousSummaryId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentSocialProof, setCurrentSocialProof] = useState(0)
  const [showSocialProof, setShowSocialProof] = useState(false)

  // Real-time progress tracking
  const { progress, stage: processingStage, status: progressStatus } = useProgressTracking({
    taskId: currentTaskId,
    onComplete: (data) => {
      console.log('Progress tracking completed:', data)
      // Don't immediately clear task ID - let the summary display handle it
      // This prevents the progress bar from disappearing before the summary shows
    },
    onError: (error) => {
      console.error('Progress tracking error:', error)
      setCurrentTaskId(null)
    }
  })

  // Social proof notification rotation
  useEffect(() => {
    // Start showing notifications after 5 seconds
    const initialDelay = setTimeout(() => {
      setShowSocialProof(true)
    }, 5000)

    // Rotate through messages every 8 seconds
    const interval = setInterval(() => {
      if (showSocialProof) {
        setShowSocialProof(false)
        setTimeout(() => {
          setCurrentSocialProof((prev) => (prev + 1) % socialProofMessages.length)
          setShowSocialProof(true)
        }, 500)
      }
    }, 8000)

    return () => {
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [showSocialProof])

  // Smooth scroll utility function
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 80 // Account for header height
      const elementPosition = element.offsetTop
      const offsetPosition = elementPosition - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  // Focus URL input and scroll to top
  const focusUrlInput = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement
      if (urlInput) {
        urlInput.focus()
      }
    }, 500) // Wait for scroll to complete
  }
  
  const phrases = useMemo(() => [
    'Turn 60-minute videos into 3-minute power briefs',
    'Stop queuing videos. Start absorbing insights.',
    'Stay ahead while everyone else is still buffering',
    'Learn faster. Retain more.'
  ], [])
  
  // Prefetch auth components on hover for better performance
  const prefetchAuth = useCallback(() => {
    // Trigger Clerk resource loading
    if (!authModal.isOpen && typeof window !== 'undefined') {
      // Preload Clerk components
      import('@clerk/nextjs').then(() => {
        console.log('Auth components preloaded')
      }).catch(err => {
        console.warn('Failed to preload auth components:', err)
      })
    }
  }, [authModal.isOpen])

  // Authenticated summary creation
  const createSummary = api.summary.create.useMutation({
    onSuccess: (data) => {
      console.log('✅ Summary created successfully:', data)
      setSuccessMessage('✅ Summary created and saved to your library!')
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Track successful summary creation
      analytics.trackSummaryCreated({
        video_id: data.videoId || '',
        video_title: data.videoTitle || '',
        channel_name: data.channelName || '',
        duration: data.duration || 0,
        user_plan: 'FREE', // Will be updated when we have user plan info
        is_anonymous: false,
        success: true
      })
      
      // If we got a real task_id from backend, switch to using it for progress tracking
      if (data.task_id && data.task_id !== currentTaskId) {
        console.log('🔄 Switching to real task_id:', data.task_id)
        setCurrentTaskId(data.task_id)
      }
      
      // Store summary immediately - don't wait for progress
      // The summary is already ready from the backend
      console.log('✅ Summary ready, displaying immediately')
      setCurrentSummary(data)
      setCurrentTaskId(null) // Clear task ID to stop progress tracking
      
      // Auto-scroll to summary section after a brief delay
      setTimeout(() => {
        const summaryElement = document.getElementById('summary-section')
        if (summaryElement) {
          summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    },
    onError: (error) => {
      console.error('❌ Summarization failed:', error)
      setCurrentTaskId(null) // Stop progress tracking
      
      // Show user-friendly error message
      const errorMessage = error.message.includes('network') 
        ? 'Network error. Please check your connection and try again.'
        : error.message.includes('limit')
        ? 'You have reached your summary limit. Please upgrade your plan.'
        : 'Unable to create summary. Please try pasting the link again.'
      
      setSuccessMessage(`❌ ${errorMessage}`)
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Track error
      analytics.trackErrorOccurred({
        error_type: 'summary_creation_failed',
        error_message: error.message,
        context: 'authenticated_summary_creation',
        user_plan: 'FREE' // Will be updated when we have user plan info
      })
    }
  })

  // Anonymous summary creation
  const createAnonymousSummary = api.summary.createAnonymous.useMutation({
    onSuccess: (data) => {
      console.log('✅ Anonymous summary created successfully:', data)
      setSuccessMessage('✅ Free summary created! Sign up to save it to your library.')
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Track successful anonymous summary creation
      analytics.trackSummaryCreated({
        video_id: data.videoId || '',
        video_title: data.videoTitle || '',
        channel_name: data.channelName || '',
        duration: data.duration || 0,
        user_plan: 'ANONYMOUS',
        is_anonymous: true,
        success: true
      })
      
      // If we got a real task_id from backend, switch to using it for progress tracking
      if (data.task_id && data.task_id !== currentTaskId) {
        console.log('🔄 Switching to real task_id:', data.task_id)
        setCurrentTaskId(data.task_id)
      }
      
      // Mark that free summary has been used (both old and new tracking)
      markFreeSummaryUsed() // Keep for backward compatibility
      incrementFreeSummariesUsed() // New tracking system
      
      // Store summary immediately - don't wait for progress
      // The summary is already ready from the backend
      console.log('✅ Anonymous summary ready, displaying immediately')
      setCurrentSummary(data)
      setAnonymousSummaryId(data.id)
      setCurrentTaskId(null) // Clear task ID to stop progress tracking
      
      // Auto-scroll to summary section after a brief delay
      setTimeout(() => {
        const summaryElement = document.getElementById('summary-section')
        if (summaryElement) {
          summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
      
      // Show auth prompt after a short delay
      setTimeout(() => {
        setShowAuthPrompt(true)
      }, 2000)
    },
    onError: (error) => {
      console.error('❌ Anonymous summarization failed:', error)
      
      // Track error
      analytics.trackErrorOccurred({
        error_type: error.message.includes('already used') ? 'anonymous_limit_reached' : 'summary_creation_failed',
        error_message: error.message,
        context: 'anonymous_summary_creation',
        user_plan: 'ANONYMOUS'
      })
      
      // Check if they've already used their free summary
      if (error.message.includes('already used')) {
        analytics.trackLimitReached({
          user_plan: 'ANONYMOUS',
          limit_type: 'anonymous',
          current_usage: 1,
          limit_value: 1
        })
        setShowAuthPrompt(true)
      } else {
        // Show user-friendly error message
        const errorMessage = error.message.includes('network') 
          ? 'Network error. Please check your connection and try again.'
          : 'Unable to create summary. Please try pasting the link again.'
        
        setSuccessMessage(`❌ ${errorMessage}`)
        setTimeout(() => setSuccessMessage(null), 5000)
      }
      setCurrentTaskId(null) // Stop progress tracking
    }
  })

  // Start progress tracking when mutation begins
  useEffect(() => {
    if ((createSummary.isPending || createAnonymousSummary.isPending) && !currentTaskId) {
      // We'll get the task_id from the mutation response to start tracking
      console.log('Summary creation started, waiting for task_id...')
    }
  }, [createSummary.isPending, createAnonymousSummary.isPending, currentTaskId])

  const handleUrlSubmit = async (url: string, fingerprint?: string) => {
    console.log('🚀 Starting summarization for URL:', url)
    console.log('🔐 Authentication status:', isAuthenticated)
    
    // Reset current summary before starting new one
    setCurrentSummary(null)
    setAnonymousSummaryId(null)
    
    // Generate a temporary task ID to start progress tracking immediately
    const tempTaskId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('🆔 Generated temporary task ID:', tempTaskId)
    setCurrentTaskId(tempTaskId)
    
    try {
      if (isAuthenticated) {
        console.log('📤 Calling authenticated createSummary mutation...')
        const result = await createSummary.mutateAsync({ url })
        console.log('✅ Mutation result:', result)
        
        // The task_id switching and summary display is now handled in the onSuccess callback
        // This ensures better coordination with progress tracking
      } else {
        // Check if they've already used their free summary
        if (hasReachedFreeLimit()) {
          console.log('❌ Free summary limit reached')
          setCurrentTaskId(null)
          setShowAuthPrompt(true)
          return
        }
        
        console.log('📤 Calling anonymous createSummary mutation...')
        // Use the simple fingerprint for anonymous tracking
        const browserFingerprint = await getSimpleFingerprint()
        const result = await createAnonymousSummary.mutateAsync({ url, browserFingerprint })
        console.log('✅ Anonymous mutation result:', result)
        
        // The task_id switching and summary display is now handled in the onSuccess callback
        // This ensures better coordination with progress tracking
      }
    } catch (error) {
      console.error('❌ HandleUrlSubmit error:', error)
      setCurrentTaskId(null) // Stop progress tracking on error
      // The error will be handled by onError callback
    }
  }


  // Animated text effect
  useEffect(() => {
    const phrase = phrases[currentPhraseIndex]
    let i = 0
    setAnimatedText('')
    
    const timer = setInterval(() => {
      if (i < phrase.length) {
        setAnimatedText(phrase.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        setTimeout(() => {
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length)
        }, 2000)
      }
    }, 50)

    return () => clearInterval(timer)
  }, [currentPhraseIndex, phrases])

  // Animated counter hook
  const animateCounter = useCallback((start: number, end: number, duration: number, key: keyof typeof counters) => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const currentValue = Math.floor(start + (end - start) * progress)
      
      setCounters(prev => ({ ...prev, [key]: currentValue }))
      
      if (progress === 1) {
        clearInterval(timer)
      }
    }, 16)
  }, [])

  // Intersection observer for metrics section
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !metricsVisible) {
          setMetricsVisible(true)
          // Start counter animations with staggered delays
          setTimeout(() => animateCounter(0, 250, 2000, 'usersView'), 0)
          setTimeout(() => animateCounter(0, 1200, 2000, 'hoursView'), 200)
          setTimeout(() => animateCounter(0, 94, 2000, 'satisfactionView'), 400)
        }
      },
      { threshold: 0.5 }
    )

    const metricsSection = document.getElementById('metrics-section')
    if (metricsSection) {
      observer.observe(metricsSection)
    }

    return () => observer.disconnect()
  }, [metricsVisible, animateCounter])

  // Sticky navigation and floating button scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setShowStickyNav(scrollY > 100)
      setShowFloatingButton(scrollY > 800) // Show after scrolling past hero
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      
      // Ctrl+K or Cmd+K focuses URL input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        focusUrlInput()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [])

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* Social Proof Notification */}
      {showSocialProof && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm animate-fade-in-up">
          <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{socialProofMessages[currentSocialProof].name}</span>{' '}
                {socialProofMessages[currentSocialProof].action}
              </p>
              <p className="text-xs text-gray-500 mt-1">{socialProofMessages[currentSocialProof].time}</p>
            </div>
            <button
              onClick={() => setShowSocialProof(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header Navigation */}
      <header className="relative z-40 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
            >
              <Image
                src="/images/logo/logo1.png"
                alt="Sightline Logo"
                width={48}
                height={48}
                className="h-12 w-auto"
                priority
              />
              <span className="font-bold text-xl text-gray-900">Sightline</span>
            </button>

            {/* Navigation Links */}
            {/* Navbar tagline */}
            <div className="hidden md:flex items-center space-x-8">
              <span className="text-sm text-gray-500 italic">Learn faster. Retain more.</span>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 min-h-[44px] touch-manipulation"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 min-h-[44px] touch-manipulation"
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 min-h-[44px] touch-manipulation"
              >
                FAQ
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <button 
                  onClick={() => router.push('/library')} 
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">Library</span>
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal('sign-in')}
                  onMouseEnter={prefetchAuth}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 min-h-[44px] touch-manipulation px-2 sm:px-3"
                >
                  <span className="sm:hidden">Sign In</span>
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
              <button
                onClick={focusUrlInput}
                className="bg-primary-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 transition-all duration-200 shadow-md hover:shadow-lg min-h-[36px] touch-manipulation"
              >
                Get Started Free →
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Sticky Navigation */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showStickyNav 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0'
      }`}>
        <div className="bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 sm:h-6 w-5 sm:w-6 text-primary-600" />
                <span className="font-bold text-lg sm:text-xl text-gray-900">Sightline</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={focusUrlInput}
                  className="bg-primary-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 transition-all duration-200 min-h-[40px] touch-manipulation shadow-md hover:shadow-lg"
                >
                  <span className="hidden sm:inline">Get Started Free →</span>
                  <span className="sm:hidden">Get Started</span>
                </button>
                <button
                  onClick={() => router.push('/library')}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 min-h-[40px] flex items-center touch-manipulation px-3"
                >
                  <BookOpen className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">Library</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1d2d44_1px,transparent_1px),linear-gradient(to_bottom,#1d2d44_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10"></div>
        
        {/* Gradient overlays */}
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_20%_80%,#c5d3e6,transparent)]"></div>
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_400px_at_80%_20%,#8ba7cd,transparent)]"></div>
        
        {/* Animated floating elements */}
        <div className="absolute top-20 left-10 w-16 h-16 bg-prussian-blue-900 rounded-full opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-prussian-blue-800 rounded-lg opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-1/4 w-8 h-8 bg-prussian-blue-700 rounded-full opacity-25 animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-prussian-blue-600 rounded-full opacity-30 animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Hero Section */}
      <section className="relative px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="relative">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <span>Trusted by 250+ verified professionals</span>
              </div>

              {/* Main headline - Clear value proposition */}
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-5xl xl:text-6xl leading-[1.1] mb-6">
                <span className="block">Get the TL;DR from any</span>
                <span className="block text-primary-600 mt-1">YouTube video in 60 seconds</span>
              </h1>

              <p className="mt-6 text-xl sm:text-2xl leading-relaxed text-gray-600 max-w-xl">
                Skip the fluff. Get actionable insights from any video without watching. 
                <span className="block mt-2 text-lg text-gray-500">Join professionals saving 10+ hours weekly.</span>
              </p>
              
              {/* Enhanced social proof with real metrics */}
              <div className="mt-8 space-y-4">
                {/* Success metrics */}
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">1,287</div>
                    <div className="text-xs text-gray-600">Hours saved this month</div>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">94%</div>
                    <div className="text-xs text-gray-600">Accuracy on insights</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">250+</div>
                    <div className="text-xs text-gray-600">Active users</div>
                  </div>
                </div>
                
                {/* Trust signals */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>No credit card required</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <Lock className="h-4 w-4 text-green-600" />
                    <span>Your data is never stored</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <Award className="h-4 w-4 text-green-600" />
                    <span>60-second results</span>
                  </div>
                </div>
              </div>
              
              {/* Primary CTA for mobile */}
              <div className="mt-8 lg:hidden">
                <button
                  onClick={focusUrlInput}
                  className="w-full bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[48px] touch-manipulation"
                >
                  Get My Free Summary →
                </button>
                <p className="text-center mt-3 text-sm text-gray-500">
                  60-second demo available • No signup required
                </p>
              </div>

            </div>

            {/* Right Column - URL Input */}
            <div className="relative">
              {/* Enhanced CTA card */}
              <div className="relative rounded-2xl bg-white p-6 sm:p-8 shadow-xl ring-1 ring-gray-200">
                <div className="space-y-6 relative">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-green-200">
                      <Zap className="h-4 w-4" />
                      <span>Start Free • No Credit Card</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Get Your Free Summary
                    </h2>
                    <p className="text-gray-600">
                      Paste any YouTube URL below for instant insights
                    </p>
                  </div>

                  {/* Display remaining summaries for authenticated users */}
                  {isAuthenticated && usageStats && (
                    <div className="mb-4 text-center">
                      <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm">
                        <span className="font-semibold">
                          {usageStats.monthlyLimit === -1 
                            ? 'Unlimited summaries' 
                            : usageStats.monthlyLimit === 0
                            ? 'No summaries available'
                            : `${Math.max(0, usageStats.monthlyLimit - usageStats.currentMonthUsage)} summaries remaining this month`}
                        </span>
                        {usageStats.monthlyLimit > 0 && usageStats.currentMonthUsage >= usageStats.monthlyLimit && (
                          <button 
                            onClick={() => router.push('/billing')} 
                            className="underline hover:text-amber-800 transition-colors"
                          >
                            Upgrade
                          </button>
                        )}
                      </span>
                    </div>
                  )}

                  <URLInput 
                    onSubmit={handleUrlSubmit}
                    onSuccess={() => {
                      // Optional: Add any additional success handling here
                      console.log('URL input cleared after successful submission')
                    }}
                    onAuthRequired={() => {
                      // Show auth modal when anonymous user needs to sign up
                      setShowAuthPrompt(true)
                    }}
                    isLoading={createSummary.isPending || createAnonymousSummary.isPending}
                    className="scale-105"
                  />

                  {/* Trust indicators */}
                  <div className="text-center pt-2">
                    <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>Secure</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        <span>Private</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span>60s results</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -left-4 top-4 h-16 w-16 rounded-2xl bg-prussian-blue-100 opacity-60 rotate-12"></div>
              <div className="absolute -right-4 bottom-4 h-12 w-12 rounded-xl bg-prussian-blue-200 opacity-40 -rotate-12"></div>
            </div>
          </div>

          {/* Enhanced Processing state - show progress bar until summary is ready */}
          {(createSummary.isPending || createAnonymousSummary.isPending || (currentTaskId && !currentSummary)) && (
            <div className="mt-16 mx-auto max-w-md">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center space-x-2 text-primary-700 mb-2">
                    <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse animation-delay-200"></div>
                    <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse animation-delay-400"></div>
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {progressStatus === 'completed' && progress >= 100 ? 'Preparing your summary...' : 'Processing your video'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{processingStage}</p>
                </div>
                
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${
                        progressStatus === 'completed' ? 'bg-green-600' : 'bg-primary-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    {progressStatus === 'completed' && progress >= 100 ? 'Loading your summary... 🎉' : 
                     progress === 100 ? 'Almost ready! 🎉' : 
                     currentTaskId?.startsWith('temp_') ? 'Estimated time: 45-60 seconds' : 
                     'Live progress tracking active'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error state */}
          {(createSummary.isError || createAnonymousSummary.isError) && (
            <div className="mt-16 mx-auto max-w-md">
              <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
                <p className="font-semibold text-red-800">Something went wrong</p>
                <p className="text-sm text-red-600 mt-1">{createSummary.error?.message || createAnonymousSummary.error?.message}</p>
                <button
                  onClick={() => {
                    // Reset error states
                    createSummary.reset()
                    createAnonymousSummary.reset()
                    setCurrentTaskId(null)
                  }}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mt-16 mx-auto max-w-md">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-lg">
                <p className="text-green-800 text-center font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Summary display */}
          {currentSummary && (
            <div id="summary-section" className="mt-20">
              <SummaryViewer summary={currentSummary} />
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Professionals Love Sightline
            </h2>
            <p className="text-lg text-gray-600">
              Join 250+ users saving hours every week
            </p>
          </div>
          
          {/* Testimonial Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
              </div>
              <blockquote className="text-gray-700 mb-4">
                "Cut my weekly research prep from 3 hours to 20 minutes. The summaries are incredibly accurate and save me so much time."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                  PK
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Priya Kumar</div>
                  <div className="text-sm text-gray-600">Product Manager, Series B Startup</div>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
              </div>
              <blockquote className="text-gray-700 mb-4">
                "As a developer, I watch tons of tutorials. Sightline helps me extract the code examples and key concepts without the fluff."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                  MR
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Marcus Rodriguez</div>
                  <div className="text-sm text-gray-600">Senior Developer, Tech Company</div>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
              </div>
              <blockquote className="text-gray-700 mb-4">
                "Perfect for staying updated on industry podcasts. I get all the insights without spending hours listening."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                  SL
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Sarah Lee</div>
                  <div className="text-sm text-gray-600">Marketing Director, SaaS Company</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="mt-12 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-5 w-5 text-green-600" />
              <span>SOC2 Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="h-5 w-5 text-green-600" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Award className="h-5 w-5 text-green-600" />
              <span>60-Day Guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Trusted Sources Section */}
      <section className="pb-20 pt-16 bg-white" aria-labelledby="trusted-sources-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <BarChart3 className="w-4 h-4" />
              Platform Versatility
            </div>
            <h2 id="trusted-sources-heading" className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
              Works with Your Favorite YouTube Channels
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              From cutting-edge research to business insights, Sightline delivers precise summaries 
              across all content categories your audience values most
            </p>
          </div>
          
          <div className="relative">
            {/* Background pattern for premium feel */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-50/30 to-transparent blur-3xl"></div>
            
            <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 lg:gap-8">
              {/* Huberman Lab */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="Huberman Lab - Science & Health content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/huberman-lab.png"
                      alt="Huberman Lab"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Huberman Lab
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Science & Health
                  </p>
                </div>
              </div>
              
              {/* Lex Fridman Podcast */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="Lex Fridman Podcast - Tech & AI content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/lex-fridman.png"
                      alt="Lex Fridman Podcast"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Lex Fridman
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Tech & AI
                  </p>
                </div>
              </div>
              
              {/* The Colin & Samir Show */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="The Colin & Samir Show - Creator Economy content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/colin-samir.png"
                      alt="The Colin & Samir Show"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Colin & Samir
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Creator Economy
                  </p>
                </div>
              </div>
              
              {/* Coding with Mosh */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="Coding with Mosh - Programming Tutorials content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/mosh.png"
                      alt="Coding with Mosh"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Coding with Mosh
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Programming Tutorials
                  </p>
                </div>
              </div>
              
              {/* The Diary of a CEO */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="The Diary of a CEO - Business & Leadership content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/diary-of-ceo.png"
                      alt="The Diary of a CEO"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Diary of a CEO
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Business & Leadership
                  </p>
                </div>
              </div>

              {/* a16z Podcast */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="a16z Podcast - Venture Capital & Tech content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/a16z.png"
                      alt="a16z Podcast"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    a16z Podcast
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Venture Capital
                  </p>
                </div>
              </div>

              {/* Acquired */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="Acquired - Tech Business Stories content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/acquired.png"
                      alt="Acquired"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Acquired
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Tech Business Stories
                  </p>
                </div>
              </div>

              {/* The Daily */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="The Daily - News & Current Affairs content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/daily.png"
                      alt="The Daily"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    The Daily
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    News & Current Affairs
                  </p>
                </div>
              </div>

              {/* Hidden Brain */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="Hidden Brain - Psychology & Behavior content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/hiddenbrain.png"
                      alt="Hidden Brain"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Hidden Brain
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Psychology & Behavior
                  </p>
                </div>
              </div>

              {/* Alex Hormozi */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="Alex Hormozi - Business & Entrepreneurship content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/hormozi.png"
                      alt="Alex Hormozi"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Alex Hormozi
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Entrepreneurship
                  </p>
                </div>
              </div>

              {/* The Journal */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="The Journal - Business & Finance content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/journal.png"
                      alt="The Journal"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    The Journal
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Business & Finance
                  </p>
                </div>
              </div>

              {/* Pod Save America */}
              <div 
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 hover:border-primary-200 cursor-pointer"
                role="img"
                aria-label="Pod Save America - Politics & Policy content"
                tabIndex={0}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all duration-300">
                    <Image
                      src="/images/podcasts/podsaveamerica.png"
                      alt="Pod Save America"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors text-center leading-tight">
                    Pod Save America
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Politics & Policy
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Capability footer */}
          <div className="text-center pt-12 mt-12 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-primary-500" />
              Supporting 20+ premium podcasts and content creators with consistent quality
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-base font-semibold leading-7 text-prussian-blue-600 mb-2">
              🎬 See Sightline in Action
            </h2>
            <h3 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              From YouTube Link to Smart Summary in 60 Seconds
            </h3>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Watch how Sightline transforms a lengthy video into actionable insights faster than you can make coffee
            </p>
          </div>
          
          {/* Video Container */}
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-prussian-blue-200/50 ring-1 ring-prussian-blue-200">
              <div style={{ position: 'relative', paddingBottom: '58.951965065502186%', height: 0 }}>
                <iframe 
                  src="https://www.loom.com/embed/60baaa8d79454a8186a92b8e187b6845?sid=1d361d0a-b600-4adf-b8da-af810c52ab00" 
                  frameBorder="0"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  className="rounded-lg"
                ></iframe>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                2 minute demo • No audio required • See the full workflow
              </p>
            </div>
          </div>

          {/* CTA below video with trust signals */}
          <div className="mt-12 text-center">
            <button
              onClick={focusUrlInput}
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
            >
              <Zap className="h-5 w-5" />
              <span>Get My Free Summary</span>
            </button>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>60-second results</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Types Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-prussian-blue-600">
              🎯 Works Great For Every Video Type
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              From podcasts to tutorials, we&apos;ve got you covered
            </h3>
            <p className="mt-6 text-lg text-gray-600">
              Sightline adapts to any video format and extracts the most valuable insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Podcast / Interviews */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <Volume2 className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">Podcast / Interviews</h4>
              </div>
              <p className="text-sm text-gray-600">Extract key quotes, insights, and takeaways from conversations and interviews</p>
            </div>

            {/* Tutorial / How-to / Coding */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <BookOpen className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">Tutorial / How-to / Coding</h4>
              </div>
              <p className="text-sm text-gray-600">Get step-by-step instructions and key concepts without watching entire tutorials</p>
            </div>

            {/* Lecture / Conference Talk */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <Users className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">Lecture / Conference Talk</h4>
              </div>
              <p className="text-sm text-gray-600">Capture main themes, research findings, and actionable insights from presentations</p>
            </div>

            {/* News / Commentary */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <Search className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">News / Commentary</h4>
              </div>
              <p className="text-sm text-gray-600">Stay informed with key facts, analysis, and different perspectives on current events</p>
            </div>

            {/* Product Review / Unboxing */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <Award className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">Product Review / Unboxing</h4>
              </div>
              <p className="text-sm text-gray-600">Get pros, cons, and key features to make informed purchasing decisions quickly</p>
            </div>

            {/* Panel / Webinar */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <Briefcase className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">Panel / Webinar</h4>
              </div>
              <p className="text-sm text-gray-600">Extract diverse viewpoints and expert opinions from multi-speaker discussions</p>
            </div>

            {/* Documentary / Deep-Dive */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <PlayCircle className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">Documentary / Deep-Dive</h4>
              </div>
              <p className="text-sm text-gray-600">Understand complex topics and narratives without hours of viewing time</p>
            </div>

            {/* Short-form Highlights */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-prussian-blue-100 hover:border-prussian-blue-200 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-prussian-blue-900 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="h-5 w-5 text-prussian-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-900">Short-form Highlights</h4>
              </div>
              <p className="text-sm text-gray-600">Distill the essence from quick clips, teasers, and highlight reels</p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <button
              onClick={focusUrlInput}
              className="bg-prussian-blue text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-paynes-gray transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Try It With Your Favorite Content
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 sm:py-32 bg-white">
        <PricingPlans showCurrentPlan={false} />
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 sm:py-32 bg-anti-flash-white relative">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-silver-lake-blue">
              🤔 Frequently Asked
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-prussian-blue sm:text-4xl">
              Questions we get all the time
            </h3>
            <p className="mt-6 text-lg text-paynes-gray">
              (More questions? Hit the chat bubble in the corner.)
            </p>
          </div>

          <div className="space-y-4 relative">
            {[
              {
                id: 'faq-1',
                question: "Does this work with podcasts?",
                answer: "Yes! As long as the podcast is on YouTube, we can summarize it. Most major podcasts upload full episodes to YouTube, including Joe Rogan, Lex Fridman, Huberman Lab, and thousands more. Just paste the YouTube link and we'll handle the rest."
              },
              {
                id: 'faq-2',
                question: "How accurate are the summaries?",
                answer: "Our AI achieves 94% accuracy in extracting key points from videos. We use advanced language models that understand context, speaker intent, and technical content. Every summary includes timestamps so you can verify important points yourself."
              },
              {
                id: 'faq-3',
                question: "What video lengths do you support?",
                answer: "We can process videos up to 6 hours long. Whether it's a 5-minute tutorial or a 3-hour podcast, you'll get your summary in about 60 seconds."
              },
              {
                id: 'faq-4',
                question: "Is my data private?",
                answer: "Absolutely. We don't store your viewing history or personal data. Summaries are tied to your account for your convenience, but we never share or sell your information. You can delete your summaries anytime."
              },
              {
                id: 'faq-5',
                question: "Can I share summaries with my team?",
                answer: "Yes! Every summary gets a unique share link. You can send it to colleagues, embed it in documents, or export it as markdown. Pro users also get team collaboration features."
              },
              {
                id: 'faq-6',
                question: "What if I'm not satisfied?",
                answer: "We offer a 60-day money-back guarantee. If Sightline doesn't save you time and improve your learning, we'll refund your subscription—no questions asked."
              }
            ].map((faq, index) => {
              const isExpanded = expandedFaq === index
              
              return (
                <div key={faq.id} className="relative border-2 border-prussian-blue-100 hover:border-prussian-blue-200 rounded-xl bg-white shadow-sm transition-all duration-200" style={{ zIndex: 10 - index }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setExpandedFaq(isExpanded ? null : index)
                    }}
                    className="relative w-full px-6 py-5 text-left flex items-center justify-between hover:bg-anti-flash-white/50 transition-colors duration-200 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-silver-lake-blue focus:ring-offset-2"
                    style={{ pointerEvents: 'auto', zIndex: 2 }}
                    aria-expanded={isExpanded}
                    aria-controls={`${faq.id}-content`}
                  >
                    <span className="font-semibold text-prussian-blue pr-4">{faq.question}</span>
                    <ChevronDown 
                      className={`h-5 w-5 text-silver-lake-blue transition-transform duration-300 flex-shrink-0 transform ${
                        isExpanded ? 'rotate-180' : 'rotate-0'
                      }`} 
                    />
                  </button>
                  <div
                    id={`${faq.id}-content`}
                    className={`overflow-hidden transition-all duration-300 ease-in-out`}
                    style={{
                      maxHeight: isExpanded ? '500px' : '0px',
                      opacity: isExpanded ? 1 : 0
                    }}
                  >
                    <div className="px-6 pb-5 pt-4 border-t border-paynes-gray/20">
                      <p className="text-paynes-gray leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative isolate px-6 py-24 sm:py-32 lg:px-8 bg-white">
        <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]">
          <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-silver-lake-blue/30 to-paynes-gray/20 opacity-30 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-prussian-blue sm:text-4xl">
            Ready to outrun information overload?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-paynes-gray">
            Stop queuing videos. Start absorbing insights.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={focusUrlInput}
              className="rounded-full bg-prussian-blue px-8 py-4 min-h-[44px] text-sm font-semibold text-white shadow-xl hover:bg-paynes-gray focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prussian-blue transition-all duration-200 hover:scale-105 touch-manipulation"
            >
Don&apos;t Miss Out - Try Sightline Free
            </button>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 transition-all duration-300 ${
        showFloatingButton 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-16 opacity-0 scale-75 pointer-events-none'
      }`}>
        <button
          onClick={focusUrlInput}
          className="group bg-primary-600 hover:bg-primary-700 text-white rounded-full p-3 sm:p-4 shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center space-x-2 min-h-[48px] sm:min-h-[56px] touch-manipulation"
          aria-label="Summarize a video"
        >
          <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden sm:block font-medium text-sm">
            {isAuthenticated && usageStats && usageStats.monthlyLimit > 0
              ? `Summarize (${Math.max(0, usageStats.monthlyLimit - usageStats.currentMonthUsage)} left)`
              : 'Summarize Video'}
          </span>
        </button>
      </div>


      {/* Debug Panel - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div suppressHydrationWarning>
          {typeof window !== 'undefined' && <DebugPanel />}
        </div>
      )}
      
      {/* Exit Intent Popup placeholder - implement with proper exit intent detection */}
      {/* "Still scrolling? Paste a link—see the magic." */}

      {/* Sign In Modal */}
      <SignInModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        mode={authModal.mode}
        afterSignInUrl={authModal.afterSignInUrl}
        afterSignUpUrl={authModal.afterSignUpUrl}
      />

      {/* Auth Prompt Modal for Anonymous Users */}
      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSignIn={() => {
          setShowAuthPrompt(false)
          openAuthModal('sign-in', {
            afterSignInUrl: anonymousSummaryId ? `/library/${anonymousSummaryId}` : '/library',
            afterSignUpUrl: anonymousSummaryId ? `/library/${anonymousSummaryId}` : '/library'
          })
        }}
        onSignUp={() => {
          setShowAuthPrompt(false)
          openAuthModal('sign-up', {
            afterSignInUrl: anonymousSummaryId ? `/library/${anonymousSummaryId}` : '/library',
            afterSignUpUrl: anonymousSummaryId ? `/library/${anonymousSummaryId}` : '/library'
          })
        }}
        summaryTitle={currentSummary?.videoTitle}
      />
    </main>
  )
}