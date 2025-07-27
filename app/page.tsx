'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { URLInput } from '@/components/molecules/URLInput'
import { SummaryViewer } from '@/components/organisms/SummaryViewer'
import { PricingPlans } from '@/components/organisms/PricingPlans'
import { useAuth } from '@/lib/hooks/useAuth'
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
    videosView: 0,
    usersView: 0,
    satisfactionView: 0
  })
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showStickyNav, setShowStickyNav] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState('')
  const [showFloatingButton, setShowFloatingButton] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)

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
      setCurrentSummary(data)
      setProgress(0)
      setProcessingStage('')
      // Optionally navigate to library after success
      // router.push(`/library/${data.id}`)
    },
    onError: (error) => {
      console.error('❌ Summarization failed:', error)
      alert(`Summarization failed: ${error.message}`)
      setProgress(0)
      setProcessingStage('')
    }
  })

  // Simulate progress when processing starts
  useEffect(() => {
    if (createSummary.isPending) {
      setProgress(0)
      const stages = [
        'Fetching video information...',
        'Downloading transcript...',
        'Analyzing content...',
        'Generating summary...',
        'Finalizing...'
      ]
      
      let currentStage = 0
      let currentProgress = 0
      
      const progressTimer = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += Math.random() * 15
          setProgress(Math.min(currentProgress, 90))
          
          const stageIndex = Math.floor((currentProgress / 90) * stages.length)
          if (stageIndex !== currentStage && stageIndex < stages.length) {
            currentStage = stageIndex
            setProcessingStage(stages[stageIndex])
          }
        }
      }, 500)

      return () => clearInterval(progressTimer)
    }
  }, [createSummary.isPending])

  const handleUrlSubmit = async (url: string) => {
    console.log('🚀 Starting summarization for URL:', url)
    console.log('🔐 Authentication status:', isAuthenticated)
    
    // Reset current summary before starting new one
    setCurrentSummary(null)
    
    try {
      console.log('📤 Calling createSummary mutation...')
      const result = await createSummary.mutateAsync({ url })
      console.log('✅ Mutation result:', result)
    } catch (error) {
      console.error('❌ HandleUrlSubmit error:', error)
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
          setTimeout(() => animateCounter(0, 1200, 2000, 'hoursView'), 0)
          setTimeout(() => animateCounter(0, 450, 2000, 'videosView'), 200)
          setTimeout(() => animateCounter(0, 89, 2000, 'usersView'), 400)
          setTimeout(() => animateCounter(0, 94, 2000, 'satisfactionView'), 600)
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
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200 hidden sm:block min-h-[44px] touch-manipulation"
              >
                Sign In
              </button>
              <button
                onClick={focusUrlInput}
                className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-700 transition-colors duration-200 min-h-[36px] touch-manipulation"
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
                  className="bg-primary-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-primary-700 transition-colors duration-200 min-h-[36px] touch-manipulation"
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
                <span className="block">Turn Any YouTube Video Into</span>
                <span className="block text-primary-600 mt-2">Actionable Insights</span>
                <span className="block text-2xl font-normal text-gray-600 mt-4">In under 60 seconds</span>
              </h1>

              <p className="mt-8 text-xl leading-8 text-gray-600 max-w-lg">
                Paste any YouTube link. Get an insight-packed summary in under a minute. Stay ahead while everyone else is still buffering.
              </p>

              {/* Primary CTA */}
              <div className="mt-12">
                <button
                  onClick={focusUrlInput}
                  className="bg-primary-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <span>Get My First Summary Free (No Signup Required)</span>
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
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Try it now
                    </h2>
                    <p className="mt-2 text-gray-600">
                      Paste any YouTube URL to get started
                    </p>
                  </div>

                  <URLInput 
                    onSubmit={handleUrlSubmit}
                    isLoading={createSummary.isPending}
                    className="scale-105"
                  />

                  {/* Trust indicators */}
                  <div className="flex items-center justify-center space-x-6 pt-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Free to try
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      No sign-up required
                    </div>
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
                    Estimated time: 10-15 seconds
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
            <div className="mt-20">
              <SummaryViewer summary={currentSummary} />
            </div>
          )}
        </div>
      </section>

      {/* Why Speed-learn Section */}
      <section id="features" className="relative py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              🔍 Why Speed-learn?
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Stop drowning in content
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              We know your pain. Here&apos;s how we fix it.
            </p>
          </div>

          {/* Pain points and fixes */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Pain/Fix 1 */}
            <div className="relative">
              <div className="rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
                <div className="mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl mb-4">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">The Pain</h3>
                  <p className="text-gray-700">Endless watch-lists & zero hours</p>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Fix</h3>
                  <p className="text-gray-700">AI crunches the key ideas for you in 60 sec.</p>
                </div>
              </div>
            </div>

            {/* Pain/Fix 2 */}
            <div className="relative">
              <div className="rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
                <div className="mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl mb-4">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">The Pain</h3>
                  <p className="text-gray-700">Passive watching = low retention</p>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Fix</h3>
                  <p className="text-gray-700">We surface actionable takeaways you&apos;ll actually remember.</p>
                </div>
              </div>
            </div>

            {/* Pain/Fix 3 */}
            <div className="relative">
              <div className="rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
                <div className="mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl mb-4">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">The Pain</h3>
                  <p className="text-gray-700">Notes scattered everywhere</p>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Fix</h3>
                  <p className="text-gray-700">Your summaries live in one tidy, searchable library.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Benefits Section */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              ✨ Core Benefits
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to learn faster
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Benefit 1 */}
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Sparkles className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">1. Instant Sparks</h3>
              <p className="text-gray-600 leading-relaxed">
                Action-ready bullet points, quotes, and next-step ideas—no fluff, no filler.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <BookOpen className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">2. Personal Library</h3>
              <p className="text-gray-600 leading-relaxed">
                Every summary auto-files itself. Search by topic or timestamp and revisit in seconds.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Share2 className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">3. Share & Shine</h3>
              <p className="text-gray-600 leading-relaxed">
                Export to Slack, Notion, or email with one click. Look like the most prepared person in the room.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built for People with Too Many Tabs Open Section */}
      <section className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              👤 Built for People with Too Many Tabs Open
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Whatever your hustle, we&apos;ve got you
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Executives & Founders */}
            <div className="relative group">
              <div className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Executives & Founders</h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Scan market interviews before your next board call.
                </p>
                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 italic">
                    "From 2-hour competitor analysis to 5-minute insights"
                  </p>
                </div>
              </div>
            </div>

            {/* Creators & Marketers */}
            <div className="relative group">
              <div className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-xl mb-4">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Creators & Marketers</h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Harvest hooks from trending videos without the midnight binge.
                </p>
                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 italic">
                    "Extract viral patterns in minutes, not hours"
                  </p>
                </div>
              </div>
            </div>

            {/* Researchers & Analysts */}
            <div className="relative group">
              <div className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-xl mb-4">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Researchers & Analysts</h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Digest 20 papers&apos; worth of lectures before the deadline.
                </p>
                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 italic">
                    "Turn video marathons into research goldmines"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof in the Numbers Section */}
      <section id="metrics-section" className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              🌎 Proof in the Numbers
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Real results from real learners
            </p>
            <p className="mt-6 text-lg text-gray-600">
              (Yep, we asked.)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
            <div className="flex flex-col items-center justify-center p-8 text-center group">
              <Clock className="h-12 w-12 text-primary-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-gray-900">
                {counters.hoursView.toLocaleString()}+
              </div>
              <div className="text-sm text-gray-600 mt-2">hours saved</div>
            </div>
            <div className="flex flex-col items-center justify-center p-8 text-center group">
              <Play className="h-12 w-12 text-primary-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-gray-900">
                {counters.videosView.toLocaleString()}+
              </div>
              <div className="text-sm text-gray-600 mt-2">videos processed</div>
            </div>
            <div className="flex flex-col items-center justify-center p-8 text-center group">
              <Users className="h-12 w-12 text-primary-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-gray-900">
                {counters.usersView.toLocaleString()}+
              </div>
              <div className="text-sm text-gray-600 mt-2">early users</div>
            </div>
            <div className="flex flex-col items-center justify-center p-8 text-center group">
              <BarChart3 className="h-12 w-12 text-primary-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-gray-900">
                {counters.satisfactionView} %
              </div>
              <div className="text-sm text-gray-600 mt-2">satisfaction rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              ❤️ What Busy Learners Say
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Don&apos;t just take our word for it
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="group relative rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
              <Quote className="h-8 w-8 text-primary-600 mb-6" />
              <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                &ldquo;Turned a 2-hour conference talk into key insights during my coffee break. Now I actually stay current with industry trends.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                  JP
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Jordan P.</div>
                  <div className="text-sm text-gray-500">VC Partner</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="group relative rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
              <Quote className="h-8 w-8 text-primary-600 mb-6" />
              <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                &ldquo;Cut my weekly research prep from 3 hours to 20 minutes. My team gets better insights faster than ever.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  PK
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Priya K.</div>
                  <div className="text-sm text-gray-500">Product Lead at Tech Startup</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="group relative rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-300">
              <Quote className="h-8 w-8 text-primary-600 mb-6" />
              <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                &ldquo;Finally caught up on 6 months of ML papers in one weekend. Game-changer for work-life balance.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-semibold">
                  DR
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Daniel R.</div>
                  <div className="text-sm text-gray-500">Data Scientist</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-primary-600">
            ⚡ Choose Your Learning Speed
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Flexible plans for every learner
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            → Start free • No credit card
          </p>
        </div>
        <PricingPlans showCurrentPlan={false} />
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              🤔 Frequently Asked
            </h2>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Questions we get all the time
            </h3>
            <p className="mt-6 text-lg text-gray-600">
              (More questions? Hit the chat bubble in the corner.)
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "How fast are the summaries?",
                answer: "Under 60 seconds for most videos—our servers double-check the clock so you don't have to."
              },
              {
                question: "Can I trust the insights?",
                answer: "We combine speaker tags, NLP, and a human-grade accuracy score. You get clarity over clickbait."
              },
              {
                question: "Will you add podcast support?",
                answer: "Already in beta. Sign up today and you'll be first in line."
              }
            ].map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 min-h-[44px] touch-manipulation"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                    expandedFaq === index ? 'rotate-180' : ''
                  }`} />
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-5 border-t border-gray-100">
                    <p className="text-gray-600 leading-relaxed pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative isolate bg-primary-600 px-6 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]">
          <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-400 to-primary-200 opacity-30 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to outrun information overload?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-100">
            Stop queuing videos. Start absorbing insights.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={focusUrlInput}
              className="rounded-full bg-white px-8 py-4 min-h-[44px] text-sm font-semibold text-primary-600 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 hover:scale-105 touch-manipulation"
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
          className="group bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 min-h-[56px] touch-manipulation"
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
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Sightline Demo - YouTube to Summary in Seconds
                  </h3>
                  <button
                    onClick={() => setShowDemoModal(false)}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PlayCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Demo video would be embedded here</p>
                    <p className="text-sm text-gray-500 mt-2">
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
                    className="bg-primary-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-primary-700 transition-colors duration-200"
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