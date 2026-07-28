import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'WAYU Inventory — Pharmaceutical Management',
  description: 'Real-time pharmaceutical inventory tracking and management system',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `dark` class here is the SSR default — ThemeProvider overrides it on mount
    // using the user's saved preference from localStorage.
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Inline script prevents flash-of-wrong-theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wayu-theme');var d=document.documentElement;if(t==='light'){d.classList.remove('dark')}else if(t==='system'){if(!window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.remove('dark')}}else{d.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
