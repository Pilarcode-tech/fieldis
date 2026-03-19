import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { redis } from '../lib/redis'

interface JwtPayload {
  jti?: string
  userId: string
  companyId: string
  role: string
  email: string
  employeeId: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    companyId: string
    userId: string
    role: string
    employeeId: string | null
  }
}

export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify()

    const decoded = request.user as JwtPayload

    // Check if token has been blacklisted (invalidated via logout)
    if (decoded.jti) {
      const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`)
      if (isBlacklisted) {
        reply.status(401).send({ error: 'Token invalidado' })
        return
      }
    }

    if (!decoded.companyId) {
      reply.status(403).send({ error: 'Empresa nao identificada no token' })
      return
    }

    // Validate UUID format to prevent SQL injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(decoded.companyId)) {
      reply.status(403).send({ error: 'Tenant ID invalido' })
      return
    }

    request.companyId = decoded.companyId
    request.userId = decoded.userId
    request.role = decoded.role
    request.employeeId = decoded.employeeId ?? null

    // Set tenant context for RLS at the database level
    await prisma.$executeRawUnsafe(
      `SET LOCAL "app.current_tenant" = '${decoded.companyId}'`,
    )
  } catch (err) {
    reply.status(401).send({ error: 'Token invalido ou expirado' })
  }
}
