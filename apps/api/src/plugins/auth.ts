import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      jti?: string
      userId: string
      companyId: string | null
      role: string
      email: string
      employeeId?: string | null
    }
    user: {
      jti?: string
      userId: string
      companyId: string | null
      role: string
      email: string
      employeeId?: string | null
    }
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      await request.jwtVerify()
      const payload = request.user as {
        userId: string
        companyId: string | null
        role: string
        email: string
      }
      request.companyId = payload.companyId ?? ''
      request.userId = payload.userId
    } catch (err) {
      reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
  })
}

export default fp(authPlugin, { name: 'auth-plugin' })
