import './globals.css'

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { ThemeProvider } from '@/components/providers/themeProvider'
import { JsonLdSchema } from '@/components/seo/json-ld-schema'
import { TooltipProvider } from '@/components/ui/tooltip'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://notavex.com'),
  title: 'Notavex - AI Music to Sheet Music | Free Transcription',
  description:
    'Turn any song into sheet music in seconds. AI-powered transcription separates every instrument from YouTube, audio files & live recordings. Try free!',
  keywords: [
    'music transcription software',
    'audio to sheet music converter',
    'YouTube to sheet music',
    'AI music transcription',
    'convert mp3 to sheet music',
    'stem separation',
    'automatic music notation',
  ],
  authors: [{ name: 'Notavex' }],
  creator: 'Notavex',
  publisher: 'Notavex',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://notavex.com/',
    siteName: 'Notavex',
    title: 'Notavex - Transform Any Song Into Sheet Music with AI',
    description:
      'AI-powered transcription that separates every instrument from YouTube videos & audio files. Used by 10,000+ musicians. Try free today!',
    images: [
      {
        url: '/thumbnails/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Notavex - AI Music Transcription Tool Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@notavex',
    creator: '@notavex',
    title: 'Notavex - AI Music to Sheet Music Converter',
    description:
      'Turn any song into sheet music in seconds. AI separates every instrument automatically. Try free!',
    images: ['/thumbnails/twitter-card.png'],
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
  icons: {
    icon: [
      { url: '/icons/favicon.ico' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://notavex.com/',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <JsonLdSchema />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
