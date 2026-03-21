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
  bankSlipUrl?: string
  paymentUrl?: string
}

export async function createCustomer(data: {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
}): Promise<AsaasCustomer> {
  const cleanPhone = data.phone?.replace(/\D/g, '')
  const phone = cleanPhone && cleanPhone.length >= 10 ? cleanPhone : undefined

  const payload = {
    name: data.name,
    email: data.email,
    cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
    ...(phone ? { phone } : {}),
  }
  const res = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
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
  const subscription = await res.json()

  // Normalize payment URL from different Asaas response fields
  const paymentUrl = subscription.invoiceUrl
    || subscription.bankSlipUrl
    || `${ASAAS_BASE_URL.replace('/api/v3', '')}/i/${subscription.id}`

  return { ...subscription, paymentUrl }
}

export async function getSubscriptionPayments(subscriptionId: string): Promise<{ data: Array<{ id: string; invoiceUrl: string; bankSlipUrl: string; status: string }> }> {
  const res = await fetch(`${ASAAS_BASE_URL}/payments?subscription=${subscriptionId}`, { headers })
  if (!res.ok) throw new Error('Asaas getSubscriptionPayments failed')
  return res.json()
}

export async function getSubscription(id: string): Promise<AsaasSubscription> {
  const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${id}`, { headers })
  if (!res.ok) throw new Error('Asaas getSubscription failed')
  return res.json()
}
