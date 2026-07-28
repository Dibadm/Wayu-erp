'use client'

import { useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info } from 'lucide-react'
import { tips, SECTIONS } from '@/lib/tips'
import { markTipsSeen } from '@/lib/tips-utils'
import {
  LayoutDashboard, Package, ArrowLeftRight, FlaskRound, MapPin, FileBarChart,
  ShoppingBag, Receipt, Users, FileSpreadsheet,
  TrendingUp, Percent, BarChart3, Landmark, ShieldCheck,
  Wallet, Building2, ArrowDownToLine, ArrowUpFromLine, Target, CircleDollarSign,
  CreditCard, UserCheck, FileCheck, CalendarDays, ClipboardList,
  Bot, Shield, HardDrive, Settings,
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Package, ArrowLeftRight, FlaskRound, MapPin, FileBarChart,
  ShoppingBag, Receipt, Users, FileSpreadsheet,
  TrendingUp, Percent, BarChart3, Landmark, ShieldCheck,
  Wallet, Building2, ArrowDownToLine, ArrowUpFromLine, Target, CircleDollarSign,
  CreditCard, UserCheck, FileCheck, CalendarDays, ClipboardList,
  Bot, Shield, HardDrive, Settings,
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function TipsOverlay({ isOpen, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleGotIt()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !overlayRef.current) return
    const container = overlayRef.current
    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    first.focus()
    container.addEventListener('keydown', handleTab)
    return () => container.removeEventListener('keydown', handleTab)
  }, [isOpen])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof tips>()
    for (const tip of tips) {
      const arr = map.get(tip.section) ?? []
      arr.push(tip)
      map.set(tip.section, arr)
    }
    return map
  }, [])

  const handleGotIt = () => {
    markTipsSeen()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && handleGotIt()}
        >
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className="glass-card w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-zinc-100">How to Use WAYU Inventory</h2>
              </div>
              <button
                onClick={handleGotIt}
                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {SECTIONS.map(section => {
                const sectionTips = grouped.get(section)
                if (!sectionTips || sectionTips.length === 0) return null
                return (
                  <div key={section}>
                    <h3 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">{section}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sectionTips.map(tip => {
                        const Icon = ICON_MAP[tip.icon]
                        return (
                          <div key={tip.id} className="rounded-lg p-4" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              {Icon && <Icon className="w-4 h-4 text-blue-400" />}
                              <p className="text-xs font-medium text-zinc-200">{tip.title}</p>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">{tip.description}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end px-5 py-4 border-t border-zinc-800 flex-shrink-0">
              <button onClick={handleGotIt} className="btn-primary text-xs px-4 py-2">
                Got It
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
