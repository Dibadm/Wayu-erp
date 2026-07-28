// lib/audit.ts
// Central audit logging — call this on every data-changing operation.
// Stores who, what, when, why, and what changed (before/after diff).

import { prisma } from '@/lib/db'
import { AuditAction } from '@prisma/client'
import { headers } from 'next/headers'

interface AuditParams {
  userId: string
  action: AuditAction
  entity: string          // e.g. "Product", "Movement", "Batch"
  entityId: string
  entityName?: string     // human-readable, e.g. product name
  changes?: Record<string, { before: unknown; after: unknown }>
  reason?: string         // required for DELETE and sensitive updates
}

export async function writeAuditLog(params: AuditParams) {
  try {
    const hdrs = headers()
    const ip = hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? 'unknown'
    const ua = hdrs.get('user-agent') ?? 'unknown'

    await prisma.auditLog.create({
      data: {
        userId:     params.userId,
        action:     params.action,
        entity:     params.entity,
        entityId:   params.entityId,
        entityName: params.entityName,
        changes:    (params.changes as any) ?? {},
        reason:     params.reason,
        ipAddress:  ip.split(',')[0].trim(),
        userAgent:  ua.slice(0, 200),
      },
    })
  } catch (err) {
    // Audit log failures must NEVER break the main operation —
    // log to console so you can alert on it separately.
    console.error('[AUDIT LOG FAILED]', err)
  }
}

// Diff helper: compare two objects and return changed fields only
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changes[key] = { before: before[key], after: after[key] }
    }
  }
  return changes
}
