import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { CreateAdvanceSchema } from '@fieldis/shared'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'

interface ListQuery {
  status?: string
  employeeId?: string
  page?: string
  limit?: string
}

interface IdParam {
  id: string
}

export default async function adiantamentoRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - List advances with filters
  fastify.get('/', async (request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { status, employeeId, page = '1', limit = '20' } = request.query

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { companyId }

      // EMPLOYEE role: only see their own advances
      if (request.role === 'EMPLOYEE' && request.employeeId) {
        where.employeeId = request.employeeId
      } else if (employeeId) {
        where.employeeId = employeeId
      }

      if (status) {
        where.status = status
      }

      const [advances, total] = await Promise.all([
        prisma.advance.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: { id: true, name: true, cpf: true, role: true },
            },
          },
        }),
        prisma.advance.count({ where }),
      ])

      return reply.send({
        data: advances,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao listar adiantamentos' })
    }
  })

  // POST / - Create advance
  fastify.post('/', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'EMPLOYEE']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const parsed = CreateAdvanceSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const data = parsed.data

      // EMPLOYEE role: can only request advances for themselves
      if (request.role === 'EMPLOYEE') {
        if (!request.employeeId || data.employeeId !== request.employeeId) {
          return reply.status(403).send({ error: 'Funcionários só podem solicitar adiantamentos para si mesmos' })
        }
      }

      // Verify employee belongs to this company
      const employee = await prisma.employee.findFirst({
        where: { id: data.employeeId, companyId },
      })

      if (!employee) {
        return reply.status(404).send({ error: 'Funcionário não encontrado' })
      }

      const advance = await prisma.advance.create({
        data: {
          companyId,
          employeeId: data.employeeId,
          amount: data.amount,
          reason: data.reason,
          discountMonth: data.discountMonth,
          discountYear: data.discountYear,
        },
        include: {
          employee: {
            select: { id: true, name: true },
          },
        },
      })

      return reply.status(201).send(advance)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao criar adiantamento' })
    }
  })

  // PATCH /:id/aprovar - Approve advance
  fastify.patch<{ Params: IdParam }>('/:id/aprovar', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const advance = await prisma.advance.findFirst({
        where: { id, companyId },
      })

      if (!advance) {
        return reply.status(404).send({ error: 'Adiantamento não encontrado' })
      }

      if (advance.status !== 'PENDING') {
        return reply.status(400).send({
          error: `Adiantamento não pode ser aprovado (status atual: ${advance.status})`,
        })
      }

      const updated = await prisma.advance.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
        },
        include: {
          employee: {
            select: { id: true, name: true },
          },
        },
      })

      return reply.send(updated)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao aprovar adiantamento' })
    }
  })

  // PATCH /:id/rejeitar - Reject advance
  fastify.patch<{ Params: IdParam }>('/:id/rejeitar', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const advance = await prisma.advance.findFirst({
        where: { id, companyId },
      })

      if (!advance) {
        return reply.status(404).send({ error: 'Adiantamento não encontrado' })
      }

      if (advance.status !== 'PENDING') {
        return reply.status(400).send({
          error: `Adiantamento não pode ser rejeitado (status atual: ${advance.status})`,
        })
      }

      const updated = await prisma.advance.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
        },
        include: {
          employee: {
            select: { id: true, name: true },
          },
        },
      })

      return reply.send(updated)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao rejeitar adiantamento' })
    }
  })
}
