'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Bell, ChevronDown, LogOut, User, FileWarning, DollarSign, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useApi'

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Administrador',
  RH_MANAGER: 'Gestor RH',
  FINANCIAL_MANAGER: 'Financeiro',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Funcionário',
  AUDITOR: 'Auditor',
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/funcionarios': 'Funcionários',
  '/obras': 'Projetos',
  '/ponto': 'Ponto',
  '/folha': 'Folha de Pagamento',
  '/financeiro': 'Financeiro',
  '/configuracoes': 'Configurações',
}

function getPageTitle(pathname: string): string {
  if (pathname.includes('/funcionarios/novo')) return 'Novo Funcionário'
  if (pathname.match(/\/funcionarios\/.+/)) return 'Detalhes do Funcionário'
  if (pathname.match(/\/obras\/.+/)) return 'Detalhes do Projeto'

  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title
  }

  return 'Fieldis'
}

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const title = getPageTitle(pathname)
  const { data: notificationsData } = useNotifications()
  const notifications = notificationsData?.notifications ?? []
  const notifCount = notificationsData?.total ?? 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#e3e6ed] bg-white px-6">
      <div className="pl-12 md:pl-0">
        <h2 className="font-syne text-xl font-bold text-[#111827]">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-md p-2 text-[#6b7280] transition-[color,opacity] duration-150 hover:text-[#111827]"
          >
            <Bell className="h-5 w-5" />
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#dc2626] text-[9px] font-bold text-white">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded-md border border-[#e3e6ed] bg-white py-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <div className="border-b border-[#e3e6ed] px-4 py-2">
                <p className="text-sm font-medium text-[#111827]">Notificações</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-[#9ca3af]">Nenhuma notificação</p>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="flex items-start gap-3 border-b border-[#e3e6ed] px-4 py-3 last:border-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {notif.type === 'doc_expiring' && <FileWarning className="h-4 w-4 text-[#d97706]" />}
                        {notif.type === 'doc_expired' && <AlertTriangle className="h-4 w-4 text-[#dc2626]" />}
                        {notif.type === 'advance_pending' && <DollarSign className="h-4 w-4 text-[#2563eb]" />}
                        {notif.type === 'payroll_open' && <FileSpreadsheet className="h-4 w-4 text-[#6b7280]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#111827]">{notif.title}</p>
                        <p className="text-xs text-[#6b7280]">{notif.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md p-1.5 transition-[color,opacity] duration-150 hover:bg-[#f9fafb]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(37,99,235,0.1)] text-[#2563eb]">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-medium text-[#111827] md:block">
              {session?.user?.name || 'Usuário'}
            </span>
            {session?.user?.role && (
              <span className="hidden rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] font-medium text-[#2563eb] md:block">
                {roleLabels[session.user.role] ?? session.user.role}
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-[#6b7280]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-[#e3e6ed] bg-white py-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <div className="border-b border-[#e3e6ed] px-4 py-2">
                <p className="text-sm font-medium text-[#111827]">{session?.user?.name}</p>
                <p className="text-xs text-[#6b7280]">{session?.user?.email}</p>
                {session?.user?.role && (
                  <span className="mt-1 inline-block rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] font-medium text-[#2563eb]">
                    {roleLabels[session.user.role] ?? session.user.role}
                  </span>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-sm text-[#6b7280] transition-[color,opacity] duration-150 hover:bg-[#f9fafb] hover:text-[#111827]'
                )}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
