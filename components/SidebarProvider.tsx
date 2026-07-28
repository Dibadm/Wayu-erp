'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextValue {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  setOpen: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export default function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  return (
    <SidebarContext.Provider value={{ isOpen, setOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}
