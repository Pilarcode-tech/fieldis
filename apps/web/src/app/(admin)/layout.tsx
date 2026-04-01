'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Toaster } from 'sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#dc2626] border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'SUPER_ADMIN') {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-[#f4f5f7] p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  )
}
