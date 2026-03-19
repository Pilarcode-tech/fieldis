'use client'

import { useState } from 'react'
import { FolderOpen, Eye, Download, AlertCircle, Loader2 } from 'lucide-react'
import { formatDate, statusLabel } from '@fieldis/shared'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployeeDocuments } from '@/hooks/useApi'
import { useSession, getSession } from 'next-auth/react'

const DOC_TYPE_LABELS: Record<string, string> = {
  RG: 'RG',
  CPF: 'CPF',
  CTPS: 'CTPS',
  PIS: 'PIS/PASEP',
  ASO: 'ASO',
  CNH: 'CNH',
  COMPROVANTE_RESIDENCIA: 'Comprovante Residência',
  CONTRATO_TRABALHO: 'Contrato de Trabalho',
  TERMO_EPI: 'NR-06 (EPI)',
  NR_10: 'NR-10',
  NR_33: 'NR-33',
  NR_35: 'NR-35',
  OUTROS: 'Outros',
}

export default function DocumentosPage() {
  const { data: session } = useSession()
  const employeeId = session?.user?.employeeId
  const { data: documents, isLoading } = useEmployeeDocuments(employeeId)
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

  async function handleViewDoc(docId: string, fileUrl: string) {
    setLoadingDoc(docId)
    try {
      const sess = await getSession()
      const res = await fetch(apiBaseUrl + fileUrl, {
        headers: { Authorization: `Bearer ${sess?.accessToken}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch {
      toast.error('Erro ao abrir documento. Tente novamente.')
    } finally {
      setLoadingDoc(null)
    }
  }

  async function handleDownloadDoc(docId: string, fileUrl: string, fileName: string) {
    setLoadingDoc(docId)
    try {
      const sess = await getSession()
      const res = await fetch(apiBaseUrl + fileUrl, {
        headers: { Authorization: `Bearer ${sess?.accessToken}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao baixar documento. Tente novamente.')
    } finally {
      setLoadingDoc(null)
    }
  }

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
        <h2 className="text-lg font-semibold text-[#111827]">Conta não vinculada</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Sua conta não está vinculada a um funcionário.
          Fale com o RH para regularizar.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[#2563eb]" />
          <h2 className="text-lg font-semibold text-[#111827]">Meus Documentos</h2>
        </div>
        <p className="mt-1 text-sm text-[#6b7280]">Consulte seus documentos enviados pelo RH</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-[#e3e6ed]">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    </p>
                    <p className="text-xs text-[#9ca3af]">
                      {doc.fileName}
                      {doc.expiresAt && <> — Vence em: {formatDate(doc.expiresAt)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      doc.status === 'VALID' ? 'success' :
                      doc.status === 'EXPIRED' ? 'destructive' :
                      'warning'
                    }>
                      {statusLabel(doc.status)}
                    </Badge>
                    {doc.fileUrl?.startsWith('/documentos/') && (
                      <>
                        <button
                          onClick={() => handleViewDoc(doc.id, doc.fileUrl)}
                          disabled={loadingDoc === doc.id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#2563eb] hover:bg-[#eff6ff] transition-colors disabled:opacity-50"
                        >
                          {loadingDoc === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          Ver
                        </button>
                        <button
                          onClick={() => handleDownloadDoc(doc.id, doc.fileUrl, doc.fileName)}
                          disabled={loadingDoc === doc.id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e3e6ed] py-16">
          <FolderOpen className="mb-2 h-8 w-8 text-[#e3e6ed]" />
          <p className="text-sm text-[#9ca3af]">Nenhum documento disponível ainda.</p>
          <p className="mt-1 text-xs text-[#9ca3af]">Fale com o RH para enviar seus documentos.</p>
        </div>
      )}
    </div>
  )
}
