import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendWelcomeEmail } from '../../lib/email'

export default async function asaasWebhookRoutes(fastify: FastifyInstance) {
  // POST / - Asaas webhook (public, no JWT)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify webhook token
      const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
      if (webhookToken) {
        const headerToken = request.headers['asaas-access-token']
        if (headerToken !== webhookToken) {
          return reply.status(401).send({ error: 'Token inválido' })
        }
      }

      const body = request.body as {
        event: string
        payment?: { externalReference?: string; subscription?: string }
        subscription?: { externalReference?: string; id?: string }
      }

      const event = body.event
      const externalRef = body.payment?.externalReference || body.subscription?.externalReference

      if (!externalRef) {
        return reply.status(200).send({ received: true, skipped: 'no externalReference' })
      }

      const cnpj = externalRef

      if (event === 'PAYMENT_CONFIRMED' || event === 'SUBSCRIPTION_CREATED') {
        // Find the lead
        const lead = await prisma.checkoutLead.findUnique({ where: { cnpj } })
        if (!lead) {
          return reply.status(200).send({ received: true, skipped: 'lead not found' })
        }

        // Check if company already exists
        const existingCompany = await prisma.company.findUnique({ where: { cnpj } })
        if (existingCompany) {
          // Update lead status
          await prisma.checkoutLead.update({ where: { cnpj }, data: { status: 'ACTIVE' } })
          return reply.status(200).send({ received: true, skipped: 'company already exists' })
        }

        // Generate temporary password
        const tempPassword = randomBytes(4).toString('hex') // 8 chars
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        // Create company
        const company = await prisma.company.create({
          data: {
            name: lead.razaoSocial,
            cnpj: lead.cnpj,
            plan: lead.plano,
            email: lead.email,
            phone: lead.telefone,
            active: true,
          },
        })

        // Create admin user
        await prisma.user.create({
          data: {
            companyId: company.id,
            name: lead.nomeResponsavel,
            email: lead.email,
            password: hashedPassword,
            role: 'COMPANY_ADMIN',
            active: true,
          },
        })

        // Update lead status
        await prisma.checkoutLead.update({ where: { cnpj }, data: { status: 'ACTIVE' } })

        // Send welcome email
        try {
          const loginUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/login`
            : 'https://fieldis.com.br/login'

          await sendWelcomeEmail({
            to: lead.email,
            name: lead.nomeResponsavel,
            companyName: lead.razaoSocial,
            tempPassword,
            loginUrl,
          })
        } catch (emailErr) {
          request.log.error({ err: emailErr }, 'Failed to send welcome email')
          // Don't fail the webhook — company was created successfully
        }

        return reply.status(200).send({ received: true, action: 'company_created' })
      }

      if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_DELETED' || event === 'PAYMENT_DELETED') {
        const company = await prisma.company.findUnique({ where: { cnpj } })
        if (company) {
          await prisma.company.update({ where: { cnpj }, data: { active: false } })
          await prisma.checkoutLead.update({ where: { cnpj }, data: { status: 'INACTIVE' } }).catch(() => {})
        }
        return reply.status(200).send({ received: true, action: 'company_deactivated' })
      }

      return reply.status(200).send({ received: true, event })
    } catch (err) {
      request.log.error(err)
      return reply.status(200).send({ received: true, error: 'internal' })
    }
  })
}
