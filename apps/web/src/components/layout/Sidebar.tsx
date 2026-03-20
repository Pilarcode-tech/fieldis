'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  DollarSign,
  Settings,
  UserCog,
  Zap,
  Menu,
  X,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()
  const permissions = usePermissions()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: !permissions.isEmployee },
    { href: '/funcionarios', label: 'Funcionários', icon: Users, visible: permissions.canManageEmployees || permissions.isReadOnly },
    { href: '/obras', label: 'Projetos', icon: Building2, visible: permissions.canManageProjects || permissions.isSupervisor || permissions.isReadOnly },
    { href: '/ponto', label: 'Ponto', icon: Clock, visible: permissions.canRecordPresence || permissions.isReadOnly || permissions.isEmployee },
    { href: '/adiantamento', label: 'Adiantamento', icon: DollarSign, visible: permissions.isEmployee },
    { href: '/holerites', label: 'Holerites', icon: FileText, visible: permissions.isEmployee },
    { href: '/documentos', label: 'Documentos', icon: FolderOpen, visible: permissions.isEmployee },
    { href: '/folha', label: 'Folha', icon: FileSpreadsheet, visible: permissions.canViewPayroll },
    { href: '/financeiro', label: 'Financeiro', icon: DollarSign, visible: permissions.canViewFinancial },
    { href: '/configuracoes/usuarios', label: 'Usuários', icon: UserCog, visible: permissions.canManageUsers },
    { href: '/configuracoes', label: 'Configurações', icon: Settings, visible: permissions.canViewSettings },
  ].filter(item => item.visible)

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md bg-[#1a1d23] p-2 shadow-md md:hidden"
      >
        <Menu className="h-5 w-5 text-[#9ca3af]" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#2d3140] bg-[#1a1d23] transition-transform md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-[#2d3140] px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2563eb]">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-syne text-lg font-bold text-white">Fieldis</h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden"
          >
            <X className="h-5 w-5 text-[#9ca3af]" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            // Exact match for items that have sub-routes as separate sidebar items
            const isActive = item.href === '/configuracoes'
              ? pathname === '/configuracoes'
              : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-[color,opacity] duration-150',
                  isActive
                    ? 'border-l-2 border-[#2563eb] bg-[rgba(37,99,235,0.08)] text-white'
                    : 'text-[#9ca3af] hover:bg-[#252830]'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#2d3140] p-4">
          <p className="font-mono-data text-[11px] text-[#6b7280]">EMPRESA</p>
          <p className="font-mono-data truncate text-sm text-[#9ca3af]">{session?.user?.companyName || 'Minha Empresa'}</p>
        </div>
      </aside>
    </>
  )
}
