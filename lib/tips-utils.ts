import { tips, type Tip } from './tips'

const STORAGE_KEY = 'wayu-tips-seen'

export function hasSeenTips(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function markTipsSeen(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, 'true')
}

export function getTipsBySection(section: string): Tip[] {
  return tips.filter(t => t.section === section)
}

export function getAllTips(): Tip[] {
  return tips
}
