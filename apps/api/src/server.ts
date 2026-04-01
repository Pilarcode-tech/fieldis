import 'dotenv/config'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load root .env as fallback, then local .env (local takes precedence)
config({ path: resolve(__dirname, '../../../.env') })
config({ path: resolve(__dirname, '../.env'), override: true })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import authRoutes from './routes/auth/index'
import dashboardRoutes from './routes/dashboard/index'
import employeeRoutes from './routes/employees/index'
import obraRoutes from './routes/obras/index'
import pontoRoutes from './routes/ponto/index'
import folhaRoutes from './routes/folha/index'
import adiantamentoRoutes from './routes/adiantamentos/index'
import notificationRoutes from './routes/notifications/index'
import userRoutes from './routes/users/index'
import documentRoutes from './routes/documents/index'
import companyRoutes from './routes/company/index'
import checkoutRoutes from './routes/checkout/index'
import adminRoutes from './routes/admin/index'
import asaasWebhookRoutes from './routes/webhooks/asaas'
import { startAlertsCron } from './jobs/alerts'
import { redis } from './lib/redis'

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
})

async function bootstrap() {
  // ── Plugins ──────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Fieldis API',
        description: 'API para gestão de obras, funcionários, ponto e folha de pagamento',
        version: '1.0.0',
      },
      tags: [
        { name: 'auth', description: 'Autenticação e sessão' },
        { name: 'employees', description: 'Gestão de funcionários' },
        { name: 'obras', description: 'Gestão de projetos/obras' },
        { name: 'ponto', description: 'Controle de presença' },
        { name: 'folha', description: 'Folha de pagamento' },
        { name: 'adiantamentos', description: 'Adiantamentos e vales' },
        { name: 'dashboard', description: 'Dashboard e métricas' },
        { name: 'notifications', description: 'Notificações' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  })

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fieldis-dev-secret-change-me',
  })

  await fastify.register(cookie)

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
    },
  })

  // ── Redis ───────────────────────────────────────────────────
  try {
    await redis.connect()
  } catch (err) {
    fastify.log.warn('Redis not available, token blacklist disabled')
  }

  // ── Auth decorator ───────────────────────────────────────────
  fastify.decorate('authenticate', async function (
    request: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply,
  ) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
  })

  // ── Health check ─────────────────────────────────────────────
  fastify.get('/api/v1/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // ── Routes ───────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  await fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' })
  await fastify.register(employeeRoutes, { prefix: '/api/v1/employees' })
  await fastify.register(obraRoutes, { prefix: '/api/v1/obras' })
  await fastify.register(pontoRoutes, { prefix: '/api/v1/ponto' })
  await fastify.register(folhaRoutes, { prefix: '/api/v1/folha' })
  await fastify.register(adiantamentoRoutes, { prefix: '/api/v1/adiantamentos' })
  await fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' })
  await fastify.register(userRoutes, { prefix: '/api/v1/users' })
  await fastify.register(documentRoutes, { prefix: '/api/v1/documentos' })
  await fastify.register(companyRoutes, { prefix: '/api/v1/company' })
  await fastify.register(checkoutRoutes, { prefix: '/api/v1/checkout' })
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' })
  await fastify.register(asaasWebhookRoutes, { prefix: '/api/v1/webhooks/asaas' })

  // ── Cron jobs ────────────────────────────────────────────────
  startAlertsCron()

  // ── Start ────────────────────────────────────────────────────
  const port = Number(process.env.PORT || process.env.API_PORT || 3001)
  const host = process.env.API_HOST || '0.0.0.0'

  await fastify.listen({ port, host })
  fastify.log.info(`Server listening on ${host}:${port}`)
}

// ── Graceful shutdown ────────────────────────────────────────────
const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}. Shutting down gracefully...`)
  await redis.quit().catch(() => {})
  await fastify.close()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

bootstrap().catch((err) => {
  fastify.log.error(err)
  process.exit(1)
})
