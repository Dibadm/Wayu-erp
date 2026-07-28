// lib/backup.ts
// Backup logic: pg_dump → gzip → store locally or upload to S3.
// Called by the cron API route and by manual trigger from the UI.

import { prisma } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export interface BackupResult {
  success: boolean
  filename?: string
  sizeBytes?: number
  error?: string
}

export async function runBackup(triggeredBy: string): Promise<BackupResult> {
  // Create a pending record first so the UI can show it immediately
  const record = await prisma.backupRecord.create({
    data: { filename: 'pending', triggeredBy, status: 'RUNNING' },
  })

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `wayu-backup-${timestamp}.sql.gz`
    const backupDir = process.env.BACKUP_DIR ?? '/tmp/wayu-backups'
    const fullPath = path.join(backupDir, filename)

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

    // Parse DATABASE_URL for pg_dump credentials
    const dbUrl = process.env.DATABASE_URL!
    const cmd = `pg_dump "${dbUrl}" | gzip > "${fullPath}"`

    await execAsync(cmd)

    const stats = fs.statSync(fullPath)
    const sizeBytes = stats.size

    // Update the record with success
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        filename,
        sizeBytes: BigInt(sizeBytes),
        storagePath: fullPath,
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    })

    // Optional: upload to S3 if configured
    if (process.env.S3_BUCKET) {
      await uploadToS3(fullPath, filename)
      await prisma.backupRecord.update({
        where: { id: record.id },
        data: { storagePath: `s3://${process.env.S3_BUCKET}/backups/${filename}` },
      })
    }

    // Auto-prune: keep only last 30 local backups
    pruneOldBackups(backupDir, 30)

    return { success: true, filename, sizeBytes }
  } catch (err: any) {
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorMsg: err.message, completedAt: new Date() },
    })
    return { success: false, error: err.message }
  }
}

async function uploadToS3(filePath: string, filename: string) {
  // Requires AWS SDK installed: npm install @aws-sdk/client-s3
  // Uncomment when S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are set.
  //
  // const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  // const client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
  // const body = fs.createReadStream(filePath)
  // await client.send(new PutObjectCommand({
  //   Bucket: process.env.S3_BUCKET!,
  //   Key: `backups/${filename}`,
  //   Body: body,
  //   ContentType: 'application/gzip',
  // }))
  console.log(`[BACKUP] S3 upload stub for ${filename} — configure AWS SDK to enable`)
}

function pruneOldBackups(dir: string, keepCount: number) {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('wayu-backup-') && f.endsWith('.gz'))
      .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time)

    files.slice(keepCount).forEach(f => {
      fs.unlinkSync(path.join(dir, f.name))
      console.log(`[BACKUP] Pruned old backup: ${f.name}`)
    })
  } catch (err) {
    console.error('[BACKUP] Prune error:', err)
  }
}
