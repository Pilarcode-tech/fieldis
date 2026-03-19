import { z } from 'zod'

// ============ Zod Schemas ============

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const CreateEmployeeSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  rg: z.string().optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  pis: z.string().optional(),
  ctpsNumber: z.string().optional(),
  role: z.string().min(2, 'Função é obrigatória'),
  department: z.string().optional(),
  hireDate: z.string(),
  baseSalary: z.number().positive('Salário deve ser positivo'),
  salaryType: z.enum(['MONTHLY', 'HOURLY', 'DAILY']).default('MONTHLY'),
  hoursPerDay: z.number().default(8),
  hasInsalubrity: z.boolean().default(false),
  insalubrityGrade: z.enum(['MINIMO', 'MEDIO', 'MAXIMO']).optional(),
  hasPericulosity: z.boolean().default(false),
  hasNightShift: z.boolean().default(false),
  hasVT: z.boolean().default(true),
  hasVA: z.boolean().default(false),
  vaAmount: z.number().default(0),
  bankCode: z.string().optional(),
  bankAgency: z.string().optional(),
  bankAccount: z.string().optional(),
  dependentsCount: z.number().int().min(0).default(0),
  hasAlimony: z.boolean().default(false),
  alimonyAmount: z.number().default(0),
  notes: z.string().optional(),
})

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial()

export const CreateObraSchema = z.object({
  name: z.string().min(3, 'Nome do projeto é obrigatório'),
  code: z.string().min(2, 'Código é obrigatório'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'PAUSED', 'FINISHED']).default('PLANNING'),
  startDate: z.string(),
  endDate: z.string().optional(),
  budgetedCost: z.number().min(0).default(0),
})

export const UpdateObraSchema = CreateObraSchema.partial()

export const TimeRecordSchema = z.object({
  employeeId: z.string().uuid(),
  obraId: z.string().uuid(),
  clockIn: z.string(),
  clockOut: z.string().optional(),
  breakMinutes: z.number().int().min(0).default(0),
  photoInUrl: z.string().optional(),
  latIn: z.number().optional(),
  lngIn: z.number().optional(),
  source: z.enum(['MANUAL', 'GPS', 'BIOMETRIC']).default('MANUAL'),
})

export const BulkTimeRecordSchema = z.object({
  obraId: z.string().uuid(),
  employeeIds: z.array(z.string().uuid()).min(1),
  clockIn: z.string(),
  breakMinutes: z.number().int().min(0).default(60),
  source: z.enum(['MANUAL', 'GPS', 'BIOMETRIC']).default('MANUAL'),
})

export const CreateAdvanceSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number().positive('Valor deve ser positivo'),
  reason: z.string().optional(),
  discountMonth: z.number().int().min(1).max(12).optional(),
  discountYear: z.number().int().optional(),
})

export const CreatePayrollPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
})

export const AllocateEmployeeSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.string(),
})

// ============ Inferred Types ============

export type Login = z.infer<typeof LoginSchema>
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>
export type UpdateEmployee = z.infer<typeof UpdateEmployeeSchema>
export type CreateObra = z.infer<typeof CreateObraSchema>
export type UpdateObra = z.infer<typeof UpdateObraSchema>
export type TimeRecordInput = z.infer<typeof TimeRecordSchema>
export type BulkTimeRecordInput = z.infer<typeof BulkTimeRecordSchema>
export type CreateAdvance = z.infer<typeof CreateAdvanceSchema>
export type CreatePayrollPeriod = z.infer<typeof CreatePayrollPeriodSchema>
export type AllocateEmployee = z.infer<typeof AllocateEmployeeSchema>

// ============ Utility Functions ============

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatDate(date: Date | string): string {
  // For date-only strings (YYYY-MM-DD), format directly to avoid
  // timezone conversion issues (new Date('YYYY-MM-DD') is UTC midnight,
  // which displays as the previous day in negative UTC offsets like BRT)
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR')
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

// Status labels and colors for various entity statuses
export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Ativo',
    ON_LEAVE: 'Afastado',
    VACATION: 'Férias',
    TERMINATED: 'Desligado',
    PLANNING: 'Planejamento',
    PAUSED: 'Pausada',
    FINISHED: 'Finalizada',
    PENDING: 'Pendente',
    VALID: 'Válido',
    EXPIRED: 'Vencido',
    REJECTED: 'Rejeitado',
    OPEN: 'Aberta',
    REVIEW: 'Em Revisão',
    CLOSED: 'Fechada',
    PAID: 'Paga',
    APPROVED: 'Aprovado',
    DISCOUNTED: 'Descontado',
  }
  return labels[status] || status
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    ON_LEAVE: 'bg-yellow-100 text-yellow-800',
    VACATION: 'bg-blue-100 text-blue-800',
    TERMINATED: 'bg-red-100 text-red-800',
    PLANNING: 'bg-gray-100 text-gray-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    FINISHED: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    VALID: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-red-100 text-red-800',
    REJECTED: 'bg-red-100 text-red-800',
    OPEN: 'bg-blue-100 text-blue-800',
    REVIEW: 'bg-orange-100 text-orange-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    PAID: 'bg-green-100 text-green-800',
    APPROVED: 'bg-green-100 text-green-800',
    DISCOUNTED: 'bg-purple-100 text-purple-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
