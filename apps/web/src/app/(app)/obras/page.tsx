'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateObraSchema, type CreateObra, formatCurrency, statusLabel } from '@fieldis/shared'
import { toast } from 'sonner'
import { Search, Plus, Building2, Users, MapPin, Pencil, ChevronDown, AlertTriangle, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { useObras, useCreateObra, useUpdateObra } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'

interface ObraForEdit {
  id: string
  name: string
  code: string
  address: string | null
  city: string | null
  state: string | null
  status: string
  startDate: string
  endDate: string | null
  budgetedCost: number
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="mb-3 h-6 w-3/4" />
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="mb-4 h-4 w-2/3" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function ObrasPage() {
  const { canManageProjects, canViewProjectFinancials, isReadOnly, isSupervisor } = usePermissions()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingObra, setEditingObra] = useState<ObraForEdit | null>(null)
  const { data, isLoading } = useObras({ search: search || undefined })
  const createObra = useCreateObra()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateObra>({
    resolver: zodResolver(CreateObraSchema),
    defaultValues: {
      status: 'PLANNING',
      budgetedCost: 0,
    },
  })

  async function onSubmit(formData: CreateObra) {
    try {
      await createObra.mutateAsync(formData as unknown as Record<string, unknown>)
      toast.success('Projeto criado com sucesso!')
      setDialogOpen(false)
      reset()
    } catch {
      toast.error('Erro ao criar projeto.')
    }
  }

  function handleEditClick(e: React.MouseEvent, obra: ObraForEdit) {
    e.preventDefault()
    e.stopPropagation()
    setEditingObra(obra)
  }

  const obras = data?.data ?? []

  return (
    <div className="space-y-4">
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <Eye className="h-3.5 w-3.5 flex-shrink-0" />
          Modo somente leitura — você está acessando como Auditor.
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            className="h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] pl-10 pr-4 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManageProjects && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        )}
      </div>
      {isSupervisor && (
        <p className="text-xs text-[#9ca3af]">Exibindo apenas os projetos sob sua responsabilidade.</p>
      )}

      {isLoading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {obras.map((obra) => {
            const budget = Number(obra.budgetedCost ?? 0)
            const real = Number(obra.realCost ?? 0)
            const realMO = Number(obra.realCostMO ?? real)
            const realExtras = Number(obra.realCostExtras ?? 0)
            const progress = budget > 0
              ? Math.min(100, Math.round((real / budget) * 100))
              : 0

            return (
              <Link key={obra.id} href={`/obras/${obra.id}`}>
                <Card className="transition-[color,opacity] duration-150 hover:border-[#2563eb]/30">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[#111827]">{obra.name}</h3>
                        <p className="font-mono-data text-xs text-[#6b7280]">{obra.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManageProjects && obra.status !== 'FINISHED' && (
                          <button
                            onClick={(e) => handleEditClick(e, {
                              id: obra.id,
                              name: obra.name,
                              code: obra.code,
                              address: obra.address ?? null,
                              city: obra.city ?? null,
                              state: obra.state ?? null,
                              status: obra.status,
                              startDate: obra.startDate,
                              endDate: obra.endDate ?? null,
                              budgetedCost: budget,
                            })}
                            className="rounded p-1 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                            title="Editar projeto"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
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

                    {obra.city && (
                      <div className="mb-2 flex items-center gap-1 text-xs text-[#6b7280]">
                        <MapPin className="h-3 w-3" />
                        {obra.city}{obra.state ? ` - ${obra.state}` : ''}
                      </div>
                    )}

                    <div className="mb-3 flex items-center gap-1 text-xs text-[#6b7280]">
                      <Users className="h-3 w-3" />
                      <span className="font-mono-data">{obra.activeEmployees ?? 0}</span> funcionários
                    </div>

                    {canViewProjectFinancials && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-[#6b7280]">
                          <span title={`MO: ${formatCurrency(realMO)} | Despesas: ${formatCurrency(realExtras)}`}>
                            Realizado: <span className="font-mono-data">{formatCurrency(real)}</span>
                          </span>
                          <span>Orçado: <span className="font-mono-data">{formatCurrency(budget)}</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded bg-[#f9fafb]">
                          <div
                            className={cn(
                              'h-full rounded transition-all',
                              progress > 90 ? 'bg-[#dc2626]' : progress > 70 ? 'bg-[#d97706]' : 'bg-[#16a34a]'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="font-mono-data text-right text-xs text-[#9ca3af]">{progress}%</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {obras.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <Building2 className="mb-4 h-12 w-12 text-[#e3e6ed]" />
              <p className="text-[#6b7280]">{isSupervisor ? 'Nenhum projeto vinculado a você.' : 'Nenhum projeto cadastrado ainda.'}</p>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogTitle>Novo Projeto</DialogTitle>
        <DialogDescription>Cadastre um novo projeto.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome do Projeto"
              placeholder="Nome do projeto"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Código"
              placeholder="OBR-001"
              error={errors.code?.message}
              {...register('code')}
            />
          </div>
          <Input
            label="Endereço"
            placeholder="Endereço completo"
            {...register('address')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Cidade" placeholder="Cidade" {...register('city')} />
            <Input label="Estado" placeholder="UF" maxLength={2} {...register('state')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Data de Início"
              type="date"
              error={errors.startDate?.message}
              {...register('startDate')}
            />
            <Input
              label="Data de Término"
              type="date"
              {...register('endDate')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              options={[
                { value: 'PLANNING', label: 'Planejamento' },
                { value: 'ACTIVE', label: 'Ativa' },
                { value: 'PAUSED', label: 'Pausada' },
                { value: 'FINISHED', label: 'Finalizada' },
              ]}
              {...register('status')}
            />
            <Input
              label="Custo Orçado"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('budgetedCost', { valueAsNumber: true })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createObra.isPending}>
              {createObra.isPending ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Dialog */}
      {editingObra && (
        <EditObraDialog
          obra={editingObra}
          open={!!editingObra}
          onClose={() => setEditingObra(null)}
        />
      )}
    </div>
  )
}

function EditObraDialog({
  obra,
  open,
  onClose,
}: {
  obra: ObraForEdit
  open: boolean
  onClose: () => void
}) {
  const updateObra = useUpdateObra(obra.id)

  const [status, setStatus] = useState(obra.status)
  const [endDate, setEndDate] = useState(obra.endDate ?? '')
  const [budgetedCost, setBudgetedCost] = useState(obra.budgetedCost)
  const [name, setName] = useState(obra.name)
  const [code, setCode] = useState(obra.code)
  const [address, setAddress] = useState(obra.address ?? '')
  const [city, setCity] = useState(obra.city ?? '')
  const [state, setState] = useState(obra.state ?? '')
  const [startDate, setStartDate] = useState(obra.startDate?.split('T')[0] ?? '')

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false)

  useEffect(() => {
    setStatus(obra.status)
    setEndDate(obra.endDate?.split('T')[0] ?? '')
    setBudgetedCost(obra.budgetedCost)
    setName(obra.name)
    setCode(obra.code)
    setAddress(obra.address ?? '')
    setCity(obra.city ?? '')
    setState(obra.state ?? '')
    setStartDate(obra.startDate?.split('T')[0] ?? '')
    setDetailsOpen(false)
  }, [obra])

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
    if (budgetedCost !== obra.budgetedCost) body.budgetedCost = budgetedCost
    if (name !== obra.name) body.name = name
    if (code !== obra.code) body.code = code
    if (address !== (obra.address ?? '')) body.address = address || undefined
    if (city !== (obra.city ?? '')) body.city = city || undefined
    if (state !== (obra.state ?? '')) body.state = state || undefined
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

  async function handleConfirmFinish() {
    setConfirmFinishOpen(false)
    await doSave()
  }

  const isFinished = obra.status === 'FINISHED'

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
            disabled={isFinished}
          />

          <Input
            label="Data de Término"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isFinished}
          />

          <div>
            <Input
              label="Orçamento (R$)"
              type="number"
              step="0.01"
              value={budgetedCost}
              onChange={(e) => setBudgetedCost(Number(e.target.value))}
              disabled={isFinished}
            />
            <p className="mt-1 text-xs text-[#9ca3af]">Atualize quando houver aditivo contratual.</p>
          </div>

          {/* Accordion: general data */}
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
                  <Input
                    label="Nome do Projeto"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isFinished}
                  />
                  <Input
                    label="Código"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isFinished}
                  />
                </div>
                <Input
                  label="Endereço"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isFinished}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isFinished}
                  />
                  <Input
                    label="Estado"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={isFinished}
                  />
                </div>
                <Input
                  label="Data de Início"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isFinished}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateObra.isPending || isFinished}
            >
              {updateObra.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm finish dialog */}
      <Dialog open={confirmFinishOpen} onClose={() => setConfirmFinishOpen(false)}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#fef2f2]">
            <AlertTriangle className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <DialogTitle>Encerrar projeto?</DialogTitle>
            <p className="mt-2 text-sm text-[#6b7280]">
              Ao marcar como Concluído, o projeto sairá da lista de ativos.
              Confirme para continuar.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmFinishOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmFinish}
            disabled={updateObra.isPending}
            className="bg-[#dc2626] hover:bg-[#b91c1c]"
          >
            {updateObra.isPending ? 'Encerrando...' : 'Sim, encerrar'}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
