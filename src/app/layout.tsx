import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'FleetCheck — Consuldata',
  description: 'Sistema de checklist veicular — Consuldata Teleprocessamento',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'FleetCheck' },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: '/icons/icon-192.png',
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
