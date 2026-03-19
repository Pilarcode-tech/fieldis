'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Building, Users, Shield } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ConfiguracoesPage() {
  const { canViewSettings } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (canViewSettings === false) {
      router.push('/dashboard')
    }
  }, [canViewSettings, router])

  if (!canViewSettings) {
    return null
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-[#2563eb]" />
        <h2 className="text-lg font-semibold text-[#111827]">Configurações</h2>
      </div>

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
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Razão Social" placeholder="Razão social da empresa" />
            <Input label="Nome Fantasia" placeholder="Nome fantasia" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="CNPJ" placeholder="00.000.000/0000-00" className="font-mono-data" />
            <Input label="Inscrição Estadual" placeholder="Inscrição estadual" className="font-mono-data" />
          </div>
          <Input label="Endereço" placeholder="Endereço completo da sede" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Cidade" placeholder="Cidade" />
            <Input label="Estado" placeholder="UF" maxLength={2} />
            <Input label="CEP" placeholder="00000-000" className="font-mono-data" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Telefone" placeholder="(00) 0000-0000" />
            <Input label="Email" type="email" placeholder="contato@empresa.com" />
          </div>
          <div className="flex justify-end">
            <Button>Salvar Alterações</Button>
          </div>
        </CardContent>
      </Card>

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
          <div className="rounded-md border border-dashed border-[#e3e6ed] py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-[#e3e6ed]" />
            <p className="text-sm text-[#6b7280]">Gerenciamento de usuários em desenvolvimento.</p>
            <p className="mt-1 text-xs text-[#9ca3af]">Em breve você poderá adicionar e gerenciar usuários aqui.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#6b7280]" />
            <div>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Configurações de segurança da conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Senha Atual" type="password" placeholder="Sua senha atual" />
          <Input label="Nova Senha" type="password" placeholder="Nova senha" />
          <Input label="Confirmar Nova Senha" type="password" placeholder="Confirme a nova senha" />
          <div className="flex justify-end">
            <Button>Alterar Senha</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
