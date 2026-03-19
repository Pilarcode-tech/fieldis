'use client'

import { useSession } from 'next-auth/react'

export function usePermissions() {
  const { data: session, status } = useSession()
  const role = session?.user?.role ?? ''

  // While session is loading, return safe defaults with isLoading flag
  const isLoading = status === 'loading'

  const isSuperAdmin = role === 'SUPER_ADMIN'
  const isCompanyAdmin = role === 'COMPANY_ADMIN'
  const isRhManager = role === 'RH_MANAGER'
  const isFinancialManager = role === 'FINANCIAL_MANAGER'
  const isSupervisor = role === 'SUPERVISOR'
  const isEmployee = role === 'EMPLOYEE'
  const isAuditor = role === 'AUDITOR'

  return {
    role,
    isLoading,
    canManageEmployees: isSuperAdmin || isCompanyAdmin || isRhManager,
    canViewFinancial: isSuperAdmin || isCompanyAdmin || isFinancialManager || isAuditor,
    canManageFinancial: isSuperAdmin || isCompanyAdmin || isFinancialManager,
    canClosePayroll: isSuperAdmin || isCompanyAdmin || isRhManager || isFinancialManager,
    canCalculatePayroll: isSuperAdmin || isCompanyAdmin || isRhManager,
    canApproveAdvances: isSuperAdmin || isCompanyAdmin || isRhManager || isFinancialManager,
    canManageProjects: isSuperAdmin || isCompanyAdmin || isRhManager,
    canDeleteProjects: isSuperAdmin || isCompanyAdmin,
    canAllocate: isSuperAdmin || isCompanyAdmin || isRhManager || isSupervisor,
    canDeallocate: isSuperAdmin || isCompanyAdmin || isRhManager,
    canRecordPresence: isSuperAdmin || isCompanyAdmin || isRhManager || isSupervisor,
    canEditPonto: isSuperAdmin || isCompanyAdmin || isRhManager,
    canUploadDocuments: isSuperAdmin || isCompanyAdmin || isRhManager,
    canRequestAdvance: isSuperAdmin || isCompanyAdmin || isRhManager || isEmployee,
    canManageUsers: isSuperAdmin || isCompanyAdmin || isRhManager,
    canViewSettings: isSuperAdmin || isCompanyAdmin,
    canViewPayroll: isSuperAdmin || isCompanyAdmin || isRhManager || isFinancialManager || isAuditor,
    canViewProjectFinancials: isSuperAdmin || isCompanyAdmin || isRhManager || isFinancialManager || isAuditor,
    isReadOnly: isAuditor,
    isEmployee,
    isSupervisor,
    isFinancialManager,
    isSuperAdmin,
    isCompanyAdmin,
  }
}
