import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'

export default async function companyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - Get company data
  fastify.get('/', { preHandler: roleGuard(['COMPANY_ADMIN']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const company = await prisma.company.findUnique({
        where: { id: request.companyId },
        select: {
          id: true,
          name: true,
          tradeName: true,
          cnpj: true,
          stateRegistration: true,
          plan: true,
          active: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
        },
      })

      if (!company) {
        return reply.status(404).send({ error: 'Empresa não encontrada' })
      }

      return reply.send(company)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar dados da empresa' })
    }
  })

  // PATCH / - Update company data
  fastify.patch('/', { preHandler: roleGuard(['COMPANY_ADMIN']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>

      const allowedFields = [
        'name', 'tradeName', 'cnpj', 'stateRegistration',
        'phone', 'email', 'address', 'city', 'state', 'zipCode',
      ]

      const updateData: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field]
        }
      }

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ error: 'Nenhum campo para atualizar' })
      }

      const company = await prisma.company.update({
        where: { id: request.companyId },
        data: updateData,
      })

      return reply.send(company)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao atualizar dados da empresa' })
    }
  })
}
