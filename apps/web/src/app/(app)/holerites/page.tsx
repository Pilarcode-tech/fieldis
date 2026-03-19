'use client'

import { FileText, ExternalLink, AlertCircle } from 'lucide-react'
import { formatCurrency, statusLabel } from '@fieldis/shared'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMyPayslips } from '@/hooks/useApi'
import { useSession } from 'next-auth/react'

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function HoleritesPage() {
  const { data: session } = useSession()
  const employeeId = session?.user?.employeeId
  const { data: payslips, isLoading } = useMyPayslips(employeeId)

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
        <h2 className="text-lg font-semibold text-[#111827]">Conta não vinculada</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Sua conta não está vinculada a um funcionário.
          Fale com o RH para regularizar.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#2563eb]" />
          <h2 className="text-lg font-semibold text-[#111827]">Meus Holerites</h2>
        </div>
        <p className="mt-1 text-sm text-[#6b7280]">Consulte seus demonstrativos de pagamento</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : payslips && payslips.length > 0 ? (
        <div className="space-y-3">
          {payslips.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-[#111827]">
                    {monthNames[item.period.month - 1]} {item.period.year}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="font-mono-data text-lg font-bold text-[#111827]">
                      {formatCurrency(item.netSalary)}
                    </span>
                    <Badge variant={
                      item.period.status === 'CLOSED' ? 'success' :
                      item.period.status === 'REVIEW' ? 'warning' : 'default'
                    }>
                      {statusLabel(item.period.status)}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/folha/holerite/${item.periodId}/${employeeId}`, '_blank')}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Ver detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e3e6ed] py-16">
          <FileText className="mb-2 h-8 w-8 text-[#e3e6ed]" />
          <p className="text-sm text-[#9ca3af]">Nenhum holerite disponível ainda.</p>
          <p className="mt-1 text-xs text-[#9ca3af]">Os holerites aparecem após o fechamento da folha.</p>
        </div>
      )}
    </div>
  )
}
