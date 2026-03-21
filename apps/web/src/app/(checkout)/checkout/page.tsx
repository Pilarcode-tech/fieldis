'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, CreditCard, FileText, QrCode, ArrowLeft } from 'lucide-react'
import axios from 'axios'

const PLANS: Record<string, { name: string; price: string; value: number }> = {
  BASICO: { name: 'Básico', price: 'R$ 297/mês', value: 297 },
  PROFISSIONAL: { name: 'Profissional', price: 'R$ 597/mês', value: 597 },
  EMPRESARIAL: { name: 'Empresarial', price: 'R$ 997/mês', value: 997 },
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const planoParam = searchParams.get('plano')?.toUpperCase() || 'PROFISSIONAL'
  const plan = PLANS[planoParam] || PLANS.PROFISSIONAL

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 fields
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')

  // Step 2 fields
  const [formaPagamento, setFormaPagamento] = useState('CREDIT_CARD')

  function formatCnpj(value: string) {
    const d = value.replace(/\D/g, '').slice(0, 14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  function formatPhone(value: string) {
    const d = value.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
  }

  function validateStep1() {
    if (!razaoSocial || !cnpj || !nomeResponsavel || !email) {
      toast.error('Preencha todos os campos obrigatórios.')
      return false
    }
    if (cnpj.replace(/\D/g, '').length !== 14) {
      toast.error('CNPJ inválido.')
      return false
    }
    return true
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
      const { data } = await axios.post(`${apiUrl}/checkout/iniciar`, {
        razaoSocial,
        cnpj,
        nomeResponsavel,
        email,
        telefone,
        plano: planoParam,
        formaPagamento,
      })

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        toast.success('Assinatura iniciada! Verifique seu email para os próximos passos.')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Erro ao processar assinatura. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step >= 1 ? 'bg-[#2563eb] text-white' : 'bg-[#e3e6ed] text-[#9ca3af]'}`}>1</div>
        <div className={`h-0.5 flex-1 ${step >= 2 ? 'bg-[#2563eb]' : 'bg-[#e3e6ed]'}`} />
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step >= 2 ? 'bg-[#2563eb] text-white' : 'bg-[#e3e6ed] text-[#9ca3af]'}`}>2</div>
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-[#e3e6ed] bg-white p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Dados da empresa</h2>
          <p className="mt-1 text-sm text-[#6b7280]">Plano selecionado: <strong>{plan.name}</strong> — {plan.price}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b7280]">Razão Social *</label>
              <input className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 text-sm focus:border-[#2563eb] focus:outline-none" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b7280]">CNPJ *</label>
              <input className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 font-mono text-sm focus:border-[#2563eb] focus:outline-none" value={cnpj} onChange={e => setCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b7280]">Nome do responsável *</label>
              <input className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 text-sm focus:border-[#2563eb] focus:outline-none" value={nomeResponsavel} onChange={e => setNomeResponsavel(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b7280]">Email *</label>
              <input type="email" className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 text-sm focus:border-[#2563eb] focus:outline-none" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b7280]">Telefone</label>
              <input className="flex h-10 w-full rounded-md border border-[#e3e6ed] bg-[#f4f5f7] px-3 text-sm focus:border-[#2563eb] focus:outline-none" value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <button
            onClick={() => validateStep1() && setStep(2)}
            className="mt-6 w-full rounded-lg bg-[#2563eb] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-[#e3e6ed] bg-white p-6">
          <button onClick={() => setStep(1)} className="mb-4 flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827]">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </button>

          <h2 className="text-xl font-semibold text-[#111827]">Forma de pagamento</h2>

          <div className="mt-6 space-y-3">
            {[
              { value: 'CREDIT_CARD', icon: CreditCard, label: 'Cartão de crédito recorrente' },
              { value: 'BOLETO', icon: FileText, label: 'Boleto mensal' },
              { value: 'PIX', icon: QrCode, label: 'Pix mensal' },
            ].map(opt => (
              <label key={opt.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${formaPagamento === opt.value ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-[#e3e6ed] hover:bg-[#f9fafb]'}`}>
                <input type="radio" name="pagamento" value={opt.value} checked={formaPagamento === opt.value} onChange={() => setFormaPagamento(opt.value)} className="h-4 w-4 text-[#2563eb]" />
                <opt.icon className="h-5 w-5 text-[#6b7280]" />
                <span className="text-sm font-medium text-[#111827]">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-[#e3e6ed] bg-[#f9fafb] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#111827]">Plano {plan.name}</p>
                <p className="text-xs text-[#9ca3af]">14 dias grátis — cobrança após o período de teste</p>
              </div>
              <p className="text-lg font-bold text-[#111827]">{plan.price}</p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#2563eb] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Finalizar assinatura'}
          </button>
        </div>
      )}
    </div>
  )
}
