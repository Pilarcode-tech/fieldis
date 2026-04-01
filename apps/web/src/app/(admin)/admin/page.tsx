'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Building2, Users, HardHat, CheckCircle, XCircle } from 'lucide-react'

interface AdminStats {
  totalCompanies: number
  activeCompanies: number
  inactiveCompanies: number
  totalUsers: number
  totalEmployees: number
  companiesByPlan: Record<string, number>
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  })

  const kpis = stats
    ? [
        { label: 'Total Empresas', value: stats.totalCompanies, icon: Building2, color: '#2563eb' },
        { label: 'Empresas Ativas', value: stats.activeCompanies, icon: CheckCircle, color: '#16a34a' },
        { label: 'Empresas Inativas', value: stats.inactiveCompanies, icon: XCircle, color: '#dc2626' },
        { label: 'Total Usuarios', value: stats.totalUsers, icon: Users, color: '#7c3aed' },
        { label: 'Total Funcionarios', value: stats.totalEmployees, icon: HardHat, color: '#d97706' },
      ]
    : []

  const planLabels: Record<string, string> = {
    BASICO: 'Basico',
    PROFISSIONAL: 'Profissional',
    EMPRESARIAL: 'Empresarial',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-bold text-[#111827]">Painel da Plataforma</h1>
        <p className="text-sm text-[#6b7280]">Visao geral de todas as empresas cadastradas no Fieldis</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-[#f4f5f7]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card key={kpi.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono-data text-[11px] uppercase tracking-wider text-[#6b7280]">
                        {kpi.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[#111827]">{kpi.value}</p>
                    </div>
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${kpi.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {stats?.companiesByPlan && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-[#111827]">Empresas por Plano</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {Object.entries(planLabels).map(([key, label]) => (
                <div key={key} className="rounded-lg border border-[#e3e6ed] p-4">
                  <p className="font-mono-data text-[11px] uppercase tracking-wider text-[#6b7280]">
                    {label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-[#111827]">
                    {stats.companiesByPlan[key] || 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
