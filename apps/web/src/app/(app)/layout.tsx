'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { usePermissions } from '@/hooks/usePermissions'
import { Header } from '@/components/layout/Header'
import { Toaster } from 'sonner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const { canViewFinancial, canViewPayroll, canViewSettings, canManageUsers, canManageProjects, canManageEmployees, canRecordPresence, isSupervisor, isFinancialManager, isEmployee, isReadOnly } = usePermissions()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    // Force re-login if session exists but role is missing (stale token)
    if (status === 'authenticated' && session?.user && !session.user.role) {
      signOut({ callbackUrl: '/login' })
    }
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    if (pathname.startsWith('/configuracoes/usuarios') && !canManageUsers) {
      router.push('/dashboard')
    } else if (pathname.startsWith('/configuracoes') && !pathname.startsWith('/configuracoes/usuarios') && !canViewSettings) {
      router.push('/dashboard')
    } else if (pathname.startsWith('/financeiro') && !canViewFinancial) {
      router.push('/dashboard')
    } else if (pathname.startsWith('/folha') && !canViewPayroll) {
      router.push('/dashboard')
    } else if (pathname.startsWith('/obras') && !canManageProjects && !isSupervisor && !isReadOnly) {
      router.push('/dashboard')
    } else if (pathname.startsWith('/funcionarios') && !canManageEmployees && !isReadOnly) {
      if (isSupervisor || isEmployee) {
        router.push('/ponto')
      } else if (isFinancialManager) {
        router.push('/financeiro')
      } else {
        router.push('/dashboard')
      }
    } else if (pathname.startsWith('/ponto') && !canRecordPresence && !isReadOnly && !isEmployee) {
      if (isFinancialManager) {
        router.push('/financeiro')
      } else {
        router.push('/dashboard')
      }
    } else if (pathname.startsWith('/holerites') && !isEmployee) {
      router.push('/dashboard')
    } else if (pathname.startsWith('/documentos') && !isEmployee) {
      router.push('/dashboard')
    }
  }, [status, pathname, canViewFinancial, canViewPayroll, canViewSettings, canManageUsers, canManageProjects, canManageEmployees, canRecordPresence, isSupervisor, isFinancialManager, isEmployee, isReadOnly, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2563eb] border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <>
    <style jsx global>{`
      @media print {
        [data-sidebar], aside, .no-print { display: none !important; }
        [data-header] { display: none !important; }
        main { overflow: visible !important; padding: 0 !important; }
        body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#f4f5f7] p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
    </>
  )
}
