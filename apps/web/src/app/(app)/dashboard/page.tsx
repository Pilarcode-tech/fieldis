'use client'

import {
  Users,
  Building2,
  Clock,
  DollarSign,
  CreditCard,
  FileWarning,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDashboard } from '@/hooks/useApi'
import { formatCurrency, statusLabel, statusColor } from '@fieldis/shared'
import { cn } from '@/lib/utils'

const kpiConfig = [
  { key: 'totalEmployees' as const, label: 'TOTAL FUNCIONÁRIOS', icon: Users },
  { key: 'activeObras' as const, label: 'PROJETOS ATIVOS', icon: Building2 },
  { key: 'todayRecords' as const, label: 'PONTOS HOJE', icon: Clock },
  { key: 'monthlyLaborCost' as const, label: 'CUSTO MO MENSAL', icon: DollarSign, format: 'currency' },
  { key: 'pendingAdvances' as const, label: 'ADIANTAMENTOS PENDENTES', icon: CreditCard },
  { key: 'expiringDocs' as const, label: 'DOCS VENCENDO', icon: FileWarning },
]

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <KpiSkeleton />
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiConfig.map((kpi) => {
          const Icon = kpi.icon
          const value = data?.[kpi.key] ?? 0
          const displayValue = kpi.format === 'currency' ? formatCurrency(value) : value

          return (
            <Card key={kpi.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[#6b7280]" />
                  <div>
                    <p className="font-syne text-[28px] font-bold text-[#111827]">{displayValue}</p>
                    <p className="font-mono-data text-[11px] uppercase text-[#9ca3af]">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projetos - Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Funcionários</TableHead>
                <TableHead>Orçado</TableHead>
                <TableHead>Realizado</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.obraStats?.map((obra) => {
                const budget = Number(obra.budgetedCost ?? 0)
                const real = Number(obra.realCost ?? 0)
                const progress = budget > 0
                  ? Math.min(100, Math.round((real / budget) * 100))
                  : 0

                return (
                  <TableRow key={obra.id}>
                    <TableCell className="font-medium">{obra.name}</TableCell>
                    <TableCell className="font-mono-data">{obra.code}</TableCell>
                    <TableCell className="font-mono-data">{obra.employeeCount}</TableCell>
                    <TableCell className="font-mono-data">{formatCurrency(budget)}</TableCell>
                    <TableCell className="font-mono-data">{formatCurrency(real)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded bg-[#e3e6ed]">
                          <div
                            className={cn(
                              'h-full rounded transition-all',
                              progress > 90 ? 'bg-[#dc2626]' : progress > 70 ? 'bg-[#d97706]' : 'bg-[#16a34a]'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="font-mono-data text-xs text-[#6b7280]">{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        obra.status === 'ACTIVE' ? 'success' :
                        obra.status === 'FINISHED' ? 'secondary' :
                        obra.status === 'PAUSED' ? 'warning' : 'default'
                      }>
                        {statusLabel(obra.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!data?.obraStats || data.obraStats.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[#9ca3af]">
                    Nenhum projeto cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
