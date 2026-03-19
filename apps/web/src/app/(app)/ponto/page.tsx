'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatDate } from '@fieldis/shared'
import { toast } from 'sonner'
import { Clock, LogIn, LogOut, MapPin, Check, Eye, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Skeleton } from '@/components/ui/Skeleton'
import { useObras, useObra, useTimeRecords, useBulkClockIn, useClockOut, useMonthlyPontoSummary } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'

export default function PontoPage() {
  const { canRecordPresence, isReadOnly, isEmployee } = usePermissions()
  const [selectedObraId, setSelectedObraId] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle')

  // Monthly summary state
  const [summaryMonth, setSummaryMonth] = useState(() => new Date().getMonth() + 1)
  const [summaryYear, setSummaryYear] = useState(() => new Date().getFullYear())

  useEffect(() => {
    if ('geolocation' in navigator) {
      setLocationStatus('loading')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocationStatus('granted')
        },
        () => {
          setLocationStatus('denied')
        },
        { timeout: 10000, enableHighAccuracy: false }
      )
    }
  }, [])

  const { data: obrasData } = useObras({ status: 'ACTIVE', limit: 100 })
  const { data: obraDetail } = useObra(selectedObraId)
  const { data: timeRecordsData, isLoading: recordsLoading } = useTimeRecords({
    obraId: selectedObraId || undefined,
    date: selectedDate || undefined,
  })
  const bulkClockIn = useBulkClockIn()
  const clockOut = useClockOut()

  const { data: summaryData, isLoading: summaryLoading } = useMonthlyPontoSummary(
    selectedObraId, summaryMonth, summaryYear
  )

  const obras = obrasData?.data ?? []
  const records = timeRecordsData?.data ?? []
  const summaryRows = summaryData?.data ?? []

  const allocatedEmployees = obraDetail?.employees?.filter((e) => !e.endDate) ?? []

  const employeesWithoutEntry = allocatedEmployees.filter(
    (emp) => !records.some((r) => r.employeeId === emp.id)
  )

  // Summary totals
  const summaryTotals = useMemo(() => {
    return summaryRows.reduce(
      (acc, row) => ({
        workedDays: acc.workedDays + row.workedDays,
        totalMinutes: acc.totalMinutes + row.totalMinutes,
        overtimeMinutes: acc.overtimeMinutes + row.overtimeMinutes,
        absences: acc.absences + row.absences,
      }),
      { workedDays: 0, totalMinutes: 0, overtimeMinutes: 0, absences: 0 }
    )
  }, [summaryRows])

  function toggleEmployee(empId: string) {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
  }

  function toggleAll() {
    if (selectedEmployees.length === employeesWithoutEntry.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(employeesWithoutEntry.map((e) => e.id))
    }
  }

  async function handleBulkClockIn() {
    if (selectedEmployees.length === 0) {
      toast.error('Selecione ao menos um funcionário.')
      return
    }
    if (!selectedObraId) {
      toast.error('Selecione um projeto.')
      return
    }

    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const offsetMin = now.getTimezoneOffset()
    const sign = offsetMin <= 0 ? '+' : '-'
    const absOffset = Math.abs(offsetMin)
    const offH = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const offM = String(absOffset % 60).padStart(2, '0')
    const clockInTime = `${selectedDate}T${hours}:${minutes}:00${sign}${offH}:${offM}`

    try {
      await bulkClockIn.mutateAsync({
        obraId: selectedObraId,
        employeeIds: selectedEmployees,
        clockIn: clockInTime,
        breakMinutes: 60,
        source: 'MANUAL',
      })
      toast.success(`Entrada registrada para ${selectedEmployees.length} funcionário(s).`)
      setSelectedEmployees([])
    } catch {
      toast.error('Erro ao registrar entrada.')
    }
  }

  async function handleClockOut(recordId: string) {
    const now = new Date()
    const clockOutTime = now.toISOString()
    try {
      await clockOut.mutateAsync({ recordId, clockOut: clockOutTime })
      toast.success('Saída registrada com sucesso.')
    } catch {
      toast.error('Erro ao registrar saída.')
    }
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <Eye className="h-3.5 w-3.5 flex-shrink-0" />
          Modo somente leitura — você está acessando como Auditor.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#2563eb]" />
            Controle de Ponto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select
                label="Projeto"
                placeholder="Selecione um projeto"
                options={obras.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
                value={selectedObraId}
                onChange={(e) => {
                  setSelectedObraId(e.target.value)
                  setSelectedEmployees([])
                }}
              />
            </div>
          </div>
          {isEmployee && (
            <p className="mt-3 text-xs text-[#9ca3af]">
              Você está em modo de consulta. O registro de presença é feito pelo seu supervisor.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedObraId ? (
        <Tabs defaultValue="diario">
          <TabsList>
            <TabsTrigger value="diario">Registro Diário</TabsTrigger>
            {!isEmployee && <TabsTrigger value="resumo">Resumo Mensal</TabsTrigger>}
          </TabsList>

          <TabsContent value="diario">
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-48">
                  <Input
                    label="Data"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              {canRecordPresence && employeesWithoutEntry.length > 0 && (
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Registrar Entrada</CardTitle>
                    <Button
                      onClick={handleBulkClockIn}
                      disabled={selectedEmployees.length === 0 || bulkClockIn.isPending}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {bulkClockIn.isPending
                        ? 'Registrando...'
                        : `Registrar Entrada (${selectedEmployees.length})`
                      }
                    </Button>
                    {locationStatus === 'granted' && (
                      <span className="flex items-center gap-1 text-xs text-[#16a34a]">
                        <MapPin className="h-3 w-3" />
                        GPS ativo
                      </span>
                    )}
                    {locationStatus === 'denied' && (
                      <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
                        <MapPin className="h-3 w-3" />
                        GPS indisponível
                      </span>
                    )}
                    {locationStatus === 'loading' && (
                      <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
                        <MapPin className="h-3 w-3" />
                        Obtendo GPS...
                      </span>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                              checked={selectedEmployees.length === employeesWithoutEntry.length && employeesWithoutEntry.length > 0}
                              onChange={toggleAll}
                            />
                          </TableHead>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Função</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeesWithoutEntry.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                                checked={selectedEmployees.includes(emp.id)}
                                onChange={() => toggleEmployee(emp.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell>{emp.role}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Registros do Dia - {formatDate(selectedDate)}</CardTitle>
                </CardHeader>
                <CardContent>
                  {recordsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Saída</TableHead>
                          <TableHead>Horas</TableHead>
                          <TableHead>Extras</TableHead>
                          <TableHead>Local</TableHead>
                          {canRecordPresence && <TableHead>Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.employeeName}</TableCell>
                            <TableCell className="font-mono-data">
                              {new Date(record.clockIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="font-mono-data">
                              {record.clockOut
                                ? new Date(record.clockOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : (
                                  <Badge variant="warning">Em aberto</Badge>
                                )
                              }
                            </TableCell>
                            <TableCell className="font-mono-data">
                              {record.workedMinutes > 0
                                ? formatMinutes(record.workedMinutes)
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="font-mono-data">
                              {record.overtimeMinutes > 0
                                ? formatMinutes(record.overtimeMinutes)
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <MapPin className="h-3.5 w-3.5 text-[#e3e6ed]" />
                            </TableCell>
                            {canRecordPresence && (
                              <TableCell>
                                {!record.clockOut ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleClockOut(record.id)}
                                    disabled={clockOut.isPending}
                                  >
                                    <LogOut className="mr-1 h-3 w-3" />
                                    Registrar Saída
                                  </Button>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-[#16a34a]">
                                    <Check className="h-3 w-3" />
                                    Completo
                                  </span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {records.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={canRecordPresence ? 7 : 6} className="py-8 text-center text-[#9ca3af]">
                              Nenhuma presença registrada para esta data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {!isEmployee && (
            <TabsContent value="resumo">
              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="w-40">
                    <Select
                      label="Mês"
                      options={monthNames.map((name, i) => ({ value: String(i + 1), label: name }))}
                      value={String(summaryMonth)}
                      onChange={(e) => setSummaryMonth(Number(e.target.value))}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      label="Ano"
                      type="number"
                      min={2020}
                      value={summaryYear}
                      onChange={(e) => setSummaryYear(Number(e.target.value) || summaryYear)}
                    />
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-[#2563eb]" />
                      Resumo — {monthNames[summaryMonth - 1]} {summaryYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Funcionário</TableHead>
                              <TableHead>Função</TableHead>
                              <TableHead>Dias trab.</TableHead>
                              <TableHead>Total horas</TableHead>
                              <TableHead>Horas extras</TableHead>
                              <TableHead>Faltas</TableHead>
                              <TableHead>Última entrada</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryRows.map((row) => (
                              <TableRow key={row.employeeId}>
                                <TableCell className="font-medium">{row.employeeName}</TableCell>
                                <TableCell>{row.employeeRole}</TableCell>
                                <TableCell className="font-mono-data">{row.workedDays}</TableCell>
                                <TableCell className="font-mono-data">{formatMinutes(row.totalMinutes)}</TableCell>
                                <TableCell className="font-mono-data">
                                  {row.overtimeMinutes > 0 ? formatMinutes(row.overtimeMinutes) : '-'}
                                </TableCell>
                                <TableCell className={`font-mono-data ${row.absences > 0 ? 'text-[#dc2626] font-semibold' : ''}`}>
                                  {row.absences}
                                </TableCell>
                                <TableCell className="font-mono-data text-xs">
                                  {formatDate(row.lastClockIn)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {summaryRows.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-[#9ca3af]">
                                  Nenhum registro de ponto neste mês
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        {summaryRows.length > 0 && (
                          <div className="mt-3 flex gap-6 border-t border-[#e3e6ed] pt-3 text-sm text-[#6b7280]">
                            <span>Total: <span className="font-mono-data font-semibold text-[#111827]">{summaryTotals.workedDays}</span> dias</span>
                            <span><span className="font-mono-data font-semibold text-[#111827]">{formatMinutes(summaryTotals.totalMinutes)}</span> trabalhadas</span>
                            <span><span className="font-mono-data font-semibold text-[#111827]">{formatMinutes(summaryTotals.overtimeMinutes)}</span> extras</span>
                            <span><span className={`font-mono-data font-semibold ${summaryTotals.absences > 0 ? 'text-[#dc2626]' : 'text-[#111827]'}`}>{summaryTotals.absences}</span> faltas</span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock className="mb-4 h-12 w-12 text-[#e3e6ed]" />
          <p className="text-[#6b7280]">
            {isEmployee ? 'Selecione um projeto para consultar seu ponto.' : 'Selecione um projeto para gerenciar o ponto.'}
          </p>
        </div>
      )}
    </div>
  )
}
