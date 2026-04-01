'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Plus, Search, Power, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  cnpj: string
  plan: string
  active: boolean
  email: string | null
  phone: string | null
  createdAt: string
  _count: { users: number; employees: number; obras: number }
}

const planLabels: Record<string, string> = {
  BASICO: 'Basico',
  PROFISSIONAL: 'Profissional',
  EMPRESARIAL: 'Empresarial',
}

export default function EmpresasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'companies', { search, plan: planFilter, active: activeFilter, page }],
    queryFn: () =>
      api
        .get('/admin/companies', {
          params: { search: search || undefined, plan: planFilter || undefined, active: activeFilter !== '' ? activeFilter : undefined, page, limit: 20 },
        })
        .then((r) => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/companies/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success('Status atualizado')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const companies: Company[] = data?.companies ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-[#111827]">Empresas</h1>
          <p className="text-sm text-[#6b7280]">Gerencie todas as empresas cadastradas na plataforma</p>
        </div>
        <Link href="/admin/empresas/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: 'BASICO', label: 'Basico' },
                { value: 'PROFISSIONAL', label: 'Profissional' },
                { value: 'EMPRESARIAL', label: 'Empresarial' },
              ]}
              placeholder="Todos os planos"
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
              className="w-full sm:w-48"
            />
            <Select
              options={[
                { value: 'true', label: 'Ativas' },
                { value: 'false', label: 'Inativas' },
              ]}
              placeholder="Todos os status"
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
              className="w-full sm:w-40"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
            </div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#6b7280]">
              Nenhuma empresa encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Funcionarios</TableHead>
                    <TableHead>Obras</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="font-mono-data text-xs">{company.cnpj}</TableCell>
                      <TableCell>
                        <Badge variant="default">{planLabels[company.plan] || company.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.active ? 'success' : 'destructive'}>
                          {company.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>{company._count.users}</TableCell>
                      <TableCell>{company._count.employees}</TableCell>
                      <TableCell>{company._count.obras}</TableCell>
                      <TableCell className="text-xs text-[#6b7280]">
                        {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/empresas/${company.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMutation.mutate(company.id)}
                            title={company.active ? 'Desativar' : 'Ativar'}
                          >
                            <Power className={`h-4 w-4 ${company.active ? 'text-[#16a34a]' : 'text-[#dc2626]'}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-[#6b7280]">
                    {pagination.total} empresa{pagination.total !== 1 ? 's' : ''} encontrada{pagination.total !== 1 ? 's' : ''}
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
                    <span className="flex items-center px-2 text-sm text-[#6b7280]">
                      {page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Proximo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
