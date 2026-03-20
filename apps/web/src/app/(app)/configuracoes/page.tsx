'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Settings, Building, Users, Shield } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useCompany, useUpdateCompany, useChangePassword } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
].map(uf => ({ value: uf, label: uf }))

interface CompanyForm {
  name: string
  tradeName: string
  cnpj: string
  stateRegistration: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zipCode: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ConfiguracoesPage() {
  const { canViewSettings } = usePermissions()
  const router = useRouter()
  const { data: company, isLoading } = useCompany()
  const updateCompany = useUpdateCompany()
  const changePassword = useChangePassword()
  const [passwordError, setPasswordError] = useState('')

  const {
    register: registerCompany,
    handleSubmit: handleCompanySubmit,
    formState: { errors: companyErrors, isDirty: companyDirty },
  } = useForm<CompanyForm>({
    values: company ? {
      name: company.name ?? '',
      tradeName: company.tradeName ?? '',
      cnpj: company.cnpj ?? '',
      stateRegistration: company.stateRegistration ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      address: company.address ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      zipCode: company.zipCode ?? '',
    } : undefined,
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>()

  const newPasswordVal = watchPassword('newPassword')

  async function onCompanySubmit(data: CompanyForm) {
    try {
      await updateCompany.mutateAsync(data)
      toast.success('Dados atualizados com sucesso.')
    } catch {
      toast.error('Erro ao atualizar dados da empresa.')
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPasswordError('')
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('Senha alterada com sucesso.')
      resetPassword()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (msg === 'Senha atual incorreta') {
        setPasswordError(msg)
      } else {
        toast.error(msg || 'Erro ao alterar senha.')
      }
    }
  }

  if (!canViewSettings) {
    router.push('/dashboard')
    return null
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-[#2563eb]" />
        <h2 className="text-lg font-semibold text-[#111827]">Configurações</h2>
      </div>

      {/* Company Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-[#6b7280]" />
            <div>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Informações cadastrais da sua empresa</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleCompanySubmit(onCompanySubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Razão Social"
                  placeholder="Razão social da empresa"
                  error={companyErrors.name?.message}
                  {...registerCompany('name', { required: 'Razão social é obrigatória' })}
                />
                <Input
                  label="Nome Fantasia"
                  placeholder="Nome fantasia"
                  {...registerCompany('tradeName')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="CNPJ"
                  placeholder="00.000.000/0000-00"
                  className="font-mono-data"
                  {...registerCompany('cnpj')}
                />
                <Input
                  label="Inscrição Estadual"
                  placeholder="Inscrição estadual"
                  className="font-mono-data"
                  {...registerCompany('stateRegistration')}
                />
              </div>
              <Input
                label="Endereço"
                placeholder="Endereço completo da sede"
                {...registerCompany('address')}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Cidade"
                  placeholder="Cidade"
                  {...registerCompany('city')}
                />
                <Select
                  label="Estado"
                  options={[{ value: '', label: 'Selecione' }, ...UF_OPTIONS]}
                  {...registerCompany('state')}
                />
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  className="font-mono-data"
                  {...registerCompany('zipCode')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  {...registerCompany('phone')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="contato@empresa.com"
                  {...registerCompany('email')}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!companyDirty || updateCompany.isPending}>
                  {updateCompany.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#6b7280]" />
            <div>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>Gerencie os usuários que têm acesso ao sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-[#e3e6ed] bg-[#f9fafb] px-4 py-3">
            <p className="text-sm text-[#6b7280]">Adicione, edite e desative usuários do sistema.</p>
            <Button variant="outline" size="sm" onClick={() => router.push('/configuracoes/usuarios')}>
              Gerenciar Usuários
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#6b7280]" />
            <div>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Altere sua senha de acesso ao sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <Input
                label="Senha Atual"
                type="password"
                placeholder="Sua senha atual"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword('currentPassword', { required: 'Informe a senha atual' })}
              />
              {passwordError && (
                <p className="mt-1 text-xs text-[#dc2626]">{passwordError}</p>
              )}
            </div>
            <Input
              label="Nova Senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              error={passwordErrors.newPassword?.message}
              {...registerPassword('newPassword', {
                required: 'Informe a nova senha',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
            />
            <Input
              label="Confirmar Nova Senha"
              type="password"
              placeholder="Confirme a nova senha"
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword', {
                required: 'Confirme a nova senha',
                validate: (value) => value === newPasswordVal || 'As senhas não conferem',
              })}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
