// app/api/users/route.ts
// Admin user management (decision #7): admin creates users + sets passwords.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { writeAuditLog } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, isSalesperson: true, createdAt: true },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const email = body.email?.toString().toLowerCase().trim()
  const password = body.password?.toString()
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      name: body.name ?? email.split('@')[0],
      role: (body.role as Role) ?? Role.STAFF,
      isSalesperson: body.isSalesperson === true,
    },
    select: { id: true, name: true, email: true, role: true, isSalesperson: true, createdAt: true },
  })

  await writeAuditLog({
    userId: (session.user as any).id, action: 'CREATE', entity: 'User',
    entityId: user.id, entityName: user.email, reason: 'User created by admin',
  })
  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const id = body.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: any = {}
  if ('name' in body) data.name = body.name
  if ('role' in body) data.role = body.role
  if ('isSalesperson' in body) data.isSalesperson = !!body.isSalesperson
  if (body.password) {
    if (body.password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    data.password = await bcrypt.hash(body.password, 12)
  }

  const user = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, isSalesperson: true } })
  await writeAuditLog({
    userId: (session.user as any).id, action: 'UPDATE', entity: 'User',
    entityId: id, entityName: user.email, reason: 'User updated by admin',
  })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (id === (session.user as any).id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  await writeAuditLog({
    userId: (session.user as any).id, action: 'DELETE', entity: 'User',
    entityId: id, reason: 'User deleted by admin',
  })
  return NextResponse.json({ success: true })
}
