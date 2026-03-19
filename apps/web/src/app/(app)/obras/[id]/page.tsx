'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, UserPlus, UserMinus, Pencil, ChevronDown, Eye, Plus, Trash2, Package, Truck, Utensils, Building, Wrench, MoreHorizontal } from 'lucide-react'
import {
  BarChart,
  Bar,
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
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatMoneyInput, parseMoneyInput } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Select } from '@/components/ui/Select'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useObra, useUpdateObra, useAllocateEmployee, useDeallocateEmployee, useEmployees, useProjectCosts, useCreateProjectCost, useUpdateProjectCost, useDeleteProjectCost } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

export default function ObraDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { canAllocate, canDeallocate, canManageProjects, canViewProjectFinancials, isSupervisor, isReadOnly } = usePermissions()
  const { data: session } = useSession()
  const id = params.id as string
  const { data: obra, isLoading } = useObra(id)
  const { data: employeesData } = useEmployees({ status: 'ACTIVE', limit: 100 })
  const allocateEmployee = useAllocateEmployee()
  const deallocateEmployee = useDeallocateEmployee()
  const { data: projectCosts } = useProjectCosts(id)
  const createCost = useCreateProjectCost(id)
  const updateCost = useUpdateProjectCost(id)
  const deleteCost = useDeleteProjectCost(id)
  const [costDialogOpen, setCostDialogOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<{ id: string; category: string; description: string; amount: number; date: string; invoiceNumber: string | null } | null>(null)
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [allocateStartDate, setAllocateStartDate] = useState('')

  async function handleAllocate() {
    if (!selectedEmployeeId || !allocateStartDate) {
      toast.error('Selecione um funcionário e a data de início.')
      return
    }
    try {
      await allocateEmployee.mutateAsync({
        obraId: id,
        employeeId: selectedEmployeeId,
        startDate: allocateStartDate,
      })
      toast.success('Funcionário alocado com sucesso!')
      setAllocateDialogOpen(false)
      setSelectedEmployeeId('')
      setAllocateStartDate('')
    } catch {
      toast.error('Erro ao alocar funcionário.')
    }
  }

  async function handleDeallocate(employeeId: string) {
    try {
      await deallocateEmployee.mutateAsync({ obraId: id, employeeId })
      toast.success('Funcionário desalocado.')
    } catch {
      toast.error('Erro ao desalocar funcionário.')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!obra) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[#6b7280]">Projeto não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/obras')}>
          Voltar
        </Button>
      </div>
    )
  }

  const budget = Number(obra.budgetedCost ?? 0)
  const real = Number(obra.actualCost ?? 0)

  const realMO = Number(obra.actualCostMO ?? real)
  const realExtras = Number(obra.actualCostExtras ?? 0)

  const costChartData = [
    {
      name: obra.name,
      orcado: budget,
      mo: realMO,
      despesas: realExtras,
      total: real,
    },
  ]

  const availableEmployees = employeesData?.data?.filter(
    (emp) => !obra.employees?.some((oe) => oe.id === emp.id)
  ) ?? []

  // SUPERVISOR can only allocate to projects they are linked to
  const supervisorCanAllocate = canAllocate && (
    !isSupervisor || obra.users?.some((u: { userId: string }) => u.userId === session?.user?.id)
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <Eye className="h-3.5 w-3.5 flex-shrink-0" />
          Modo somente leitura — você está acessando como Auditor.
        </div>
      )}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/obras')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">{obra.name}</h2>
          <p className="font-mono-data text-sm text-[#6b7280]">{obra.code}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canManageProjects && obra.status !== 'FINISHED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Editar
            </Button>
          )}
          <Badge variant={
            obra.status === 'ACTIVE' ? 'success' :
            obra.status === 'FINISHED' ? 'secondary' :
            obra.status === 'PAUSED' ? 'warning' : 'default'
          }>
            {statusLabel(obra.status)}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="visao">
        <TabsList>
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="ponto">Ponto</TabsTrigger>
          {canViewProjectFinancials && (
            <TabsTrigger value="custo">Custo</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="visao">
          <div className={cn("grid gap-4", canViewProjectFinancials ? "sm:grid-cols-2" : "sm:grid-cols-1 max-w-md")}>
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Endereço</span>
                  <span className="text-sm font-medium text-[#111827]">{obra.address || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Cidade</span>
                  <span className="text-sm font-medium text-[#111827]">{obra.city || '-'}{obra.state ? ` - ${obra.state}` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Início</span>
                  <span className="text-sm font-medium text-[#111827]">{formatDate(obra.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Término Previsto</span>
                  <span className="text-sm font-medium text-[#111827]">{obra.endDate ? formatDate(obra.endDate) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6b7280]">Equipe</span>
                  <span className="font-mono-data text-sm font-medium text-[#111827]">{obra.employees?.length ?? 0} funcionários</span>
                </div>
              </CardContent>
            </Card>
            {canViewProjectFinancials && (
              <Card>
                <CardHeader>
                  <CardTitle>Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#6b7280]">Custo Orçado</span>
                    <span className="font-mono-data text-sm font-medium text-[#111827]">{formatCurrency(budget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#6b7280]">Custo Realizado</span>
                    <span className="font-mono-data text-sm font-medium text-[#111827]">{formatCurrency(real)}</span>
                  </div>
                  {budget > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-[#6b7280]">
                        <span>Progresso financeiro</span>
                        <span className="font-mono-data">{Math.round((real / budget) * 100)}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded bg-[#f9fafb]">
                        <div
                          className={cn(
                            'h-full rounded',
                            (real / budget) > 0.9 ? 'bg-[#dc2626]' : 'bg-[#16a34a]'
                          )}
                          style={{ width: `${Math.min(100, (real / budget) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Equipe Alocada</CardTitle>
              {supervisorCanAllocate && (
                <Button size="sm" onClick={() => setAllocateDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Alocar Funcionário
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obra.employees?.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell>{formatDate(emp.startDate)}</TableCell>
                      <TableCell>
                        <Badge variant={emp.endDate ? 'secondary' : 'success'}>
                          {emp.endDate ? 'Encerrado' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!emp.endDate && canDeallocate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeallocate(emp.id)}
                          >
                            <UserMinus className="mr-1 h-3 w-3" />
                            Desalocar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!obra.employees || obra.employees.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#9ca3af]">
                        Nenhum funcionário alocado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ponto">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Ponto</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obra.timeRecords?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>{formatDate(record.clockIn)}</TableCell>
                      <TableCell className="font-mono-data">
                        {new Date(record.clockIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-mono-data">
                        {record.clockOut
                          ? new Date(record.clockOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-mono-data">
                        {Math.floor(record.workedMinutes / 60)}h {record.workedMinutes % 60}m
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!obra.timeRecords || obra.timeRecords.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#9ca3af]">
                        Nenhum registro de ponto
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewProjectFinancials && <TabsContent value="custo">
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[#9ca3af]">Custo MO</p>
                  <p className="font-mono-data text-lg font-bold text-[#2563eb]">{formatCurrency(realMO)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[#9ca3af]">Despesas avulsas</p>
                  <p className="font-mono-data text-lg font-bold text-[#d97706]">{formatCurrency(realExtras)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[#9ca3af]">Total realizado</p>
                  <p className="font-mono-data text-lg font-bold text-[#111827]">{formatCurrency(real)}</p>
                  <p className="text-xs text-[#9ca3af]">Orçado: {formatCurrency(budget)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Custo Acumulado vs Orçamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3e6ed" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#e3e6ed" />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickFormatter={(val: number) =>
                          new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(val)
                        }
                        stroke="#e3e6ed"
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '6px', border: '1px solid #e3e6ed', backgroundColor: '#fff', color: '#111827' }} />
                      <Legend wrapperStyle={{ color: '#6b7280' }} />
                      <Bar dataKey="orcado" name="Orçado" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="mo" name="MO" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesas" fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expenses table */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Despesas Avulsas</CardTitle>
                {canManageProjects && (
                  <Button size="sm" onClick={() => { setEditingCost(null); setCostDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova despesa
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>NF</TableHead>
                      <TableHead>Valor</TableHead>
                      {canManageProjects && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectCosts?.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="font-mono-data text-xs">{formatDate(cost.date)}</TableCell>
                        <TableCell><CostCategoryBadge category={cost.category} /></TableCell>
                        <TableCell>{cost.description}</TableCell>
                        <TableCell className="font-mono-data text-xs">{cost.invoiceNumber || '-'}</TableCell>
                        <TableCell className="font-mono-data font-semibold">{formatCurrency(cost.amount)}</TableCell>
                        {canManageProjects && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCost({
                                    id: cost.id,
                                    category: cost.category,
                                    description: cost.description,
                                    amount: cost.amount,
                                    date: cost.date.split('T')[0],
                                    invoiceNumber: cost.invoiceNumber,
                                  })
                                  setCostDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#dc2626] hover:text-[#dc2626]"
                                onClick={async () => {
                                  if (confirm('Tem certeza que deseja excluir esta despesa?')) {
                                    try {
                                      await deleteCost.mutateAsync(cost.id)
                                      toast.success('Despesa excluída.')
                                    } catch { toast.error('Erro ao excluir.') }
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {(!projectCosts || projectCosts.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={canManageProjects ? 6 : 5} className="py-8 text-center text-[#9ca3af]">
                          Nenhuma despesa lançada para este projeto ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Cost Dialog (create or edit) */}
          <CostDialog
            open={costDialogOpen}
            editingCost={editingCost}
            onClose={() => { setCostDialogOpen(false); setEditingCost(null) }}
            onSave={async (body) => {
              try {
                if (editingCost) {
                  await updateCost.mutateAsync({ costId: editingCost.id, body })
                  toast.success('Despesa atualizada com sucesso.')
                } else {
                  await createCost.mutateAsync(body as { category: string; description: string; amount: number; date: string; invoiceNumber?: string })
                  toast.success('Despesa lançada com sucesso.')
                }
                setCostDialogOpen(false)
                setEditingCost(null)
              } catch { toast.error(editingCost ? 'Erro ao atualizar despesa.' : 'Erro ao lançar despesa.') }
            }}
            isPending={editingCost ? updateCost.isPending : createCost.isPending}
          />
        </TabsContent>}
      </Tabs>

      <Dialog open={allocateDialogOpen} onClose={() => setAllocateDialogOpen(false)}>
        <DialogTitle>Alocar Funcionário</DialogTitle>
        <div className="mt-4 space-y-4">
          <div>
            <label className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]">
              Funcionário
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 py-2 text-sm text-[#111827] focus:border-[#2563eb] focus:outline-none"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">Selecione um funcionário</option>
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.role}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Data de Início"
            type="date"
            value={allocateStartDate}
            onChange={(e) => setAllocateStartDate(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAllocateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAllocate} disabled={allocateEmployee.isPending}>
              {allocateEmployee.isPending ? 'Alocando...' : 'Alocar'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Project Dialog */}
      {editDialogOpen && (
        <EditObraInlineDialog
          obra={obra}
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
        />
      )}
    </div>
  )
}

function EditObraInlineDialog({
  obra,
  open,
  onClose,
}: {
  obra: { id: string; name: string; code: string; address: string | null; city: string | null; state: string | null; status: string; startDate: string; endDate: string | null; budgetedCost: number }
  open: boolean
  onClose: () => void
}) {
  const updateObra = useUpdateObra(obra.id)

  const [status, setStatus] = useState(obra.status)
  const [endDate, setEndDate] = useState(obra.endDate?.split('T')[0] ?? '')
  const [budgetedCost, setBudgetedCost] = useState(Number(obra.budgetedCost ?? 0))
  const [name, setName] = useState(obra.name)
  const [code, setCode] = useState(obra.code)
  const [address, setAddress] = useState(obra.address ?? '')
  const [city, setCity] = useState(obra.city ?? '')
  const [stateVal, setStateVal] = useState(obra.state ?? '')
  const [startDate, setStartDate] = useState(obra.startDate?.split('T')[0] ?? '')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false)

  async function handleSave() {
    if (status === 'FINISHED' && obra.status !== 'FINISHED') {
      setConfirmFinishOpen(true)
      return
    }
    await doSave()
  }

  async function doSave() {
    const body: Record<string, unknown> = {}
    if (status !== obra.status) body.status = status
    if (endDate !== (obra.endDate?.split('T')[0] ?? '')) body.endDate = endDate || undefined
    if (budgetedCost !== Number(obra.budgetedCost ?? 0)) body.budgetedCost = budgetedCost
    if (name !== obra.name) body.name = name
    if (code !== obra.code) body.code = code
    if (address !== (obra.address ?? '')) body.address = address || undefined
    if (city !== (obra.city ?? '')) body.city = city || undefined
    if (stateVal !== (obra.state ?? '')) body.state = stateVal || undefined
    if (startDate !== (obra.startDate?.split('T')[0] ?? '')) body.startDate = startDate

    if (Object.keys(body).length === 0) {
      onClose()
      return
    }

    try {
      await updateObra.mutateAsync(body)
      toast.success('Projeto atualizado com sucesso.')
      onClose()
    } catch {
      toast.error('Erro ao atualizar projeto. Tente novamente.')
    }
  }

  return (
    <>
      <Dialog open={open && !confirmFinishOpen} onClose={onClose} className="max-w-lg">
        <DialogTitle>Editar Projeto</DialogTitle>
        <DialogDescription>{obra.code} — {obra.name}</DialogDescription>
        <div className="mt-4 space-y-4">
          <Select
            label="Status"
            options={[
              { value: 'PLANNING', label: 'Planejamento' },
              { value: 'ACTIVE', label: 'Ativa' },
              { value: 'PAUSED', label: 'Pausada' },
              { value: 'FINISHED', label: 'Concluída' },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Input
            label="Data de Término"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div>
            <Input
              label="Orçamento (R$)"
              type="number"
              step="0.01"
              value={budgetedCost}
              onChange={(e) => setBudgetedCost(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-[#9ca3af]">Atualize quando houver aditivo contratual.</p>
          </div>

          <div className="rounded-lg border border-[#e3e6ed]">
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-[#6b7280] hover:bg-[#f9fafb] transition-colors rounded-lg"
            >
              <span>Dados gerais — nome, código e localização</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', detailsOpen && 'rotate-180')} />
            </button>
            {detailsOpen && (
              <div className="space-y-4 border-t border-[#e3e6ed] px-4 py-4">
                <p className="text-xs text-[#d97706]">Estes dados raramente mudam. Edite com cuidado.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Nome do Projeto" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input label="Código" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <Input label="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
                  <Input label="Estado" maxLength={2} value={stateVal} onChange={(e) => setStateVal(e.target.value)} />
                </div>
                <Input label="Data de Início" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateObra.isPending}>
              {updateObra.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={confirmFinishOpen} onClose={() => setConfirmFinishOpen(false)}>
        <DialogTitle>Encerrar projeto?</DialogTitle>
        <p className="mt-2 text-sm text-[#6b7280]">
          Ao marcar como Concluído, o projeto sairá da lista de ativos. Confirme para continuar.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmFinishOpen(false)}>Cancelar</Button>
          <Button onClick={async () => { setConfirmFinishOpen(false); await doSave() }} disabled={updateObra.isPending} className="bg-[#dc2626] hover:bg-[#b91c1c]">
            {updateObra.isPending ? 'Encerrando...' : 'Sim, encerrar'}
          </Button>
        </div>
      </Dialog>
    </>
  )
}

const COST_CATEGORIES = [
  { value: 'MATERIAL', label: 'Material', color: 'bg-blue-100 text-blue-800' },
  { value: 'EQUIPAMENTO', label: 'Equipamento', color: 'bg-purple-100 text-purple-800' },
  { value: 'TRANSPORTE', label: 'Transporte', color: 'bg-orange-100 text-orange-800' },
  { value: 'ALIMENTACAO', label: 'Alimentação', color: 'bg-green-100 text-green-800' },
  { value: 'HOSPEDAGEM', label: 'Hospedagem', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'OUTROS', label: 'Outros', color: 'bg-gray-100 text-gray-800' },
]

function CostCategoryBadge({ category }: { category: string }) {
  const cat = COST_CATEGORIES.find((c) => c.value === category)
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', cat?.color ?? 'bg-gray-100 text-gray-800')}>
      {cat?.label ?? category}
    </span>
  )
}

function CostDialog({
  open,
  editingCost,
  onClose,
  onSave,
  isPending,
}: {
  open: boolean
  editingCost: { id: string; category: string; description: string; amount: number; date: string; invoiceNumber: string | null } | null
  onClose: () => void
  onSave: (body: { category?: string; description?: string; amount?: number; date?: string; invoiceNumber?: string }) => void
  isPending: boolean
}) {
  const [category, setCategory] = useState(editingCost?.category ?? 'MATERIAL')
  const [description, setDescription] = useState(editingCost?.description ?? '')
  const [amount, setAmount] = useState(editingCost ? editingCost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
  const [date, setDate] = useState(() => {
    if (editingCost) return editingCost.date
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [invoiceNumber, setInvoiceNumber] = useState(editingCost?.invoiceNumber ?? '')

  // Sync when editingCost changes
  useState(() => {
    if (editingCost) {
      setCategory(editingCost.category)
      setDescription(editingCost.description)
      setAmount(String(editingCost.amount))
      setDate(editingCost.date)
      setInvoiceNumber(editingCost.invoiceNumber ?? '')
    } else {
      setCategory('MATERIAL')
      setDescription('')
      setAmount('')
      setInvoiceNumber('')
    }
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseMoneyInput(amount)
    if (!val || val <= 0 || !description || !date) return
    onSave({
      category,
      description,
      amount: val,
      date,
      invoiceNumber: invoiceNumber || undefined,
    })
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{editingCost ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Select
          label="Categoria"
          options={COST_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Input
          label="Descrição"
          placeholder="Ex: Cabo XLPE 35mm² — 500 metros"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Valor (R$)"
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            className="font-mono-data"
            value={amount}
            onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
          />
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Input
            label="Número da NF"
            placeholder="Opcional"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
          <p className="mt-1 text-xs text-[#9ca3af]">Facilita rastreamento contábil.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending || !description || !amount}>
            {isPending ? 'Salvando...' : editingCost ? 'Salvar alterações' : 'Salvar despesa'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
