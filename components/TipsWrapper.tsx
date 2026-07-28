'use client'

import { useEffect, useState } from 'react'
import TipsOverlay from '@/components/TipsOverlay'
import { hasSeenTips } from '@/lib/tips-utils'

export default function TipsWrapper() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!hasSeenTips()) {
      setShow(true)
    }
  }, [])

  return <TipsOverlay isOpen={show} onClose={() => setShow(false)} />
}
