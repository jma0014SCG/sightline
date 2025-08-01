'use client'

import Link from 'next/link'
import { Home, Library, CreditCard, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/sign-in')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-prussian-blue-500 to-paynes-gray-500 shadow-xl">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6">
            <Link href="/" className="text-xl font-semibold text-white">
              Sightline.ai
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <Link
              href="/library"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                pathname === '/library'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Home className="h-5 w-5" />
              Home
            </Link>
            <Link
              href="/library"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                pathname === '/library'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Library className="h-5 w-5" />
              Library
            </Link>
            <Link
              href="/billing"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                pathname === '/billing'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              Billing
            </Link>
            <Link
              href="/settings"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                pathname === '/settings'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </nav>

          {/* User menu */}
          <div className="border-t border-white/20 p-4">
            <button 
              onClick={() => logout()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}