'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, Pencil, UserX, Info, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useObras,
  useEmployees,
} from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Administrador',
  RH_MANAGER: 'RH',
  FINANCIAL_MANAGER: 'Financeiro',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Funcionário',
  AUDITOR: 'Auditor',
}

const ROLE_COLORS: Record<string, string> = {
  COMPANY_ADMIN: 'bg-[#1e3a5f] text-white border-[#1e3a5f]/20',
  RH_MANAGER: 'bg-[#dbeafe] text-[#2563eb] border-[#2563eb]/20',
  FINANCIAL_MANAGER: 'bg-[#dcfce7] text-[#16a34a] border-[#16a34a]/20',
  SUPERVISOR: 'bg-[#fef3c7] text-[#d97706] border-[#d97706]/20',
  EMPLOYEE: 'bg-[#f9fafb] text-[#6b7280] border-[#e3e6ed]',
  AUDITOR: 'bg-[#f3e8ff] text-[#7c3aed] border-[#7c3aed]/20',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  COMPANY_ADMIN: 'Acesso total. Gerencia funcionários, projetos, folha, financeiro e outros usuários.',
  RH_MANAGER: 'Gerencia admissões, documentos, alocações e folha de pagamento. Pode criar Supervisores e Funcionários.',
  FINANCIAL_MANAGER: 'Visualiza folha (somente leitura), aprova adiantamentos e acessa relatórios financeiros.',
  SUPERVISOR: 'Registra presença da equipe nos projetos vinculados. Acesso restrito à tela de Ponto e Projetos.',
  EMPLOYEE: 'Acesso ao app do funcionário: holerites, ponto próprio e solicitação de adiantamento. Vincule a um funcionário já cadastrado para associar os registros.',
  AUDITOR: 'Somente leitura em todos os módulos. Não cria, edita nem aprova nada.',
}

function getCreatableRoles(role: string) {
  if (role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN') {
    return [
      { value: 'RH_MANAGER', label: 'RH' },
      { value: 'FINANCIAL_MANAGER', label: 'Financeiro' },
      { value: 'SUPERVISOR', label: 'Supervisor' },
      { value: 'EMPLOYEE', label: 'Funcionário' },
      { value: 'AUDITOR', label: 'Auditor' },
    ]
  }
  if (role === 'RH_MANAGER') {
    return [
      { value: 'SUPERVISOR', label: 'Supervisor' },
      { value: 'EMPLOYEE', label: 'Funcionário' },
    ]
  }
  return []
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

interface EditingUser {
  id: string
  name: string
  email: string
  role: string
  active: boolean
}

export default function UsuariosPage() {
  const router = useRouter()
  const { canManageUsers, canManageEmployees, role, isLoading: permLoading } = usePermissions()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [selectedObraIds, setSelectedObraIds] = useState<string[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [emailError, setEmailError] = useState('')

  // Password reveal modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [closeEnabled, setCloseEnabled] = useState(false)

  const { data, isLoading } = useUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    page: String(page),
    limit: String(limit),
  })

  const createUser = useCreateUser()
  const deactivateUser = useDeactivateUser()

  const { data: obrasData } = useObras({ limit: 100 })
  const { data: employeesData } = useEmployees({ limit: 500 })

  const users = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  useEffect(() => {
    if (!permLoading && !canManageUsers) {
      router.push('/dashboard')
    }
  }, [permLoading, canManageUsers, router])

  // Auto-enable close button after 5s as fallback
  useEffect(() => {
    if (!passwordModalOpen) return
    setCloseEnabled(false)
    setPasswordCopied(false)
    const timer = setTimeout(() => setCloseEnabled(true), 5000)
    return () => clearTimeout(timer)
  }, [passwordModalOpen])

  if (permLoading || !canManageUsers) {
    return null
  }

  function resetCreateForm() {
    setNewName('')
    setNewEmail('')
    setNewRole('')
    setNewPassword('')
    setSelectedObraIds([])
    setSelectedEmployeeId('')
    setEmailError('')
  }

  async function handleCreateUser() {
    if (!newName || !newEmail || !newRole) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    setEmailError('')

    try {
      const body: Record<string, unknown> = {
        name: newName,
        email: newEmail,
        role: newRole,
      }

      if (newPassword) {
        body.password = newPassword
      }

      if (newRole === 'SUPERVISOR' && selectedObraIds.length > 0) {
        body.obraIds = selectedObraIds
      }

      if (newRole === 'EMPLOYEE' && selectedEmployeeId) {
        body.employeeId = selectedEmployeeId
      }

      const result = await createUser.mutateAsync(body)

      setCreateOpen(false)
      resetCreateForm()

      if (result?.generatedPassword) {
        setGeneratedPassword(result.generatedPassword)
        setPasswordModalOpen(true)
      } else {
        toast.success('Usuário criado com sucesso!')
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } }
      if (err?.response?.status === 409) {
        setEmailError('Este e-mail já está em uso nesta empresa.')
      } else {
        toast.error('Erro ao criar usuário. Tente novamente.')
      }
    }
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(generatedPassword)
    setPasswordCopied(true)
    setCloseEnabled(true)
  }

  async function handleDeactivateUser(userId: string) {
    try {
      await deactivateUser.mutateAsync(userId)
      toast.success('Usuário desativado com sucesso.')
    } catch {
      toast.error('Erro ao desativar usuário.')
    }
  }

  function openEditDialog(user: EditingUser) {
    setEditingUser(user)
    setEditOpen(true)
  }

  function toggleObraSelection(obraId: string) {
    setSelectedObraIds((prev) =>
      prev.includes(obraId) ? prev.filter((id) => id !== obraId) : [...prev, obraId]
    )
  }

  const creatableRoles = getCreatableRoles(role)
  const obras = obrasData?.data ?? []
  const employees = employeesData?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-[#2563eb]" />
            <h1 className="text-2xl font-bold text-[#111827]">Usuários</h1>
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">Gerencie quem tem acesso ao sistema</p>
        </div>
        {canManageEmployees && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            className="h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] pl-10 pr-4 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          options={[
            { value: '', label: 'Todos os perfis' },
            { value: 'COMPANY_ADMIN', label: 'Administrador' },
            { value: 'RH_MANAGER', label: 'RH' },
            { value: 'FINANCIAL_MANAGER', label: 'Financeiro' },
            { value: 'SUPERVISOR', label: 'Supervisor' },
            { value: 'EMPLOYEE', label: 'Funcionário' },
            { value: 'AUDITOR', label: 'Auditor' },
          ]}
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className="w-48"
        />
      </div>

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
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-[#111827]">
                      {user.name}
                    </TableCell>
                    <TableCell className="font-mono-data text-[#6b7280]">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium border ${ROLE_COLORS[user.role] ?? 'bg-[#f9fafb] text-[#6b7280] border-[#e3e6ed]'}`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'success' : 'destructive'}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'SUPERVISOR' ? (
                        user.obras.length > 0 ? (
                          <span className="text-sm text-[#6b7280]">
                            {user.obras.length} {user.obras.length === 1 ? 'projeto' : 'projetos'}
                          </span>
                        ) : (
                          <span className="text-sm text-[#9ca3af]">Nenhum</span>
                        )
                      ) : (
                        <span className="text-sm text-[#9ca3af]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canManageEmployees && (
                          <>
                            <button
                              onClick={() =>
                                openEditDialog({
                                  id: user.id,
                                  name: user.name,
                                  email: user.email,
                                  role: user.role,
                                  active: user.active,
                                })
                              }
                              className="rounded-md p-1.5 text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#2563eb]"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {user.active && (
                              <button
                                onClick={() => handleDeactivateUser(user.id)}
                                className="rounded-md p-1.5 text-[#6b7280] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                                title="Desativar"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-[#9ca3af]">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      {/* Create User Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm() }} className="max-w-lg">
        <DialogTitle>Novo Usuário</DialogTitle>
        <DialogDescription>Preencha os dados para criar um novo acesso ao sistema.</DialogDescription>
        <div className="mt-4 space-y-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div>
            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value)
                if (emailError) setEmailError('')
              }}
            />
            {emailError && (
              <p className="mt-1 text-xs text-[#dc2626]">{emailError}</p>
            )}
          </div>
          <div>
            <Select
              label="Perfil"
              placeholder="Selecione um perfil"
              options={creatableRoles}
              value={newRole}
              onChange={(e) => {
                setNewRole(e.target.value)
                setSelectedObraIds([])
                setSelectedEmployeeId('')
              }}
            />
            {newRole && ROLE_DESCRIPTIONS[newRole] && (
              <div className="mt-2 flex gap-2 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-3">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2563eb]" />
                <p className="text-sm text-[#1e40af]">{ROLE_DESCRIPTIONS[newRole]}</p>
              </div>
            )}
          </div>
          <div>
            <Input
              label="Senha"
              type="password"
              placeholder="Deixe vazio para gerar automaticamente"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-[#9ca3af]">
              Se não informada, uma senha temporária será gerada e exibida após o cadastro.
            </p>
          </div>

          {newRole === 'SUPERVISOR' && (
            <div>
              <label className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]">
                Projetos sob responsabilidade
              </label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-[#e3e6ed] p-3">
                {obras.length === 0 ? (
                  <p className="text-sm text-[#9ca3af]">Nenhum projeto disponível</p>
                ) : (
                  obras.map((obra) => (
                    <label key={obra.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                        checked={selectedObraIds.includes(obra.id)}
                        onChange={() => toggleObraSelection(obra.id)}
                      />
                      <span className="text-sm text-[#111827]">
                        {obra.code} - {obra.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-1 text-xs text-[#9ca3af]">
                O supervisor só verá e registrará ponto nestes projetos. Pode ser alterado depois.
              </p>
            </div>
          )}

          {newRole === 'EMPLOYEE' && (
            <div>
              <Select
                label="Funcionário correspondente"
                placeholder="Buscar por nome ou função..."
                options={[
                  { value: '', label: 'Nenhum (sem vínculo)' },
                  ...employees
                    .filter((emp) => !emp.email)
                    .map((emp) => ({ value: emp.id, label: `${emp.name} - ${emp.role}` })),
                ]}
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              />
              <p className="mt-1 text-xs text-[#9ca3af]">
                Opcional. Vincule se este usuário é um funcionário já cadastrado. Sem vínculo, ele não verá holerites nem registros de ponto.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => { setCreateOpen(false); resetCreateForm() }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUser.isPending}
            >
              {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Password Reveal Modal */}
      <Dialog open={passwordModalOpen} onClose={() => closeEnabled && setPasswordModalOpen(false)}>
        <DialogTitle>Usuário criado com sucesso</DialogTitle>
        <DialogDescription>A senha temporária gerada foi:</DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-[#f4f5f7] px-4 py-3">
            <span className="font-mono-data text-lg font-medium text-[#111827] tracking-wider">
              {generatedPassword}
            </span>
            <button
              onClick={handleCopyPassword}
              className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] border border-[#e3e6ed] hover:bg-[#f9fafb] transition-colors"
            >
              {passwordCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span className="text-[#16a34a]">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar senha</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-[#dc2626]">
            Anote agora. Esta senha não será exibida novamente.
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => setPasswordModalOpen(false)}
              disabled={!closeEnabled}
            >
              Fechar
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={editOpen}
          onClose={() => {
            setEditOpen(false)
            setEditingUser(null)
          }}
          creatableRoles={creatableRoles}
        />
      )}
    </div>
  )
}

function EditUserDialog({
  user,
  open,
  onClose,
  creatableRoles,
}: {
  user: EditingUser
  open: boolean
  onClose: () => void
  creatableRoles: { value: string; label: string }[]
}) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [editRole, setEditRole] = useState(user.role)
  const [active, setActive] = useState(user.active)

  const updateUser = useUpdateUser(user.id)

  useEffect(() => {
    setName(user.name)
    setEmail(user.email)
    setEditRole(user.role)
    setActive(user.active)
  }, [user])

  async function handleSave() {
    if (!name || !email) {
      toast.error('Nome e email são obrigatórios.')
      return
    }

    try {
      await updateUser.mutateAsync({
        name,
        email,
        role: editRole,
        active,
      })
      toast.success('Usuário atualizado com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao atualizar usuário.')
    }
  }

  const allRoles = [
    { value: user.role, label: ROLE_LABELS[user.role] ?? user.role },
    ...creatableRoles.filter((r) => r.value !== user.role),
  ]

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Editar Usuário</DialogTitle>
      <DialogDescription>Altere os dados do usuário.</DialogDescription>
      <div className="mt-4 space-y-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select
          label="Perfil"
          options={allRoles}
          value={editRole}
          onChange={(e) => setEditRole(e.target.value)}
        />
        <div>
          <label className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]">
            Status
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span className="text-sm text-[#111827]">Ativo</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateUser.isPending}
          >
            {updateUser.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
