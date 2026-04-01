'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { ArrowLeft, Building2, Users, HardHat, FolderOpen, Power } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  tradeName: string | null
  cnpj: string
  plan: string
  active: boolean
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  createdAt: string
  _count: { users: number; employees: number; obras: number }
}

interface CompanyUser {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

const planLabels: Record<string, string> = {
  BASICO: 'Basico',
  PROFISSIONAL: 'Profissional',
  EMPRESARIAL: 'Empresarial',
}

const roleLabels: Record<string, string> = {
  COMPANY_ADMIN: 'Administrador',
  RH_MANAGER: 'Gestor RH',
  FINANCIAL_MANAGER: 'Financeiro',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Funcionario',
  AUDITOR: 'Auditor',
}

export default function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['admin', 'company', id],
    queryFn: () => api.get(`/admin/companies/${id}`).then((r) => r.data),
  })

  const { data: users } = useQuery<CompanyUser[]>({
    queryKey: ['admin', 'company', id, 'users'],
    queryFn: () => api.get(`/admin/companies/${id}/users`).then((r) => r.data),
    enabled: !!id,
  })

  const toggleMutation = useMutation({
    mutationFn: () => api.patch(`/admin/companies/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success('Status atualizado')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="py-20 text-center text-sm text-[#6b7280]">Empresa nao encontrada</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/empresas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-syne text-2xl font-bold text-[#111827]">{company.name}</h1>
            <p className="font-mono-data text-xs text-[#6b7280]">{company.cnpj}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={company.active ? 'success' : 'destructive'}>
            {company.active ? 'Ativa' : 'Inativa'}
          </Badge>
          <Button
            variant={company.active ? 'destructive' : 'default'}
            size="sm"
            onClick={() => toggleMutation.mutate()}
          >
            <Power className="mr-2 h-4 w-4" />
            {company.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Plano', value: planLabels[company.plan] || company.plan, icon: Building2, color: '#2563eb' },
          { label: 'Usuarios', value: company._count.users, icon: Users, color: '#7c3aed' },
          { label: 'Funcionarios', value: company._count.employees, icon: HardHat, color: '#d97706' },
          { label: 'Obras', value: company._count.obras, icon: FolderOpen, color: '#16a34a' },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono-data text-[11px] uppercase tracking-wider text-[#6b7280]">{kpi.label}</p>
                    <p className="mt-1 text-xl font-bold text-[#111827]">{kpi.value}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${kpi.color}15` }}>
                    <Icon className="h-4 w-4" style={{ color: kpi.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                ['Razao Social', company.name],
                ['Nome Fantasia', company.tradeName],
                ['CNPJ', company.cnpj],
                ['Email', company.email],
                ['Telefone', company.phone],
                ['Endereco', company.address],
                ['Cidade/Estado', company.city && company.state ? `${company.city} / ${company.state}` : null],
                ['CEP', company.zipCode],
                ['Criada em', new Date(company.createdAt).toLocaleDateString('pt-BR')],
              ]
                .filter(([, val]) => val)
                .map(([label, value]) => (
                  <div key={label as string} className="flex justify-between border-b border-[#f4f5f7] pb-2 last:border-0">
                    <dt className="text-[#6b7280]">{label}</dt>
                    <dd className="font-medium text-[#111827]">{value}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios ({users?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!users || users.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#6b7280]">Nenhum usuario</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-[#6b7280]">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{roleLabels[user.role] || user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'success' : 'destructive'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
