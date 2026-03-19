import cron from 'node-cron'
import { prisma } from '@fieldis/database'

async function checkDocumentAlerts(): Promise<void> {
  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  try {
    // Documents expiring in the next 30 days
    const expiringDocs = await prisma.document.findMany({
      where: {
        expiresAt: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        status: { not: 'EXPIRED' },
      },
      include: {
        employee: {
          select: { name: true, companyId: true },
        },
      },
    })

    if (expiringDocs.length > 0) {
      console.log(`[ALERTA] ${expiringDocs.length} documento(s) vencendo nos próximos 30 dias:`)
      for (const doc of expiringDocs) {
        const expiresAt = doc.expiresAt ? doc.expiresAt.toLocaleDateString('pt-BR') : 'N/A'
        console.log(
          `  - ${doc.type} de ${doc.employee.name} (vence em ${expiresAt})`,
        )
      }
    }

    // Already expired documents that are not marked as EXPIRED
    const expiredDocs = await prisma.document.findMany({
      where: {
        expiresAt: { lt: now },
        status: { not: 'EXPIRED' },
      },
      include: {
        employee: {
          select: { name: true, companyId: true },
        },
      },
    })

    if (expiredDocs.length > 0) {
      console.log(`[ALERTA] ${expiredDocs.length} documento(s) já vencido(s):`)
      for (const doc of expiredDocs) {
        const expiresAt = doc.expiresAt ? doc.expiresAt.toLocaleDateString('pt-BR') : 'N/A'
        console.log(
          `  - ${doc.type} de ${doc.employee.name} (venceu em ${expiresAt})`,
        )
      }

      // Automatically mark them as expired
      await prisma.document.updateMany({
        where: {
          expiresAt: { lt: now },
          status: { not: 'EXPIRED' },
        },
        data: { status: 'EXPIRED' },
      })

      console.log(`[ALERTA] ${expiredDocs.length} documento(s) marcado(s) como EXPIRED`)
    }

    if (expiringDocs.length === 0 && expiredDocs.length === 0) {
      console.log('[ALERTA] Nenhum documento com vencimento próximo ou vencido.')
    }
  } catch (err) {
    console.error('[ALERTA] Erro ao verificar documentos:', err)
  }
}

async function checkPayrollAlerts(): Promise<void> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const dayOfMonth = now.getDate()

  try {
    // Get all active companies
    const companies = await prisma.company.findMany({
      where: { active: true },
      select: { id: true, name: true },
    })

    for (const company of companies) {
      // On the 25th+, check if current month's payroll period exists
      if (dayOfMonth >= 25) {
        const currentPeriod = await prisma.payrollPeriod.findFirst({
          where: { companyId: company.id, month: currentMonth, year: currentYear },
        })

        if (!currentPeriod) {
          console.log(`[ALERTA] ${company.name}: folha de ${currentMonth}/${currentYear} ainda não foi criada`)
        }
      }

      // On the 1st+, check if previous month's payroll is still OPEN
      if (dayOfMonth >= 1) {
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

        const prevPeriod = await prisma.payrollPeriod.findFirst({
          where: { companyId: company.id, month: prevMonth, year: prevYear, status: 'OPEN' },
        })

        if (prevPeriod) {
          console.log(`[ALERTA] ${company.name}: folha de ${prevMonth}/${prevYear} ainda está em aberto (OVERDUE)`)
        }
      }
    }
  } catch (err) {
    console.error('[ALERTA] Erro ao verificar folhas:', err)
  }
}

export function startAlertsCron(): void {
  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('[CRON] Executando verificação de alertas de documentos...')
    checkDocumentAlerts()
  })

  console.log('[CRON] Alertas de documentos agendados para 08:00 diariamente.')

  // Run payroll check daily at 8:30 AM
  cron.schedule('30 8 * * *', () => {
    console.log('[CRON] Executando verificação de alertas de folha...')
    checkPayrollAlerts()
  })

  console.log('[CRON] Alertas de folha agendados para 08:30 diariamente.')
}
