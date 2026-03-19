'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreatePayrollPeriodSchema, type CreatePayrollPeriod, formatCurrency, statusLabel } from '@fieldis/shared'
import { toast } from 'sonner'
import { FileSpreadsheet, Plus, Calculator, Lock, Download, Eye, CheckCircle, AlertTriangle, Pencil, Send, Printer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  usePayrollPeriods,
  usePayrollPeriod,
  useCreatePayrollPeriod,
  useCalculatePayroll,
  useClosePayroll,
  usePayrollItem,
  useAdjustPayrollItem,
  useAdvances,
  useApproveAdvance,
  useRejectAdvance,
  useMonthlyPontoSummary,
} from '@/hooks/useApi'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function FolhaPage() {
  const { canCalculatePayroll, canClosePayroll, canApproveAdvances, isReadOnly } = usePermissions()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [payslipEmployee, setPayslipEmployee] = useState<{ periodId: string; employeeId: string } | null>(null)
  const [calcResultOpen, setCalcResultOpen] = useState(false)
  const [calcResult, setCalcResult] = useState<{
    items: Array<{ employeeId: string; employeeName: string; netSalary: number }>
    skipped?: Array<{ employeeId: string; employeeName: string; reason: string }>
  } | null>(null)
  const [preCalcWarningOpen, setPreCalcWarningOpen] = useState(false)
  const [preCalcMissing, setPreCalcMissing] = useState<string[]>([])

  const { data: periods, isLoading } = usePayrollPeriods()
  const { data: selectedPeriod, isLoading: periodLoading } = usePayrollPeriod(selectedPeriodId ?? '')
  const createPeriod = useCreatePayrollPeriod()
  const calculatePayroll = useCalculatePayroll()
  const { data: pendingAdvances } = useAdvances({ status: 'PENDING' })
  const approveAdv = useApproveAdvance()
  const rejectAdv = useRejectAdvance()
  const pendingList = pendingAdvances?.data ?? []
  const closePayroll = useClosePayroll()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePayrollPeriod>({
    resolver: zodResolver(CreatePayrollPeriodSchema),
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
  })

  async function onSubmit(data: CreatePayrollPeriod) {
    try {
      await createPeriod.mutateAsync(data)
      toast.success('Período criado com sucesso!')
      setDialogOpen(false)
      reset()
    } catch {
      toast.error('Erro ao criar período.')
    }
  }

  async function handlePreCalculateCheck(periodId: string) {
    if (!selectedPeriod) return
    // Check if there are employees without any time records this month
    // We'll use the first active obra or skip the check if no obra is clearly the main one
    try {
      const { data: allObras } = await api.get('/obras', { params: { status: 'ACTIVE', limit: 100 } })
      const obraIds = (allObras?.data ?? []).map((o: { id: string }) => o.id)

      // Fetch summaries for all active projects
      const allEmployeesWithPonto = new Set<string>()
      for (const obraId of obraIds) {
        const { data: summary } = await api.get('/ponto/resumo', {
          params: { obraId, month: selectedPeriod.month, year: selectedPeriod.year },
        })
        for (const row of summary?.data ?? []) {
          allEmployeesWithPonto.add(row.employeeId)
        }
      }

      // Get active employees
      const { data: empData } = await api.get('/employees', { params: { status: 'ACTIVE', limit: 200 } })
      const activeEmployees = empData?.data ?? []
      const missing = activeEmployees
        .filter((e: { id: string }) => !allEmployeesWithPonto.has(e.id))
        .map((e: { name: string }) => e.name) as string[]

      if (missing.length > 0) {
        setPreCalcMissing(missing)
        setPreCalcWarningOpen(true)
        return
      }
    } catch {
      // If pre-check fails, proceed to calculate anyway
    }
    await doCalculate(periodId)
  }

  async function doCalculate(periodId: string) {
    try {
      const result = await calculatePayroll.mutateAsync(periodId)
      setCalcResult({ items: result.items, skipped: result.skipped })
      setCalcResultOpen(true)
    } catch {
      toast.error('Erro ao calcular folha.')
    }
  }

  async function handleExportCSV(periodId: string) {
    try {
      const response = await api.get(`/folha/periodos/${periodId}/export`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `folha-${selectedPeriod?.month}-${selectedPeriod?.year}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar CSV.')
    }
  }

  async function handleClose(periodId: string) {
    try {
      await closePayroll.mutateAsync(periodId)
      toast.success(
        selectedPeriod?.status === 'OPEN'
          ? 'Folha enviada para revisão.'
          : 'Folha fechada com sucesso!'
      )
    } catch {
      toast.error('Erro ao fechar folha.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const periodIsEditable = selectedPeriod?.status === 'OPEN' || selectedPeriod?.status === 'REVIEW'

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <Eye className="h-3.5 w-3.5 flex-shrink-0" />
          Modo somente leitura — você está acessando como Auditor.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-[#2563eb]" />
          <h2 className="text-lg font-semibold text-[#111827]">Folha de Pagamento</h2>
        </div>
        {canCalculatePayroll && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Período
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-1">
          {periods?.map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriodId(period.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border p-4 text-left transition-[color,opacity] duration-150',
                selectedPeriodId === period.id
                  ? 'border-[#2563eb] bg-[rgba(37,99,235,0.06)]'
                  : 'border-[#e3e6ed] bg-[#ffffff] hover:bg-[#f9fafb]'
              )}
            >
              <div>
                <p className="font-medium text-[#111827]">
                  {monthNames[period.month - 1]} {period.year}
                </p>
                <p className="font-mono-data text-sm text-[#6b7280]">
                  Líquido: {formatCurrency(period.totalNet)}
                </p>
              </div>
              <Badge variant={
                period.status === 'CLOSED' ? 'success' :
                period.status === 'REVIEW' ? 'warning' : 'default'
              }>
                {statusLabel(period.status)}
              </Badge>
            </button>
          ))}

          {(!periods || periods.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e3e6ed] py-12">
              <FileSpreadsheet className="mb-2 h-8 w-8 text-[#e3e6ed]" />
              <p className="text-sm text-[#9ca3af]">Nenhum período criado ainda.</p>
              {canCalculatePayroll && <p className="mt-1 text-xs text-[#9ca3af]">Clique em &quot;Novo Período&quot; para começar.</p>}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedPeriodId ? (
            periodLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : selectedPeriod ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>
                    {monthNames[selectedPeriod.month - 1]} {selectedPeriod.year}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCSV(selectedPeriod.id)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </Button>
                    {canCalculatePayroll && periodIsEditable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreCalculateCheck(selectedPeriod.id)}
                        disabled={calculatePayroll.isPending}
                      >
                        <Calculator className="mr-2 h-4 w-4" />
                        {calculatePayroll.isPending ? 'Calculando...' : 'Calcular Folha'}
                      </Button>
                    )}
                    {canClosePayroll && selectedPeriod.status === 'OPEN' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClose(selectedPeriod.id)}
                        disabled={closePayroll.isPending}
                        title="Envia para o financeiro conferir antes de fechar."
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {closePayroll.isPending ? 'Enviando...' : 'Enviar para Revisão'}
                      </Button>
                    )}
                    {canClosePayroll && selectedPeriod.status === 'REVIEW' && (
                      <Button
                        size="sm"
                        onClick={() => handleClose(selectedPeriod.id)}
                        disabled={closePayroll.isPending}
                        title="Encerra o período. Não poderá ser alterado após fechar."
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        {closePayroll.isPending ? 'Fechando...' : 'Fechar Folha'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-2 gap-4 rounded-md border border-[#e3e6ed] bg-[#f4f5f7] p-4 sm:grid-cols-5">
                    <div>
                      <p className="font-mono-data text-[11px] uppercase text-[#9ca3af]">Base</p>
                      <p className="font-mono-data text-sm font-semibold text-[#111827]">{formatCurrency(selectedPeriod.totalBase)}</p>
                    </div>
                    <div>
                      <p className="font-mono-data text-[11px] uppercase text-[#9ca3af]">H. Extras</p>
                      <p className="font-mono-data text-sm font-semibold text-[#111827]">{formatCurrency(selectedPeriod.totalOvertime)}</p>
                    </div>
                    <div>
                      <p className="font-mono-data text-[11px] uppercase text-[#9ca3af]">Adições</p>
                      <p className="font-mono-data text-sm font-semibold text-[#16a34a]">{formatCurrency(selectedPeriod.totalAdditions)}</p>
                    </div>
                    <div>
                      <p className="font-mono-data text-[11px] uppercase text-[#9ca3af]">Descontos</p>
                      <p className="font-mono-data text-sm font-semibold text-[#dc2626]">{formatCurrency(selectedPeriod.totalDeductions)}</p>
                    </div>
                    <div>
                      <p className="font-mono-data text-[11px] uppercase text-[#9ca3af]">Líquido</p>
                      <p className="font-mono-data text-sm font-bold text-[#111827]">{formatCurrency(selectedPeriod.totalNet)}</p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Salário Base</TableHead>
                        <TableHead>H. Extras</TableHead>
                        <TableHead>Adições</TableHead>
                        <TableHead>Descontos</TableHead>
                        <TableHead>Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPeriod.items?.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-[#f9fafb]"
                          onClick={() => setPayslipEmployee({ periodId: selectedPeriod.id, employeeId: item.employeeId })}
                        >
                          <TableCell className="font-medium text-[#2563eb]">{item.employeeName}</TableCell>
                          <TableCell className="font-mono-data">{formatCurrency(item.baseSalary)}</TableCell>
                          <TableCell className="font-mono-data">{formatCurrency(item.overtime)}</TableCell>
                          <TableCell className="font-mono-data text-[#16a34a]">{formatCurrency(item.additions)}</TableCell>
                          <TableCell className="font-mono-data text-[#dc2626]">{formatCurrency(item.deductions)}</TableCell>
                          <TableCell className="font-mono-data font-semibold">{formatCurrency(item.netSalary)}</TableCell>
                        </TableRow>
                      ))}
                      {(!selectedPeriod.items || selectedPeriod.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-[#9ca3af]">
                            {canCalculatePayroll
                              ? 'Clique em "Calcular Folha" para gerar os holerites deste período.'
                              : 'Nenhum holerite gerado neste período ainda.'
                            }
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e3e6ed] py-20">
              <FileSpreadsheet className="mb-2 h-8 w-8 text-[#e3e6ed]" />
              <p className="text-sm text-[#9ca3af]">Selecione um período para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Advances — visible for RH_MANAGER and COMPANY_ADMIN */}
      {canApproveAdvances && pendingList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Adiantamentos aguardando aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Desconto em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.map((adv) => (
                  <TableRow key={adv.id}>
                    <TableCell className="font-medium">{adv.employeeName}</TableCell>
                    <TableCell className="font-mono-data font-semibold">{formatCurrency(adv.amount)}</TableCell>
                    <TableCell>{adv.reason || '-'}</TableCell>
                    <TableCell className="font-mono-data">
                      {adv.discountMonth && adv.discountYear
                        ? `${String(adv.discountMonth).padStart(2, '0')}/${adv.discountYear}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try { await approveAdv.mutateAsync(adv.id); toast.success('Adiantamento aprovado.') }
                            catch { toast.error('Erro ao aprovar.') }
                          }}
                          disabled={approveAdv.isPending}
                          className="text-[#16a34a] hover:bg-[#16a34a]/10 hover:text-[#16a34a]"
                        >
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try { await rejectAdv.mutateAsync(adv.id); toast.success('Adiantamento rejeitado.') }
                            catch { toast.error('Erro ao rejeitar.') }
                          }}
                          disabled={rejectAdv.isPending}
                          className="text-[#dc2626] hover:bg-[#dc2626]/10 hover:text-[#dc2626]"
                        >
                          Rejeitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Period Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Novo Período</DialogTitle>
        <DialogDescription>Crie um novo período de folha de pagamento.</DialogDescription>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Mês"
              type="number"
              min={1}
              max={12}
              error={errors.month?.message}
              {...register('month', { valueAsNumber: true })}
            />
            <Input
              label="Ano"
              type="number"
              min={2020}
              error={errors.year?.message}
              {...register('year', { valueAsNumber: true })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPeriod.isPending}>
              {createPeriod.isPending ? 'Criando...' : 'Criar Período'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Calculate Result Dialog */}
      <Dialog open={calcResultOpen} onClose={() => setCalcResultOpen(false)} className="max-w-md">
        <div className="flex items-start gap-3">
          {calcResult?.skipped && calcResult.skipped.length > 0 ? (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#dcfce7]">
              <CheckCircle className="h-5 w-5 text-[#16a34a]" />
            </div>
          )}
          <div className="flex-1">
            <DialogTitle>Cálculo concluído</DialogTitle>
            <p className="mt-2 text-sm text-[#6b7280]">
              {calcResult?.items.length ?? 0} funcionário(s) calculado(s) com sucesso.
              {calcResult?.skipped && calcResult.skipped.length > 0 && (
                <> {calcResult.skipped.length} ignorado(s):</>
              )}
            </p>
            {calcResult?.skipped && calcResult.skipped.length > 0 && (
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-3">
                {calcResult.skipped.map((s) => (
                  <p key={s.employeeId} className="text-sm text-amber-800">
                    {s.employeeName} — {s.reason}
                  </p>
                ))}
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Corrija os dados e recalcule para incluí-los.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {calcResult?.skipped && calcResult.skipped.length > 0 && selectedPeriodId && (
            <Button
              variant="outline"
              onClick={() => {
                setCalcResultOpen(false)
                if (selectedPeriodId) doCalculate(selectedPeriodId)
              }}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Recalcular
            </Button>
          )}
          <Button onClick={() => setCalcResultOpen(false)}>Fechar</Button>
        </div>
      </Dialog>

      {/* Pre-calculate warning dialog */}
      <Dialog open={preCalcWarningOpen} onClose={() => setPreCalcWarningOpen(false)} className="max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <DialogTitle>Atenção antes de calcular</DialogTitle>
            <p className="mt-2 text-sm text-[#6b7280]">
              Os funcionários abaixo não têm registros de ponto neste mês.
              Se calculados, terão folha zerada ou serão ignorados.
            </p>
            <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-3">
              {preCalcMissing.map((name) => (
                <p key={name} className="text-sm text-amber-800">{name}</p>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPreCalcWarningOpen(false)}>
            Cancelar — verificar o ponto
          </Button>
          <Button
            onClick={() => {
              setPreCalcWarningOpen(false)
              if (selectedPeriodId) doCalculate(selectedPeriodId)
            }}
          >
            Calcular mesmo assim
          </Button>
        </div>
      </Dialog>

      {/* Payslip Detail Dialog */}
      {payslipEmployee && (
        <PayslipDialog
          periodId={payslipEmployee.periodId}
          employeeId={payslipEmployee.employeeId}
          periodStatus={selectedPeriod?.status ?? ''}
          onClose={() => setPayslipEmployee(null)}
        />
      )}
    </div>
  )
}

function PayslipDialog({
  periodId,
  employeeId,
  periodStatus,
  onClose,
}: {
  periodId: string
  employeeId: string
  periodStatus: string
  onClose: () => void
}) {
  const { canCalculatePayroll } = usePermissions()
  const { data: item, isLoading } = usePayrollItem(periodId, employeeId)
  const [editing, setEditing] = useState(false)

  const canEdit = canCalculatePayroll && (periodStatus === 'OPEN' || periodStatus === 'REVIEW')

  if (isLoading) {
    return (
      <Dialog open onClose={onClose} className="max-w-lg">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </Dialog>
    )
  }

  if (!item) return null

  const gross = item.baseSalary + item.overtimeValue + item.nightShiftValue + item.insalubrityValue + item.periculosityValue + item.dsrValue

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <DialogTitle>
        {item.employee.name}
      </DialogTitle>
      <DialogDescription>
        {item.employee.role} — {monthNames[item.period.month - 1]} {item.period.year}
        {item.obra && <> — {item.obra.name}</>}
      </DialogDescription>

      {editing ? (
        <PayslipEditForm item={item} periodId={periodId} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      ) : (
        <>
          <div className="mt-5 space-y-4">
            {/* Proventos */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#9ca3af]">Proventos</p>
              <div className="space-y-1.5">
                <PayslipLine label="Salário base" value={item.baseSalary} />
                {item.overtimeValue > 0 && (
                  <PayslipLine label={`Horas extras (${item.overtimeHours.toFixed(1)}h)`} value={item.overtimeValue} />
                )}
                {item.nightShiftValue > 0 && <PayslipLine label="Adicional noturno" value={item.nightShiftValue} />}
                {item.insalubrityValue > 0 && <PayslipLine label="Insalubridade" value={item.insalubrityValue} />}
                {item.periculosityValue > 0 && <PayslipLine label="Periculosidade" value={item.periculosityValue} />}
                {item.dsrValue > 0 && <PayslipLine label="DSR" value={item.dsrValue} />}
                <div className="flex justify-between border-t border-[#e3e6ed] pt-1.5">
                  <span className="text-sm font-medium text-[#111827]">Total bruto</span>
                  <span className="font-mono-data text-sm font-semibold text-[#111827]">{formatCurrency(gross)}</span>
                </div>
              </div>
            </div>

            {/* Descontos */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#9ca3af]">Descontos</p>
              <div className="space-y-1.5">
                {item.inssDiscount > 0 && <PayslipLine label="INSS" value={-item.inssDiscount} negative />}
                {item.irrfDiscount > 0 && <PayslipLine label="IRRF" value={-item.irrfDiscount} negative />}
                {item.vtDiscount > 0 && <PayslipLine label="Vale-transporte" value={-item.vtDiscount} negative />}
                {item.advancesDiscount > 0 && <PayslipLine label="Adiantamentos" value={-item.advancesDiscount} negative />}
                {item.absencesDiscount > 0 && <PayslipLine label="Faltas" value={-item.absencesDiscount} negative />}
                {item.alimonyDiscount > 0 && <PayslipLine label="Pensão alimentícia" value={-item.alimonyDiscount} negative />}
                <div className="flex justify-between border-t border-[#e3e6ed] pt-1.5">
                  <span className="text-sm font-medium text-[#111827]">Total descontos</span>
                  <span className="font-mono-data text-sm font-semibold text-[#dc2626]">{formatCurrency(-item.totalDiscounts)}</span>
                </div>
              </div>
            </div>

            {/* Resultado */}
            <div className="rounded-md border border-[#e3e6ed] bg-[#f4f5f7] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#111827]">Salário líquido</span>
                <span className="font-mono-data text-lg font-bold text-[#111827]">{formatCurrency(item.netSalary)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-[#9ca3af]">
                <span>FGTS (custo empresa)</span>
                <span className="font-mono-data">{formatCurrency(item.fgtsValue)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/folha/holerite/${periodId}/${employeeId}`, '_blank')}
            >
              <Printer className="mr-1 h-3 w-3" />
              Abrir para imprimir
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3 w-3" />
                Editar
              </Button>
            )}
            <Button size="sm" onClick={onClose}>Fechar</Button>
          </div>
        </>
      )}
    </Dialog>
  )
}

function PayslipLine({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-[#6b7280]">{label}</span>
      <span className={cn('font-mono-data text-sm', negative ? 'text-[#dc2626]' : 'text-[#111827]')}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function PayslipEditForm({
  item,
  periodId,
  onCancel,
  onSaved,
}: {
  item: {
    employeeId: string
    baseSalary: number
    overtimeValue: number
    nightShiftValue: number
    insalubrityValue: number
    periculosityValue: number
    dsrValue: number
    inssDiscount: number
    irrfDiscount: number
    vtDiscount: number
    advancesDiscount: number
    absencesDiscount: number
    alimonyDiscount: number
  }
  periodId: string
  onCancel: () => void
  onSaved: () => void
}) {
  const adjustPayroll = useAdjustPayrollItem()

  const [overtimeValue, setOvertimeValue] = useState(item.overtimeValue)
  const [nightShiftValue, setNightShiftValue] = useState(item.nightShiftValue)
  const [insalubrityValue, setInsalubrityValue] = useState(item.insalubrityValue)
  const [periculosityValue, setPericulosityValue] = useState(item.periculosityValue)
  const [dsrValue, setDsrValue] = useState(item.dsrValue)
  const [vtDiscount, setVtDiscount] = useState(item.vtDiscount)
  const [advancesDiscount, setAdvancesDiscount] = useState(item.advancesDiscount)
  const [absencesDiscount, setAbsencesDiscount] = useState(item.absencesDiscount)
  const [alimonyDiscount, setAlimonyDiscount] = useState(item.alimonyDiscount)

  const liveGross = useMemo(() =>
    item.baseSalary + overtimeValue + nightShiftValue + insalubrityValue + periculosityValue + dsrValue,
    [item.baseSalary, overtimeValue, nightShiftValue, insalubrityValue, periculosityValue, dsrValue]
  )

  const liveDiscounts = useMemo(() =>
    item.inssDiscount + item.irrfDiscount + vtDiscount + advancesDiscount + absencesDiscount + alimonyDiscount,
    [item.inssDiscount, item.irrfDiscount, vtDiscount, advancesDiscount, absencesDiscount, alimonyDiscount]
  )

  const liveNet = useMemo(() =>
    Math.round((liveGross - liveDiscounts) * 100) / 100,
    [liveGross, liveDiscounts]
  )

  async function handleSave() {
    const body: Record<string, number> = {}
    if (overtimeValue !== item.overtimeValue) body.overtimeValue = overtimeValue
    if (nightShiftValue !== item.nightShiftValue) body.nightShiftValue = nightShiftValue
    if (insalubrityValue !== item.insalubrityValue) body.insalubrityValue = insalubrityValue
    if (periculosityValue !== item.periculosityValue) body.periculosityValue = periculosityValue
    if (dsrValue !== item.dsrValue) body.dsrValue = dsrValue
    if (vtDiscount !== item.vtDiscount) body.vtDiscount = vtDiscount
    if (advancesDiscount !== item.advancesDiscount) body.advancesDiscount = advancesDiscount
    if (absencesDiscount !== item.absencesDiscount) body.absencesDiscount = absencesDiscount
    if (alimonyDiscount !== item.alimonyDiscount) body.alimonyDiscount = alimonyDiscount

    if (Object.keys(body).length === 0) {
      onCancel()
      return
    }

    try {
      await adjustPayroll.mutateAsync({ periodId, employeeId: item.employeeId, body })
      toast.success('Ajuste salvo com sucesso.')
      onSaved()
    } catch {
      toast.error('Erro ao salvar ajuste.')
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-[#9ca3af]">Proventos</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Horas extras (R$)" value={overtimeValue} onChange={setOvertimeValue} />
        <NumberField label="Adicional noturno (R$)" value={nightShiftValue} onChange={setNightShiftValue} />
        <NumberField label="Insalubridade (R$)" value={insalubrityValue} onChange={setInsalubrityValue} />
        <NumberField label="Periculosidade (R$)" value={periculosityValue} onChange={setPericulosityValue} />
        <NumberField label="DSR (R$)" value={dsrValue} onChange={setDsrValue} />
      </div>

      <p className="text-xs font-medium uppercase tracking-wider text-[#9ca3af]">Descontos</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Vale-transporte (R$)" value={vtDiscount} onChange={setVtDiscount} />
        <NumberField label="Adiantamentos (R$)" value={advancesDiscount} onChange={setAdvancesDiscount} />
        <NumberField label="Faltas (R$)" value={absencesDiscount} onChange={setAbsencesDiscount} />
        <NumberField label="Pensão alimentícia (R$)" value={alimonyDiscount} onChange={setAlimonyDiscount} />
      </div>

      <div className="rounded-md border border-[#2563eb]/20 bg-[#eff6ff] p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#1e40af]">Novo líquido estimado</span>
          <span className="font-mono-data text-lg font-bold text-[#1e40af]">{formatCurrency(liveNet)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={adjustPayroll.isPending}>
          {adjustPayroll.isPending ? 'Salvando...' : 'Salvar ajuste'}
        </Button>
      </div>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="font-mono-data mb-1 block text-[11px] uppercase tracking-wider text-[#6b7280]">{label}</label>
      <input
        type="number"
        step="0.01"
        className="flex h-9 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 py-1 font-mono-data text-sm text-[#111827] focus:border-[#2563eb] focus:outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}
