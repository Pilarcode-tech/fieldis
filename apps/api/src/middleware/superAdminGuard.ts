import { FastifyRequest, FastifyReply } from 'fastify'

export async function superAdminGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.role !== 'SUPER_ADMIN') {
    reply.status(403).send({ error: 'Acesso restrito ao Super Admin' })
  }
}
