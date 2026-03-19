import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { CreatePayrollPeriodSchema } from '@fieldis/shared'
import { calculatePayroll } from '@fieldis/calculator'
import type { InsalubrityGrade } from '@fieldis/calculator'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'

interface IdParam {
  id: string
}

interface ItemParams {
  id: string
  employeeId: string
}

export default async function folhaRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET /periodos - List payroll periods
  fastify.get('/periodos', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER', 'AUDITOR']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request

      const periods = await prisma.payrollPeriod.findMany({
        where: { companyId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          payrollItems: {
            select: { netSalary: true, baseSalary: true, overtimeValue: true, totalDiscounts: true },
          },
        },
      })

      const result = periods.map((period) => ({
        id: period.id,
        month: period.month,
        year: period.year,
        status: period.status,
        closedAt: period.closedAt,
        itemCount: period.payrollItems.length,
        totalBase: period.payrollItems.reduce((sum, i) => sum + i.baseSalary, 0),
        totalOvertime: period.payrollItems.reduce((sum, i) => sum + i.overtimeValue, 0),
        totalDeductions: period.payrollItems.reduce((sum, i) => sum + i.totalDiscounts, 0),
        totalNet: period.payrollItems.reduce((sum, i) => sum + i.netSalary, 0),
      }))

      return reply.send(result)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao listar períodos' })
    }
  })

  // POST /periodos - Create payroll period
  fastify.post('/periodos', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const parsed = CreatePayrollPeriodSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const { month, year } = parsed.data

      // Check if period already exists
      const existing = await prisma.payrollPeriod.findFirst({
        where: { companyId, month, year },
      })

      if (existing) {
        return reply.status(409).send({ error: 'Período já existe' })
      }

      const period = await prisma.payrollPeriod.create({
        data: { companyId, month, year },
      })

      return reply.status(201).send(period)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao criar período' })
    }
  })

  // GET /periodos/:id - Period detail with items
  fastify.get<{ Params: IdParam }>('/periodos/:id', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER', 'AUDITOR']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const period = await prisma.payrollPeriod.findFirst({
        where: { id, companyId },
        include: {
          payrollItems: {
            include: {
              employee: {
                select: { id: true, name: true, cpf: true, role: true },
              },
              obra: {
                select: { id: true, name: true, code: true },
              },
            },
            orderBy: {
              employee: { name: 'asc' },
            },
          },
        },
      })

      if (!period) {
        return reply.status(404).send({ error: 'Período não encontrado' })
      }

      // Transform to match frontend PayrollPeriod type
      const items = period.payrollItems.map((item) => {
        const additions = item.overtimeValue + item.nightShiftValue + item.insalubrityValue + item.periculosityValue + item.dsrValue
        const deductions = item.inssDiscount + item.irrfDiscount + item.vtDiscount + item.advancesDiscount + item.absencesDiscount + item.alimonyDiscount
        return {
          id: item.id,
          employeeId: item.employeeId,
          employeeName: item.employee.name,
          employeeCpf: item.employee.cpf,
          employeeRole: item.employee.role,
          obraName: item.obra?.name ?? null,
          baseSalary: item.baseSalary,
          overtime: item.overtimeValue,
          additions,
          deductions,
          netSalary: item.netSalary,
          grossSalary: item.grossSalary,
          fgtsValue: item.fgtsValue,
          companyCost: item.companyCost,
        }
      })

      const totalBase = items.reduce((sum, i) => sum + i.baseSalary, 0)
      const totalOvertime = items.reduce((sum, i) => sum + i.overtime, 0)
      const totalAdditions = items.reduce((sum, i) => sum + i.additions, 0)
      const totalDeductions = items.reduce((sum, i) => sum + i.deductions, 0)
      const totalNet = items.reduce((sum, i) => sum + i.netSalary, 0)

      // Strip CPF for FINANCIAL_MANAGER — they identify by name, not CPF
      const responseItems = request.role === 'FINANCIAL_MANAGER'
        ? items.map(({ employeeCpf, ...rest }) => rest)
        : items

      return reply.send({
        id: period.id,
        month: period.month,
        year: period.year,
        status: period.status,
        totalBase,
        totalOvertime,
        totalAdditions,
        totalDeductions,
        totalNet,
        items: responseItems,
      })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar período' })
    }
  })

  // POST /periodos/:id/calcular - Calculate payroll for all active employees
  fastify.post<{ Params: IdParam }>('/periodos/:id/calcular', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id: periodId } = request.params

      const period = await prisma.payrollPeriod.findFirst({
        where: { id: periodId, companyId },
      })

      if (!period) {
        return reply.status(404).send({ error: 'Período não encontrado' })
      }

      if (period.status === 'CLOSED' || period.status === 'PAID') {
        return reply.status(400).send({ error: 'Período já fechado, não é possível recalcular' })
      }

      // Get all active employees for this company
      const employees = await prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        include: {
          employeeAllocations: {
            where: { active: true },
            take: 1,
            select: { obraId: true },
          },
        },
      })

      if (employees.length === 0) {
        return reply.send({
          message: 'Nenhum funcionário ativo encontrado',
          periodId,
          items: [],
        })
      }

      // Period date range
      const startOfMonth = new Date(period.year, period.month - 1, 1)
      const endOfMonth = new Date(period.year, period.month, 0, 23, 59, 59, 999)
      const totalDaysInMonth = endOfMonth.getDate()

      // Map insalubrity grade from legacy formats (e.g. '10%', '20%', '40%') to enum
      function mapInsalubrityGrade(grade: string | null): InsalubrityGrade | undefined {
        if (!grade) return undefined
        const normalized = grade.toUpperCase().trim()
        if (normalized === 'MINIMO' || normalized === '10%') return 'MINIMO'
        if (normalized === 'MEDIO' || normalized === '20%') return 'MEDIO'
        if (normalized === 'MAXIMO' || normalized === '40%') return 'MAXIMO'
        return undefined
      }

      const results: Array<{ employeeId: string; employeeName: string; netSalary: number }> = []
      const skipped: Array<{ employeeId: string; employeeName: string; reason: string }> = []

      for (const employee of employees) {
        // Validate required data
        if (!employee.baseSalary || employee.baseSalary <= 0) {
          skipped.push({ employeeId: employee.id, employeeName: employee.name, reason: 'Salário base inválido' })
          continue
        }

        const hoursPerDay = employee.hoursPerDay || 8

        // Get time records for this employee in this period
        const timeRecords = await prisma.timeRecord.findMany({
          where: {
            companyId,
            employeeId: employee.id,
            clockIn: { gte: startOfMonth, lte: endOfMonth },
          },
        })

        // Sum overtime minutes
        const totalOvertimeMinutes = timeRecords.reduce(
          (sum, record) => sum + (record.overtimeMinutes ?? 0),
          0,
        )

        // Count worked days (unique dates with records)
        const workedDates = new Set(
          timeRecords.map((r) => r.clockIn.toISOString().split('T')[0]),
        )
        const workedDays = workedDates.size

        // Count absences: no records on expected working days
        const expectedWorkDays = Math.round(totalDaysInMonth * (5 / 7))
        const absencesDays = Math.max(0, expectedWorkDays - workedDays)

        // Get approved advances for this month
        const advances = await prisma.advance.findMany({
          where: {
            companyId,
            employeeId: employee.id,
            status: 'APPROVED',
            discountMonth: period.month,
            discountYear: period.year,
          },
        })

        const advancesTotal = advances.reduce((sum, adv) => sum + Number(adv.amount), 0)

        const overtimeHours = totalOvertimeMinutes / 60

        const payrollResult = calculatePayroll({
          baseSalary: Number(employee.baseSalary),
          salaryType: employee.salaryType as 'MONTHLY' | 'HOURLY' | 'DAILY',
          hoursPerDay,
          workedDays,
          totalDaysInMonth,
          weekdayOvertimeHours: overtimeHours,
          sundayOvertimeHours: 0,
          holidayOvertimeHours: 0,
          hasInsalubrity: employee.hasInsalubrity,
          insalubrityGrade: mapInsalubrityGrade(employee.insalubrityGrade),
          hasPericulosity: employee.hasPericulosity,
          hasNightShift: employee.hasNightShift,
          nightShiftHours: 0,
          hasVT: employee.hasVT,
          vtDailyAmount: 0,
          dependentsCount: employee.dependentsCount,
          hasAlimony: employee.hasAlimony,
          alimonyAmount: Number(employee.alimonyAmount),
          advancesTotal,
          absencesDays,
        })

        const obraId = employee.employeeAllocations[0]?.obraId ?? null

        // Upsert the payroll item
        await prisma.payrollItem.upsert({
          where: {
            periodId_employeeId: {
              periodId,
              employeeId: employee.id,
            },
          },
          create: {
            companyId,
            periodId,
            employeeId: employee.id,
            obraId,
            baseSalary: payrollResult.baseSalary,
            workedDays: payrollResult.workedDays,
            overtimeHours: payrollResult.overtimeHours,
            overtimeValue: payrollResult.overtimeValue,
            nightShiftValue: payrollResult.nightShiftValue,
            insalubrityValue: payrollResult.insalubrityValue,
            periculosityValue: payrollResult.periculosityValue,
            dsrValue: payrollResult.dsrValue,
            inssDiscount: payrollResult.inssDiscount,
            irrfDiscount: payrollResult.irrfDiscount,
            vtDiscount: payrollResult.vtDiscount,
            advancesDiscount: payrollResult.advancesDiscount,
            absencesDiscount: payrollResult.absencesDiscount,
            alimonyDiscount: payrollResult.alimonyDiscount,
            fgtsValue: payrollResult.fgtsValue,
            grossSalary: payrollResult.grossSalary,
            totalDiscounts: payrollResult.totalDiscounts,
            netSalary: payrollResult.netSalary,
            companyCost: payrollResult.companyCost,
          },
          update: {
            obraId,
            baseSalary: payrollResult.baseSalary,
            workedDays: payrollResult.workedDays,
            overtimeHours: payrollResult.overtimeHours,
            overtimeValue: payrollResult.overtimeValue,
            nightShiftValue: payrollResult.nightShiftValue,
            insalubrityValue: payrollResult.insalubrityValue,
            periculosityValue: payrollResult.periculosityValue,
            dsrValue: payrollResult.dsrValue,
            inssDiscount: payrollResult.inssDiscount,
            irrfDiscount: payrollResult.irrfDiscount,
            vtDiscount: payrollResult.vtDiscount,
            advancesDiscount: payrollResult.advancesDiscount,
            absencesDiscount: payrollResult.absencesDiscount,
            alimonyDiscount: payrollResult.alimonyDiscount,
            fgtsValue: payrollResult.fgtsValue,
            grossSalary: payrollResult.grossSalary,
            totalDiscounts: payrollResult.totalDiscounts,
            netSalary: payrollResult.netSalary,
            companyCost: payrollResult.companyCost,
          },
        })

        // Mark advances as discounted
        if (advances.length > 0) {
          await prisma.advance.updateMany({
            where: {
              id: { in: advances.map((a) => a.id) },
            },
            data: { status: 'DISCOUNTED' },
          })
        }

        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          netSalary: payrollResult.netSalary,
        })
      }

      return reply.send({
        message: `Folha calculada para ${results.length} funcionário(s)${skipped.length > 0 ? `, ${skipped.length} ignorado(s)` : ''}`,
        periodId,
        items: results,
        skipped: skipped.length > 0 ? skipped : undefined,
      })
    } catch (err) {
      request.log.error(err)
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      return reply.status(500).send({
        error: 'Erro ao calcular folha',
        detail: message,
      })
    }
  })

  // PATCH /periodos/:id/fechar - Close period
  fastify.patch<{ Params: IdParam }>('/periodos/:id/fechar', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId, userId } = request
      const { id } = request.params

      const period = await prisma.payrollPeriod.findFirst({
        where: { id, companyId },
      })

      if (!period) {
        return reply.status(404).send({ error: 'Período não encontrado' })
      }

      if (period.status === 'CLOSED' || period.status === 'PAID') {
        return reply.status(400).send({ error: 'Período já está fechado' })
      }

      let newStatus: 'REVIEW' | 'CLOSED'

      if (period.status === 'OPEN') {
        newStatus = 'REVIEW'
      } else {
        // REVIEW -> CLOSED
        newStatus = 'CLOSED'
      }

      const updated = await prisma.payrollPeriod.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'CLOSED'
            ? { closedAt: new Date(), closedById: userId }
            : {}),
        },
      })

      return reply.send(updated)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao fechar período' })
    }
  })

  // GET /periodos/:id/items/:employeeId - Individual payslip
  fastify.get('/periodos/:id/items/:employeeId', async (request: FastifyRequest<{ Params: ItemParams }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { id: periodId, employeeId } = request.params
      const role = request.role

      // EMPLOYEE role: can only view their own payslip
      if (role === 'EMPLOYEE' && request.employeeId && employeeId !== request.employeeId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const item = await prisma.payrollItem.findFirst({
        where: {
          companyId,
          periodId,
          employeeId,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              cpf: true,
              role: true,
              department: true,
              hireDate: true,
              bankCode: true,
              bankAgency: true,
              bankAccount: true,
            },
          },
          obra: {
            select: { id: true, name: true, code: true },
          },
          period: {
            select: { month: true, year: true, status: true },
          },
        },
      })

      if (!item) {
        return reply.status(404).send({ error: 'Holerite não encontrado' })
      }

      // Strip bank data for non-admin roles
      if (!['COMPANY_ADMIN', 'RH_MANAGER', 'SUPER_ADMIN'].includes(role)) {
        const employee = { ...item.employee } as Record<string, unknown>
        delete employee.bankCode
        delete employee.bankAgency
        delete employee.bankAccount
        return reply.send({ ...item, employee })
      }

      return reply.send(item)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar holerite' })
    }
  })

  // GET /periodos/:id/export - Export period as CSV
  fastify.get<{ Params: IdParam }>('/periodos/:id/export', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER', 'FINANCIAL_MANAGER', 'AUDITOR']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const period = await prisma.payrollPeriod.findFirst({
        where: { id, companyId },
        include: {
          payrollItems: {
            include: {
              employee: {
                select: { name: true, cpf: true, role: true, department: true },
              },
              obra: {
                select: { name: true, code: true },
              },
            },
            orderBy: { employee: { name: 'asc' } },
          },
        },
      })

      if (!period) {
        return reply.status(404).send({ error: 'Período não encontrado' })
      }

      const header = 'Nome,CPF,Funcao,Departamento,Projeto,Salario Base,H. Extras,Insalubridade,Periculosidade,Ad. Noturno,DSR,Salario Bruto,INSS,IRRF,VT,Adiantamentos,Faltas,Pensao,Total Descontos,Salario Liquido,FGTS'

      const rows = period.payrollItems.map(item => {
        return [
          `"${item.employee.name}"`,
          `"${item.employee.cpf}"`,
          `"${item.employee.role}"`,
          `"${item.employee.department || ''}"`,
          `"${item.obra?.name || ''}"`,
          item.baseSalary.toFixed(2),
          item.overtimeValue.toFixed(2),
          item.insalubrityValue.toFixed(2),
          item.periculosityValue.toFixed(2),
          item.nightShiftValue.toFixed(2),
          item.dsrValue.toFixed(2),
          item.grossSalary.toFixed(2),
          item.inssDiscount.toFixed(2),
          item.irrfDiscount.toFixed(2),
          item.vtDiscount.toFixed(2),
          item.advancesDiscount.toFixed(2),
          item.absencesDiscount.toFixed(2),
          item.alimonyDiscount.toFixed(2),
          item.totalDiscounts.toFixed(2),
          item.netSalary.toFixed(2),
          item.fgtsValue.toFixed(2),
        ].join(',')
      })

      const csv = [header, ...rows].join('\n')

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="folha-${period.month}-${period.year}.csv"`)
      return reply.send(csv)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao exportar folha' })
    }
  })

  // GET /periodos/:id/items/:employeeId/payslip - Individual payslip data
  fastify.get('/periodos/:id/items/:employeeId/payslip', async (request: FastifyRequest<{ Params: ItemParams }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { id: periodId, employeeId } = request.params

      // EMPLOYEE role check
      if (request.role === 'EMPLOYEE' && request.employeeId && request.employeeId !== employeeId) {
        return reply.status(403).send({ error: 'Sem permissão' })
      }

      const item = await prisma.payrollItem.findFirst({
        where: { companyId, periodId, employeeId },
        include: {
          employee: {
            select: {
              name: true, cpf: true, role: true, department: true,
              hireDate: true, bankCode: true, bankAgency: true, bankAccount: true,
            },
          },
          obra: { select: { name: true, code: true } },
          period: { select: { month: true, year: true, status: true } },
        },
      })

      if (!item) {
        return reply.status(404).send({ error: 'Holerite não encontrado' })
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, cnpj: true },
      })

      // Strip bank data for non-admin roles
      if (!['COMPANY_ADMIN', 'RH_MANAGER', 'SUPER_ADMIN'].includes(request.role)) {
        const employee = { ...item.employee } as Record<string, unknown>
        delete employee.bankCode
        delete employee.bankAgency
        delete employee.bankAccount
        return reply.send({ ...item, employee, company })
      }

      return reply.send({ ...item, company })
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar holerite' })
    }
  })

  // PATCH /periodos/:id/items/:employeeId - Manual adjustment
  fastify.patch<{ Params: ItemParams }>('/periodos/:id/items/:employeeId', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id: periodId, employeeId } = request.params

      // Check if period is closed
      const period = await prisma.payrollPeriod.findFirst({
        where: { id: periodId, companyId },
      })

      if (!period) {
        return reply.status(404).send({ error: 'Período não encontrado' })
      }

      if (period.status === 'CLOSED' || period.status === 'PAID') {
        return reply.status(400).send({ error: 'Período fechado, não é possível ajustar' })
      }

      const item = await prisma.payrollItem.findFirst({
        where: { companyId, periodId, employeeId },
      })

      if (!item) {
        return reply.status(404).send({ error: 'Item de folha não encontrado' })
      }

      const body = request.body as Record<string, unknown>

      // Allow adjusting specific fields
      const allowedFields = [
        'overtimeHours',
        'overtimeValue',
        'nightShiftValue',
        'insalubrityValue',
        'periculosityValue',
        'dsrValue',
        'vtDiscount',
        'advancesDiscount',
        'absencesDiscount',
        'alimonyDiscount',
      ]

      const updateData: Record<string, number> = {}

      for (const field of allowedFields) {
        if (body[field] !== undefined && typeof body[field] === 'number') {
          updateData[field] = body[field] as number
        }
      }

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ error: 'Nenhum campo válido para ajuste' })
      }

      // Recalculate totals if adjustments were made
      const currentItem = { ...item, ...updateData }

      const grossSalary =
        currentItem.baseSalary +
        (updateData.overtimeValue ?? item.overtimeValue) +
        (updateData.nightShiftValue ?? item.nightShiftValue) +
        (updateData.insalubrityValue ?? item.insalubrityValue) +
        (updateData.periculosityValue ?? item.periculosityValue) +
        (updateData.dsrValue ?? item.dsrValue)

      const totalDiscounts =
        item.inssDiscount +
        item.irrfDiscount +
        (updateData.vtDiscount ?? item.vtDiscount) +
        (updateData.advancesDiscount ?? item.advancesDiscount) +
        (updateData.absencesDiscount ?? item.absencesDiscount) +
        (updateData.alimonyDiscount ?? item.alimonyDiscount)

      const netSalary = Math.round((grossSalary - totalDiscounts) * 100) / 100

      const updated = await prisma.payrollItem.update({
        where: { id: item.id },
        data: {
          ...updateData,
          grossSalary,
          totalDiscounts,
          netSalary,
        },
      })

      return reply.send(updated)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao ajustar item de folha' })
    }
  })
}
