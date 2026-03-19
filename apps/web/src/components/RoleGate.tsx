'use client'

import { useSession } from 'next-auth/react'

interface RoleGateProps {
  roles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''

  if (role === 'SUPER_ADMIN' || roles.includes(role)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
