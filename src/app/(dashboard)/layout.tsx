'use client'

import Link from 'next/link'
import { Home, Library, CreditCard, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  // Sidebar collapse state - default to collapsed on mobile, expanded on desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed')
    if (stored !== null) {
      setIsSidebarCollapsed(stored === 'true')
    } else {
      // Default: collapsed on mobile, expanded on desktop
      setIsSidebarCollapsed(window.innerWidth < 768)
    }
    
    // Handle resize
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobileMenuOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

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
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed md:relative z-50 md:z-0 h-full bg-gradient-to-b from-prussian-blue-500 to-paynes-gray-500 shadow-xl transition-all duration-300 ease-in-out",
          // Desktop width behavior
          isSidebarCollapsed ? "md:w-16" : "md:w-64",
          // Mobile behavior - slide from left
          isMobileMenuOpen ? "left-0" : "-left-64",
          "w-64 md:left-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and Toggle */}
          <div className="flex h-16 items-center justify-between px-3 md:px-4">
            <Link 
              href="/" 
              className={cn(
                "font-semibold text-white transition-all duration-300",
                isSidebarCollapsed ? "md:hidden" : "text-xl"
              )}
            >
              Sightline.ai
            </Link>
            
            {/* Desktop Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle sidebar"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
            
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                pathname === '/'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              )}
              title="Home"
            >
              <Home className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-300",
                isSidebarCollapsed ? "md:hidden" : "block"
              )}>Home</span>
              {isSidebarCollapsed && (
                <span className="absolute left-14 ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap hidden md:block">
                  Home
                </span>
              )}
            </Link>
            
            <Link
              href="/library"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                pathname === '/library'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              )}
              title="Library"
            >
              <Library className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-300",
                isSidebarCollapsed ? "md:hidden" : "block"
              )}>Library</span>
              {isSidebarCollapsed && (
                <span className="absolute left-14 ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap hidden md:block">
                  Library
                </span>
              )}
            </Link>
            
            <Link
              href="/billing"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                pathname === '/billing'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              )}
              title="Billing"
            >
              <CreditCard className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-300",
                isSidebarCollapsed ? "md:hidden" : "block"
              )}>Billing</span>
              {isSidebarCollapsed && (
                <span className="absolute left-14 ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap hidden md:block">
                  Billing
                </span>
              )}
            </Link>
            
            <Link
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                pathname === '/settings'
                  ? 'bg-white/20 text-white border-l-4 border-white'
                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
              )}
              title="Settings"
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-300",
                isSidebarCollapsed ? "md:hidden" : "block"
              )}>Settings</span>
              {isSidebarCollapsed && (
                <span className="absolute left-14 ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap hidden md:block">
                  Settings
                </span>
              )}
            </Link>
          </nav>

          {/* User menu */}
          <div className="border-t border-white/20 p-3 md:p-4">
            <button 
              onClick={() => {
                logout()
                setIsMobileMenuOpen(false)
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-all duration-200 group"
              )}
              title="Sign out"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-300",
                isSidebarCollapsed ? "md:hidden" : "block"
              )}>Sign out</span>
              {isSidebarCollapsed && (
                <span className="absolute left-14 ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap hidden md:block">
                  Sign out
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Mobile Header with Menu Toggle */}
        <div className="sticky top-0 z-30 flex items-center gap-4 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
          <button
            onClick={toggleMobileMenu}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Sightline.ai</h1>
        </div>
        
        <main className="p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}