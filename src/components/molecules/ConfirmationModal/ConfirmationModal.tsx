/**
 * Confirmation modal for delete operations
 * 
 * @module ConfirmationModal
 * @category Components
 */

import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Modal title */
  title?: string
  /** Modal description */
  description?: string
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Whether the action is loading */
  isLoading?: boolean
  /** Confirmation handler */
  onConfirm: () => void
  /** Cancel handler */
  onCancel: () => void
  /** Confirm button variant */
  variant?: 'danger' | 'primary' | 'warning'
  /** Custom className */
  className?: string
}

export function ConfirmationModal({
  isOpen,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
  variant = 'danger',
  className,
}: ConfirmationModalProps) {
  if (!isOpen) return null
  
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    primary: {
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }
  
  const styles = variantStyles[variant]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={cn(
        "max-w-md rounded-lg bg-white p-6 shadow-xl",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            styles.icon
          )}>
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50",
              styles.button
            )}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}