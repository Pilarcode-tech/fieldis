import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@fieldis/database'
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '@fieldis/shared'
import { tenantMiddleware } from '../../middleware/tenant'
import { roleGuard } from '../../middleware/roleGuard'
import { extname } from 'path'
import { saveFile } from '../../lib/storage'

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

interface ListQuery {
  status?: string
  search?: string
  obraId?: string
  page?: string
  limit?: string
}

interface IdParam {
  id: string
}

export default async function employeeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', tenantMiddleware)

  // GET / - List employees with filters
  fastify.get('/', async (request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { status, search, obraId, page = '1', limit = '20' } = request.query

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { companyId }

      // EMPLOYEE role: only see themselves
      if (request.role === 'EMPLOYEE' && request.employeeId) {
        where.id = request.employeeId
      }

      if (status) {
        where.status = status
      }

      if (search) {
        where.name = { contains: search, mode: 'insensitive' }
      }

      if (obraId) {
        where.employeeAllocations = {
          some: {
            obraId,
            active: true,
          },
        }
      }

      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { name: 'asc' },
          include: {
            employeeAllocations: {
              where: { active: true },
              include: {
                obra: {
                  select: { id: true, name: true, code: true },
                },
              },
              take: 1,
            },
          },
        }),
        prisma.employee.count({ where }),
      ])

      const data = employees.map((emp) => ({
        ...emp,
        currentObra: emp.employeeAllocations[0]?.obra ?? null,
        employeeAllocations: undefined,
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
      return reply.status(500).send({ error: 'Erro ao listar funcionários' })
    }
  })

  // POST / - Create employee
  fastify.post('/', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const parsed = CreateEmployeeSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const data = parsed.data

      // Check plan employee limit
      const PLAN_LIMITS: Record<string, number> = { BASICO: 30, PROFISSIONAL: 100, EMPRESARIAL: Infinity }
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } })
      const activeCount = await prisma.employee.count({ where: { companyId, status: { not: 'TERMINATED' } } })
      const limit = PLAN_LIMITS[company?.plan ?? 'BASICO'] ?? 30
      if (activeCount >= limit) {
        return reply.status(403).send({
          error: 'Limite de funcionários atingido para o plano atual.',
          code: 'PLAN_LIMIT_REACHED',
          limit,
          current: activeCount,
          plan: company?.plan,
        })
      }

      // Check for duplicate CPF within the same company
      const existing = await prisma.employee.findFirst({
        where: { companyId, cpf: data.cpf },
      })

      if (existing) {
        return reply.status(409).send({ error: 'CPF já cadastrado nesta empresa' })
      }

      const employee = await prisma.employee.create({
        data: {
          companyId,
          name: data.name,
          cpf: data.cpf,
          rg: data.rg,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          phone: data.phone,
          email: data.email || undefined,
          address: data.address,
          pis: data.pis,
          ctpsNumber: data.ctpsNumber,
          role: data.role,
          department: data.department,
          hireDate: new Date(data.hireDate),
          baseSalary: data.baseSalary,
          salaryType: data.salaryType,
          hoursPerDay: data.hoursPerDay,
          hasInsalubrity: data.hasInsalubrity,
          insalubrityGrade: data.insalubrityGrade,
          hasPericulosity: data.hasPericulosity,
          hasNightShift: data.hasNightShift,
          hasVT: data.hasVT,
          hasVA: data.hasVA,
          vaAmount: data.vaAmount,
          bankCode: data.bankCode,
          bankAgency: data.bankAgency,
          bankAccount: data.bankAccount,
          dependentsCount: data.dependentsCount,
          hasAlimony: data.hasAlimony,
          alimonyAmount: data.alimonyAmount,
          notes: data.notes,
        },
      })

      return reply.status(201).send(employee)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao criar funcionário' })
    }
  })

  // GET /:id - Employee detail
  fastify.get('/:id', async (request: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { id } = request.params
      const role = request.role

      // SUPERVISOR and FINANCIAL_MANAGER should not access employee details
      if (role === 'SUPERVISOR' || role === 'FINANCIAL_MANAGER') {
        return reply.status(403).send({ error: 'Sem permissão para acessar dados de funcionários' })
      }

      // EMPLOYEE role: can only view themselves
      if (role === 'EMPLOYEE' && request.employeeId && id !== request.employeeId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const employee = await prisma.employee.findFirst({
        where: { id, companyId },
        include: {
          employeeAllocations: {
            include: {
              obra: { select: { id: true, name: true, code: true } },
            },
            orderBy: { startDate: 'desc' },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
          },
          advances: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!employee) {
        return reply.status(404).send({ error: 'Funcionário não encontrado' })
      }

      // Flatten allocations for frontend
      const allocations = employee.employeeAllocations.map((a) => ({
        id: a.id,
        obraId: a.obraId,
        obraName: a.obra.name,
        obraCode: a.obra.code,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        active: a.active,
      }))

      // Build response without raw Prisma relation fields
      const { employeeAllocations: _ea, advances: rawAdvances, ...employeeData } = employee
      const result = { ...employeeData, allocations } as Record<string, unknown>

      // EMPLOYEE: remove advances and bank data
      if (role === 'EMPLOYEE') {
        delete result.bankCode
        delete result.bankAgency
        delete result.bankAccount
      } else {
        result.advances = rawAdvances
      }

      // AUDITOR: remove bank data
      if (role === 'AUDITOR') {
        delete result.bankCode
        delete result.bankAgency
        delete result.bankAccount
      }

      return reply.send(result)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao buscar funcionário' })
    }
  })

  // PATCH /:id - Update employee
  fastify.patch<{ Params: IdParam }>('/:id', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const parsed = UpdateEmployeeSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const existing = await prisma.employee.findFirst({
        where: { id, companyId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Funcionário não encontrado' })
      }

      const data = parsed.data
      const updateData: Record<string, unknown> = { ...data }

      if (data.birthDate) {
        updateData.birthDate = new Date(data.birthDate)
      }
      if (data.hireDate) {
        updateData.hireDate = new Date(data.hireDate)
      }
      if (data.email === '') {
        updateData.email = null
      }

      const employee = await prisma.employee.update({
        where: { id },
        data: updateData,
      })

      return reply.send(employee)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao atualizar funcionário' })
    }
  })

  // DELETE /:id - Soft delete (terminate)
  fastify.delete<{ Params: IdParam }>('/:id', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const existing = await prisma.employee.findFirst({
        where: { id, companyId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Funcionário não encontrado' })
      }

      const employee = await prisma.employee.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          terminatedAt: new Date(),
        },
      })

      // Deactivate all allocations
      await prisma.employeeAllocation.updateMany({
        where: { employeeId: id, companyId, active: true },
        data: { active: false, endDate: new Date() },
      })

      return reply.send(employee)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao desligar funcionário' })
    }
  })

  // GET /:id/documents - List employee documents
  fastify.get('/:id/documents', async (request: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      // EMPLOYEE role: can only view their own documents
      if (request.role === 'EMPLOYEE' && request.employeeId && id !== request.employeeId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const documents = await prisma.document.findMany({
        where: { companyId, employeeId: id },
        orderBy: { createdAt: 'desc' },
      })

      return reply.send(documents)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao listar documentos' })
    }
  })

  // POST /:id/documents - Upload document with file
  fastify.post<{ Params: IdParam }>('/:id/documents', { preHandler: roleGuard(['COMPANY_ADMIN', 'RH_MANAGER']) }, async (request, reply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      const employee = await prisma.employee.findFirst({
        where: { id, companyId },
      })

      if (!employee) {
        return reply.status(404).send({ error: 'Funcionário não encontrado' })
      }

      // Process multipart form data
      const fields: Record<string, string> = {}
      let fileBuffer: Buffer | null = null
      let originalFileName = ''

      const parts = request.parts()
      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = []
          for await (const chunk of part.file) {
            chunks.push(chunk)
          }
          fileBuffer = Buffer.concat(chunks)
          originalFileName = part.filename

          if (fileBuffer.length > MAX_FILE_SIZE) {
            return reply.status(400).send({ error: 'Arquivo muito grande. Máximo permitido: 10 MB.' })
          }

          const ext = extname(originalFileName).toLowerCase()
          if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return reply.status(400).send({ error: 'Formato não suportado. Use PDF, JPG ou PNG.' })
          }
        } else {
          fields[part.fieldname] = part.value as string
        }
      }

      if (!fileBuffer || !originalFileName) {
        return reply.status(400).send({ error: 'Arquivo é obrigatório' })
      }

      if (!fields.type) {
        return reply.status(400).send({ error: 'Tipo do documento é obrigatório' })
      }

      // Generate unique filename: companyId_employeeId_type_timestamp.ext
      const ext = extname(originalFileName).toLowerCase()
      const savedFileName = `${companyId}_${id}_${fields.type}_${Date.now()}${ext}`

      // Save file via storage abstraction (disk or R2)
      const fileUrl = await saveFile(savedFileName, fileBuffer)

      const document = await prisma.document.create({
        data: {
          companyId,
          employeeId: id,
          type: fields.type as import('@prisma/client').DocumentType,
          fileName: originalFileName,
          fileUrl,
          issuedAt: fields.issuedAt ? new Date(fields.issuedAt) : undefined,
          expiresAt: fields.expiresAt ? new Date(fields.expiresAt) : undefined,
          notes: fields.notes,
          status: 'VALID',
        },
      })

      return reply.status(201).send(document)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao salvar documento' })
    }
  })

  // GET /:id/payslips - List payroll items for the employee
  fastify.get('/:id/payslips', async (request: FastifyRequest<{ Params: IdParam }>, reply: FastifyReply) => {
    try {
      const { companyId } = request
      const { id } = request.params

      // EMPLOYEE role: can only view their own payslips
      if (request.role === 'EMPLOYEE' && request.employeeId && id !== request.employeeId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const payslips = await prisma.payrollItem.findMany({
        where: { companyId, employeeId: id },
        include: {
          period: {
            select: { month: true, year: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.send(payslips)
    } catch (err) {
      request.log.error(err)
      return reply.status(500).send({ error: 'Erro ao listar holerites' })
    }
  })
}
