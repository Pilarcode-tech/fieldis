import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { tenantMiddleware } from '../../middleware/tenant'
import { getFileStream } from '../../lib/storage'

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

export default async function documentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET /:fileName - Serve document with auth check
  fastify.get('/:fileName', async (request: FastifyRequest<{ Params: { fileName: string } }>, reply: FastifyReply) => {
    const { companyId } = request
    const { fileName } = request.params

    // Security: verify the file belongs to the user's company
    if (!fileName.startsWith(companyId + '_')) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const stream = await getFileStream(fileName)

    if (!stream) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' })
    }

    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    reply.header('Content-Type', contentType)
    return reply.send(stream)
  })
}
