import React from "react"
import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { VideoProvider } from "@/components/providers/VideoProvider"
import { AuthProvider } from "@/contexts/AuthContext"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: '撮るだけマニュアル',
  description: '動画から手順を自動生成するAIサービス',
  generator: 'v0.app',
  icons: {
    icon: '/apple-icon.png',
    apple: '/apple-icon.png',
  },
}

import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${notoSansJP.className} font-sans antialiased`}>
        <AuthProvider>
          <VideoProvider>
            {children}
          </VideoProvider>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
