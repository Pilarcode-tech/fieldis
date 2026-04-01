import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { CreateObraSchema, UpdateObraSchema, AllocateEmployeeSchema, getPlanLimit } from '@fieldis/shared'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'

interface IdParam {
  id: string
}

interface ListQuery {
  status?: string
  search?: string
  page?: string
  limit?: string
}

interface DeallocateBody {
  employeeId: string
}

export default async function obraRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - List obras
  fastify.get('/', async (request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { status, search, page = '1', limit = '20' } = request.query

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { companyId }

      // SUPERVISOR: only sees projects they are linked to via ObraUser
      if (request.role === 'SUPERVISOR') {
        where.obraUsers = { some: { userId: request.userId } }
      }

      // EMPLOYEE: only sees projects they are currently allocated to
      if (request.role === 'EMPLOYEE' && request.employeeId) {
        where.employeeAllocations = { some: { employeeId: request.employeeId, active: true } }
      }

      if (status) {
        where.status = status
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [obras, total] = await Promise.all([
        prisma.obra.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                employeeAllocations: {
                  where: { active: true },
                },
              },
            },
            payrollItems: {
              select: { companyCost: true },
            },
            projectCosts: {
              select: { amount: true },
            },
          },
        }),
        prisma.obra.count({ where }),
      ])

      const data = obras.map((obra) => {
        const realCostMO = obra.payrollItems.reduce((sum, item) => sum + item.companyCost, 0)
        const realCostExtras = obra.projectCosts.reduce((sum, item) => sum + item.amount, 0)
        return {
          ...obra,
          activeEmployees: obra._count.employeeAllocations,
          realCostMO,
          realCostExtras,
          realCost: realCostMO + realCostExtras,
          payrollItems: undefined,
          projectCosts: undefined,
        }
      })

      return reply.send({
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao listar obras' })
    }
  })

  // POST / - Create obra
  fastify.post('/', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const parsed = CreateObraSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const data = parsed.data

      // Check plan obra limit
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } })
      const activeCount = await prisma.obra.count({ where: { companyId, status: { not: 'FINISHED' } } })
      const limit = getPlanLimit(company?.plan ?? 'BASICO', 'obras')
      if (activeCount >= limit) {
        return reply.status(403).send({
          error: 'Limite de obras atingido para o plano atual.',
          code: 'PLAN_LIMIT_REACHED',
          limit,
          current: activeCount,
          plan: company?.plan,
        })
      }

      const obra = await prisma.obra.create({
        data: {
          companyId,
          name: data.name,
          code: data.code,
          address: data.address,
          city: data.city,
          state: data.state,
          status: data.status,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          budgetedCost: data.budgetedCost,
        },
      })

      return reply.status(201).send(obra)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao criar obra' })
    }
  })

  // GET /:id - Obra detail
  fastify.get('/:id', async (request: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const obra = await prisma.obra.findFirst({
        where: { id, companyId },
        include: {
          obraUsers: {
            select: { userId: true },
          },
          employeeAllocations: {
            include: {
              employee: {
                select: { id: true, name: true, role: true, status: true },
              },
            },
            orderBy: { startDate: 'desc' },
          },
          timeRecords: {
            include: {
              employee: {
                select: { name: true },
              },
            },
            orderBy: { clockIn: 'desc' },
            take: 50,
          },
          payrollItems: {
            select: { companyCost: true },
          },
          projectCosts: {
            select: { amount: true },
          },
        },
      })

      if (!obra) {
        return reply.status(404).send({ error: 'Obra não encontrada' })
      }

      // Transform data to match frontend expectations
      const employees = obra.employeeAllocations.map((alloc) => ({
        id: alloc.employee.id,
        name: alloc.employee.name,
        role: alloc.employee.role,
        startDate: alloc.startDate.toISOString(),
        endDate: alloc.endDate?.toISOString() ?? null,
      }))

      const timeRecords = obra.timeRecords.map((record) => ({
        id: record.id,
        employeeId: record.employeeId,
        employeeName: record.employee.name,
        clockIn: record.clockIn.toISOString(),
        clockOut: record.clockOut?.toISOString() ?? null,
        workedMinutes: record.workedMinutes ?? 0,
      }))

      const actualCostMO = obra.payrollItems.reduce((sum, item) => sum + item.companyCost, 0)
      const actualCostExtras = obra.projectCosts.reduce((sum, item) => sum + item.amount, 0)
      const actualCost = actualCostMO + actualCostExtras

      return reply.send({
        id: obra.id,
        name: obra.name,
        code: obra.code,
        address: obra.address,
        city: obra.city,
        state: obra.state,
        status: obra.status,
        startDate: obra.startDate.toISOString(),
        endDate: obra.endDate?.toISOString() ?? null,
        budgetedCost: obra.budgetedCost,
        actualCost,
        actualCostMO,
        actualCostExtras,
        employees,
        timeRecords,
        users: obra.obraUsers,
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar obra' })
    }
  })

  // PATCH /:id - Update obra
  fastify.patch<{ Params: IdParam }>('/:id', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const parsed = UpdateObraSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const existing = await prisma.obra.findFirst({
        where: { id, companyId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Obra não encontrada' })
      }

      const data = parsed.data
      const updateData: Record<string, unknown> = { ...data }

      if (data.startDate) {
        updateData.startDate = new Date(data.startDate)
      }
      if (data.endDate) {
        updateData.endDate = new Date(data.endDate)
      }

      const obra = await prisma.obra.update({
        where: { id },
        data: updateData,
      })

      return reply.send(obra)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao atualizar obra' })
    }
  })

  // GET /:id/equipe - List active employee allocations
  fastify.get('/:id/equipe', async (request: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const allocations = await prisma.employeeAllocation.findMany({
        where: { companyId, obraId: id, active: true },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              cpf: true,
              role: true,
              phone: true,
              baseSalary: true,
              status: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
      })

      return reply.send(allocations)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao listar equipe' })
    }
  })

  // POST /:id/equipe - Allocate employee to obra
  fastify.post<{ Params: IdParam }>('/:id/equipe', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'SUPERVISOR']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id: obraId } = request.params

      const parsed = AllocateEmployeeSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const { employeeId, startDate } = parsed.data

      // Verify the obra belongs to this company
      const obra = await prisma.obra.findFirst({
        where: { id: obraId, companyId },
      })

      if (!obra) {
        return reply.status(404).send({ error: 'Obra não encontrada' })
      }

      // SUPERVISOR: can only allocate to projects they are assigned to
      if (request.role === 'SUPERVISOR') {
        const obraUser = await prisma.obraUser.findFirst({
          where: { userId: request.userId, obraId },
        })
        if (!obraUser) {
          return reply.status(403).send({ error: 'Supervisores só podem alocar em projetos dos quais participam' })
        }
      }

      // Verify the employee belongs to this company
      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId },
      })

      if (!employee) {
        return reply.status(404).send({ error: 'Funcionário não encontrado' })
      }

      // Deactivate any current active allocation for this employee
      await prisma.employeeAllocation.updateMany({
        where: { companyId, employeeId, active: true },
        data: { active: false, endDate: new Date() },
      })

      const allocation = await prisma.employeeAllocation.create({
        data: {
          companyId,
          employeeId,
          obraId,
          startDate: new Date(startDate),
          active: true,
        },
        include: {
          employee: {
            select: { id: true, name: true, role: true },
          },
          obra: {
            select: { id: true, name: true, code: true },
          },
        },
      })

      return reply.status(201).send(allocation)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao alocar funcionário' })
    }
  })

  // DELETE /:id/equipe - Deallocate employee
  fastify.delete<{ Params: IdParam; Body: DeallocateBody }>('/:id/equipe', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id: obraId } = request.params
      const body = request.body as DeallocateBody

      if (!body.employeeId) {
        return reply.status(400).send({ error: 'employeeId é obrigatório' })
      }

      const result = await prisma.employeeAllocation.updateMany({
        where: {
          companyId,
          obraId,
          employeeId: body.employeeId,
          active: true,
        },
        data: {
          active: false,
          endDate: new Date(),
        },
      })

      if (result.count === 0) {
        return reply.status(404).send({ error: 'Alocação ativa não encontrada' })
      }

      return reply.send({ message: 'Funcionário desalocado com sucesso' })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao desalocar funcionário' })
    }
  })

  // ── Project Costs (Custos Avulsos) ──────────────────────────

  interface CostParams { id: string; costId: string }

  // GET /:id/custos - List project costs
  fastify.get<{ Params: IdParam }>('/:id/custos', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER', 'AUDITOR']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id: obraId } = request.params

      const costs = await prisma.projectCost.findMany({
        where: { companyId, obraId },
        include: {
          createdBy: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      })

      return reply.send(costs)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao listar custos' })
    }
  })

  // POST /:id/custos - Create project cost
  fastify.post<{ Params: IdParam }>('/:id/custos', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId, userId } = request
      const { id: obraId } = request.params
      const body = request.body as { category: string; description: string; amount: number; date: string; invoiceNumber?: string }

      if (!body.category || !body.description || !body.amount || !body.date) {
        return reply.status(400).send({ error: 'category, description, amount e date são obrigatórios' })
      }

      const obra = await prisma.obra.findFirst({ where: { id: obraId, companyId } })
      if (!obra) {
        return reply.status(404).send({ error: 'Projeto não encontrado' })
      }

      const cost = await prisma.projectCost.create({
        data: {
          companyId,
          obraId,
          category: body.category as import('@prisma/client').ProjectCostCategory,
          description: body.description,
          amount: body.amount,
          date: new Date(body.date),
          invoiceNumber: body.invoiceNumber,
          createdById: userId,
        },
        include: {
          createdBy: { select: { name: true } },
        },
      })

      return reply.status(201).send(cost)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao criar custo' })
    }
  })

  // PATCH /:id/custos/:costId - Update project cost
  fastify.patch<{ Params: CostParams }>('/:id/custos/:costId', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request
      const { id: obraId, costId } = request.params
      const body = request.body as Record<string, unknown>

      const existing = await prisma.projectCost.findFirst({ where: { id: costId, companyId, obraId } })
      if (!existing) {
        return reply.status(404).send({ error: 'Custo não encontrado' })
      }

      // Only creator or COMPANY_ADMIN can edit
      if (existing.createdById !== userId && role !== 'COMPANY_ADMIN') {
        return reply.status(403).send({ error: 'Apenas quem criou ou o administrador pode editar' })
      }

      const updateData: Record<string, unknown> = {}
      if (body.category) updateData.category = body.category
      if (body.description) updateData.description = body.description
      if (body.amount !== undefined) updateData.amount = body.amount
      if (body.date) updateData.date = new Date(body.date as string)
      if (body.invoiceNumber !== undefined) updateData.invoiceNumber = body.invoiceNumber

      const updated = await prisma.projectCost.update({
        where: { id: costId },
        data: updateData,
        include: { createdBy: { select: { name: true } } },
      })

      return reply.send(updated)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao atualizar custo' })
    }
  })

  // DELETE /:id/custos/:costId - Delete project cost
  fastify.delete<{ Params: CostParams }>('/:id/custos/:costId', { preHandler: roleGuard(['COMPANY_ADMIN']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id: obraId, costId } = request.params

      const existing = await prisma.projectCost.findFirst({ where: { id: costId, companyId, obraId } })
      if (!existing) {
        return reply.status(404).send({ error: 'Custo não encontrado' })
      }

      await prisma.projectCost.delete({ where: { id: costId } })
      return reply.status(204).send()
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao deletar custo' })
    }
  })
}
