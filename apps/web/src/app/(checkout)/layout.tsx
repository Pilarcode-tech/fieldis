import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <header className="border-b border-[#e3e6ed] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2563eb]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#111827]">Fieldis</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
