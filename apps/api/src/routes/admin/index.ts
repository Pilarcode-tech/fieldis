import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { tenantMiddleware } from '../../middleware/tenant'
import { superAdminGuard } from '../../middleware/superAdminGuard'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)
  fastify.addHook('preHandler', superAdminGuard)

  // GET /stats - Platform-wide statistics
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalEmployees,
      companiesByPlan,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { active: true } }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.employee.count(),
      prisma.company.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
    ])

    const planCounts = Object.fromEntries(
      companiesByPlan.map((p) => [p.plan, p._count.id]),
    )

    return reply.send({
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      totalUsers,
      totalEmployees,
      companiesByPlan: planCounts,
    })
  })

  // GET /companies - List all companies
  fastify.get('/companies', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      page?: string
      limit?: string
      search?: string
      plan?: string
      active?: string
    }

    const page = Math.max(1, parseInt(query.page || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { cnpj: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.plan) {
      where.plan = query.plan
    }

    if (query.active !== undefined && query.active !== '') {
      where.active = query.active === 'true'
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              employees: true,
              obras: true,
            },
          },
        },
      }),
      prisma.company.count({ where }),
    ])

    return reply.send({
      companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  })

  // GET /companies/:id - Company detail
  fastify.get('/companies/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            employees: true,
            obras: true,
          },
        },
      },
    })

    if (!company) {
      return reply.status(404).send({ error: 'Empresa não encontrada' })
    }

    return reply.send(company)
  })

  // POST /companies - Create a new company + admin user
  fastify.post('/companies', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string
      cnpj: string
      plan?: string
      phone?: string
      email?: string
      address?: string
      city?: string
      state?: string
      zipCode?: string
      adminName: string
      adminEmail: string
    }

    if (!body.name || !body.cnpj || !body.adminName || !body.adminEmail) {
      return reply.status(400).send({
        error: 'Nome, CNPJ, nome do admin e email do admin são obrigatórios',
      })
    }

    // Check if CNPJ already exists
    const existing = await prisma.company.findUnique({
      where: { cnpj: body.cnpj },
    })

    if (existing) {
      return reply.status(409).send({ error: 'CNPJ já cadastrado' })
    }

    // Generate a temporary password
    const tempPassword = randomBytes(4).toString('hex') // 8-char hex password
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const company = await prisma.company.create({
      data: {
        name: body.name,
        cnpj: body.cnpj,
        plan: (body.plan as 'BASICO' | 'PROFISSIONAL' | 'EMPRESARIAL') || 'BASICO',
        active: true,
        phone: body.phone,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
      },
    })

    const adminUser = await prisma.user.create({
      data: {
        companyId: company.id,
        email: body.adminEmail,
        name: body.adminName,
        password: hashedPassword,
        role: 'COMPANY_ADMIN',
        active: true,
      },
    })

    return reply.status(201).send({
      company,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        tempPassword,
      },
    })
  })

  // PATCH /companies/:id - Update company
  fastify.patch('/companies/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      name?: string
      plan?: string
      active?: boolean
      phone?: string
      email?: string
      address?: string
      city?: string
      state?: string
      zipCode?: string
    }

    const company = await prisma.company.findUnique({ where: { id } })
    if (!company) {
      return reply.status(404).send({ error: 'Empresa não encontrada' })
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.plan !== undefined && { plan: body.plan as 'BASICO' | 'PROFISSIONAL' | 'EMPRESARIAL' }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.zipCode !== undefined && { zipCode: body.zipCode }),
      },
    })

    return reply.send(updated)
  })

  // PATCH /companies/:id/toggle-active - Activate/Deactivate company
  fastify.patch('/companies/:id/toggle-active', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }

    const company = await prisma.company.findUnique({ where: { id } })
    if (!company) {
      return reply.status(404).send({ error: 'Empresa não encontrada' })
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { active: !company.active },
    })

    return reply.send(updated)
  })

  // GET /companies/:id/users - List users of a company
  fastify.get('/companies/:id/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }

    const company = await prisma.company.findUnique({ where: { id } })
    if (!company) {
      return reply.status(404).send({ error: 'Empresa não encontrada' })
    }

    const users = await prisma.user.findMany({
      where: { companyId: id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send(users)
  })
}
