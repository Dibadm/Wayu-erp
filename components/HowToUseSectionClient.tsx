'use client'

import { useState } from 'react'
import HowToUseSection from './HowToUseSection'
import TipsOverlay from './TipsOverlay'

export default function HowToUseSectionClient() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <HowToUseSection onShowTips={() => setOpen(true)} />
      <TipsOverlay isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
