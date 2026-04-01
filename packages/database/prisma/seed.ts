import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Super Admin (platform owner) ────────────────────────
  const superAdminPassword = hashSync('super123', 10)

  await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      companyId: null,
      email: 'super@fieldis.com.br',
      name: 'Super Admin',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      active: true,
    },
  })

  console.log('Super Admin created: super@fieldis.com.br / super123')

  // ── Company ──────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      name: 'Montagem Industrial Demo Ltda',
      cnpj: '12.345.678/0001-90',
      plan: 'BASICO',
      active: true,
      phone: '(11) 3456-7890',
      email: 'contato@montagemindustrialdemo.com.br',
      address: 'Rua dos Projetos, 100 - Sao Paulo/SP',
    },
  })

  console.log(`Company created: ${company.name} (${company.id})`)

  // ── Users ────────────────────────────────────────────────
  const hashedPassword = hashSync('123456', 10)

  const adminUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@demo.com',
      name: 'Carlos Administrador',
      password: hashedPassword,
      role: 'COMPANY_ADMIN',
      active: true,
    },
  })

  const rhUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'rh@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'rh@demo.com',
      name: 'Ana Paula RH',
      password: hashedPassword,
      role: 'RH_MANAGER',
      active: true,
    },
  })

  const supervisorUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'supervisor@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'supervisor@demo.com',
      name: 'Roberto Supervisor de Campo',
      password: hashedPassword,
      role: 'SUPERVISOR',
      active: true,
    },
  })

  const financeiroUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'financeiro@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'financeiro@demo.com',
      name: 'Carlos Financeiro',
      password: hashedPassword,
      role: 'FINANCIAL_MANAGER',
      active: true,
    },
  })

  const auditorUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'auditor@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'auditor@demo.com',
      name: 'Ana Auditora',
      password: hashedPassword,
      role: 'AUDITOR',
      active: true,
    },
  })

  console.log(`Users created: ${adminUser.email}, ${rhUser.email}, ${supervisorUser.email}, ${financeiroUser.email}, ${auditorUser.email}`)

  // ── Projetos ────────────────────────────────────────────────
  const obraA = await prisma.obra.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      companyId: company.id,
      name: 'Subestação Solar 230kV',
      code: 'PRJ-001',
      address: 'Av. Paulista, 1500',
      city: 'Sao Paulo',
      state: 'SP',
      status: 'ACTIVE',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2026-06-30'),
      budgetedCost: 2500000,
    },
  })

  const obraB = await prisma.obra.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      companyId: company.id,
      name: 'Planta Petroquímica Norte',
      code: 'PRJ-002',
      address: 'Rua XV de Novembro, 300',
      city: 'Curitiba',
      state: 'PR',
      status: 'ACTIVE',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2026-12-31'),
      budgetedCost: 4800000,
    },
  })

  const obraC = await prisma.obra.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      companyId: company.id,
      name: 'Retrofit Usina Termelétrica',
      code: 'PRJ-003',
      address: 'Rod. Anchieta, km 45',
      city: 'Sao Bernardo do Campo',
      state: 'SP',
      status: 'PLANNING',
      startDate: new Date('2026-06-01'),
      budgetedCost: 1200000,
    },
  })

  console.log(`Projetos created: ${obraA.name}, ${obraB.name}, ${obraC.name}`)

  // ── Assign supervisor to Projeto A ────────────────────────
  await prisma.obraUser.upsert({
    where: { userId_obraId: { userId: supervisorUser.id, obraId: obraA.id } },
    update: {},
    create: {
      userId: supervisorUser.id,
      obraId: obraA.id,
    },
  })

  // ── Employees ────────────────────────────────────────────
  const employeesData = [
    { name: 'Jose da Silva', cpf: '111.222.333-44', role: 'Montador', baseSalary: 3200, phone: '(11) 91111-1111' },
    { name: 'Antonio Santos', cpf: '222.333.444-55', role: 'Montador', baseSalary: 3100, phone: '(11) 92222-2222' },
    { name: 'Marcos Oliveira', cpf: '333.444.555-66', role: 'Auxiliar de Montagem', baseSalary: 1800, phone: '(11) 93333-3333' },
    { name: 'Francisco Souza', cpf: '444.555.666-77', role: 'Auxiliar de Montagem', baseSalary: 1850, phone: '(11) 94444-4444' },
    { name: 'Pedro Almeida', cpf: '555.666.777-88', role: 'Eletricista', baseSalary: 4200, hasInsalubrity: true, insalubrityGrade: '20%', phone: '(11) 95555-5555' },
    { name: 'Paulo Ferreira', cpf: '666.777.888-99', role: 'Encanador', baseSalary: 3800, phone: '(11) 96666-6666' },
    { name: 'Rafael Costa', cpf: '777.888.999-00', role: 'Soldador', baseSalary: 3500, hasPericulosity: true, phone: '(11) 97777-7777' },
    { name: 'Lucas Pereira', cpf: '888.999.000-11', role: 'Caldeireiro', baseSalary: 3600, phone: '(11) 98888-8888' },
    { name: 'Fernando Lima', cpf: '999.000.111-22', role: 'Montador', baseSalary: 3300, phone: '(11) 99999-9999' },
    { name: 'Ricardo Mendes', cpf: '000.111.222-33', role: 'Auxiliar de Montagem', baseSalary: 1900, phone: '(11) 90000-0000' },
    { name: 'Gabriel Rocha', cpf: '123.456.789-01', role: 'Eletricista', baseSalary: 4500, hasInsalubrity: true, insalubrityGrade: '20%', phone: '(11) 91234-5678' },
    { name: 'Daniel Barbosa', cpf: '234.567.890-12', role: 'Caldeireiro', baseSalary: 3400, phone: '(11) 92345-6789' },
  ]

  const employees: Array<{ id: string; name: string; cpf: string }> = []

  for (const data of employeesData) {
    const emp = await prisma.employee.upsert({
      where: { companyId_cpf: { companyId: company.id, cpf: data.cpf } },
      update: {},
      create: {
        companyId: company.id,
        name: data.name,
        cpf: data.cpf,
        role: data.role,
        baseSalary: data.baseSalary,
        salaryType: 'MONTHLY',
        hireDate: new Date('2025-01-10'),
        status: 'ACTIVE',
        phone: data.phone,
        hasInsalubrity: data.hasInsalubrity ?? false,
        insalubrityGrade: data.insalubrityGrade ?? null,
        hasPericulosity: data.hasPericulosity ?? false,
        hasVT: true,
        hoursPerDay: 8,
        dependentsCount: 0,
      },
    })
    employees.push({ id: emp.id, name: emp.name, cpf: emp.cpf })
  }

  console.log(`Employees created: ${employees.length}`)

  // ── EMPLOYEE user linked to Paulo Ferreira (index 5) ────
  const pauloFerreira = employees.find(e => e.name === 'Paulo Ferreira')
  if (pauloFerreira) {
    const employeeUser = await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: 'funcionario@demo.com' } },
      update: {},
      create: {
        companyId: company.id,
        email: 'funcionario@demo.com',
        name: 'Paulo Ferreira',
        password: hashedPassword,
        role: 'EMPLOYEE',
        active: true,
        employeeId: pauloFerreira.id,
      },
    })
    console.log(`Employee user created: ${employeeUser.email} → ${pauloFerreira.name}`)
  }

  // ── Allocations ──────────────────────────────────────────
  // Employees 0-5 (6 employees) in Projeto A
  // Employees 6-10 (5 employees) in Projeto B
  // Employees 4-5 also shared with Projeto B (2 shared between A and B)
  const allocationStartDate = new Date('2025-02-01')

  // 6 in Projeto A (indices 0..5)
  for (let i = 0; i < 6; i++) {
    await prisma.employeeAllocation.upsert({
      where: {
        employeeId_obraId_startDate: {
          employeeId: employees[i].id,
          obraId: obraA.id,
          startDate: allocationStartDate,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        employeeId: employees[i].id,
        obraId: obraA.id,
        startDate: allocationStartDate,
        active: true,
      },
    })
  }

  // 5 in Projeto B (indices 6..10)
  for (let i = 6; i < 11; i++) {
    await prisma.employeeAllocation.upsert({
      where: {
        employeeId_obraId_startDate: {
          employeeId: employees[i].id,
          obraId: obraB.id,
          startDate: allocationStartDate,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        employeeId: employees[i].id,
        obraId: obraB.id,
        startDate: allocationStartDate,
        active: true,
      },
    })
  }

  // 2 shared: employees 4 and 5 also in Projeto B
  for (let i = 4; i < 6; i++) {
    await prisma.employeeAllocation.upsert({
      where: {
        employeeId_obraId_startDate: {
          employeeId: employees[i].id,
          obraId: obraB.id,
          startDate: allocationStartDate,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        employeeId: employees[i].id,
        obraId: obraB.id,
        startDate: allocationStartDate,
        active: true,
      },
    })
  }

  console.log('Allocations created')

  // ── Time Records (last 7 business days for Projeto A employees) ──
  const today = new Date()
  const businessDays: Date[] = []
  let cursor = new Date(today)

  while (businessDays.length < 7) {
    cursor.setDate(cursor.getDate() - 1)
    const dayOfWeek = cursor.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays.push(new Date(cursor))
    }
  }

  let timeRecordCount = 0
  for (let i = 0; i < 6; i++) {
    for (const day of businessDays) {
      const clockIn = new Date(day)
      clockIn.setHours(7, 0, 0, 0)

      const clockOut = new Date(day)
      clockOut.setHours(16, 0, 0, 0)

      const workedMinutes = (16 - 7) * 60 - 60 // 9h - 1h break = 480 min
      const overtimeMinutes = 0

      await prisma.timeRecord.create({
        data: {
          companyId: company.id,
          employeeId: employees[i].id,
          obraId: obraA.id,
          clockIn,
          clockOut,
          breakMinutes: 60,
          source: 'MANUAL',
          workedMinutes,
          overtimeMinutes,
          isAbsence: false,
        },
      })
      timeRecordCount++
    }
  }

  console.log(`Time records created: ${timeRecordCount}`)

  console.log('Seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
