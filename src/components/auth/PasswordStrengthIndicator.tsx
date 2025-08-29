'use client'

import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrengthIndicatorProps {
  password: string
  showRequirements?: boolean
  className?: string
  onStrengthChange?: (strength: PasswordStrength) => void
}

export interface PasswordStrength {
  score: number
  label: string
  color: string
  percentage: number
  checks: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    numbers: boolean
    special: boolean
  }
  suggestions: string[]
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className,
  onStrengthChange
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }

    const score = Object.values(checks).filter(Boolean).length
    const percentage = (score / 5) * 100

    const suggestions: string[] = []
    if (!checks.length) suggestions.push('Use at least 8 characters')
    if (!checks.uppercase) suggestions.push('Add uppercase letters')
    if (!checks.lowercase) suggestions.push('Add lowercase letters')
    if (!checks.numbers) suggestions.push('Include numbers')
    if (!checks.special) suggestions.push('Add special characters')

    const strengthLevels = [
      { label: 'Very Weak', color: 'red' },
      { label: 'Weak', color: 'orange' },
      { label: 'Fair', color: 'yellow' },
      { label: 'Good', color: 'lime' },
      { label: 'Strong', color: 'green' },
      { label: 'Very Strong', color: 'emerald' }
    ]

    const level = strengthLevels[score] || strengthLevels[0]

    const result = {
      score,
      label: level.label,
      color: level.color,
      percentage,
      checks,
      suggestions
    }

    onStrengthChange?.(result)
    return result
  }, [password, onStrengthChange])

  if (!password) return null

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      lime: 'bg-lime-500',
      green: 'bg-green-500',
      emerald: 'bg-emerald-500'
    }
    return colorMap[color] || 'bg-gray-300'
  }

  const getTextColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      red: 'text-red-600',
      orange: 'text-orange-600',
      yellow: 'text-yellow-600',
      lime: 'text-lime-600',
      green: 'text-green-600',
      emerald: 'text-emerald-600'
    }
    return colorMap[color] || 'text-gray-600'
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex gap-1 h-1.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-full transition-all duration-300",
                i < strength.score 
                  ? getColorClasses(strength.color)
                  : 'bg-gray-200'
              )}
            />
          ))}
        </div>
        
        {/* Strength Label */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Password strength: 
            <span className={cn(
              "font-semibold ml-1",
              getTextColorClasses(strength.color)
            )}>
              {strength.label}
            </span>
          </p>
          <span className="text-xs text-gray-500">
            {strength.score}/5 requirements
          </span>
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700 mb-2">Requirements:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <RequirementItem
              met={strength.checks.length}
              label="8+ characters"
            />
            <RequirementItem
              met={strength.checks.uppercase}
              label="Uppercase letter"
            />
            <RequirementItem
              met={strength.checks.lowercase}
              label="Lowercase letter"
            />
            <RequirementItem
              met={strength.checks.numbers}
              label="Number"
            />
            <RequirementItem
              met={strength.checks.special}
              label="Special character"
            />
          </div>
        </div>
      )}

      {/* Suggestions */}
      {strength.suggestions.length > 0 && strength.score < 4 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
          <p className="text-xs font-medium text-amber-800 mb-1">
            Improve your password:
          </p>
          <ul className="space-y-0.5">
            {strength.suggestions.slice(0, 2).map((suggestion, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {strength.score >= 4 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <p className="text-xs font-medium text-green-800 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            Great password! Your account will be secure.
          </p>
        </div>
      )}
    </div>
  )
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "h-4 w-4 rounded-full flex items-center justify-center transition-all duration-200",
        met 
          ? "bg-green-100 text-green-600" 
          : "bg-gray-100 text-gray-400"
      )}>
        {met ? (
          <Check className="h-2.5 w-2.5" />
        ) : (
          <X className="h-2.5 w-2.5" />
        )}
      </div>
      <span className={cn(
        "text-xs transition-colors duration-200",
        met ? "text-gray-700 font-medium" : "text-gray-500"
      )}>
        {label}
      </span>
    </div>
  )
}