'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { DollarSign, TrendingUp, TrendingDown, Download, Eye, FileSpreadsheet, Clock } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency, formatDate, statusLabel } from '@fieldis/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/lib/api'
import { useFinancialData, useAdvances, useApproveAdvance, useRejectAdvance, usePayrollPeriods } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'

export default function FinanceiroPage() {
  const { canApproveAdvances, isReadOnly } = usePermissions()
  const { data: financialData, isLoading: financialLoading } = useFinancialData()
  const { data: periods } = usePayrollPeriods()
  const [advanceFilter, setAdvanceFilter] = useState('PENDING')
  const { data: advancesData, isLoading: advancesLoading } = useAdvances(
    advanceFilter ? { status: advanceFilter } : undefined
  )
  const approveAdvance = useApproveAdvance()
  const rejectAdvance = useRejectAdvance()

  const advances = advancesData?.data ?? []

  // KPI calculations
  const latestPeriod = periods?.find(p => p.status === 'CLOSED' || p.status === 'REVIEW') ?? periods?.[0]
  const previousPeriod = periods && latestPeriod
    ? periods.find(p => p.id !== latestPeriod.id && (p.status === 'CLOSED' || p.status === 'REVIEW'))
    : null

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  const pendingAdvancesTotal = useMemo(() => {
    if (advanceFilter !== 'PENDING') return null
    return advances.reduce((sum, a) => sum + a.amount, 0)
  }, [advances, advanceFilter])

  // Cost variation
  const costVariation = latestPeriod && previousPeriod && previousPeriod.totalNet > 0
    ? ((latestPeriod.totalNet - previousPeriod.totalNet) / previousPeriod.totalNet) * 100
    : null

  // Advances total for current filter
  const filteredTotal = useMemo(() =>
    advances.reduce((sum, a) => sum + a.amount, 0),
    [advances]
  )

  async function handleApprove(advanceId: string) {
    try {
      await approveAdvance.mutateAsync(advanceId)
      toast.success('Adiantamento aprovado.')
    } catch {
      toast.error('Erro ao aprovar adiantamento.')
    }
  }

  async function handleReject(advanceId: string) {
    try {
      await rejectAdvance.mutateAsync(advanceId)
      toast.success('Adiantamento rejeitado.')
    } catch {
      toast.error('Erro ao rejeitar adiantamento.')
    }
  }

  async function handleExportCSV() {
    try {
      const response = await api.get('/dashboard/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'financeiro.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar CSV.')
    }
  }

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <Eye className="h-3.5 w-3.5 flex-shrink-0" />
          Modo somente leitura — você está acessando como Auditor.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-syne text-lg font-bold text-[#111827]">Financeiro</h2>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eff6ff]">
                <FileSpreadsheet className="h-5 w-5 text-[#2563eb]" />
              </div>
              <div>
                <p className="text-xs text-[#9ca3af]">Folha do mês</p>
                <p className="font-mono-data text-lg font-bold text-[#111827]">
                  {latestPeriod ? formatCurrency(latestPeriod.totalNet) : 'R$ 0,00'}
                </p>
                {latestPeriod && (
                  <p className="text-xs text-[#6b7280]">
                    {monthNames[latestPeriod.month - 1]} {latestPeriod.year}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-[#9ca3af]">Adiantamentos pendentes</p>
                <p className="font-mono-data text-lg font-bold text-[#111827]">
                  {pendingAdvancesTotal !== null ? formatCurrency(pendingAdvancesTotal) : formatCurrency(advances.filter(a => a.status === 'PENDING').reduce((s, a) => s + a.amount, 0))}
                </p>
                <p className="text-xs text-[#6b7280]">
                  {advanceFilter === 'PENDING' ? advances.length : '—'} solicitações
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#dcfce7]">
                <DollarSign className="h-5 w-5 text-[#16a34a]" />
              </div>
              <div>
                <p className="text-xs text-[#9ca3af]">Custo MO do mês</p>
                <p className="font-mono-data text-lg font-bold text-[#111827]">
                  {financialData?.monthlyEvolution?.length
                    ? formatCurrency(financialData.monthlyEvolution[financialData.monthlyEvolution.length - 1]?.cost ?? 0)
                    : 'R$ 0,00'
                  }
                </p>
                <p className="text-xs text-[#6b7280]">Custo total com encargos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${costVariation !== null && costVariation <= 0 ? 'bg-[#dcfce7]' : 'bg-[#fef2f2]'}`}>
                {costVariation !== null && costVariation <= 0
                  ? <TrendingDown className="h-5 w-5 text-[#16a34a]" />
                  : <TrendingUp className="h-5 w-5 text-[#dc2626]" />
                }
              </div>
              <div>
                <p className="text-xs text-[#9ca3af]">Variação mensal</p>
                <p className={`font-mono-data text-lg font-bold ${costVariation !== null && costVariation <= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                  {costVariation !== null
                    ? `${costVariation > 0 ? '+' : ''}${costVariation.toFixed(1)}%`
                    : '—'
                  }
                </p>
                <p className="text-xs text-[#6b7280]">vs. mês anterior</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#2563eb]" />
              Custo Total por Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData?.costByObra ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e6ed" />
                    <XAxis
                      dataKey="obraName"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                      stroke="#e3e6ed"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(val: number) =>
                        new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(val)
                      }
                      stroke="#e3e6ed"
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'cost' ? 'Custo' : 'Orçamento',
                      ]}
                      contentStyle={{
                        borderRadius: '6px',
                        border: '1px solid #e3e6ed',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                      }}
                    />
                    <Legend
                      formatter={(value: string) => (value === 'cost' ? 'Custo' : 'Orçamento')}
                      wrapperStyle={{ color: '#6b7280' }}
                    />
                    <Bar dataKey="budget" name="budget" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="cost" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#2563eb]" />
              Custo de Mão de Obra por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialData?.monthlyEvolution ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e6ed" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e3e6ed" />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(val: number) =>
                        new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(val)
                      }
                      stroke="#e3e6ed"
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Custo MO']}
                      contentStyle={{
                        borderRadius: '6px',
                        border: '1px solid #e3e6ed',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      name="Custo MO"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advances with status filter */}
      <Card>
        <CardHeader>
          <CardTitle>Adiantamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="PENDING" onValueChange={(v) => setAdvanceFilter(v)}>
            <TabsList>
              <TabsTrigger value="PENDING">Pendentes</TabsTrigger>
              <TabsTrigger value="APPROVED">Aprovados</TabsTrigger>
              <TabsTrigger value="REJECTED">Rejeitados</TabsTrigger>
              <TabsTrigger value="DISCOUNTED">Descontados</TabsTrigger>
              <TabsTrigger value="">Todos</TabsTrigger>
            </TabsList>

            {['PENDING', 'APPROVED', 'REJECTED', 'DISCOUNTED', ''].map((status) => (
              <TabsContent key={status} value={status}>
                {advancesLoading ? (
                  <div className="space-y-3 pt-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Desconto em</TableHead>
                          {status !== 'PENDING' && <TableHead>Status</TableHead>}
                          <TableHead>Data</TableHead>
                          {status === 'PENDING' && canApproveAdvances && <TableHead>Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {advances.map((advance) => (
                          <TableRow key={advance.id}>
                            <TableCell className="font-medium">{advance.employeeName}</TableCell>
                            <TableCell className="font-mono-data font-semibold">{formatCurrency(advance.amount)}</TableCell>
                            <TableCell>{advance.reason || '-'}</TableCell>
                            <TableCell className="font-mono-data">
                              {advance.discountMonth && advance.discountYear
                                ? `${String(advance.discountMonth).padStart(2, '0')}/${advance.discountYear}`
                                : '-'
                              }
                            </TableCell>
                            {status !== 'PENDING' && (
                              <TableCell>
                                <Badge variant={
                                  advance.status === 'APPROVED' ? 'success' :
                                  advance.status === 'REJECTED' ? 'destructive' :
                                  advance.status === 'DISCOUNTED' ? 'secondary' :
                                  'warning'
                                }>
                                  {statusLabel(advance.status)}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell>{formatDate(advance.requestDate)}</TableCell>
                            {status === 'PENDING' && canApproveAdvances && (
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(advance.id)}
                                    disabled={approveAdvance.isPending}
                                    className="text-[#16a34a] hover:bg-[#16a34a]/10 hover:text-[#16a34a]"
                                  >
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReject(advance.id)}
                                    disabled={rejectAdvance.isPending}
                                    className="text-[#dc2626] hover:bg-[#dc2626]/10 hover:text-[#dc2626]"
                                  >
                                    Rejeitar
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {advances.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={status === 'PENDING' && canApproveAdvances ? 7 : 6} className="py-8 text-center text-[#9ca3af]">
                              Nenhum adiantamento {status === 'PENDING' ? 'pendente' : status === 'APPROVED' ? 'aprovado' : status === 'REJECTED' ? 'rejeitado' : status === 'DISCOUNTED' ? 'descontado' : ''}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {advances.length > 0 && (
                      <div className="mt-3 flex justify-end border-t border-[#e3e6ed] pt-3">
                        <p className="font-mono-data text-sm text-[#6b7280]">
                          Total: <span className="font-semibold text-[#111827]">{formatCurrency(filteredTotal)}</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
