'use client'

import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate, formatCPF } from '@fieldis/shared'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePayslip } from '@/hooks/useApi'

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function HoleritePage() {
  const params = useParams()
  const router = useRouter()
  const periodId = params.periodId as string
  const employeeId = params.employeeId as string
  const { data: payslip, isLoading } = usePayslip(periodId, employeeId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!payslip) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[#6b7280]">Holerite não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/folha')}>
          Voltar
        </Button>
      </div>
    )
  }

  const gross = payslip.baseSalary + payslip.overtimeValue + payslip.nightShiftValue + payslip.insalubrityValue + payslip.periculosityValue + payslip.dsrValue

  const proventos = [
    { label: 'Salário base', value: payslip.baseSalary },
    payslip.overtimeValue > 0 ? { label: `Horas extras (${payslip.overtimeHours.toFixed(1)}h)`, value: payslip.overtimeValue } : null,
    payslip.nightShiftValue > 0 ? { label: 'Adicional noturno', value: payslip.nightShiftValue } : null,
    payslip.insalubrityValue > 0 ? { label: 'Insalubridade', value: payslip.insalubrityValue } : null,
    payslip.periculosityValue > 0 ? { label: 'Periculosidade', value: payslip.periculosityValue } : null,
    payslip.dsrValue > 0 ? { label: 'DSR', value: payslip.dsrValue } : null,
  ].filter(Boolean) as Array<{ label: string; value: number }>

  const descontos = [
    payslip.inssDiscount > 0 ? { label: 'INSS', value: payslip.inssDiscount } : null,
    payslip.irrfDiscount > 0 ? { label: 'IRRF', value: payslip.irrfDiscount } : null,
    payslip.vtDiscount > 0 ? { label: 'Vale-transporte', value: payslip.vtDiscount } : null,
    payslip.advancesDiscount > 0 ? { label: 'Adiantamentos', value: payslip.advancesDiscount } : null,
    payslip.absencesDiscount > 0 ? { label: 'Faltas', value: payslip.absencesDiscount } : null,
    payslip.alimonyDiscount > 0 ? { label: 'Pensão alimentícia', value: payslip.alimonyDiscount } : null,
  ].filter(Boolean) as Array<{ label: string; value: number }>

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          nav, aside, header, .no-print, [data-sidebar], [data-header] { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .print-page {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>

      {/* Action buttons — hidden on print */}
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/folha')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Payslip document */}
      <div className="print-page mx-auto max-w-3xl rounded-lg border border-[#e3e6ed] bg-white p-8 shadow-sm">
        {/* Company header */}
        <div className="border-b border-[#111827] pb-4">
          <h1 className="text-lg font-bold text-[#111827]">{payslip.company?.name ?? 'Empresa'}</h1>
          {payslip.company?.cnpj && (
            <p className="text-sm text-[#6b7280]">CNPJ: {payslip.company.cnpj}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827]">Demonstrativo de Pagamento</p>
            <p className="text-sm font-semibold text-[#111827]">
              Competência: {monthNames[payslip.period.month - 1]}/{payslip.period.year}
            </p>
          </div>
        </div>

        {/* Employee data */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 border-b border-[#e3e6ed] py-3 text-sm">
          <div className="flex gap-2">
            <span className="text-[#6b7280]">Nome:</span>
            <span className="font-medium text-[#111827]">{payslip.employee.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#6b7280]">Função:</span>
            <span className="font-medium text-[#111827]">{payslip.employee.role}</span>
          </div>
          {payslip.employee.cpf && (
            <div className="flex gap-2">
              <span className="text-[#6b7280]">CPF:</span>
              <span className="font-mono-data font-medium text-[#111827]">{formatCPF(payslip.employee.cpf)}</span>
            </div>
          )}
          {payslip.employee.department && (
            <div className="flex gap-2">
              <span className="text-[#6b7280]">Departamento:</span>
              <span className="font-medium text-[#111827]">{payslip.employee.department}</span>
            </div>
          )}
          {payslip.employee.hireDate && (
            <div className="flex gap-2">
              <span className="text-[#6b7280]">Admissão:</span>
              <span className="font-medium text-[#111827]">{formatDate(payslip.employee.hireDate)}</span>
            </div>
          )}
          {payslip.obra && (
            <div className="flex gap-2">
              <span className="text-[#6b7280]">Projeto:</span>
              <span className="font-medium text-[#111827]">{payslip.obra.code} — {payslip.obra.name}</span>
            </div>
          )}
        </div>

        {/* Proventos & Descontos side by side */}
        <div className="grid grid-cols-2 gap-8 py-4">
          {/* Proventos */}
          <div>
            <h3 className="mb-2 border-b border-[#e3e6ed] pb-1 text-xs font-bold uppercase tracking-wider text-[#111827]">
              Proventos
            </h3>
            <div className="space-y-1">
              {proventos.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-[#374151]">{item.label}</span>
                  <span className="font-mono-data text-[#111827]">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t border-[#111827] pt-1">
              <span className="text-sm font-bold text-[#111827]">Total proventos</span>
              <span className="font-mono-data text-sm font-bold text-[#111827]">{formatCurrency(gross)}</span>
            </div>
          </div>

          {/* Descontos */}
          <div>
            <h3 className="mb-2 border-b border-[#e3e6ed] pb-1 text-xs font-bold uppercase tracking-wider text-[#111827]">
              Descontos
            </h3>
            <div className="space-y-1">
              {descontos.length > 0 ? descontos.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-[#374151]">{item.label}</span>
                  <span className="font-mono-data text-[#dc2626]">{formatCurrency(item.value)}</span>
                </div>
              )) : (
                <p className="text-sm text-[#9ca3af]">Nenhum desconto</p>
              )}
            </div>
            <div className="mt-2 flex justify-between border-t border-[#111827] pt-1">
              <span className="text-sm font-bold text-[#111827]">Total descontos</span>
              <span className="font-mono-data text-sm font-bold text-[#dc2626]">{formatCurrency(payslip.totalDiscounts)}</span>
            </div>
          </div>
        </div>

        {/* Net salary */}
        <div className="rounded-md border-2 border-[#111827] bg-[#f4f5f7] p-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-[#111827]">Salário líquido</span>
            <span className="font-mono-data text-xl font-bold text-[#111827]">{formatCurrency(payslip.netSalary)}</span>
          </div>
        </div>

        {/* FGTS info */}
        <div className="mt-3 flex justify-between text-sm text-[#6b7280]">
          <span>FGTS — depósito (custo empresa)</span>
          <span className="font-mono-data">{formatCurrency(payslip.fgtsValue)}</span>
        </div>

        {/* Signature line */}
        <div className="mt-12 border-t border-[#374151] pt-2 text-center">
          <p className="text-xs text-[#6b7280]">Assinatura do funcionário</p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-[#9ca3af]">
          Documento gerado pelo Fieldis em {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
    </>
  )
}
