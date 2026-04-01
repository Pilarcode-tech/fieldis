'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface CreatedResult {
  company: { id: string; name: string }
  adminUser: { email: string; tempPassword: string; name: string }
}

export default function NovaEmpresaPage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<CreatedResult | null>(null)
  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    plan: 'BASICO',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    adminName: '',
    adminEmail: '',
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/companies', data).then((r) => r.data),
    onSuccess: (data: CreatedResult) => {
      setResult(data)
      toast.success('Empresa criada com sucesso')
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Erro ao criar empresa')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function copyCredentials() {
    if (!result) return
    navigator.clipboard.writeText(`Email: ${result.adminUser.email}\nSenha: ${result.adminUser.tempPassword}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/empresas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-syne text-2xl font-bold text-[#111827]">Nova Empresa</h1>
          <p className="text-sm text-[#6b7280]">Cadastre uma nova empresa na plataforma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Razao Social" required value={form.name} onChange={(e) => update('name', e.target.value)} />
            <Input label="CNPJ" required value={form.cnpj} onChange={(e) => update('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            <Select
              label="Plano"
              options={[
                { value: 'BASICO', label: 'Basico' },
                { value: 'PROFISSIONAL', label: 'Profissional' },
                { value: 'EMPRESARIAL', label: 'Empresarial' },
              ]}
              value={form.plan}
              onChange={(e) => update('plan', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Telefone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <Input label="Endereco" value={form.address} onChange={(e) => update('address', e.target.value)} />
            <div className="grid grid-cols-3 gap-4">
              <Input label="Cidade" value={form.city} onChange={(e) => update('city', e.target.value)} />
              <Input label="Estado" value={form.state} onChange={(e) => update('state', e.target.value)} />
              <Input label="CEP" value={form.zipCode} onChange={(e) => update('zipCode', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Administrador da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Nome do Admin" required value={form.adminName} onChange={(e) => update('adminName', e.target.value)} />
              <Input label="Email do Admin" required type="email" value={form.adminEmail} onChange={(e) => update('adminEmail', e.target.value)} />
              <p className="text-xs text-[#6b7280]">
                Uma senha temporaria sera gerada automaticamente. Voce podera copia-la apos a criacao.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Criando...' : 'Criar Empresa'}
          </Button>
        </div>
      </form>

      <Dialog open={!!result} onClose={() => { setResult(null); router.push('/admin/empresas') }}>
        <DialogTitle>Empresa Criada</DialogTitle>
        <DialogDescription>A empresa foi criada com sucesso. Envie as credenciais abaixo para o administrador.</DialogDescription>
        {result && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-[#f4f5f7] p-4">
              <p className="font-mono-data text-[11px] uppercase tracking-wider text-[#6b7280]">Empresa</p>
              <p className="text-sm font-medium text-[#111827]">{result.company.name}</p>
            </div>
            <div className="rounded-lg bg-[#f4f5f7] p-4">
              <p className="font-mono-data text-[11px] uppercase tracking-wider text-[#6b7280]">Credenciais do Admin</p>
              <p className="mt-1 text-sm text-[#111827]">Email: <span className="font-medium">{result.adminUser.email}</span></p>
              <p className="text-sm text-[#111827]">Senha: <span className="font-mono font-medium">{result.adminUser.tempPassword}</span></p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={copyCredentials} className="flex-1">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar Credenciais'}
              </Button>
              <Button onClick={() => { setResult(null); router.push('/admin/empresas') }} className="flex-1">
                Ir para Empresas
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
