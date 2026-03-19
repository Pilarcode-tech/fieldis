'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AxiosError } from 'axios'

interface ApiError {
  message: string
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

interface EmployeeFilters {
  search?: string
  status?: string
  page?: number
  limit?: number
}

interface ObraFilters {
  search?: string
  status?: string
  page?: number
  limit?: number
}

interface TimeRecordFilters {
  obraId?: string
  date?: string
  employeeId?: string
  page?: number
  limit?: number
}

interface AdvanceFilters {
  status?: string
  page?: number
  limit?: number
}

interface DashboardData {
  totalEmployees: number
  activeObras: number
  todayRecords: number
  monthlyLaborCost: number
  pendingAdvances: number
  expiringDocs: number
  obraStats: Array<{
    id: string
    name: string
    code: string
    employeeCount: number
    budgetedCost: number
    realCost: number
    status: string
  }>
}

interface Employee {
  id: string
  name: string
  cpf: string
  rg: string | null
  birthDate: string | null
  phone: string | null
  email: string | null
  address: string | null
  pis: string | null
  ctpsNumber: string | null
  role: string
  department: string | null
  hireDate: string
  terminationDate: string | null
  status: string
  baseSalary: number
  salaryType: string
  hoursPerDay: number
  hasInsalubrity: boolean
  insalubrityGrade: string | null
  hasPericulosity: boolean
  hasNightShift: boolean
  hasVT: boolean
  hasVA: boolean
  vaAmount: number
  bankCode: string | null
  bankAgency: string | null
  bankAccount: string | null
  dependentsCount: number
  hasAlimony: boolean
  alimonyAmount: number
  notes: string | null
  currentObra: { id: string; name: string } | null
  documents: Array<{ id: string; type: string; fileName: string; fileUrl: string; status: string; expiresAt: string | null }>
  allocations: Array<{ id: string; obraId: string; obraName: string; startDate: string; endDate: string | null }>
  timeRecords: Array<{ id: string; clockIn: string; clockOut: string | null; workedMinutes: number; overtimeMinutes: number }>
  payrollItems: Array<{ id: string; periodMonth: number; periodYear: number; baseSalary: number; overtime: number; additions: number; deductions: number; netSalary: number }>
}

interface Obra {
  id: string
  name: string
  code: string
  address: string | null
  city: string | null
  state: string | null
  status: string
  startDate: string
  endDate: string | null
  budgetedCost: number
  realCost: number
  realCostMO?: number
  realCostExtras?: number
  actualCost: number
  actualCostMO?: number
  actualCostExtras?: number
  activeEmployees: number
  employees: Array<{ id: string; name: string; role: string; startDate: string; endDate: string | null }>
  timeRecords: Array<{ id: string; employeeName: string; clockIn: string; clockOut: string | null; workedMinutes: number }>
  users?: Array<{ userId: string }>
}

interface PayrollPeriod {
  id: string
  month: number
  year: number
  status: string
  totalBase: number
  totalOvertime: number
  totalAdditions: number
  totalDeductions: number
  totalNet: number
  items: Array<{
    id: string
    employeeId: string
    employeeName: string
    baseSalary: number
    overtime: number
    additions: number
    deductions: number
    netSalary: number
  }>
}

interface Advance {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  reason: string | null
  status: string
  requestDate: string
  discountMonth: number | null
  discountYear: number | null
}

// Dashboard
export function useDashboard() {
  return useQuery<DashboardData, AxiosError<ApiError>>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard')
      return data
    },
  })
}

// Employees
export function useEmployees(filters?: EmployeeFilters) {
  return useQuery<PaginatedResponse<Employee>, AxiosError<ApiError>>({
    queryKey: ['employees', filters],
    queryFn: async () => {
      const { data } = await api.get('/employees', { params: filters })
      return data
    },
  })
}

export function useEmployee(id: string) {
  return useQuery<Employee, AxiosError<ApiError>>({
    queryKey: ['employees', id],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (employee: Record<string, unknown>) => {
      const { data } = await api.post('/employees', employee)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (employee: Record<string, unknown>) => {
      const { data } = await api.patch(`/employees/${id}`, employee)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employees', id] })
    },
  })
}

// Obras
export function useObras(filters?: ObraFilters) {
  return useQuery<PaginatedResponse<Obra>, AxiosError<ApiError>>({
    queryKey: ['obras', filters],
    queryFn: async () => {
      const { data } = await api.get('/obras', { params: filters })
      return data
    },
  })
}

export function useObra(id: string) {
  return useQuery<Obra, AxiosError<ApiError>>({
    queryKey: ['obras', id],
    queryFn: async () => {
      const { data } = await api.get(`/obras/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateObra(obraId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { data: result } = await api.patch(`/obras/${obraId}`, data)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      queryClient.invalidateQueries({ queryKey: ['obras', obraId] })
    },
  })
}

export function useCreateObra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (obra: Record<string, unknown>) => {
      const { data } = await api.post('/obras', obra)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
    },
  })
}

// Project Costs
interface ProjectCost {
  id: string
  category: string
  description: string
  amount: number
  date: string
  invoiceNumber: string | null
  createdBy: { name: string }
  createdById: string
  createdAt: string
}

export function useProjectCosts(obraId: string) {
  return useQuery<ProjectCost[]>({
    queryKey: ['project-costs', obraId],
    queryFn: async () => {
      const { data } = await api.get(`/obras/${obraId}/custos`)
      return data
    },
    enabled: !!obraId,
  })
}

export function useCreateProjectCost(obraId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { category: string; description: string; amount: number; date: string; invoiceNumber?: string }) => {
      const { data } = await api.post(`/obras/${obraId}/custos`, body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-costs', obraId] })
      queryClient.invalidateQueries({ queryKey: ['obras', obraId] })
      queryClient.invalidateQueries({ queryKey: ['obras'] })
    },
  })
}

export function useUpdateProjectCost(obraId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ costId, body }: { costId: string; body: { category?: string; description?: string; amount?: number; date?: string; invoiceNumber?: string } }) => {
      const { data } = await api.patch(`/obras/${obraId}/custos/${costId}`, body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-costs', obraId] })
      queryClient.invalidateQueries({ queryKey: ['obras', obraId] })
      queryClient.invalidateQueries({ queryKey: ['obras'] })
    },
  })
}

export function useDeleteProjectCost(obraId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (costId: string) => {
      await api.delete(`/obras/${obraId}/custos/${costId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-costs', obraId] })
      queryClient.invalidateQueries({ queryKey: ['obras', obraId] })
      queryClient.invalidateQueries({ queryKey: ['obras'] })
    },
  })
}

export function useAllocateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ obraId, ...body }: { obraId: string; employeeId: string; startDate: string }) => {
      const { data } = await api.post(`/obras/${obraId}/equipe`, body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useDeallocateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ obraId, employeeId }: { obraId: string; employeeId: string }) => {
      const { data } = await api.delete(`/obras/${obraId}/equipe`, { data: { employeeId } })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

// Time Records
export function useTimeRecords(filters?: TimeRecordFilters) {
  return useQuery({
    queryKey: ['time-records', filters],
    queryFn: async () => {
      const { data } = await api.get('/ponto', { params: filters })
      return data as PaginatedResponse<{
        id: string
        employeeId: string
        employeeName: string
        obraId: string
        clockIn: string
        clockOut: string | null
        workedMinutes: number
        overtimeMinutes: number
        breakMinutes: number
      }>
    },
    enabled: !!filters?.obraId,
  })
}

export function useBulkClockIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { obraId: string; employeeIds: string[]; clockIn: string; breakMinutes: number; source: string }) => {
      const { data } = await api.post('/ponto', { ...body, bulk: true })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-records'] })
    },
  })
}

export function useClockOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ recordId, clockOut }: { recordId: string; clockOut: string }) => {
      const { data } = await api.patch(`/ponto/${recordId}/saida`, { clockOut })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-records'] })
    },
  })
}

export function useEmployeeDocuments(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/documents`)
      return data as Array<{
        id: string
        type: string
        fileName: string
        fileUrl: string
        status: string
        expiresAt: string | null
      }>
    },
    enabled: !!employeeId,
  })
}

export function useMonthlyPontoSummary(obraId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['ponto-resumo', obraId, month, year],
    queryFn: async () => {
      const { data } = await api.get('/ponto/resumo', { params: { obraId, month, year } })
      return data as {
        data: Array<{
          employeeId: string
          employeeName: string
          employeeRole: string
          workedDays: number
          totalMinutes: number
          overtimeMinutes: number
          absences: number
          lastClockIn: string
        }>
        expectedWorkDays: number
      }
    },
    enabled: !!obraId && month > 0 && year > 0,
  })
}

export function usePontoByEmployee(employeeId: string, month: number, year: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
  return useQuery({
    queryKey: ['ponto-employee', employeeId, month, year],
    queryFn: async () => {
      const { data } = await api.get('/ponto', { params: { employeeId, startDate, endDate } })
      return (data as { data: Array<{ id: string; clockIn: string; clockOut: string | null; workedMinutes: number; overtimeMinutes: number }> }).data
    },
    enabled: !!employeeId && month > 0 && year > 0,
  })
}

export function useEmployeePayslips(employeeId: string) {
  return useQuery({
    queryKey: ['employee-payslips', employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/payslips`)
      return data as Array<{
        id: string
        periodId: string
        baseSalary: number
        netSalary: number
        period: { month: number; year: number; status: string }
      }>
    },
    enabled: !!employeeId,
  })
}

// Payroll
export function usePayrollPeriods() {
  return useQuery<PayrollPeriod[], AxiosError<ApiError>>({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const { data } = await api.get('/folha/periodos')
      return data
    },
  })
}

export function usePayrollPeriod(id: string) {
  return useQuery<PayrollPeriod, AxiosError<ApiError>>({
    queryKey: ['payroll-periods', id],
    queryFn: async () => {
      const { data } = await api.get(`/folha/periodos/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { month: number; year: number }) => {
      const { data } = await api.post('/folha/periodos', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
    },
  })
}

interface CalculatePayrollResult {
  message: string
  periodId: string
  items: Array<{ employeeId: string; employeeName: string; netSalary: number }>
  skipped?: Array<{ employeeId: string; employeeName: string; reason: string }>
}

export function useCalculatePayroll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data } = await api.post(`/folha/periodos/${periodId}/calcular`)
      return data as CalculatePayrollResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
    },
  })
}

export function useClosePayroll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data } = await api.patch(`/folha/periodos/${periodId}/fechar`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
    },
  })
}

export function usePayrollItem(periodId: string, employeeId: string) {
  return useQuery({
    queryKey: ['payroll-item', periodId, employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/folha/periodos/${periodId}/items/${employeeId}`)
      return data as {
        id: string
        employeeId: string
        employee: { id: string; name: string; cpf?: string; role: string; department?: string }
        obra?: { id: string; name: string; code: string } | null
        period: { month: number; year: number; status: string }
        baseSalary: number
        workedDays: number
        overtimeHours: number
        overtimeValue: number
        nightShiftValue: number
        insalubrityValue: number
        periculosityValue: number
        dsrValue: number
        inssDiscount: number
        irrfDiscount: number
        vtDiscount: number
        advancesDiscount: number
        absencesDiscount: number
        alimonyDiscount: number
        fgtsValue: number
        grossSalary: number
        totalDiscounts: number
        netSalary: number
        companyCost: number
      }
    },
    enabled: !!periodId && !!employeeId,
  })
}

export function usePayslip(periodId: string, employeeId: string) {
  return useQuery({
    queryKey: ['payslip', periodId, employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/folha/periodos/${periodId}/items/${employeeId}/payslip`)
      return data as {
        id: string
        employeeId: string
        employee: { name: string; cpf?: string; role: string; department?: string; hireDate?: string }
        obra?: { name: string; code: string } | null
        period: { month: number; year: number; status: string }
        company?: { name: string; cnpj: string } | null
        baseSalary: number
        workedDays: number
        overtimeHours: number
        overtimeValue: number
        nightShiftValue: number
        insalubrityValue: number
        periculosityValue: number
        dsrValue: number
        inssDiscount: number
        irrfDiscount: number
        vtDiscount: number
        advancesDiscount: number
        absencesDiscount: number
        alimonyDiscount: number
        fgtsValue: number
        grossSalary: number
        totalDiscounts: number
        netSalary: number
        companyCost: number
      }
    },
    enabled: !!periodId && !!employeeId,
  })
}

export function useAdjustPayrollItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ periodId, employeeId, body }: { periodId: string; employeeId: string; body: Record<string, number> }) => {
      const { data } = await api.patch(`/folha/periodos/${periodId}/items/${employeeId}`, body)
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-item', variables.periodId, variables.employeeId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
    },
  })
}

// Employee payslips
export function useMyPayslips(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: ['payslips', employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/payslips`)
      return data as Array<{
        id: string
        periodId: string
        baseSalary: number
        netSalary: number
        grossSalary: number
        period: { month: number; year: number; status: string }
      }>
    },
    enabled: !!employeeId,
  })
}

// Advances
export function useAdvances(filters?: AdvanceFilters) {
  return useQuery<PaginatedResponse<Advance>, AxiosError<ApiError>>({
    queryKey: ['advances', filters],
    queryFn: async () => {
      const { data } = await api.get('/adiantamentos', { params: filters })
      return data
    },
  })
}

export function useApproveAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (advanceId: string) => {
      const { data } = await api.patch(`/adiantamentos/${advanceId}/aprovar`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] })
    },
  })
}

export function useRejectAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (advanceId: string) => {
      const { data } = await api.patch(`/adiantamentos/${advanceId}/rejeitar`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] })
    },
  })
}

export function useCreateAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { employeeId: string; amount: number; reason?: string; discountMonth?: number; discountYear?: number }) => {
      const { data } = await api.post('/adiantamentos', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] })
    },
  })
}

// Financial
export function useFinancialData() {
  return useQuery({
    queryKey: ['financial'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/financial')
      return data as {
        costByObra: Array<{ obraName: string; cost: number; budget: number }>
        monthlyEvolution: Array<{ month: string; cost: number; revenue: number }>
      }
    },
  })
}

// Users
interface UserData {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  employeeId: string | null
  createdAt: string
  obras: Array<{ id: string; name: string; code: string }>
}

export function useUsers(filters?: { role?: string; active?: string; search?: string; page?: string; limit?: string }) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: filters })
      return data as PaginatedResponse<UserData>
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.post('/users', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.patch(`/users/${id}`, body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data } = await api.patch(`/users/${userId}/senha`, { newPassword })
      return data
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(`/users/${userId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useLinkUserProjects() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, obraIds }: { userId: string; obraIds: string[] }) => {
      const { data } = await api.post(`/users/${userId}/projetos`, { obraIds })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Notifications
interface Notification {
  id: string
  type: 'doc_expiring' | 'doc_expired' | 'advance_pending' | 'payroll_open'
  title: string
  description: string
  date: string | null
}

export function useNotifications() {
  return useQuery<{ notifications: Notification[]; total: number }, AxiosError<ApiError>>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications')
      return data
    },
    refetchInterval: 60000, // Poll every 60 seconds
    refetchOnWindowFocus: true,
  })
}
