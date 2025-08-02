'use client'

import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', message, ...options })
  }, [addToast])

  const error = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', message, ...options })
  }, [addToast])

  const info = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', message, ...options })
  }, [addToast])

  const warning = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', message, ...options })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning
  }
}