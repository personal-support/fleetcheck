import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'FleetCheck — Alpha Comex e Transportes',
  description: 'Sistema de checklist veicular inteligente com IA — Alpha Comex e Transportes',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'FleetCheck' },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'FleetCheck — Alpha Comex e Transportes',
    description: 'Sistema de checklist veicular inteligente com IA — Gestão e controle de frota em tempo real.',
    url: 'https://fleetcheck.vercel.app',
    siteName: 'FleetCheck',
    images: [{ url: 'https://fleetcheck.vercel.app/icons/icon-512.png', width: 512, height: 512, alt: 'FleetCheck' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'FleetCheck — Alpha Comex e Transportes',
    description: 'Sistema de checklist veicular inteligente com IA — Gestão e controle de frota em tempo real.',
    images: ['https://fleetcheck.vercel.app/icons/icon-512.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#212771',
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
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,700;1,400&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen" style={{ fontFamily: "'Open Sans', sans-serif", background: '#ebeff2' }}>
        {children}
        <Script id="register-sw" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                  // Request background sync when online
                  window.addEventListener('online', () => {
                    if (reg.active) reg.active.postMessage({ type: 'ONLINE' })
                  })
                })
                .catch(() => {})
            })
          }
        `}</Script>
      </body>
    </html>
  )
}
