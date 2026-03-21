import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { createCustomer, createSubscription, getSubscriptionPayments } from '../../lib/asaas'

const PLAN_VALUES: Record<string, number> = {
  BASICO: 297.00,
  PROFISSIONAL: 597.00,
  EMPRESARIAL: 997.00,
}

export default async function checkoutRoutes(fastify: FastifyInstance) {
  // POST /iniciar - Public (no auth)
  fastify.post('/iniciar', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        razaoSocial: string
        cnpj: string
        nomeResponsavel: string
        email: string
        telefone?: string
        plano: string
        formaPagamento: string
      }

      if (!body.razaoSocial || !body.cnpj || !body.email || !body.nomeResponsavel || !body.plano) {
        return reply.status(400).send({ error: 'Campos obrigatórios: razaoSocial, cnpj, email, nomeResponsavel, plano' })
      }

      const cnpjDigits = body.cnpj.replace(/\D/g, '')
      if (cnpjDigits.length !== 14) {
        return reply.status(400).send({ error: 'CNPJ inválido' })
      }

      // Check if CNPJ already exists as company
      const existingCompany = await prisma.company.findUnique({ where: { cnpj: body.cnpj } })
      if (existingCompany) {
        return reply.status(409).send({ error: 'CNPJ já cadastrado no sistema' })
      }

      // Check if lead already exists
      const existingLead = await prisma.checkoutLead.findUnique({ where: { cnpj: body.cnpj } })
      if (existingLead?.status === 'ACTIVE') {
        return reply.status(409).send({ error: 'Assinatura já ativa para este CNPJ' })
      }

      // Create customer in Asaas
      const customer = await createCustomer({
        name: body.nomeResponsavel,
        email: body.email,
        cpfCnpj: cnpjDigits,
        phone: body.telefone?.replace(/\D/g, ''),
      })

      // Create subscription
      const value = PLAN_VALUES[body.plano] ?? PLAN_VALUES.BASICO
      const nextDueDate = new Date()
      nextDueDate.setDate(nextDueDate.getDate() + 14) // 14 days free trial
      const dueDateStr = nextDueDate.toISOString().split('T')[0]

      const billingType = (body.formaPagamento === 'BOLETO' ? 'BOLETO' :
        body.formaPagamento === 'PIX' ? 'PIX' : 'CREDIT_CARD') as 'CREDIT_CARD' | 'BOLETO' | 'PIX'

      const subscription = await createSubscription({
        customer: customer.id,
        billingType,
        value,
        nextDueDate: dueDateStr,
        cycle: 'MONTHLY',
        description: `Fieldis ${body.plano} — ${body.razaoSocial}`,
        externalReference: body.cnpj,
      })

      // Save or update lead
      await prisma.checkoutLead.upsert({
        where: { cnpj: body.cnpj },
        create: {
          cnpj: body.cnpj,
          razaoSocial: body.razaoSocial,
          email: body.email,
          nomeResponsavel: body.nomeResponsavel,
          telefone: body.telefone,
          plano: body.plano as 'BASICO' | 'PROFISSIONAL' | 'EMPRESARIAL',
          asaasCustomerId: customer.id,
          asaasSubscriptionId: subscription.id,
          status: 'PENDING',
        },
        update: {
          razaoSocial: body.razaoSocial,
          email: body.email,
          nomeResponsavel: body.nomeResponsavel,
          telefone: body.telefone,
          plano: body.plano as 'BASICO' | 'PROFISSIONAL' | 'EMPRESARIAL',
          asaasCustomerId: customer.id,
          asaasSubscriptionId: subscription.id,
          status: 'PENDING',
        },
      })

      // Wait for Asaas to generate the first payment
      await new Promise(resolve => setTimeout(resolve, 2000))

      const payments = await getSubscriptionPayments(subscription.id)
      const firstPayment = payments.data?.[0]

      const paymentUrl = firstPayment?.invoiceUrl
        || firstPayment?.bankSlipUrl
        || subscription.paymentUrl
        || null

      return reply.send({
        subscriptionId: subscription.id,
        paymentUrl,
        paymentId: firstPayment?.id || null,
      })
    } catch (err) {
      request.log.error(err)
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      return reply.status(500).send({ error: 'Erro ao iniciar checkout', detail: message })
    }
  })
}
