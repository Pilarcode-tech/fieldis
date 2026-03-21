const ASAAS_BASE_URL = process.env.ASAAS_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/api/v3'

const headers = {
  'Content-Type': 'application/json',
  'access_token': process.env.ASAAS_API_KEY || '',
}

interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
}

interface AsaasSubscription {
  id: string
  status: string
  invoiceUrl?: string
}

export async function createCustomer(data: {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
}): Promise<AsaasCustomer> {
  const res = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Asaas createCustomer failed: ${JSON.stringify(err)}`)
  }
  return res.json()
}

export async function createSubscription(data: {
  customer: string
  billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX'
  value: number
  nextDueDate: string
  cycle: 'MONTHLY'
  description: string
  externalReference: string
}): Promise<AsaasSubscription> {
  const res = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Asaas createSubscription failed: ${JSON.stringify(err)}`)
  }
  return res.json()
}

export async function getSubscription(id: string): Promise<AsaasSubscription> {
  const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${id}`, { headers })
  if (!res.ok) throw new Error('Asaas getSubscription failed')
  return res.json()
}
