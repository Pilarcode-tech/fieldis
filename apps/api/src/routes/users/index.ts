import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { getPlanLimit } from '@fieldis/shared'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

interface ListQuery {
  role?: string
  active?: string
  search?: string
  page?: string
  limit?: string
}

interface IdParam {
  id: string
}

interface ObraIdParam {
  id: string
  obraId: string
}

const RH_MANAGER_ALLOWED_ROLES = ['SUPERVISOR', 'EMPLOYEE']
const COMPANY_ADMIN_ALLOWED_ROLES = ['RH_MANAGER', 'FINANCIAL_MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'AUDITOR']

function generateRandomPassword(length = 8): string {
  return randomBytes(length).toString('base64url').slice(0, length)
}

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - List users of the company
  fastify.get<{ Querystring: ListQuery }>('/', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { role, active, search, page = '1', limit = '20' } = request.query

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { companyId }

      // RH_MANAGER can only see SUPERVISOR and EMPLOYEE users
      if (request.role === 'RH_MANAGER') {
        where.role = { in: RH_MANAGER_ALLOWED_ROLES }
      }

      if (role) {
        // If RH_MANAGER, enforce their visibility constraint even with filter
        if (request.role === 'RH_MANAGER' && !RH_MANAGER_ALLOWED_ROLES.includes(role)) {
          return reply.send({
            data: [],
            pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
          })
        }
        where.role = role
      }

      if (active !== undefined) {
        where.active = active === 'true'
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            employeeId: true,
            createdAt: true,
            obraUsers: {
              include: {
                obra: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ])

      const data = users.map((user) => {
        const u = user as typeof user & { obraUsers?: Array<{ obra: { id: string; name: string; code: string } }> }
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          employeeId: u.employeeId,
          createdAt: u.createdAt,
          obras: u.obraUsers?.map((ou) => ou.obra) ?? [],
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
      return reply.status(500).send({ error: 'Erro ao listar usuarios' })
    }
  })

  // POST / - Create new user
  fastify.post('/', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request

      const body = request.body as {
        name: string
        email: string
        role: string
        password?: string
        employeeId?: string
        obraIds?: string[]
      }

      if (!body.name || !body.email || !body.role) {
        return reply.status(400).send({ error: 'name, email e role sao obrigatorios' })
      }

      // Validate role permissions
      if (request.role === 'COMPANY_ADMIN' && !COMPANY_ADMIN_ALLOWED_ROLES.includes(body.role)) {
        return reply.status(403).send({ error: 'Voce nao pode criar usuarios com essa role' })
      }

      if (request.role === 'RH_MANAGER' && !RH_MANAGER_ALLOWED_ROLES.includes(body.role)) {
        return reply.status(403).send({ error: 'Voce nao pode criar usuarios com essa role' })
      }

      // Check plan user limit
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } })
      const activeUserCount = await prisma.user.count({ where: { companyId, active: true } })
      const userLimit = getPlanLimit(company?.plan ?? 'BASICO', 'users')
      if (activeUserCount >= userLimit) {
        return reply.status(403).send({
          error: 'Limite de usuários atingido para o plano atual.',
          code: 'PLAN_LIMIT_REACHED',
          limit: userLimit,
          current: activeUserCount,
          plan: company?.plan,
        })
      }

      // Check email uniqueness within company
      const existingUser = await prisma.user.findFirst({
        where: { companyId, email: body.email },
      })

      if (existingUser) {
        return reply.status(409).send({ error: 'Email ja cadastrado nesta empresa' })
      }

      // Generate password if not provided
      const rawPassword = body.password || generateRandomPassword()
      const hashedPassword = await bcrypt.hash(rawPassword, 10)

      const user = await prisma.user.create({
        data: {
          companyId,
          name: body.name,
          email: body.email,
          role: body.role as import('@prisma/client').UserRole,
          password: hashedPassword,
          employeeId: body.employeeId || undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          employeeId: true,
          createdAt: true,
        },
      })

      // Create ObraUser records if obraIds provided
      if (body.obraIds && body.obraIds.length > 0) {
        await prisma.obraUser.createMany({
          data: body.obraIds.map((obraId) => ({
            userId: user.id,
            obraId,
          })),
          skipDuplicates: true,
        })
      }

      return reply.status(201).send({
        ...user,
        generatedPassword: body.password ? undefined : rawPassword,
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao criar usuario' })
    }
  })

  // GET /:id - User detail
  fastify.get<{ Params: IdParam }>('/:id', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const user = await prisma.user.findFirst({
        where: { id, companyId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          employeeId: true,
          createdAt: true,
          updatedAt: true,
          employee: {
            select: {
              id: true,
              name: true,
              cpf: true,
              role: true,
              department: true,
              status: true,
            },
          },
          obraUsers: {
            include: {
              obra: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuario nao encontrado' })
      }

      const { obraUsers, password, ...rest } = user as typeof user & { obraUsers?: Array<{ obra: { id: string; name: string; code: string } }>; password?: string }
      return reply.send({
        ...rest,
        obras: obraUsers?.map((ou) => ou.obra) ?? [],
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar usuario' })
    }
  })

  // PATCH /:id - Update user
  fastify.patch<{ Params: IdParam }>('/:id', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId, userId } = request
      const { id } = request.params

      const body = request.body as {
        name?: string
        email?: string
        role?: string
        active?: boolean
      }

      const existing = await prisma.user.findFirst({
        where: { id, companyId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Usuario nao encontrado' })
      }

      // Cannot change own role
      if (body.role && id === userId) {
        return reply.status(400).send({ error: 'Voce nao pode alterar sua propria role' })
      }

      // RH_MANAGER cannot edit users with roles they can't manage
      if (request.role === 'RH_MANAGER' && !RH_MANAGER_ALLOWED_ROLES.includes(existing.role)) {
        return reply.status(403).send({ error: 'Sem permissao para editar este usuario' })
      }

      // Validate new role if changing
      if (body.role) {
        if (request.role === 'COMPANY_ADMIN' && !COMPANY_ADMIN_ALLOWED_ROLES.includes(body.role)) {
          return reply.status(403).send({ error: 'Voce nao pode atribuir essa role' })
        }
        if (request.role === 'RH_MANAGER' && !RH_MANAGER_ALLOWED_ROLES.includes(body.role)) {
          return reply.status(403).send({ error: 'Voce nao pode atribuir essa role' })
        }
      }

      // Validate email uniqueness if changed
      if (body.email && body.email !== existing.email) {
        const emailTaken = await prisma.user.findFirst({
          where: { companyId, email: body.email, id: { not: id } },
        })
        if (emailTaken) {
          return reply.status(409).send({ error: 'Email ja cadastrado nesta empresa' })
        }
      }

      const updateData: Record<string, unknown> = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.email !== undefined) updateData.email = body.email
      if (body.role !== undefined) updateData.role = body.role
      if (body.active !== undefined) updateData.active = body.active

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          employeeId: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return reply.send(user)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao atualizar usuario' })
    }
  })

  // PATCH /:id/senha - Reset password
  fastify.patch<{ Params: IdParam }>('/:id/senha', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const body = request.body as { newPassword: string }

      if (!body.newPassword) {
        return reply.status(400).send({ error: 'newPassword e obrigatorio' })
      }

      const existing = await prisma.user.findFirst({
        where: { id, companyId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Usuario nao encontrado' })
      }

      const hashedPassword = await bcrypt.hash(body.newPassword, 10)

      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      })

      return reply.send({ message: 'Senha atualizada com sucesso' })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao atualizar senha' })
    }
  })

  // DELETE /:id - Deactivate user (soft delete)
  fastify.delete<{ Params: IdParam }>('/:id', { preHandler: roleGuard(['COMPANY_ADMIN']) }, async (request, reply) => {
    try {
      const { companyId, userId } = request
      const { id } = request.params

      // Cannot deactivate self
      if (id === userId) {
        return reply.status(400).send({ error: 'Voce nao pode desativar sua propria conta' })
      }

      const existing = await prisma.user.findFirst({
        where: { id, companyId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Usuario nao encontrado' })
      }

      const user = await prisma.user.update({
        where: { id },
        data: { active: false },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
        },
      })

      return reply.send(user)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao desativar usuario' })
    }
  })

  // POST /:id/projetos - Link user to projects
  fastify.post<{ Params: IdParam }>('/:id/projetos', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const body = request.body as { obraIds: string[] }

      if (!body.obraIds || !Array.isArray(body.obraIds) || body.obraIds.length === 0) {
        return reply.status(400).send({ error: 'obraIds e obrigatorio e deve ser um array nao vazio' })
      }

      const user = await prisma.user.findFirst({
        where: { id, companyId },
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuario nao encontrado' })
      }

      await prisma.obraUser.createMany({
        data: body.obraIds.map((obraId) => ({
          userId: id,
          obraId,
        })),
        skipDuplicates: true,
      })

      // Return updated obra associations
      const obraUsers = await prisma.obraUser.findMany({
        where: { userId: id },
        include: {
          obra: {
            select: { id: true, name: true, code: true },
          },
        },
      })

      return reply.status(201).send(obraUsers)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao vincular usuario a projetos' })
    }
  })

  // DELETE /:id/projetos/:obraId - Unlink user from project
  fastify.delete<{ Params: ObraIdParam }>('/:id/projetos/:obraId', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id, obraId } = request.params

      const user = await prisma.user.findFirst({
        where: { id, companyId },
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuario nao encontrado' })
      }

      const obraUser = await prisma.obraUser.findFirst({
        where: { userId: id, obraId },
      })

      if (!obraUser) {
        return reply.status(404).send({ error: 'Vinculo nao encontrado' })
      }

      await prisma.obraUser.delete({
        where: { id: obraUser.id },
      })

      return reply.send({ message: 'Vinculo removido com sucesso' })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao desvincular usuario do projeto' })
    }
  })
}
