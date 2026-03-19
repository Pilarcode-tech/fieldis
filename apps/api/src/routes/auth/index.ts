import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import bcrypt from 'bcryptjs'
import { LoginSchema } from '@fieldis/shared'
import { randomUUID } from 'crypto'
import { redis } from '../../lib/redis'

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = LoginSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados invalidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const { email, password } = parsed.data

      // Find user by email (may belong to multiple companies, take the first active)
      const user = await prisma.user.findFirst({
        where: {
          email,
          active: true,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              active: true,
            },
          },
        },
      })

      if (!user) {
        return reply.status(401).send({ error: 'Credenciais invalidas' })
      }

      if (!user.company.active) {
        return reply.status(403).send({ error: 'Empresa inativa' })
      }

      const passwordValid = await bcrypt.compare(password, user.password)

      if (!passwordValid) {
        return reply.status(401).send({ error: 'Credenciais invalidas' })
      }

      const jti = randomUUID()
      const accessToken = fastify.jwt.sign(
        {
          jti,
          userId: user.id,
          companyId: user.companyId,
          role: user.role,
          email: user.email,
          employeeId: user.employeeId ?? null,
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
      )

      return reply.send({
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company.name,
          employeeId: user.employeeId ?? null,
        },
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /refresh
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as {
        jti?: string
        userId: string
        companyId: string
        role: string
        email: string
        employeeId: string | null
      }

      // Blacklist the old token so it can't be reused
      if (payload.jti) {
        await redis.setex(`blacklist:${payload.jti}`, 8 * 60 * 60, '1')
      }

      const jti = randomUUID()
      const accessToken = fastify.jwt.sign(
        {
          jti,
          userId: payload.userId,
          companyId: payload.companyId,
          role: payload.role,
          email: payload.email,
          employeeId: payload.employeeId ?? null,
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
      )

      return reply.send({ accessToken })
    } catch (err) {
      return reply.status(401).send({ error: 'Token invalido para refresh' })
    }
  })

  // POST /logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as { jti?: string }

      if (payload.jti) {
        // Blacklist token for remaining TTL (8 hours max)
        await redis.setex(`blacklist:${payload.jti}`, 8 * 60 * 60, '1')
      }

      return reply.send({ message: 'Logout realizado com sucesso' })
    } catch {
      // Even if token is invalid, return success
      return reply.send({ message: 'Logout realizado com sucesso' })
    }
  })
}
