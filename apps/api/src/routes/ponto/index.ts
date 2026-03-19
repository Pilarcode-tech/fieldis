import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { TimeRecordSchema, BulkTimeRecordSchema } from '@fieldis/shared'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'

interface ListQuery {
  obraId?: string
  employeeId?: string
  date?: string
  startDate?: string
  endDate?: string
  page?: string
  limit?: string
}

interface IdParam {
  id: string
}

export default async function pontoRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - List time records with filters
  fastify.get('/', async (request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { obraId, employeeId, date, startDate, endDate, page = '1', limit = '50' } = request.query

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { companyId }

      // EMPLOYEE role: only see their own time records
      if (request.role === 'EMPLOYEE' && request.employeeId) {
        where.employeeId = request.employeeId
      } else if (request.role === 'SUPERVISOR') {
        // SUPERVISOR: only see time records for projects they are assigned to
        // Check ObraUser (user-project assignment) first, then EmployeeAllocation as fallback
        const obraUsers = await prisma.obraUser.findMany({
          where: { userId: request.userId },
          select: { obraId: true },
        })
        let supervisorObraIds = obraUsers.map((a) => a.obraId)

        if (supervisorObraIds.length === 0 && request.employeeId) {
          const supervisorAllocations = await prisma.employeeAllocation.findMany({
            where: { companyId, employeeId: request.employeeId, active: true },
            select: { obraId: true },
          })
          supervisorObraIds = supervisorAllocations.map((a) => a.obraId)
        }
        where.obraId = { in: supervisorObraIds }
        if (employeeId) {
          where.employeeId = employeeId
        }
      } else if (employeeId) {
        where.employeeId = employeeId
      }

      if (obraId && request.role !== 'SUPERVISOR') {
        where.obraId = obraId
      } else if (obraId && request.role === 'SUPERVISOR') {
        // For supervisors, only allow filtering by obras they have access to
        const allowed = where.obraId as { in: string[] } | undefined
        if (!allowed || allowed.in.includes(obraId)) {
          where.obraId = obraId
        }
      }

      // Single date filter (e.g. "2026-03-17")
      // Interpret date as a day in America/Sao_Paulo (UTC-3).
      // Brazil abolished DST in 2019, so the offset is constant.
      if (date) {
        // Start of day in BRT (00:00 BRT = 03:00 UTC)
        const startUTC = new Date(date + 'T03:00:00.000Z')
        // Start of next day in BRT
        const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000)
        where.clockIn = { gte: startUTC, lt: endUTC }
      } else if (startDate || endDate) {
        const clockInFilter: Record<string, Date> = {}
        if (startDate) {
          // Start of day in BRT (00:00 BRT = 03:00 UTC)
          clockInFilter.gte = new Date(startDate + 'T03:00:00.000Z')
        }
        if (endDate) {
          // End of day in BRT (23:59:59 BRT = next day 02:59:59 UTC)
          const end = new Date(endDate + 'T03:00:00.000Z')
          end.setDate(end.getDate() + 1)
          clockInFilter.lt = end
        }
        where.clockIn = clockInFilter
      }

      const [records, total] = await Promise.all([
        prisma.timeRecord.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { clockIn: 'desc' },
          include: {
            employee: {
              select: { id: true, name: true, role: true },
            },
            obra: {
              select: { id: true, name: true, code: true },
            },
          },
        }),
        prisma.timeRecord.count({ where }),
      ])

      // Flatten employee/obra data for frontend
      const data = records.map((record) => ({
        id: record.id,
        employeeId: record.employeeId,
        employeeName: record.employee.name,
        obraId: record.obraId,
        obraName: record.obra.name,
        clockIn: record.clockIn.toISOString(),
        clockOut: record.clockOut?.toISOString() ?? null,
        breakMinutes: record.breakMinutes,
        workedMinutes: record.workedMinutes ?? 0,
        overtimeMinutes: record.overtimeMinutes ?? 0,
      }))

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
      return reply.status(500).send({ error: 'Erro ao listar registros de ponto' })
    }
  })

  // POST / - Create time record (single or bulk)
  fastify.post('/', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'SUPERVISOR']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const body = request.body as Record<string, unknown>

      // SUPERVISOR: validate project link via ObraUser
      if (request.role === 'SUPERVISOR' && body.obraId) {
        const vinculo = await prisma.obraUser.findFirst({
          where: { userId: request.userId, obraId: body.obraId as string },
        })
        if (!vinculo) {
          return reply.status(403).send({ error: 'Você não está vinculado a este projeto.' })
        }
      }

      // Check if it is a bulk operation
      if (body.bulk === true || (body.employeeIds && Array.isArray(body.employeeIds))) {
        const parsed = BulkTimeRecordSchema.safeParse(body)

        if (!parsed.success) {
          return reply.status(400).send({
            error: 'Dados inválidos',
            details: parsed.error.flatten().fieldErrors,
          })
        }

        const data = parsed.data

        const result = await prisma.timeRecord.createMany({
          data: data.employeeIds.map((employeeId) => ({
            companyId,
            employeeId,
            obraId: data.obraId,
            clockIn: new Date(data.clockIn),
            breakMinutes: data.breakMinutes,
            source: data.source,
            recordedById: request.userId,
          })),
          skipDuplicates: true,
        })

        return reply.status(201).send({
          message: `${result.count} registros criados com sucesso`,
          count: result.count,
        })
      }

      // Single record
      const parsed = TimeRecordSchema.safeParse(body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const data = parsed.data

      const record = await prisma.timeRecord.create({
        data: {
          companyId,
          employeeId: data.employeeId,
          obraId: data.obraId,
          clockIn: new Date(data.clockIn),
          clockOut: data.clockOut ? new Date(data.clockOut) : undefined,
          breakMinutes: data.breakMinutes,
          photoInUrl: data.photoInUrl,
          latIn: data.latIn,
          lngIn: data.lngIn,
          source: data.source,
          recordedById: request.userId,
        },
        include: {
          employee: { select: { id: true, name: true } },
          obra: { select: { id: true, name: true } },
        },
      })

      return reply.status(201).send(record)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao criar registro de ponto' })
    }
  })

  // PATCH /:id/saida - Register clock out
  fastify.patch<{ Params: IdParam }>('/:id/saida', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'SUPERVISOR']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params
      const body = request.body as { clockOut?: string }

      const record = await prisma.timeRecord.findFirst({
        where: { id, companyId },
        include: {
          employee: {
            select: { hoursPerDay: true },
          },
        },
      })

      if (!record) {
        return reply.status(404).send({ error: 'Registro de ponto não encontrado' })
      }

      // SUPERVISOR: validate project link via ObraUser
      if (request.role === 'SUPERVISOR') {
        const vinculo = await prisma.obraUser.findFirst({
          where: { userId: request.userId, obraId: record.obraId },
        })
        if (!vinculo) {
          return reply.status(403).send({ error: 'Você não está vinculado a este projeto.' })
        }
      }

      if (record.clockOut) {
        return reply.status(400).send({ error: 'Saída já registrada' })
      }

      const clockOut = body.clockOut ? new Date(body.clockOut) : new Date()

      // Calculate worked minutes (subtract break)
      const diffMs = clockOut.getTime() - record.clockIn.getTime()
      const totalMinutes = Math.floor(diffMs / 60000)
      const workedMinutes = Math.max(0, totalMinutes - record.breakMinutes)

      // Calculate overtime based on employee's hoursPerDay
      const expectedMinutes = record.employee.hoursPerDay * 60
      const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes)

      const updated = await prisma.timeRecord.update({
        where: { id },
        data: {
          clockOut,
          workedMinutes,
          overtimeMinutes,
        },
        include: {
          employee: { select: { id: true, name: true } },
          obra: { select: { id: true, name: true } },
        },
      })

      return reply.send(updated)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao registrar saída' })
    }
  })

  // GET /resumo - Monthly summary by employee
  interface ResumoQuery {
    obraId: string
    month: string
    year: string
  }

  fastify.get<{ Querystring: ResumoQuery }>('/resumo', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'SUPERVISOR', 'AUDITOR']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { obraId, month: monthStr, year: yearStr } = request.query

      if (!obraId || !monthStr || !yearStr) {
        return reply.status(400).send({ error: 'obraId, month e year são obrigatórios' })
      }

      const month = parseInt(monthStr, 10)
      const year = parseInt(yearStr, 10)

      // SUPERVISOR: validate project link
      if (request.role === 'SUPERVISOR') {
        const vinculo = await prisma.obraUser.findFirst({
          where: { userId: request.userId, obraId },
        })
        if (!vinculo) {
          return reply.status(403).send({ error: 'Você não está vinculado a este projeto.' })
        }
      }

      // Date range for the month (BRT)
      const startUTC = new Date(Date.UTC(year, month - 1, 1, 3, 0, 0))
      const endUTC = new Date(Date.UTC(year, month, 1, 3, 0, 0))

      // Get all time records for the project in this month
      const records = await prisma.timeRecord.findMany({
        where: {
          companyId,
          obraId,
          clockIn: { gte: startUTC, lt: endUTC },
        },
        include: {
          employee: {
            select: { id: true, name: true, role: true },
          },
        },
      })

      // Group by employee
      const byEmployee = new Map<string, {
        employeeId: string
        employeeName: string
        employeeRole: string
        dates: Set<string>
        totalMinutes: number
        overtimeMinutes: number
        lastClockIn: Date
      }>()

      for (const record of records) {
        const empId = record.employee.id
        let entry = byEmployee.get(empId)
        if (!entry) {
          entry = {
            employeeId: empId,
            employeeName: record.employee.name,
            employeeRole: record.employee.role,
            dates: new Set(),
            totalMinutes: 0,
            overtimeMinutes: 0,
            lastClockIn: record.clockIn,
          }
          byEmployee.set(empId, entry)
        }
        // Count unique dates (date part of clockIn in BRT = UTC-3)
        const brtDate = new Date(record.clockIn.getTime() - 3 * 60 * 60 * 1000)
        entry.dates.add(brtDate.toISOString().split('T')[0])
        entry.totalMinutes += record.workedMinutes ?? 0
        entry.overtimeMinutes += record.overtimeMinutes ?? 0
        if (record.clockIn > entry.lastClockIn) {
          entry.lastClockIn = record.clockIn
        }
      }

      // Calculate expected work days (weekdays in the month, excluding Sundays)
      const daysInMonth = new Date(year, month, 0).getDate()
      let expectedWorkDays = 0
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(year, month - 1, d).getDay()
        if (day !== 0) expectedWorkDays++ // exclude Sundays only
      }

      const data = Array.from(byEmployee.values()).map((entry) => ({
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        employeeRole: entry.employeeRole,
        workedDays: entry.dates.size,
        totalMinutes: entry.totalMinutes,
        overtimeMinutes: entry.overtimeMinutes,
        absences: Math.max(0, expectedWorkDays - entry.dates.size),
        lastClockIn: entry.lastClockIn.toISOString(),
      })).sort((a, b) => a.employeeName.localeCompare(b.employeeName))

      return reply.send({ data, expectedWorkDays })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao gerar resumo mensal' })
    }
  })
}
