'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function logoutAction() {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })
    await writeAuditLog({
      userId: session.user.id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: session.user.id,
      entityName: user?.email ?? session.user.id,
    })
  }
}