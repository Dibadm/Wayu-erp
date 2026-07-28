import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import AIChat from '@/components/AIChat'
import ExpiryNotificationBanner from '@/components/ExpiryNotificationBanner'
import SidebarProvider from '@/components/SidebarProvider'
import TipsWrapper from '@/components/TipsWrapper'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden surface-page">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={session.user} />
          {/* Login-time expiry warning — shows once per session if batches are expiring */}
          <ExpiryNotificationBanner />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
        {/* AI Chat floats over all pages */}
        <AIChat />
      </div>
      <TipsWrapper />
    </SidebarProvider>
  )
}
