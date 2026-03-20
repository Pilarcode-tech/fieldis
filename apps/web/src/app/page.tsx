'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Zap, Menu, X, Clock, Calculator, BarChart3,
  FileCheck, Wallet, Shield, ChevronDown, ArrowRight,
} from 'lucide-react'

// ── Intersection Observer hook ──────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInView()
  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </section>
  )
}

// ── FAQ data ────────────────────────────────────────────
const faqs = [
  { q: 'O Fieldis funciona no celular?', a: 'Sim. A tela de ponto foi desenvolvida para uso mobile pelo supervisor em campo. Funciona em qualquer smartphone com navegador.' },
  { q: 'Como funciona o cálculo de folha?', a: 'O motor de cálculo aplica automaticamente INSS progressivo, IRRF, DSR, insalubridade por grau, periculosidade e horas extras conforme as tabelas vigentes. Você confere e fecha.' },
  { q: 'Preciso instalar algum software?', a: 'Não. O Fieldis é 100% web — acessa pelo navegador em qualquer dispositivo. Nada para instalar.' },
  { q: 'Meus dados estão seguros?', a: 'Cada empresa tem dados completamente isolados. Usamos PostgreSQL com Row Level Security e conexão criptografada via HTTPS.' },
  { q: 'Posso migrar meus dados de planilha?', a: 'Sim. Nossa equipe auxilia na importação dos dados durante o onboarding sem custo adicional.' },
]

// ── Main Component ──────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Para quem é', href: '#para-quem' },
    { label: 'Planos', href: '#planos' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ═══ HEADER ═══ */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 shadow-sm backdrop-blur-sm' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2563eb]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className={`text-lg font-bold ${scrolled ? 'text-[#111827]' : 'text-white'}`}>Fieldis</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors hover:text-[#2563eb] ${scrolled ? 'text-[#6b7280]' : 'text-white/80'}`}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className={`text-sm font-medium transition-colors hover:text-[#2563eb] ${scrolled ? 'text-[#6b7280]' : 'text-white/80'}`}>
              Entrar
            </Link>
            <Link href="/login" className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8]">
              Começar grátis
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen
              ? <X className={`h-6 w-6 ${scrolled ? 'text-[#111827]' : 'text-white'}`} />
              : <Menu className={`h-6 w-6 ${scrolled ? 'text-[#111827]' : 'text-white'}`} />
            }
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#e3e6ed] bg-white px-4 py-4 md:hidden">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#374151]">{l.label}</a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/login" className="text-center text-sm font-medium text-[#6b7280]">Entrar</Link>
              <Link href="/login" className="rounded-lg bg-[#2563eb] px-4 py-2.5 text-center text-sm font-medium text-white">Começar grátis</Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══ HERO ═══ */}
      <div className="relative flex min-h-screen items-center">
        <Image src="/images/landing/hero.png" alt="Supervisor em subestação elétrica" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/80 via-[#0f172a]/50 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="mb-4 inline-block rounded-full bg-[#2563eb]/20 px-4 py-1.5 text-xs font-medium text-[#93c5fd] backdrop-blur-sm">
              Gestão para montagem eletromecânica
            </span>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Controle sua equipe em campo. Calcule a folha com precisão.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
              Do registro de ponto na frente de serviço ao fechamento da folha com insalubridade, periculosidade e horas extras — tudo integrado.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
                Começar grátis
              </Link>
              <Link href="/login" className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                Ver demonstração
              </Link>
            </div>
            <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 sm:gap-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">500+</span>
                <span className="text-sm text-white/70">funcionários gerenciados</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-white/30" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">100%</span>
                <span className="text-sm text-white/70">das verbas trabalhistas</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-white/30" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">Zero</span>
                <span className="text-sm text-white/70">planilhas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PROVA SOCIAL ═══ */}
      <Section className="bg-[#f9fafb] py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <p className="mb-8 text-sm font-medium text-[#9ca3af]">Confiado por empresas de montagem em todo o Brasil</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {['Eletromonte', 'Voltec Engenharia', 'NovaPower', 'Montagem Sul', 'Energia Brasil'].map(name => (
              <span key={name} className="text-lg font-bold tracking-wide text-[#d1d5db]">{name}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PARA QUEM É ═══ */}
      <Section id="para-quem" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-[#111827]">Feito para quem trabalha com montagem industrial</h2>
            <p className="mt-3 text-[#6b7280]">Cada perfil tem acesso apenas ao que precisa.</p>
          </div>

          <div className="space-y-12 lg:space-y-16">
            {[
              { img: '/images/landing/supervisor.png', tag: 'Supervisor de Campo', tagColor: 'bg-orange-100 text-orange-700', title: 'Registre presença em segundos', text: 'Selecione a equipe, marque quem chegou e confirme com um clique. Sem papel, sem ligação.' },
              { img: '/images/landing/equipe.png', tag: 'Gestão de Projetos', tagColor: 'bg-blue-100 text-blue-700', title: 'Custo real por obra em tempo real', text: 'Acompanhe mão de obra e despesas por projeto. Saiba exatamente onde está o orçamento.' },
              { img: '/images/landing/rh.png', tag: 'Gestores de RH', tagColor: 'bg-green-100 text-green-700', title: 'Folha sem erro, sem planilha', text: 'Cálculo automático de INSS, IRRF, insalubridade e periculosidade. Confira, ajuste e feche.' },
            ].map((card, i) => (
              <div key={card.title} className={`flex flex-col items-center gap-8 lg:flex-row ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                <div className="relative h-64 w-full overflow-hidden rounded-xl lg:h-80 lg:w-1/2">
                  <Image src={card.img} alt={card.title} fill className="object-cover" />
                </div>
                <div className="w-full lg:w-1/2">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${card.tagColor}`}>{card.tag}</span>
                  <h3 className="mt-3 text-2xl font-bold text-[#111827]">{card.title}</h3>
                  <p className="mt-3 text-[#6b7280] leading-relaxed">{card.text}</p>
                  <a href="#funcionalidades" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2563eb] hover:underline">
                    Saiba mais <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FUNCIONALIDADES ═══ */}
      <Section id="funcionalidades" className="bg-[#f9fafb] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-[#111827]">Tudo que sua operação precisa</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Clock, title: 'Ponto em campo', text: 'Registro em lote com GPS direto do celular. Entrada e saída da equipe inteira em segundos.' },
              { icon: Calculator, title: 'Folha automática', text: 'INSS progressivo, IRRF, DSR, insalubridade, periculosidade e horas extras calculados automaticamente.' },
              { icon: BarChart3, title: 'Custo por projeto', text: 'Veja o custo real de mão de obra e despesas por obra em tempo real. Sem planilha paralela.' },
              { icon: FileCheck, title: 'Documentos com validade', text: 'ASO, NR-10, NR-35 com alerta automático antes do vencimento. Nunca mais um documento vencido.' },
              { icon: Wallet, title: 'Adiantamentos', text: 'Funcionário solicita, RH aprova, desconto automático na folha. Fluxo completo.' },
              { icon: Shield, title: 'Dados isolados por empresa', text: 'Cada empresa tem acesso apenas aos próprios dados. Segurança de nível bancário.' },
            ].map(feat => (
              <div key={feat.title} className="rounded-xl border border-[#e3e6ed] bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6ff]">
                  <feat.icon className="h-5 w-5 text-[#2563eb]" />
                </div>
                <h3 className="text-lg font-semibold text-[#111827]">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">{feat.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PLANOS ═══ */}
      <Section id="planos" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#111827]">Planos simples, sem surpresas</h2>
            <p className="mt-3 text-[#6b7280]">Todos os planos incluem todos os módulos.</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
            {/* Básico */}
            <div className="rounded-xl border border-[#e3e6ed] bg-white p-6">
              <h3 className="text-lg font-semibold text-[#111827]">Básico</h3>
              <div className="mt-3"><span className="text-3xl font-bold text-[#111827]">R$ 297</span><span className="text-sm text-[#6b7280]">/mês</span></div>
              <ul className="mt-6 space-y-3 text-sm text-[#6b7280]">
                <li>Até 30 funcionários</li>
                <li>Todos os módulos incluídos</li>
                <li>Suporte por e-mail</li>
              </ul>
              <Link href="/login" className="mt-6 block rounded-lg border border-[#2563eb] py-2.5 text-center text-sm font-medium text-[#2563eb] transition-colors hover:bg-[#eff6ff]">
                Começar grátis
              </Link>
            </div>

            {/* Profissional */}
            <div className="relative rounded-xl border-2 border-[#2563eb] bg-white p-6">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2563eb] px-3 py-0.5 text-xs font-medium text-white">Mais popular</span>
              <h3 className="text-lg font-semibold text-[#111827]">Profissional</h3>
              <div className="mt-3"><span className="text-3xl font-bold text-[#111827]">R$ 597</span><span className="text-sm text-[#6b7280]">/mês</span></div>
              <ul className="mt-6 space-y-3 text-sm text-[#6b7280]">
                <li>Até 100 funcionários</li>
                <li>Todos os módulos incluídos</li>
                <li>Suporte prioritário</li>
                <li>Exportação de relatórios</li>
              </ul>
              <Link href="/login" className="mt-6 block rounded-lg bg-[#2563eb] py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8]">
                Começar grátis
              </Link>
            </div>

            {/* Empresarial */}
            <div className="rounded-xl border border-[#e3e6ed] bg-white p-6">
              <h3 className="text-lg font-semibold text-[#111827]">Empresarial</h3>
              <div className="mt-3"><span className="text-3xl font-bold text-[#111827]">Sob consulta</span></div>
              <ul className="mt-6 space-y-3 text-sm text-[#6b7280]">
                <li>Funcionários ilimitados</li>
                <li>Multi-empresa</li>
                <li>Suporte dedicado</li>
                <li>SLA garantido</li>
              </ul>
              <a href="mailto:contato@fieldis.com.br" className="mt-6 block rounded-lg border border-[#e3e6ed] py-2.5 text-center text-sm font-medium text-[#6b7280] transition-colors hover:bg-[#f9fafb]">
                Falar com vendas
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-[#9ca3af]">
            Todos os planos com 14 dias grátis. Sem cartão de crédito.
          </p>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" className="bg-[#f9fafb] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold text-[#111827]">Perguntas frequentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#e3e6ed] bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-[#111827]"
                >
                  {faq.q}
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#9ca3af] transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: openFaq === i ? '200px' : '0' }}
                >
                  <p className="px-5 pb-4 text-sm leading-relaxed text-[#6b7280]">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ CTA FINAL ═══ */}
      <Section className="bg-[#1e3a5f] py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">Pronto para sair das planilhas?</h2>
          <p className="mt-4 text-white/70">Configure em minutos. 14 dias grátis. Sem cartão de crédito.</p>
          <Link href="/login" className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-[#1e3a5f] transition-colors hover:bg-[#f1f5f9]">
            Começar grátis agora
          </Link>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-[#0f172a] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb]">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Fieldis</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#9ca3af]">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            ))}
            <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
          </div>
          <a href="mailto:contato@fieldis.com.br" className="text-sm text-[#6b7280] hover:text-white transition-colors">contato@fieldis.com.br</a>
          <div className="text-center text-xs text-[#4b5563]">
            <p>&copy; 2026 Fieldis. Todos os direitos reservados.</p>
            <p className="mt-1">Desenvolvido por Pilarcode</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
