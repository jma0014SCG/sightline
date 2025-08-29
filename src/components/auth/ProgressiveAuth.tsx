'use client'

import { useState, useEffect } from 'react'
import { useSignIn, useSignUp } from '@clerk/nextjs'
// import { motion, AnimatePresence } from 'framer-motion' // Uncomment after installing framer-motion
import { ArrowRight, Check, Mail, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SocialAuthButtons } from './SocialAuthButtons'
import { PasswordStrengthIndicator, type PasswordStrength } from './PasswordStrengthIndicator'

export type AuthStage = 'email' | 'password' | 'verification' | 'complete'
export type AuthContext = 'summary-save' | 'feature-unlock' | 'limit-reached' | 'general'

interface ProgressiveAuthProps {
  mode?: 'sign-in' | 'sign-up'
  initialStage?: AuthStage
  context?: AuthContext
  preserveWork?: boolean
  showBenefits?: boolean
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

export function ProgressiveAuth({
  mode = 'sign-up',
  initialStage = 'email',
  context = 'general',
  preserveWork = true,
  showBenefits = true,
  onSuccess,
  onCancel,
  className
}: ProgressiveAuthProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()
  
  const [stage, setStage] = useState<AuthStage>(initialStage)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)

  const isLoaded = mode === 'sign-in' ? signInLoaded : signUpLoaded

  // Save progress to localStorage
  useEffect(() => {
    if (email && stage !== 'complete') {
      localStorage.setItem('auth_progress', JSON.stringify({
        email,
        stage,
        context,
        timestamp: Date.now()
      }))
    }
  }, [email, stage, context])

  // Restore progress on mount
  useEffect(() => {
    const saved = localStorage.getItem('auth_progress')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        // If less than 30 minutes old
        if (Date.now() - data.timestamp < 30 * 60 * 1000) {
          setEmail(data.email)
          if (data.stage !== 'complete') {
            setStage(data.stage)
          }
        }
      } catch (e) {
        console.error('Failed to restore auth progress:', e)
      }
    }
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !isLoaded) return

    setIsLoading(true)
    setError(null)

    try {
      // Check if email exists (for sign-in suggestion)
      if (mode === 'sign-up') {
        // Proceed to password stage
        setStage('password')
      } else {
        // For sign-in, also move to password
        setStage('password')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !isLoaded) return

    // Check password strength for sign-up
    if (mode === 'sign-up' && (!passwordStrength || passwordStrength.score < 3)) {
      setError('Please choose a stronger password')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'sign-up' && signUp) {
        // Create the user
        await signUp.create({
          emailAddress: email,
          password
        })

        // Send verification email
        await signUp.prepareEmailAddressVerification({
          strategy: 'email_code'
        })

        setStage('verification')
      } else if (mode === 'sign-in' && signIn) {
        // Sign in directly
        const result = await signIn.create({
          identifier: email,
          password
        })

        if (result.status === 'complete') {
          setStage('complete')
          onSuccess?.()
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode || !signUp) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode
      })

      if (result.status === 'complete') {
        setStage('complete')
        localStorage.removeItem('auth_progress')
        onSuccess?.()
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const contextMessages = {
    'summary-save': {
      title: 'Save your summary',
      subtitle: 'Create an account to keep your work and access it anytime'
    },
    'feature-unlock': {
      title: 'Unlock this feature',
      subtitle: 'Sign in to access premium features'
    },
    'limit-reached': {
      title: 'You\'ve reached the free limit',
      subtitle: 'Sign up to continue using Sightline'
    },
    'general': {
      title: mode === 'sign-in' ? 'Welcome back' : 'Create your account',
      subtitle: mode === 'sign-in' ? 'Sign in to continue' : 'Join thousands saving time with Sightline'
    }
  }

  // Animation variants for framer-motion (when installed)
  // const stageVariants = {
  //   initial: { opacity: 0, x: 20 },
  //   animate: { opacity: 1, x: 0 },
  //   exit: { opacity: 0, x: -20 }
  // }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {['email', 'password', mode === 'sign-up' ? 'verification' : null, 'complete']
            .filter(Boolean)
            .map((s, i, arr) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                  stage === s ? "bg-primary-600 text-white scale-110" :
                  arr.indexOf(stage) > i ? "bg-green-500 text-white" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {arr.indexOf(stage) > i ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < arr.length - 1 && (
                  <div className={cn(
                    "w-full h-0.5 mx-2 transition-all duration-300",
                    arr.indexOf(stage) > i ? "bg-green-500" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
        </div>
        <p className="text-xs text-gray-500 text-center">
          Step {['email', 'password', 'verification'].indexOf(stage) + 1} of {mode === 'sign-up' ? 3 : 2}
        </p>
      </div>

      {/* Context Message */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {contextMessages[context].title}
        </h2>
        <p className="text-sm text-gray-600">
          {contextMessages[context].subtitle}
        </p>
      </div>

      {/* Social Auth (only on email stage) */}
      {stage === 'email' && (
        <div className="mb-6">
          <SocialAuthButtons
            mode={mode}
            onSuccess={onSuccess}
            onError={setError}
          />
        </div>
      )}

      {/* Stage Content */}
      <div>
        {stage === 'email' && (
          <form
            key="email"
            onSubmit={handleEmailSubmit}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!email || isLoading}
              className={cn(
                "w-full bg-primary-600 text-white py-3 rounded-xl font-medium",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isLoading && "hover:bg-primary-700 active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>
        )}

        {stage === 'password' && (
          <form
            key="password"
            onSubmit={handlePasswordSubmit}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setStage('email')}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Change email
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'sign-up' ? 'Create a strong password' : 'Enter your password'}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  required
                  autoFocus
                  minLength={mode === 'sign-up' ? 8 : undefined}
                />
              </div>
            </div>

            {mode === 'sign-up' && (
              <PasswordStrengthIndicator
                password={password}
                onStrengthChange={setPasswordStrength}
              />
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password || isLoading || (mode === 'sign-up' && passwordStrength && passwordStrength.score < 3)}
              className={cn(
                "w-full bg-primary-600 text-white py-3 rounded-xl font-medium",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isLoading && "hover:bg-primary-700 active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'sign-up' ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {mode === 'sign-up' ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>
        )}

        {stage === 'verification' && (
          <form
            key="verification"
            onSubmit={handleVerificationSubmit}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="h-8 w-8 text-primary-600" />
              </div>
              <p className="text-sm text-gray-600">
                We've sent a verification code to
              </p>
              <p className="font-medium text-gray-900">{email}</p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Verification code
              </label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors text-center text-lg font-mono"
                required
                autoFocus
                maxLength={6}
                pattern="[0-9]{6}"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={verificationCode.length !== 6 || isLoading}
              className={cn(
                "w-full bg-primary-600 text-white py-3 rounded-xl font-medium",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isLoading && "hover:bg-primary-700 active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </button>

            <button
              type="button"
              onClick={() => {/* Resend code logic */}}
              className="w-full text-sm text-primary-600 hover:text-primary-700"
            >
              Didn't receive the code? Resend
            </button>
          </form>
        )}

        {stage === 'complete' && (
          <div
            key="complete"
            className="text-center py-8"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Welcome to Sightline!
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Your account has been created successfully.
            </p>
            {preserveWork && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  ✨ Your work has been saved to your library
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Option */}
      {stage !== 'complete' && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
        >
          I'll do this later
        </button>
      )}
    </div>
  )
}