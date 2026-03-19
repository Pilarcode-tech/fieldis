'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateEmployeeSchema, type UpdateEmployee, formatCPF, formatCurrency, formatDate, statusLabel } from '@fieldis/shared'
import { toast } from 'sonner'
import { ArrowLeft, FileCheck, FileX, Upload, Eye, ChevronDown, ExternalLink, Download, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Dialog, DialogTitle } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployee, useUpdateEmployee, usePontoByEmployee, useEmployeePayslips } from '@/hooks/useApi'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { getSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

// Map display labels to database enum values
const DOC_TYPES: Array<{ label: string; enumValue: string; hasExpiry: boolean }> = [
  { label: 'RG', enumValue: 'RG', hasExpiry: false },
  { label: 'CPF', enumValue: 'CPF', hasExpiry: false },
  { label: 'CTPS', enumValue: 'CTPS', hasExpiry: false },
  { label: 'PIS/PASEP', enumValue: 'PIS', hasExpiry: false },
  { label: 'CNH', enumValue: 'CNH', hasExpiry: true },
  { label: 'Comprovante Residência', enumValue: 'COMPROVANTE_RESIDENCIA', hasExpiry: false },
  { label: 'Contrato de Trabalho', enumValue: 'CONTRATO_TRABALHO', hasExpiry: false },
  { label: 'ASO', enumValue: 'ASO', hasExpiry: true },
  { label: 'NR-06 (EPI)', enumValue: 'TERMO_EPI', hasExpiry: true },
  { label: 'NR-10', enumValue: 'NR_10', hasExpiry: true },
  { label: 'NR-33', enumValue: 'NR_33', hasExpiry: true },
  { label: 'NR-35', enumValue: 'NR_35', hasExpiry: true },
]

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function FuncionarioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { canManageEmployees, canUploadDocuments, isReadOnly, isEmployee } = usePermissions()
  const canViewSensitiveData = canManageEmployees || isReadOnly
  const canViewPayslips = canManageEmployees || isReadOnly || isEmployee
  const id = params.id as string
  const { data: employee, isLoading, refetch } = useEmployee(id)
  const updateEmployee = useUpdateEmployee(id)

  // Ponto state
  const [pontoMonth, setPontoMonth] = useState(() => new Date().getMonth() + 1)
  const [pontoYear, setPontoYear] = useState(() => new Date().getFullYear())
  const { data: pontoRecords, isLoading: pontoLoading } = usePontoByEmployee(id, pontoMonth, pontoYear)

  // Payslips
  const { data: payslips, isLoading: payslipsLoading } = useEmployeePayslips(id)

  // Upload state
  const [uploadDocType, setUploadDocType] = useState<{ label: string; enumValue: string; hasExpiry: boolean } | null>(null)
  const [uploadExpiry, setUploadExpiry] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)

  // Accordeon states
  const [contractOpen, setContractOpen] = useState(false)
  const [remunerationOpen, setRemunerationOpen] = useState(false)
  const [benefitsOpen, setBenefitsOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateEmployee>({
    resolver: zodResolver(UpdateEmployeeSchema),
    values: employee ? {
      name: employee.name,
      cpf: employee.cpf,
      rg: employee.rg ?? undefined,
      birthDate: employee.birthDate?.split('T')[0] ?? undefined,
      phone: employee.phone ?? undefined,
      email: employee.email ?? undefined,
      address: employee.address ?? undefined,
      role: employee.role,
      department: employee.department ?? undefined,
      hireDate: employee.hireDate?.split('T')[0],
      baseSalary: employee.baseSalary,
      salaryType: employee.salaryType as 'MONTHLY' | 'HOURLY' | 'DAILY',
      hoursPerDay: employee.hoursPerDay,
      pis: employee.pis ?? undefined,
      ctpsNumber: employee.ctpsNumber ?? undefined,
      hasInsalubrity: employee.hasInsalubrity,
      insalubrityGrade: employee.insalubrityGrade as 'MINIMO' | 'MEDIO' | 'MAXIMO' | undefined,
      hasPericulosity: employee.hasPericulosity,
      hasNightShift: employee.hasNightShift,
      hasVT: employee.hasVT,
      hasVA: employee.hasVA,
      vaAmount: employee.vaAmount,
      dependentsCount: employee.dependentsCount,
      hasAlimony: employee.hasAlimony,
      alimonyAmount: employee.alimonyAmount,
      bankCode: employee.bankCode ?? undefined,
      bankAgency: employee.bankAgency ?? undefined,
      bankAccount: employee.bankAccount ?? undefined,
      notes: employee.notes ?? undefined,
    } : undefined,
  })

  const watchInsalubrity = watch('hasInsalubrity')
  const watchVA = watch('hasVA')
  const watchAlimony = watch('hasAlimony')
  const watchCpf = watch('cpf') ?? ''

  async function onSubmit(data: UpdateEmployee) {
    try {
      await updateEmployee.mutateAsync(data as unknown as Record<string, unknown>)
      toast.success('Dados atualizados com sucesso!')
    } catch {
      toast.error('Erro ao atualizar dados.')
    }
  }

  async function handleUpload(file: File) {
    if (!uploadDocType) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo permitido: 10 MB.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      toast.error('Formato não suportado. Use PDF, JPG ou PNG.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', uploadDocType.enumValue)
      if (uploadExpiry) formData.append('expiresAt', uploadExpiry)

      await api.post(`/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Documento enviado com sucesso.')
      setUploadDocType(null)
      setUploadExpiry('')
      refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Erro ao enviar documento.')
    } finally {
      setUploading(false)
    }
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

  async function handleViewDoc(docId: string, fileUrl: string) {
    setLoadingDoc(docId)
    try {
      const session = await getSession()
      const res = await fetch(apiBaseUrl + fileUrl, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch {
      toast.error('Erro ao abrir documento. Tente novamente.')
    } finally {
      setLoadingDoc(null)
    }
  }

  async function handleDownloadDoc(docId: string, fileUrl: string, fileName: string) {
    setLoadingDoc(docId)
    try {
      const session = await getSession()
      const res = await fetch(apiBaseUrl + fileUrl, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao baixar documento. Tente novamente.')
    } finally {
      setLoadingDoc(null)
    }
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <DetailSkeleton />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[#6b7280]">Funcionário não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/funcionarios')}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <Eye className="h-3.5 w-3.5 flex-shrink-0" />
          Modo somente leitura — você está acessando como Auditor.
        </div>
      )}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/funcionarios')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">{employee.name}</h2>
          <p className="text-sm text-[#6b7280]">{employee.role}{canViewSensitiveData ? <> - <span className="font-mono-data">{formatCPF(employee.cpf)}</span></> : ''}</p>
        </div>
        <Badge className="ml-auto" variant={
          employee.status === 'ACTIVE' ? 'success' :
          employee.status === 'TERMINATED' ? 'destructive' :
          employee.status === 'VACATION' ? 'default' :
          'warning'
        }>
          {statusLabel(employee.status)}
        </Badge>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="obras">Histórico de Projetos</TabsTrigger>
          <TabsTrigger value="ponto">Ponto</TabsTrigger>
          {canViewPayslips && <TabsTrigger value="holerites">Holerites</TabsTrigger>}
        </TabsList>

        {/* ===== DADOS PESSOAIS ===== */}
        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <fieldset disabled={!canManageEmployees}>
                {/* Personal */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Nome Completo" error={errors.name?.message} {...register('name')} />
                  {canViewSensitiveData && (
                    <div>
                      <label className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]">CPF</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 py-2 font-mono-data text-sm text-[#111827] focus:border-[#2563eb] focus:outline-none disabled:opacity-50"
                        value={formatCPF(watchCpf)}
                        onChange={(e) => setValue('cpf', e.target.value.replace(/\D/g, ''), { shouldDirty: true })}
                        maxLength={14}
                        disabled={!canManageEmployees}
                      />
                      {errors.cpf?.message && <p className="mt-1 text-xs text-[#dc2626]">{errors.cpf.message}</p>}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {canViewSensitiveData && <Input label="RG" {...register('rg')} />}
                  <Input label="Data de Nascimento" type="date" {...register('birthDate')} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Telefone" {...register('phone')} />
                  <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
                </div>
                <Input label="Endereço" {...register('address')} />

                {/* Contract — accordeon */}
                <div className="rounded-lg border border-[#e3e6ed]">
                  <button type="button" onClick={() => setContractOpen(!contractOpen)} className="flex w-full items-center justify-between px-4 py-3 text-sm text-[#6b7280] hover:bg-[#f9fafb] transition-colors rounded-lg">
                    <span>Dados contratuais</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', contractOpen && 'rotate-180')} />
                  </button>
                  {contractOpen && (
                    <div className="space-y-4 border-t border-[#e3e6ed] px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Função" error={errors.role?.message} {...register('role')} />
                        <Input label="Departamento" {...register('department')} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                          label="Tipo de Salário"
                          options={[
                            { value: 'MONTHLY', label: 'Mensal' },
                            { value: 'HOURLY', label: 'Hora' },
                            { value: 'DAILY', label: 'Diário' },
                          ]}
                          {...register('salaryType')}
                        />
                        <Input label="Horas por Dia" type="number" className="font-mono-data" {...register('hoursPerDay', { valueAsNumber: true })} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Data de Admissão" type="date" {...register('hireDate')} />
                        <Input label="PIS/PASEP" {...register('pis')} />
                      </div>
                      <Input label="CTPS" {...register('ctpsNumber')} />
                    </div>
                  )}
                </div>

                {/* Remuneration — accordeon */}
                <div className="rounded-lg border border-[#e3e6ed]">
                  <button type="button" onClick={() => setRemunerationOpen(!remunerationOpen)} className="flex w-full items-center justify-between px-4 py-3 text-sm text-[#6b7280] hover:bg-[#f9fafb] transition-colors rounded-lg">
                    <span>Remuneração e adicionais</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', remunerationOpen && 'rotate-180')} />
                  </button>
                  {remunerationOpen && (
                    <div className="space-y-4 border-t border-[#e3e6ed] px-4 py-4">
                      {canViewSensitiveData && (
                        <Input label="Salário Base" type="number" step="0.01" className="font-mono-data" error={errors.baseSalary?.message} {...register('baseSalary', { valueAsNumber: true })} />
                      )}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4 rounded border-[#e3e6ed] text-[#2563eb]" {...register('hasInsalubrity')} />
                          <span className="text-sm text-[#111827]">Insalubridade</span>
                        </label>
                        {watchInsalubrity && (
                          <Select label="Grau" options={[
                            { value: 'MINIMO', label: 'Mínimo (10%)' },
                            { value: 'MEDIO', label: 'Médio (20%)' },
                            { value: 'MAXIMO', label: 'Máximo (40%)' },
                          ]} {...register('insalubrityGrade')} />
                        )}
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4 rounded border-[#e3e6ed] text-[#2563eb]" {...register('hasPericulosity')} />
                          <span className="text-sm text-[#111827]">Periculosidade (30%)</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4 rounded border-[#e3e6ed] text-[#2563eb]" {...register('hasNightShift')} />
                          <span className="text-sm text-[#111827]">Adicional Noturno</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Benefits — accordeon */}
                <div className="rounded-lg border border-[#e3e6ed]">
                  <button type="button" onClick={() => setBenefitsOpen(!benefitsOpen)} className="flex w-full items-center justify-between px-4 py-3 text-sm text-[#6b7280] hover:bg-[#f9fafb] transition-colors rounded-lg">
                    <span>Benefícios</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', benefitsOpen && 'rotate-180')} />
                  </button>
                  {benefitsOpen && (
                    <div className="space-y-4 border-t border-[#e3e6ed] px-4 py-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-[#e3e6ed] text-[#2563eb]" {...register('hasVT')} />
                        <span className="text-sm text-[#111827]">Vale-transporte</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-[#e3e6ed] text-[#2563eb]" {...register('hasVA')} />
                        <span className="text-sm text-[#111827]">Vale-alimentação</span>
                      </label>
                      {watchVA && (
                        <Input label="Valor VA" type="number" step="0.01" className="font-mono-data" {...register('vaAmount', { valueAsNumber: true })} />
                      )}
                      <Input label="Número de Dependentes" type="number" min={0} className="font-mono-data" {...register('dependentsCount', { valueAsNumber: true })} />
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-[#e3e6ed] text-[#2563eb]" {...register('hasAlimony')} />
                        <span className="text-sm text-[#111827]">Pensão alimentícia</span>
                      </label>
                      {watchAlimony && (
                        <Input label="Valor da Pensão" type="number" step="0.01" className="font-mono-data" {...register('alimonyAmount', { valueAsNumber: true })} />
                      )}
                    </div>
                  )}
                </div>

                {/* Bank — accordeon */}
                {canViewSensitiveData && (
                  <div className="rounded-lg border border-[#e3e6ed]">
                    <button type="button" onClick={() => setBankOpen(!bankOpen)} className="flex w-full items-center justify-between px-4 py-3 text-sm text-[#6b7280] hover:bg-[#f9fafb] transition-colors rounded-lg">
                      <span>Dados bancários</span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', bankOpen && 'rotate-180')} />
                    </button>
                    {bankOpen && (
                      <div className="space-y-4 border-t border-[#e3e6ed] px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Input label="Código do Banco" placeholder="Ex: 001" className="font-mono-data" {...register('bankCode')} />
                          <Input label="Agência" placeholder="0000" className="font-mono-data" {...register('bankAgency')} />
                          <Input label="Conta" placeholder="00000-0" className="font-mono-data" {...register('bankAccount')} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isDirty && canManageEmployees && (
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={updateEmployee.isPending}>
                      {updateEmployee.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                )}
                </fieldset>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DOCUMENTOS ===== */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DOC_TYPES.map((docType) => {
                  const doc = employee.documents?.find((d) => d.type === docType.enumValue)
                  return (
                    <div
                      key={docType.enumValue}
                      className="flex items-center justify-between rounded-md border border-[#e3e6ed] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        {doc ? (
                          <FileCheck className="h-5 w-5 text-[#16a34a]" />
                        ) : (
                          <FileX className="h-5 w-5 text-[#e3e6ed]" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[#111827]">{docType.label}</p>
                          {doc?.expiresAt && (
                            <p className="text-xs text-[#9ca3af]">Vence em: {formatDate(doc.expiresAt)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc && (
                          <Badge variant={
                            doc.status === 'VALID' ? 'success' :
                            doc.status === 'EXPIRED' ? 'destructive' :
                            'warning'
                          }>
                            {statusLabel(doc.status)}
                          </Badge>
                        )}
                        {doc?.fileUrl?.startsWith('/documentos/') && (
                          <>
                            <button
                              onClick={() => handleViewDoc(doc.id, doc.fileUrl)}
                              disabled={loadingDoc === doc.id}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#2563eb] hover:bg-[#eff6ff] transition-colors disabled:opacity-50"
                            >
                              {loadingDoc === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                              Ver
                            </button>
                            <button
                              onClick={() => handleDownloadDoc(doc.id, doc.fileUrl, doc.fileName)}
                              disabled={loadingDoc === doc.id}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                          </>
                        )}
                        {canUploadDocuments && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadDocType(docType)
                              setUploadExpiry('')
                            }}
                          >
                            <Upload className="mr-1 h-3 w-3" />
                            Upload
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTÓRICO DE PROJETOS ===== */}
        <TabsContent value="obras">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Projetos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.allocations?.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-medium">{alloc.obraName}</TableCell>
                      <TableCell>{formatDate(alloc.startDate)}</TableCell>
                      <TableCell>{alloc.endDate ? formatDate(alloc.endDate) : 'Em andamento'}</TableCell>
                      <TableCell>
                        <Badge variant={alloc.endDate ? 'secondary' : 'success'}>
                          {alloc.endDate ? 'Encerrado' : 'Ativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!employee.allocations || employee.allocations.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-[#9ca3af]">
                        Este funcionário não foi alocado em nenhum projeto ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PONTO ===== */}
        <TabsContent value="ponto">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Registros de Ponto</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
                  value={String(pontoMonth)}
                  onChange={(e) => setPontoMonth(Number(e.target.value))}
                />
                <Input
                  type="number"
                  min={2020}
                  className="w-24 font-mono-data"
                  value={pontoYear}
                  onChange={(e) => setPontoYear(Number(e.target.value) || pontoYear)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {pontoLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Horas Trabalhadas</TableHead>
                      <TableHead>Horas Extras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pontoRecords?.map((record) => (
                      <TableRow key={record.id}>
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
                        <TableCell className="font-mono-data">
                          {record.overtimeMinutes > 0
                            ? `${Math.floor(record.overtimeMinutes / 60)}h ${record.overtimeMinutes % 60}m`
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pontoRecords || pontoRecords.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-[#9ca3af]">
                          Nenhum registro de ponto em {monthNames[pontoMonth - 1]} {pontoYear}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HOLERITES ===== */}
        {canViewPayslips && <TabsContent value="holerites">
          <Card>
            <CardHeader>
              <CardTitle>Holerites</CardTitle>
            </CardHeader>
            <CardContent>
              {payslipsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Salário Base</TableHead>
                      <TableHead>Líquido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono-data font-medium">
                          {String(item.period.month).padStart(2, '0')}/{item.period.year}
                        </TableCell>
                        <TableCell className="font-mono-data">{formatCurrency(item.baseSalary)}</TableCell>
                        <TableCell className="font-mono-data font-semibold">{formatCurrency(item.netSalary)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.period.status === 'CLOSED' ? 'success' :
                            item.period.status === 'REVIEW' ? 'warning' : 'default'
                          }>
                            {statusLabel(item.period.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/folha/holerite/${item.periodId}/${id}`, '_blank')}
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Ver holerite
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!payslips || payslips.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-[#9ca3af]">
                          Nenhum holerite gerado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>}
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={!!uploadDocType} onClose={() => setUploadDocType(null)}>
        <DialogTitle>Upload de Documento</DialogTitle>
        <p className="mt-1 text-sm text-[#6b7280]">{uploadDocType?.label}</p>
        <div className="mt-4 space-y-4">
          {uploadDocType?.hasExpiry && (
            <Input
              label="Data de vencimento (opcional)"
              type="date"
              value={uploadExpiry}
              onChange={(e) => setUploadExpiry(e.target.value)}
            />
          )}
          <div>
            <label className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]">
              Arquivo
            </label>
            {uploading ? (
              <div className="flex items-center gap-2 rounded-md border border-[#e3e6ed] px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" />
                <span className="text-sm text-[#6b7280]">Enviando...</span>
              </div>
            ) : (
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full text-sm text-[#6b7280] file:mr-4 file:rounded-md file:border-0 file:bg-[#2563eb] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#1d4ed8]"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                }}
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setUploadDocType(null)} disabled={uploading}>Cancelar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
