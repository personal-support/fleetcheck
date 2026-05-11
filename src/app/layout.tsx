import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FleetCheck — Consuldata',
  description: 'Sistema de checklist veicular — Consuldata Teleprocessamento',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'FleetCheck' },
}

export const viewport: Viewport = {
  themeColor: '#f0f2f9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen" style={{ fontFamily: "'Roboto', sans-serif", background: '#f0f2f9' }}>
        {children}
      </body>
    </html>
  )
}
