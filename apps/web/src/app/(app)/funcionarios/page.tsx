'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployees } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'
import { formatCurrency, formatCPF, formatDate, statusLabel } from '@fieldis/shared'

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'ON_LEAVE', label: 'Afastados' },
  { value: 'VACATION', label: 'Férias' },
  { value: 'TERMINATED', label: 'Desligados' },
]

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export default function FuncionariosPage() {
  const { canManageEmployees, isReadOnly } = usePermissions()
  const canViewSensitiveData = canManageEmployees || isReadOnly
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useEmployees({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    limit,
  })

  const employees = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

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
            placeholder="Buscar por nome, CPF ou função..."
            className="h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] pl-10 pr-4 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        {canManageEmployees && (
          <Link href="/funcionarios/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Funcionário
            </Button>
          </Link>
        )}
      </div>

      <Tabs
        defaultValue=""
        onValueChange={(val) => {
          setStatusFilter(val)
          setPage(1)
        }}
      >
        <TabsList>
          {statusFilters.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {statusFilters.map((f) => (
          <TabsContent key={f.value} value={f.value}>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6">
                    <TableSkeleton />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        {canViewSensitiveData && <TableHead>CPF</TableHead>}
                        <TableHead>Função</TableHead>
                        <TableHead>Projeto Atual</TableHead>
                        {canViewSensitiveData && <TableHead>Salário</TableHead>}
                        <TableHead>Admissão</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <Link
                              href={`/funcionarios/${emp.id}`}
                              className="font-medium text-[#2563eb] hover:underline"
                            >
                              {emp.name}
                            </Link>
                          </TableCell>
                          {canViewSensitiveData && <TableCell className="font-mono-data">{formatCPF(emp.cpf)}</TableCell>}
                          <TableCell>{emp.role}</TableCell>
                          <TableCell>{emp.currentObra?.name ?? '-'}</TableCell>
                          {canViewSensitiveData && <TableCell className="font-mono-data">{formatCurrency(emp.baseSalary)}</TableCell>}
                          <TableCell>{formatDate(emp.hireDate)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              emp.status === 'ACTIVE' ? 'success' :
                              emp.status === 'TERMINATED' ? 'destructive' :
                              emp.status === 'VACATION' ? 'default' :
                              'warning'
                            }>
                              {statusLabel(emp.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {employees.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={canViewSensitiveData ? 7 : 5} className="py-8 text-center text-[#9ca3af]">
                            Nenhum funcionário encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#6b7280]">
            Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} resultados
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
