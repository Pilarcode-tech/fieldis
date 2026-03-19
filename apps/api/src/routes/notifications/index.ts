import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { tenantMiddleware } from '../../middleware/tenant'

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - Get notifications for the current user
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const [expiringDocs, expiredDocs, pendingAdvances, openPeriods] = await Promise.all([
        // Documents expiring in 30 days
        prisma.document.findMany({
          where: {
            companyId,
            expiresAt: { gte: today, lte: thirtyDaysFromNow },
            status: { not: 'EXPIRED' },
          },
          select: {
            id: true,
            type: true,
            expiresAt: true,
            employee: { select: { name: true } },
          },
          orderBy: { expiresAt: 'asc' },
          take: 10,
        }),

        // Already expired documents
        prisma.document.findMany({
          where: {
            companyId,
            status: 'EXPIRED',
          },
          select: {
            id: true,
            type: true,
            expiresAt: true,
            employee: { select: { name: true } },
          },
          orderBy: { expiresAt: 'desc' },
          take: 5,
        }),

        // Pending advances count
        prisma.advance.count({
          where: { companyId, status: 'PENDING' },
        }),

        // Open payroll periods
        prisma.payrollPeriod.findMany({
          where: { companyId, status: 'OPEN' },
          select: { id: true, month: true, year: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 3,
        }),
      ])

      const notifications: Array<{
        id: string
        type: 'doc_expiring' | 'doc_expired' | 'advance_pending' | 'payroll_open'
        title: string
        description: string
        date: string | null
      }> = []

      for (const doc of expiringDocs) {
        notifications.push({
          id: `doc-exp-${doc.id}`,
          type: 'doc_expiring',
          title: 'Documento vencendo',
          description: `${doc.type} de ${doc.employee.name} vence em ${doc.expiresAt?.toLocaleDateString('pt-BR')}`,
          date: doc.expiresAt?.toISOString() ?? null,
        })
      }

      for (const doc of expiredDocs) {
        notifications.push({
          id: `doc-xpd-${doc.id}`,
          type: 'doc_expired',
          title: 'Documento vencido',
          description: `${doc.type} de ${doc.employee.name} esta vencido`,
          date: doc.expiresAt?.toISOString() ?? null,
        })
      }

      if (pendingAdvances > 0) {
        notifications.push({
          id: 'adv-pending',
          type: 'advance_pending',
          title: 'Adiantamentos pendentes',
          description: `${pendingAdvances} adiantamento${pendingAdvances > 1 ? 's' : ''} aguardando aprovacao`,
          date: null,
        })
      }

      for (const period of openPeriods) {
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        notifications.push({
          id: `payroll-${period.id}`,
          type: 'payroll_open',
          title: 'Folha em aberto',
          description: `Folha de ${monthNames[period.month - 1]}/${period.year} ainda nao foi fechada`,
          date: null,
        })
      }

      return reply.send({
        notifications,
        total: notifications.length,
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar notificacoes' })
    }
  })
}
