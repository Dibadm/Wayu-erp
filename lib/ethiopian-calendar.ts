// lib/ethiopian-calendar.ts
// Ethiopian calendar conversion + month labels for reports (decision #4).
// The client's CF19 workbook used a LET-based Ethiopian-calendar conversion with
// Amharic month names. We port the conversion to pure TS so report grouping can
// switch between Gregorian and Ethiopian calendars on export.
//
// Ethiopian calendar: 13 months — 12 of 30 days, plus Pagumē (5 or 6 days in leap years).
// Ethiopian year 2000 began on 11 Sep 2007 (Gregorian). The two calendars differ
// by ~7-8 years and the new Ethiopian year starts in September.

export const ETHIOPIAN_MONTHS_AMHARIC = [
  'መስከረም', // 1  Meskerem
  'ጥቅምት',   // 2  Tikimt
  'ኅዳር',     // 3  Hidar
  'ታኅሳስ',   // 4  Tahsas
  'ጥር',       // 5  Tir
  'የካቲት',   // 6  Yekatit
  'መጋቢት',   // 7  Megabit
  'ሚያዝያ',   // 8  Miazia
  'ግንቦት',   // 9  Ginbot
  'ሰኔ',       // 10 Sene
  'ሐምሌ',     // 11 Hamle
  'ነሐሴ',     // 12 Nehasse
  'ጳጉሜ',     // 13 Pagumē
] as const

export const ETHIOPIAN_MONTHS_ENGLISH = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehasse', 'Pagume',
] as const

export interface EthiopianDate {
  year: number
  month: number // 1-13
  day: number   // 1-30 (or 1-5/6 for Pagumē)
  monthName: string
  monthNameAmharic: string
  label: string // e.g. "Meskerem 2011"
}

// JD = Julian Day number (astronomical, noon-based)
function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

function jdnToGregorian(jdn: number): Date {
  let a = jdn + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)
  const day = e - Math.floor((153 * m + 2) / 5) + 1
  const month = m + 3 - 12 * Math.floor(m / 10)
  const year = 100 * b + d - 4800 + Math.floor(m / 10)
  return new Date(Date.UTC(year, month - 1, day))
}

// Ethiopian epoch = JD 1724220.5 (Ethiopian 1/1/1 ≈ 27 Aug 8 CE Julian)
const ET_EPOCH = 1723856 // JD for Ethiopian 1/1/1 (Gregorian 30 Aug 8 CE)

function isEthiopianLeap(year: number): boolean {
  return year % 4 === 3
}

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJDN(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  let ethDay = jdn - ET_EPOCH + 1 // day number since Ethiopian epoch (1-based)

  let year = 1
  while (true) {
    const len = isEthiopianLeap(year) ? 366 : 365
    if (ethDay <= len) break
    ethDay -= len
    year++
  }

  const month = Math.ceil(ethDay / 30)
  const day = ((ethDay - 1) % 30) + 1

  const monthName = ETHIOPIAN_MONTHS_ENGLISH[month - 1]
  const monthNameAmharic = ETHIOPIAN_MONTHS_AMHARIC[month - 1]

  return {
    year,
    month,
    day,
    monthName,
    monthNameAmharic,
    label: `${monthName} ${year}`,
  }
}

export function fromEthiopian(year: number, month: number, day: number): Date {
  let jdn = ET_EPOCH - 1
  for (let y = 1; y < year; y++) jdn += isEthiopianLeap(y) ? 366 : 365
  jdn += (month - 1) * 30 + (day - 1)
  return jdnToGregorian(jdn)
}

// A label used for report grouping. Mirrors the client's Sells19!$AE "EtC" column.
export function ethiopianMonthLabel(date: Date, useAmharic = false): string {
  const e = toEthiopian(date)
  return useAmharic ? `${e.monthNameAmharic} ${e.year}` : `${e.monthName} ${e.year}`
}

// Gregorian month label (mirrors the client's Sells19!$J / $AE grouping).
export function gregorianMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export type CalendarMode = 'gregorian' | 'ethiopian'

// Returns the key used to bucket a date by month in the chosen calendar system.
export function monthGroupKey(date: Date, mode: CalendarMode, useAmharic = false): string {
  return mode === 'ethiopian' ? ethiopianMonthLabel(date, useAmharic) : gregorianMonthLabel(date)
}

// ISO-ish week number (Gregorian) — mirrors Sells19!$J (Gregorian week).
export function gregorianWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const diff = d.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 86400000))
}
