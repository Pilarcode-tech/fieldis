import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AssinaturaInativaPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
      <h1 className="text-2xl font-bold text-[#111827]">Assinatura inativa</h1>
      <p className="mt-3 text-[#6b7280]">
        Sua assinatura está inativa. Regularize seu pagamento
        para voltar a acessar o sistema.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <a
          href="mailto:contato@fieldis.com.br"
          className="rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
        >
          Entrar em contato
        </a>
        <Link href="/login" className="text-sm text-[#6b7280] hover:text-[#111827]">
          Tentar acessar novamente
        </Link>
      </div>
    </div>
  )
}
