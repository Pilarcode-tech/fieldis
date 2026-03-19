import { FastifyRequest, FastifyReply } from 'fastify'

export function roleGuard(allowedRoles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userRole = request.role

    // SUPER_ADMIN always passes
    if (userRole === 'SUPER_ADMIN') {
      return
    }

    if (!allowedRoles.includes(userRole)) {
      reply.status(403).send({ error: 'Sem permissão' })
    }
  }
}
