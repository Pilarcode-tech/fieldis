'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, statusLabel } from '@fieldis/shared'
import { formatMoneyInput, parseMoneyInput } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAdvances, useCreateAdvance } from '@/hooks/useApi'
import { useSession } from 'next-auth/react'

export default function AdiantamentoPage() {
  const { data: session } = useSession()
  const employeeId = session?.user?.employeeId ?? ''
  const { data: advancesData, isLoading } = useAdvances()
  const createAdvance = useCreateAdvance()

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [discountMonth, setDiscountMonth] = useState(() => {
    const now = new Date()
    return now.getMonth() + 1 // next calculation will use this
  })
  const [discountYear, setDiscountYear] = useState(() => new Date().getFullYear())

  const advances = advancesData?.data ?? []

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseMoneyInput(amount)
    if (!val || val <= 0) {
      toast.error('Informe um valor válido.')
      return
    }
    if (!employeeId) {
      toast.error('Funcionário não identificado.')
      return
    }

    try {
      await createAdvance.mutateAsync({
        employeeId,
        amount: val,
        reason: reason || undefined,
        discountMonth,
        discountYear,
      })
      toast.success('Solicitação enviada com sucesso!')
      setAmount('')
      setReason('')
    } catch {
      toast.error('Erro ao enviar solicitação.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-[#2563eb]" />
        <h2 className="text-lg font-semibold text-[#111827]">Solicitar Adiantamento</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova solicitação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Valor (R$)"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                className="font-mono-data"
                value={amount}
                onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
              />
              <p className="mt-1 text-xs text-[#9ca3af]">O valor máximo é 40% do seu salário base.</p>
            </div>

            <Input
              label="Motivo"
              placeholder="Descreva o motivo (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div>
              <label className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]">
                Mês de desconto
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 py-2 text-sm text-[#111827] focus:border-[#2563eb] focus:outline-none"
                value={`${discountMonth}-${discountYear}`}
                onChange={(e) => {
                  const [m, y] = e.target.value.split('-').map(Number)
                  setDiscountMonth(m)
                  setDiscountYear(y)
                }}
              >
                <option value={`${currentMonth}-${currentYear}`}>
                  {monthNames[currentMonth - 1]} {currentYear}
                </option>
                <option value={`${nextMonth}-${nextYear}`}>
                  {monthNames[nextMonth - 1]} {nextYear}
                </option>
              </select>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createAdvance.isPending}>
                {createAdvance.isPending ? 'Enviando...' : 'Enviar solicitação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desconto em</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.map((adv) => (
                  <TableRow key={adv.id}>
                    <TableCell className="font-mono-data font-semibold">{formatCurrency(adv.amount)}</TableCell>
                    <TableCell>{adv.reason || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        adv.status === 'APPROVED' ? 'success' :
                        adv.status === 'REJECTED' ? 'destructive' :
                        adv.status === 'DISCOUNTED' ? 'secondary' :
                        'warning'
                      }>
                        {statusLabel(adv.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono-data">
                      {adv.discountMonth && adv.discountYear
                        ? `${String(adv.discountMonth).padStart(2, '0')}/${adv.discountYear}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{formatDate(adv.requestDate)}</TableCell>
                  </TableRow>
                ))}
                {advances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-[#9ca3af]">
                      Nenhuma solicitação registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
