import type { Metadata } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { TRPCProvider } from '@/components/providers/TRPCProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { MonitoringProvider } from '@/components/providers/MonitoringProvider'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

// Using Space Mono as it's the closest Google Font to Geist Mono
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-geist'
})

export const metadata: Metadata = {
  title: 'Sightline.ai - Speed-learn anything on YouTube',
  description: 'Transform hour-long YouTube videos into concise, searchable summaries with AI-powered insights.',
  keywords: ['YouTube', 'summarization', 'AI', 'learning', 'productivity'],
  authors: [{ name: 'Sightline.ai Team' }],
  openGraph: {
    title: 'Sightline.ai - Speed-learn anything on YouTube',
    description: 'Transform hour-long YouTube videos into concise, searchable summaries',
    url: 'https://sightline.ai',
    siteName: 'Sightline.ai',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sightline.ai - Speed-learn anything on YouTube',
    description: 'Transform hour-long YouTube videos into concise, searchable summaries',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          formButtonPrimary: 'bg-primary-600 hover:bg-primary-700',
          footerActionLink: 'text-primary-600 hover:text-primary-700',
        },
        layout: {
          shimmer: true,
          animations: true,
        }
      }}
      telemetry={false}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} ${spaceMono.variable} antialiased`}>
          <PostHogProvider>
            <TRPCProvider>
              <MonitoringProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </MonitoringProvider>
            </TRPCProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}