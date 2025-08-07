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
import { api } from '@/components/providers/TRPCProvider'
import { DebugPanel } from '@/components/debug/DebugPanel'
import { SignInModal } from '@/components/modals/SignInModal'
import { AuthPromptModal } from '@/components/modals/AuthPromptModal'
import { getBrowserFingerprint, hasUsedFreeSummary, markFreeSummaryUsed } from '@/lib/browser-fingerprint'
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

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, authModal, openAuthModal, closeAuthModal } = useAuth()
  const analytics = useAnalytics()
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
      
      // Wait for progress to complete (100%) or a maximum timeout before showing summary
      const waitForProgressCompletion = () => {
        const checkProgress = async () => {
          if (progressStatus === 'completed' || progress >= 100) {
            console.log('📊 Progress completed, showing summary immediately')
            setCurrentSummary(data)
            setCurrentTaskId(null) // Clear task ID after showing summary
            
            // Auto-scroll to summary section
            setTimeout(() => {
              const summaryElement = document.getElementById('summary-section')
              if (summaryElement) {
                summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 100)
          } else {
            // Check again in 500ms if progress isn't complete yet
            setTimeout(checkProgress, 500)
          }
        }
        
        // Start checking immediately, but with a 3-second safety timeout
        checkProgress()
        setTimeout(() => {
          if (!currentSummary) {
            console.log('⏰ Progress timeout, showing summary anyway')
            setCurrentSummary(data)
            setCurrentTaskId(null)
            
            setTimeout(() => {
              const summaryElement = document.getElementById('summary-section')
              if (summaryElement) {
                summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 100)
          }
        }, 3000)
      }
      
      waitForProgressCompletion()
    },
    onError: (error) => {
      console.error('❌ Summarization failed:', error)
      alert(`Summarization failed: ${error.message}`)
      setCurrentTaskId(null) // Stop progress tracking
      
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
      
      // Mark that free summary has been used
      markFreeSummaryUsed()
      
      // Wait for progress to complete (100%) or a maximum timeout before showing summary
      const waitForProgressCompletion = () => {
        const checkProgress = async () => {
          if (progressStatus === 'completed' || progress >= 100) {
            console.log('📊 Progress completed, showing anonymous summary immediately')
            setCurrentSummary(data)
            setAnonymousSummaryId(data.id)
            setCurrentTaskId(null) // Clear task ID after showing summary
            
            // Auto-scroll to summary section
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
          } else {
            // Check again in 500ms if progress isn't complete yet
            setTimeout(checkProgress, 500)
          }
        }
        
        // Start checking immediately, but with a 3-second safety timeout
        checkProgress()
        setTimeout(() => {
          if (!currentSummary) {
            console.log('⏰ Progress timeout, showing anonymous summary anyway')
            setCurrentSummary(data)
            setAnonymousSummaryId(data.id)
            setCurrentTaskId(null)
            
            setTimeout(() => {
              const summaryElement = document.getElementById('summary-section')
              if (summaryElement) {
                summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 100)
            
            setTimeout(() => {
              setShowAuthPrompt(true)
            }, 2000)
          }
        }, 3000)
      }
      
      waitForProgressCompletion()
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
        alert(`Summarization failed: ${error.message}`)
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
        if (hasUsedFreeSummary()) {
          console.log('❌ Free summary already used')
          setCurrentTaskId(null)
          setShowAuthPrompt(true)
          return
        }
        
        console.log('📤 Calling anonymous createSummary mutation...')
        // Use the fingerprint provided by URLInput component
        const browserFingerprint = fingerprint || await getBrowserFingerprint()
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
              <button
                onClick={() => openAuthModal('sign-in')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 hidden sm:block min-h-[44px] touch-manipulation"
              >
                Sign In
              </button>
              <button
                onClick={focusUrlInput}
                className="bg-prussian-blue text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-paynes-gray transition-colors duration-200 min-h-[36px] touch-manipulation"
              >
                Try Free Now →
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
                  className="bg-primary-600 text-white px-4 sm:px-6 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 transition-colors duration-200 min-h-[40px] touch-manipulation shadow-md"
                >
                  <span className="hidden sm:inline">Try Free Now →</span>
                  <span className="sm:hidden">Try Free</span>
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
              {/* Floating badge */}
              <div className="inline-flex items-center rounded-full bg-primary-600 text-white px-4 py-2 text-sm font-semibold shadow-md mb-8 animate-pulse">
                <Sparkles className="h-4 w-4 mr-2" />
                #1 YouTube Summarizer
              </div>

              {/* Main headline */}
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-5xl xl:text-6xl leading-[1.1] mb-6">
                <span className="block">Turn YouTube videos into</span>
                <span className="block bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mt-1">instant insights</span>
              </h1>

              <p className="mt-6 text-xl sm:text-2xl leading-relaxed text-gray-700 max-w-xl font-light">
                Skip the fluff. Get key insights from any YouTube video in <span className="font-semibold text-primary-600">under 60 seconds</span>.
              </p>
              
              {/* Enhanced social proof */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md">JM</div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md">SK</div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md">AL</div>
                    <div className="w-10 h-10 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md">+247</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 font-semibold">
                      Join 250+ professionals
                    </p>
                    <p className="text-xs text-gray-600">
                      saving 10+ hours per week
                    </p>
                  </div>
                </div>
                
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">4.9/5</span>
                  <span className="text-sm text-gray-600">(127 reviews)</span>
                </div>
              </div>
              
              {/* CTA Buttons for mobile */}
              <div className="mt-8 flex gap-4 lg:hidden">
                <button
                  onClick={focusUrlInput}
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Try it free
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:border-primary-300 hover:text-primary-700 transition-all duration-200"
                >
                  See how it works
                </button>
              </div>

            </div>

            {/* Right Column - URL Input */}
            <div className="relative">
              {/* Simplified CTA card */}
              <div className="relative rounded-2xl bg-white p-6 sm:p-8 shadow-xl ring-1 ring-gray-200">
                <div className="space-y-6 relative">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                      <Zap className="h-4 w-4" />
                      <span>1 Free Trial • No signup required</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Try it now
                    </h2>
                    <p className="text-gray-600">
                      Paste any YouTube URL to get started
                    </p>
                  </div>

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

      {/* Quick Social Proof Section */}
      <section className="py-10 bg-gray-50 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-gray-600 mb-4">
              Trusted by 250+ professionals at top companies
            </p>
            <div className="flex items-center justify-center gap-8 opacity-60">
              <div className="text-lg font-bold text-gray-700">Google</div>
              <div className="text-lg font-bold text-gray-700">Microsoft</div>
              <div className="text-lg font-bold text-gray-700">Y Combinator</div>
              <div className="text-lg font-bold text-gray-700">OpenAI</div>
            </div>
          </div>
          
          {/* Key testimonial */}
          <div className="max-w-2xl mx-auto text-center">
            <blockquote className="text-xl text-gray-700 italic mb-4">
              &ldquo;Cut my weekly research prep from 3 hours to 20 minutes. My team gets better insights faster than ever.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                PK
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Priya K.</div>
                <div className="text-sm text-gray-600">Product Lead at Tech Startup</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Visual connector */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-primary-300 to-transparent"></div>
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
            
            <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
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
            </div>
          </div>
          
          {/* Capability footer */}
          <div className="text-center pt-12 mt-12 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-primary-500" />
              Supporting 15+ content categories with consistent quality
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
              <div style={{ position: 'relative', paddingBottom: '41.25%', height: 0 }}>
                <iframe 
                  src="https://www.loom.com/embed/60df8f98f6c34a57b7bc71049b445f91?sid=a3115793-e470-4812-bb41-1d2e6d99854b" 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
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

          {/* CTA below video */}
          <div className="mt-12 text-center">
            <button
              onClick={focusUrlInput}
              className="bg-primary-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Try It Yourself - Free</span>
            </button>
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

      {/* Benefits & Use Cases Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Perfect for busy professionals
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Turn any YouTube video into actionable insights in under 60 seconds
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mb-12">
            {/* Use Case 1 */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
                <BookOpen className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Learning & Development</h3>
              <p className="text-gray-600 text-sm">Get key insights from tutorials, conferences, and educational content</p>
            </div>

            {/* Use Case 2 */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
                <BarChart3 className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Market Research</h3>
              <p className="text-gray-600 text-sm">Analyze product reviews, industry talks, and competitor content</p>
            </div>

            {/* Use Case 3 */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Knowledge</h3>
              <p className="text-gray-600 text-sm">Share summaries with your team and build collective intelligence</p>
            </div>
          </div>

          {/* Simple transformation story */}
          <div className="bg-gradient-to-r from-gray-50 to-primary-50 rounded-2xl p-8 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div>
                  <div className="text-2xl mb-2">😵‍💫</div>
                  <p className="text-sm text-gray-600">Hours of video backlog</p>
                </div>
                <div>
                  <div className="text-2xl mb-2">→</div>
                  <p className="text-sm font-semibold text-primary-600">60 seconds with Sightline</p>
                </div>
                <div>
                  <div className="text-2xl mb-2">🧠</div>
                  <p className="text-sm text-gray-600">Key insights, ready to use</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get in Before the Rest Catch On Section */}
      <section id="metrics-section" className="py-24 sm:py-32 bg-gradient-to-br from-prussian-blue-50 via-white to-prussian-blue-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="mt-2 text-4xl font-bold tracking-tight text-prussian-blue sm:text-5xl">
              Take back your most valuable asset: Time
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="flex flex-col items-center justify-center p-8 text-center group">
              <Users className="h-12 w-12 text-silver-lake-blue mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-prussian-blue">
                250+
              </div>
              <div className="text-sm text-paynes-gray mt-2">power users</div>
            </div>
            <div className="flex flex-col items-center justify-center p-8 text-center group">
              <Clock className="h-12 w-12 text-silver-lake-blue mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-prussian-blue">
                1,200+
              </div>
              <div className="text-sm text-paynes-gray mt-2">hours saved</div>
            </div>
            <div className="flex flex-col items-center justify-center p-8 text-center group">
              <BarChart3 className="h-12 w-12 text-silver-lake-blue mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-prussian-blue">
                94%
              </div>
              <div className="text-sm text-paynes-gray mt-2">say they think faster</div>
            </div>
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
                question: "How fast are the summaries?",
                answer: "Under 60 seconds for most videos—our servers double-check the clock so you don't have to."
              },
              {
                id: 'faq-2',
                question: "Can I trust the insights?",
                answer: "We combine speaker tags, NLP, and a human-grade accuracy score. You get clarity over clickbait."
              },
              {
                id: 'faq-3',
                question: "Will you add podcast support?",
                answer: "Already in beta. Sign up today and you'll be first in line."
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
          <span className="hidden sm:block font-medium text-sm">Summarize Video</span>
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