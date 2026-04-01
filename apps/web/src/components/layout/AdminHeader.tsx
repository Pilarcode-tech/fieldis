'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/empresas': 'Empresas',
}

function getPageTitle(pathname: string): string {
  if (pathname.match(/\/admin\/empresas\/nova/)) return 'Nova Empresa'
  if (pathname.match(/\/admin\/empresas\/.+/)) return 'Detalhes da Empresa'

  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(path + '/')) return title
  }

  return 'Admin'
}

export function AdminHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const title = getPageTitle(pathname)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
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
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md p-1.5 transition-[color,opacity] duration-150 hover:bg-[#f9fafb]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(220,38,38,0.1)] text-[#dc2626]">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-medium text-[#111827] md:block">
              {session?.user?.name || 'Super Admin'}
            </span>
            <span className="hidden rounded bg-[#fee2e2] px-1.5 py-0.5 text-[10px] font-medium text-[#dc2626] md:block">
              Super Admin
            </span>
            <ChevronDown className="h-4 w-4 text-[#6b7280]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-[#e3e6ed] bg-white py-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <div className="border-b border-[#e3e6ed] px-4 py-2">
                <p className="text-sm font-medium text-[#111827]">{session?.user?.name}</p>
                <p className="text-xs text-[#6b7280]">{session?.user?.email}</p>
                <span className="mt-1 inline-block rounded bg-[#fee2e2] px-1.5 py-0.5 text-[10px] font-medium text-[#dc2626]">
                  Super Admin
                </span>
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
