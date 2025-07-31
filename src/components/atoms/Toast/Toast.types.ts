export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
} 