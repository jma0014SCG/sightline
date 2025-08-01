'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { URLInput } from '@/components/molecules/URLInput'
import { SummaryViewer } from '@/components/organisms/SummaryViewer'
import { PricingPlans } from '@/components/organisms/PricingPlans'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProgressTracking } from '@/lib/hooks/useProgressTracking'
import { api } from '@/components/providers/TRPCProvider'
import { DebugPanel } from '@/components/debug/DebugPanel'
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
  const { isAuthenticated } = useAuth()
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
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  // Real-time progress tracking
  const { progress, stage: processingStage, status: progressStatus } = useProgressTracking({
    taskId: currentTaskId,
    onComplete: () => {
      console.log('Progress tracking completed')
      setCurrentTaskId(null)
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
  
  const phrases = [
    'Turn 60-minute videos into 3-minute power briefs',
    'Stop queuing videos. Start absorbing insights.',
    'Stay ahead while everyone else is still buffering',
    'Learn faster. Retain more.'
  ]

  const createSummary = api.summary.create.useMutation({
    onSuccess: (data) => {
      console.log('✅ Summary created successfully:', data)
      
      // Wait a moment for user to see completion, then show summary
      setTimeout(() => {
        setCurrentSummary(data)
        setCurrentTaskId(null) // Stop progress tracking
        
        // Auto-scroll to summary section
        setTimeout(() => {
          const summaryElement = document.getElementById('summary-section')
          if (summaryElement) {
            summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }, 1000)
    },
    onError: (error) => {
      console.error('❌ Summarization failed:', error)
      alert(`Summarization failed: ${error.message}`)
      setCurrentTaskId(null) // Stop progress tracking
    }
  })

  // Start progress tracking when mutation begins
  useEffect(() => {
    if (createSummary.isPending && !currentTaskId) {
      // We'll get the task_id from the mutation response to start tracking
      console.log('Summary creation started, waiting for task_id...')
    }
  }, [createSummary.isPending, currentTaskId])

  const handleUrlSubmit = async (url: string) => {
    console.log('🚀 Starting summarization for URL:', url)
    console.log('🔐 Authentication status:', isAuthenticated)
    
    // Reset current summary before starting new one
    setCurrentSummary(null)
    
    // Generate a temporary task ID to start progress tracking immediately
    const tempTaskId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTaskId(tempTaskId)
    
    try {
      console.log('📤 Calling createSummary mutation...')
      const result = await createSummary.mutateAsync({ url })
      console.log('✅ Mutation result:', result)
      
      // If the backend returns a real task_id, switch to that for more accurate tracking
      if (result.task_id && result.task_id !== tempTaskId) {
        setCurrentTaskId(result.task_id)
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
  }, [currentPhraseIndex])

  // Animated counter hook
  const animateCounter = (start: number, end: number, duration: number, key: keyof typeof counters) => {
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
  }

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
  }, [metricsVisible])

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
      // Escape key closes modals
      if (e.key === 'Escape') {
        setShowDemoModal(false)
      }
      
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
              <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
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
                onClick={() => router.push('/sign-in')}
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
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary-600" />
                <span className="font-bold text-xl text-gray-900">Sightline</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={focusUrlInput}
                  className="bg-prussian-blue text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-paynes-gray transition-colors duration-200 min-h-[36px] touch-manipulation"
                >
  Try Free Now →
                </button>
                <button
                  onClick={() => router.push('/library')}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 min-h-[36px] flex items-center touch-manipulation"
                >
                  Library
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"></div>
        
        {/* Gradient overlays */}
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_20%_80%,#dbeafe,transparent)]"></div>
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_400px_at_80%_20%,#f3e8ff,transparent)]"></div>
        
        {/* Animated floating elements */}
        <div className="absolute top-20 left-10 w-16 h-16 bg-primary-100 rounded-full opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-purple-100 rounded-lg opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-1/4 w-8 h-8 bg-blue-100 rounded-full opacity-25 animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-indigo-100 rounded-full opacity-30 animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Hero Section */}
      <section className="relative px-6 py-24 sm:py-32 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="relative">
              {/* Floating badge */}
              <div className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-gray-700 shadow-sm mb-8">
                <Sparkles className="h-4 w-4 mr-2 text-primary-600" />
                AI-Powered Learning
              </div>

              {/* Main headline */}
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl lg:text-6xl xl:text-7xl leading-tight mb-6" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', margin: '0 0 1.5rem 0' }}>
                <span className="block">Outlearn Everyone.</span>
                <span className="block text-primary-600 mt-2">In 60 Seconds.</span>
              </h1>

              <p className="mt-8 text-xl leading-8 text-gray-600 max-w-lg">
                Paste any YouTube link. Get a no-fluff, insight-packed summary in 60 seconds flat.
              </p>
              
              <p className="mt-4 text-lg text-gray-500">
                Made for people who want to know more — without wasting more time.
              </p>

              {/* Primary CTA */}
              <div className="mt-12">
                <button
                  onClick={focusUrlInput}
                  className="bg-prussian-blue text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-paynes-gray transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <span>1 Free Summary. <span className="text-sm font-normal">(Because we're not running a charity, we're building a brain upgrade.)</span></span>
                </button>
              </div>
            </div>

            {/* Right Column - URL Input */}
            <div className="relative">
              {/* Gradient background card */}
              <div className="relative rounded-3xl bg-gradient-to-br from-white to-gray-50 p-8 shadow-2xl shadow-gray-900/10 ring-1 ring-gray-900/5">
                <div className="absolute -top-px left-20 right-11 h-px bg-gradient-to-r from-primary-300/0 via-primary-300/70 to-primary-300/0"></div>
                <div className="absolute -bottom-px left-11 right-20 h-px bg-gradient-to-r from-primary-300/0 via-primary-300/70 to-primary-300/0"></div>
                
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Try It Now — Your Brain, But Faster
                    </h2>
                    <p className="mt-3 text-gray-600 leading-relaxed">
                      You've got a podcast backlog, a content graveyard, and no time.
                    </p>
                    <div className="mt-4 space-y-1 text-sm text-gray-500">
                      <p>Drop a YouTube link.</p>
                      <p>We'll distill it into a punchy, skimmable summary.</p>
                      <p className="font-medium text-gray-700">You'll walk away smarter — in less time than it takes to reheat coffee.</p>
                    </div>
                  </div>

                  <URLInput 
                    onSubmit={handleUrlSubmit}
                    onSuccess={() => {
                      // Optional: Add any additional success handling here
                      console.log('URL input cleared after successful submission')
                    }}
                    isLoading={createSummary.isPending}
                    className="scale-105"
                  />

                  {/* CTA */}
                  <div className="text-center pt-2">
                    <p className="text-primary-600 font-semibold text-sm">
                      Try It Free → 1 Summary On Us
                    </p>
                  </div>

                  {/* Security badges */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center space-x-8 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        SOC 2 Compliant
                      </div>
                      <div className="flex items-center">
                        <Lock className="h-3 w-3 mr-1" />
                        256-bit SSL
                      </div>
                      <div className="flex items-center">
                        <Award className="h-3 w-3 mr-1" />
                        GDPR Ready
                      </div>
                    </div>
                  </div>

                  {/* Demo Video Section */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="text-center mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        See it in action
                      </h3>
                    </div>
                    <button 
                      onClick={() => setShowDemoModal(true)}
                      className="relative group cursor-pointer rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 aspect-video w-full"
                    >
                      {/* Video placeholder with play button */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-primary-800/40"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-white/10 rounded-full blur-xl scale-150 group-hover:scale-175 transition-transform duration-300"></div>
                          <div className="relative bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                            <PlayCircle className="h-8 w-8 text-primary-600" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Video overlay text */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                          <div className="flex items-center space-x-2 text-white text-sm">
                            <Volume2 className="h-4 w-4" />
                            <span>Watch: YouTube video → Summary in 15 seconds</span>
                          </div>
                        </div>
                      </div>

                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                    
                    <div className="mt-3 text-center">
                      <p className="text-xs text-gray-500">
                        2 minute demo • No audio required
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -left-4 top-4 h-16 w-16 rounded-2xl bg-primary-100 opacity-60 rotate-12 animate-pulse"></div>
              <div className="absolute -right-4 bottom-4 h-12 w-12 rounded-xl bg-primary-200 opacity-40 -rotate-12 animate-pulse animation-delay-200"></div>
            </div>
          </div>

          {/* Enhanced Processing state */}
          {createSummary.isPending && (
            <div className="mt-16 mx-auto max-w-md">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center space-x-2 text-primary-700 mb-2">
                    <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse animation-delay-200"></div>
                    <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse animation-delay-400"></div>
                  </div>
                  <h3 className="font-semibold text-gray-900">Processing your video</h3>
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
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    {progress === 100 ? 'Complete! 🎉' : 'Estimated time: 15-30 seconds'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error state */}
          {createSummary.isError && (
            <div className="mt-16 mx-auto max-w-md">
              <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
                <p className="font-semibold text-red-800">Something went wrong</p>
                <p className="text-sm text-red-600 mt-1">{createSummary.error?.message}</p>
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


      {/* Built for People With More Ambition Than Free Time Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              ⚡ Built for People With More Ambition Than Free Time
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              You know the feeling
            </p>
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Your reading list is longer than your grocery list. Your podcast queue looks like a small library. 
              You want to stay sharp, stay curious, stay ahead—but there are only so many hours in the day.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center mb-20">
            {/* Left Column - Pain Points */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">The endless scroll</h3>
                  <p className="text-gray-600">Bookmarking videos you'll "definitely watch later" (but never do).</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">The guilt cycle</h3>
                  <p className="text-gray-600">Feeling behind while your peers seem to know everything.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">The time trap</h3>
                  <p className="text-gray-600">Starting a "quick" video that turns into a 2-hour rabbit hole.</p>
                </div>
              </div>
            </div>

            {/* Right Column - Solution */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Learn what matters</h3>
                  <p className="text-gray-600">Get the key insights without the filler, fluff, or tangents.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Stay ahead</h3>
                  <p className="text-gray-600">Be the person who actually knows what's happening in your field.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reclaim your time</h3>
                  <p className="text-gray-600">60 seconds of summary = 60 minutes of content consumed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Core Benefits */}
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h3 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to learn faster
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Benefit 1 */}
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Sparkles className="h-8 w-8 text-primary-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Instant Sparks</h4>
              <p className="text-gray-600 leading-relaxed">
                Action-ready bullet points, quotes, and next-step ideas—no fluff, no filler.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <BookOpen className="h-8 w-8 text-primary-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Personal Library</h4>
              <p className="text-gray-600 leading-relaxed">
                Every summary auto-files itself. Search by topic or timestamp and revisit in seconds.
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Life's too short for slow learning
              </h3>
              <p className="text-lg text-gray-700 mb-6">
                Stop letting good content collect digital dust. Start turning knowledge into action.
              </p>
              <button
                onClick={focusUrlInput}
                className="bg-primary-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Try Your First Summary Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Get in Before the Rest Catch On Section */}
      <section id="metrics-section" className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-silver-lake-blue">
              🚀 Get in Before the Rest Catch On
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-prussian-blue sm:text-5xl">
              Join the smart learners
            </p>
            <p className="mt-6 text-lg text-paynes-gray">
              While everyone else is still buffering, you'll be three insights ahead.
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

      {/* Testimonials Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-anti-flash-white via-eggshell/30 to-anti-flash-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-silver-lake-blue">
              ❤️ What Busy Learners Say
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-prussian-blue sm:text-5xl">
              Don&apos;t just take our word for it
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="group relative rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
              <Quote className="h-8 w-8 text-silver-lake-blue mb-6" />
              <p className="text-paynes-gray mb-6 leading-relaxed text-lg">
                &ldquo;Turned a 2-hour conference talk into key insights during my coffee break. Now I actually stay current with industry trends.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-silver-lake-blue to-paynes-gray flex items-center justify-center text-white font-semibold">
                  JP
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-prussian-blue">Jordan P.</div>
                  <div className="text-sm text-paynes-gray">VC Partner</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="group relative rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
              <Quote className="h-8 w-8 text-silver-lake-blue mb-6" />
              <p className="text-paynes-gray mb-6 leading-relaxed text-lg">
                &ldquo;Cut my weekly research prep from 3 hours to 20 minutes. My team gets better insights faster than ever.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-prussian-blue to-paynes-gray flex items-center justify-center text-white font-semibold">
                  PK
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-prussian-blue">Priya K.</div>
                  <div className="text-sm text-paynes-gray">Product Lead at Tech Startup</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="group relative rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
              <Quote className="h-8 w-8 text-silver-lake-blue mb-6" />
              <p className="text-paynes-gray mb-6 leading-relaxed text-lg">
                &ldquo;Built my first AI side project with zero fluff, thanks to these summaries.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-paynes-gray to-silver-lake-blue flex items-center justify-center text-white font-semibold">
                  DR
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-prussian-blue">— Daniel R., Data Scientist</div>
                </div>
              </div>
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
                <div key={faq.id} className="relative border border-paynes-gray/20 rounded-xl bg-white shadow-sm" style={{ zIndex: 10 - index }}>
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
      <div className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
        showFloatingButton 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-16 opacity-0 scale-75 pointer-events-none'
      }`}>
        <button
          onClick={focusUrlInput}
          className="group bg-prussian-blue hover:bg-paynes-gray text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center space-x-2 min-h-[56px] touch-manipulation"
        >
          <Zap className="h-6 w-6" />
          <span className="hidden sm:block font-medium text-sm">Summarize Video</span>
        </button>
      </div>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-prussian-blue/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-paynes-gray/20">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-prussian-blue">
                    Sightline Demo - YouTube to Summary in Seconds
                  </h3>
                  <button
                    onClick={() => setShowDemoModal(false)}
                    className="rounded-md text-paynes-gray hover:text-prussian-blue focus:outline-none focus:ring-2 focus:ring-silver-lake-blue transition-colors duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="aspect-video bg-prussian-blue/10 rounded-lg flex items-center justify-center border border-paynes-gray/20">
                  <div className="text-center">
                    <PlayCircle className="h-16 w-16 text-silver-lake-blue mx-auto mb-4" />
                    <p className="text-prussian-blue">Demo video would be embedded here</p>
                    <p className="text-sm text-paynes-gray mt-2">
                      Shows: URL input → Processing → Summary output
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setShowDemoModal(false)
                      focusUrlInput()
                    }}
                    className="bg-prussian-blue text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-paynes-gray transition-all duration-200 hover:scale-105 shadow-lg"
                  >
Start My Free Summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel - only in development */}
      {process.env.NODE_ENV === 'development' && <DebugPanel />}
      
      {/* Exit Intent Popup placeholder - implement with proper exit intent detection */}
      {/* "Still scrolling? Paste a link—see the magic." */}
    </main>
  )
}