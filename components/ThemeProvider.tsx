'use client'

// ThemeProvider — manages light/dark/system theme.
// Applies `dark` class to <html>. Persists to localStorage.
// Children access theme via useTheme() hook.

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: 'light' | 'dark'   // what's actually applied
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'dark',
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  return resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState]         = useState<Theme>('system')
  const [resolvedTheme, setResolved]   = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted]          = useState(false)

  // Read persisted theme on mount
  useEffect(() => {
    const saved = (localStorage.getItem('wayu-theme') as Theme | null) ?? 'system'
    setThemeState(saved)
    const resolved = applyTheme(saved)
    setResolved(resolved)
    setMounted(true)
  }, [])

  // Listen for system theme changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = applyTheme('system')
      setResolved(resolved)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(t: Theme) {
    localStorage.setItem('wayu-theme', t)
    setThemeState(t)
    const resolved = applyTheme(t)
    setResolved(resolved)
  }

  // Prevent flash: render children immediately (SSR renders with dark class on html)
  // After hydration, ThemeProvider takes over with the stored preference.
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
