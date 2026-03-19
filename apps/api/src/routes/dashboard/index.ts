import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'
import { redis } from '../../lib/redis'

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - Dashboard KPIs
  fastify.get('/', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER', 'SUPERVISOR', 'AUDITOR']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request

      // Check Redis cache first
      const cacheKey = `dashboard:${companyId}`
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          return reply.send(JSON.parse(cached))
        }
      } catch {
        // Redis unavailable, proceed without cache
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      // Run all queries in parallel
      const [
        totalEmployees,
        activeObras,
        pontosHoje,
        latestPayrollItems,
        adiantamentosPendentes,
        docsVencendo,
        activeObrasList,
      ] = await Promise.all([
        // Total active employees
        prisma.employee.count({
          where: { companyId, status: 'ACTIVE' },
        }),

        // Active obras
        prisma.obra.count({
          where: { companyId, status: 'ACTIVE' },
        }),

        // Time records today
        prisma.timeRecord.count({
          where: {
            companyId,
            clockIn: { gte: today, lt: tomorrow },
          },
        }),

        // Latest payroll period total cost
        prisma.payrollPeriod.findFirst({
          where: { companyId },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          include: {
            payrollItems: {
              select: { netSalary: true },
            },
          },
        }),

        // Pending advances
        prisma.advance.count({
          where: { companyId, status: 'PENDING' },
        }),

        // Documents expiring in the next 30 days
        prisma.document.count({
          where: {
            companyId,
            expiresAt: {
              gte: today,
              lte: thirtyDaysFromNow,
            },
            status: { not: 'EXPIRED' },
          },
        }),

        // Active obras with employee count and cost
        prisma.obra.findMany({
          where: { companyId, status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            code: true,
            budgetedCost: true,
            _count: {
              select: {
                employeeAllocations: {
                  where: { active: true },
                },
              },
            },
            payrollItems: {
              select: { companyCost: true },
            },
          },
        }),
      ])

      const custoMensal = latestPayrollItems?.payrollItems.reduce(
        (sum, item) => sum + item.netSalary,
        0,
      ) ?? 0

      const obraStats = activeObrasList.map((obra) => ({
        id: obra.id,
        name: obra.name,
        code: obra.code,
        budgetedCost: obra.budgetedCost,
        employeeCount: obra._count.employeeAllocations,
        realCost: obra.payrollItems.reduce((sum, item) => sum + item.companyCost, 0),
      }))

      const responseData = {
        totalEmployees,
        activeObras,
        pontosHoje,
        custoMensal,
        adiantamentosPendentes,
        docsVencendo,
        obraStats,
      }

      try {
        await redis.setex(cacheKey, 30, JSON.stringify(responseData))
      } catch {
        // Redis unavailable, skip caching
      }

      return reply.send(responseData)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao carregar dashboard' })
    }
  })

  // GET /financial - Financial summary for charts
  fastify.get('/financial', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER', 'AUDITOR']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request

      // Cost by obra (MO + extras)
      const obras = await prisma.obra.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: {
          name: true,
          budgetedCost: true,
          payrollItems: {
            select: { companyCost: true },
          },
          projectCosts: {
            select: { amount: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      const costByObra = obras.map(obra => {
        const moCost = obra.payrollItems.reduce((sum, item) => sum + item.companyCost, 0)
        const extrasCost = obra.projectCosts.reduce((sum, item) => sum + item.amount, 0)
        return {
          obraName: obra.name,
          cost: moCost + extrasCost,
          moCost,
          extrasCost,
          budget: obra.budgetedCost,
        }
      })

      // Monthly evolution (last 6 months)
      const monthlyEvolution: Array<{ month: string; cost: number; revenue: number }> = []
      const now = new Date()
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const month = d.getMonth() + 1
        const year = d.getFullYear()

        const period = await prisma.payrollPeriod.findFirst({
          where: { companyId, month, year },
          include: {
            payrollItems: {
              select: { companyCost: true, netSalary: true },
            },
          },
        })

        const cost = period?.payrollItems.reduce((sum, item) => sum + item.companyCost, 0) ?? 0

        monthlyEvolution.push({
          month: `${monthNames[month - 1]}/${String(year).slice(2)}`,
          cost,
          revenue: 0,
        })
      }

      return reply.send({ costByObra, monthlyEvolution })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao carregar dados financeiros' })
    }
  })

  // GET /export - Export financial summary as CSV
  fastify.get('/export', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER', 'AUDITOR']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request

      const obras = await prisma.obra.findMany({
        where: { companyId },
        select: {
          name: true,
          code: true,
          status: true,
          budgetedCost: true,
          _count: {
            select: {
              employeeAllocations: { where: { active: true } },
            },
          },
          payrollItems: {
            select: { companyCost: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      const header = 'Projeto,Codigo,Status,Funcionarios Alocados,Custo MO Acumulado,Orcamento,Percentual Utilizado'

      const rows = obras.map(obra => {
        const realCost = obra.payrollItems.reduce((sum, item) => sum + item.companyCost, 0)
        const pct = obra.budgetedCost > 0 ? ((realCost / obra.budgetedCost) * 100).toFixed(1) : '0.0'
        return [
          `"${obra.name}"`,
          `"${obra.code}"`,
          `"${obra.status}"`,
          obra._count.employeeAllocations,
          realCost.toFixed(2),
          obra.budgetedCost.toFixed(2),
          `${pct}%`,
        ].join(',')
      })

      const csv = [header, ...rows].join('\n')

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="financeiro.csv"')
      return reply.send(csv)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao exportar financeiro' })
    }
  })
}
