// ──────────────────────────────────────────────────────────────
// @fieldis/calculator  –  Brazilian payroll calculation (2024 values)
// ──────────────────────────────────────────────────────────────

// ─── Constants ───────────────────────────────────────────────

export const SALARIO_MINIMO = 1412.0;

export const INSS_CEILING = 7786.02;

export const INSS_BRACKETS: ReadonlyArray<{ ceiling: number; rate: number }> = [
  { ceiling: 1412.0, rate: 0.075 },
  { ceiling: 2666.68, rate: 0.09 },
  { ceiling: 4000.03, rate: 0.12 },
  { ceiling: 7786.02, rate: 0.14 },
];

export const IRRF_BRACKETS: ReadonlyArray<{
  ceiling: number;
  rate: number;
  deduction: number;
}> = [
  { ceiling: 2259.2, rate: 0.0, deduction: 0 },
  { ceiling: 2826.65, rate: 0.075, deduction: 169.44 },
  { ceiling: 3751.05, rate: 0.15, deduction: 381.44 },
  { ceiling: 4664.68, rate: 0.225, deduction: 662.77 },
  { ceiling: Infinity, rate: 0.275, deduction: 896.0 },
];

export const IRRF_DEPENDENT_DEDUCTION = 189.59;

// ─── Utility ─────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── INSS (progressive) ─────────────────────────────────────

export function calcINSS(grossSalary: number): number {
  if (grossSalary <= 0) return 0;

  let total = 0;
  let previousCeiling = 0;

  for (const bracket of INSS_BRACKETS) {
    if (grossSalary <= previousCeiling) break;

    const taxableInBracket =
      Math.min(grossSalary, bracket.ceiling) - previousCeiling;
    total += taxableInBracket * bracket.rate;
    previousCeiling = bracket.ceiling;
  }

  return round2(total);
}

// ─── IRRF (progressive) ─────────────────────────────────────

export function calcIRRF(
  gross: number,
  inss: number,
  dependents: number = 0,
): number {
  const base = gross - inss - dependents * IRRF_DEPENDENT_DEDUCTION;
  if (base <= 0) return 0;

  for (const bracket of IRRF_BRACKETS) {
    if (base <= bracket.ceiling) {
      const tax = base * bracket.rate - bracket.deduction;
      return round2(Math.max(tax, 0));
    }
  }

  // Should never reach here because last bracket ceiling is Infinity
  const last = IRRF_BRACKETS[IRRF_BRACKETS.length - 1];
  return round2(Math.max(base * last.rate - last.deduction, 0));
}

// ─── DSR (Descanso Semanal Remunerado) ──────────────────────

export function calcDSR(
  overtimeValue: number,
  workDays: number,
  restDays: number,
): number {
  if (workDays <= 0) return 0;
  return round2((overtimeValue / workDays) * restDays);
}

// ─── Overtime ────────────────────────────────────────────────

export interface OvertimeInput {
  hourlyRate: number;
  weekdayHours: number; // 50% extra
  sundayHours: number; // 100% extra
  holidayHours: number; // 100% extra
}

export interface OvertimeResult {
  weekdayValue: number;
  sundayValue: number;
  holidayValue: number;
  totalValue: number;
  totalHours: number;
}

export function calcOvertime(opts: OvertimeInput): OvertimeResult {
  const weekdayValue = round2(opts.hourlyRate * 1.5 * opts.weekdayHours);
  const sundayValue = round2(opts.hourlyRate * 2.0 * opts.sundayHours);
  const holidayValue = round2(opts.hourlyRate * 2.0 * opts.holidayHours);
  const totalValue = round2(weekdayValue + sundayValue + holidayValue);
  const totalHours = opts.weekdayHours + opts.sundayHours + opts.holidayHours;

  return { weekdayValue, sundayValue, holidayValue, totalValue, totalHours };
}

// ─── Insalubrity ─────────────────────────────────────────────

export type InsalubrityGrade = 'MINIMO' | 'MEDIO' | 'MAXIMO';

const INSALUBRITY_RATES: Record<InsalubrityGrade, number> = {
  MINIMO: 0.1,
  MEDIO: 0.2,
  MAXIMO: 0.4,
};

export function calcInsalubrity(grade: InsalubrityGrade): number {
  return round2(SALARIO_MINIMO * INSALUBRITY_RATES[grade]);
}

// ─── Periculosity ────────────────────────────────────────────

export function calcPericulosity(baseSalary: number): number {
  return round2(baseSalary * 0.3);
}

// ─── Vale-Transporte (VT) ───────────────────────────────────

export function calcVT(baseSalary: number, vtAmount: number): number {
  const maxDiscount = round2(baseSalary * 0.06);
  return round2(Math.min(maxDiscount, vtAmount));
}

// ─── FGTS ────────────────────────────────────────────────────

export function calcFGTS(grossSalary: number): number {
  return round2(grossSalary * 0.08);
}

// ─── Complete Payroll ────────────────────────────────────────

export interface PayrollInput {
  baseSalary: number;
  salaryType: 'MONTHLY' | 'HOURLY' | 'DAILY';
  hoursPerDay: number;
  workedDays: number;
  totalDaysInMonth: number;
  weekdayOvertimeHours: number;
  sundayOvertimeHours: number;
  holidayOvertimeHours: number;
  hasInsalubrity: boolean;
  insalubrityGrade?: InsalubrityGrade;
  hasPericulosity: boolean;
  hasNightShift: boolean;
  nightShiftHours?: number;
  hasVT: boolean;
  vtDailyAmount?: number;
  dependentsCount: number;
  hasAlimony: boolean;
  alimonyAmount: number;
  advancesTotal: number;
  absencesDays: number;
}

export interface PayrollResult {
  baseSalary: number;
  workedDays: number;
  overtimeHours: number;
  overtimeValue: number;
  nightShiftValue: number;
  insalubrityValue: number;
  periculosityValue: number;
  dsrValue: number;
  grossSalary: number;
  inssDiscount: number;
  irrfDiscount: number;
  vtDiscount: number;
  advancesDiscount: number;
  absencesDiscount: number;
  alimonyDiscount: number;
  totalDiscounts: number;
  netSalary: number;
  fgtsValue: number;
  companyCost: number;
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  // 1. Proportional base salary based on worked days
  const proportionalSalary = round2(
    (input.baseSalary / input.totalDaysInMonth) * input.workedDays,
  );

  // 2. Hourly rate
  let hourlyRate: number;
  switch (input.salaryType) {
    case 'MONTHLY':
      hourlyRate = round2(
        input.baseSalary / input.totalDaysInMonth / input.hoursPerDay,
      );
      break;
    case 'DAILY':
      hourlyRate = round2(input.baseSalary / input.hoursPerDay);
      break;
    case 'HOURLY':
      hourlyRate = input.baseSalary;
      break;
  }

  // 3. Overtime
  const overtime = calcOvertime({
    hourlyRate,
    weekdayHours: input.weekdayOvertimeHours,
    sundayHours: input.sundayOvertimeHours,
    holidayHours: input.holidayOvertimeHours,
  });

  // 4. Insalubrity
  const insalubrityValue =
    input.hasInsalubrity && input.insalubrityGrade
      ? calcInsalubrity(input.insalubrityGrade)
      : 0;

  // 5. Periculosity
  const periculosityValue = input.hasPericulosity
    ? calcPericulosity(input.baseSalary)
    : 0;

  // 6. Night shift (20% additional)
  const nightShiftValue =
    input.hasNightShift && input.nightShiftHours
      ? round2(hourlyRate * 0.2 * input.nightShiftHours)
      : 0;

  // 7. DSR on overtime – estimate work/rest days from totalDaysInMonth
  // Typical month: ~22 work days, ~8 rest days (sundays + holidays)
  const workDaysInMonth = input.workedDays;
  const restDaysInMonth = input.totalDaysInMonth - workDaysInMonth;
  const dsrValue =
    overtime.totalValue > 0 && workDaysInMonth > 0
      ? calcDSR(overtime.totalValue, workDaysInMonth, restDaysInMonth)
      : 0;

  // 8. Gross salary
  const grossSalary = round2(
    proportionalSalary +
      overtime.totalValue +
      nightShiftValue +
      insalubrityValue +
      periculosityValue +
      dsrValue,
  );

  // 9. Absences discount
  const absencesDiscount = round2(
    (input.baseSalary / input.totalDaysInMonth) * input.absencesDays,
  );

  // 10. INSS on gross salary
  const inssDiscount = calcINSS(grossSalary);

  // 11. IRRF on gross salary with INSS deduction and dependents
  const irrfDiscount = calcIRRF(grossSalary, inssDiscount, input.dependentsCount);

  // 12. VT discount
  const vtMonthlyAmount =
    input.hasVT && input.vtDailyAmount
      ? round2(input.vtDailyAmount * input.workedDays)
      : 0;
  const vtDiscount =
    input.hasVT ? calcVT(input.baseSalary, vtMonthlyAmount) : 0;

  // 13. Sum all discounts
  const advancesDiscount = input.advancesTotal;
  const alimonyDiscount = input.hasAlimony ? input.alimonyAmount : 0;

  const totalDiscounts = round2(
    inssDiscount +
      irrfDiscount +
      vtDiscount +
      advancesDiscount +
      absencesDiscount +
      alimonyDiscount,
  );

  // 14. Net salary
  const netSalary = round2(grossSalary - totalDiscounts);

  // 15. FGTS on gross salary
  const fgtsValue = calcFGTS(grossSalary);

  // 16. Company cost
  const companyCost = round2(grossSalary + fgtsValue);

  return {
    baseSalary: proportionalSalary,
    workedDays: input.workedDays,
    overtimeHours: overtime.totalHours,
    overtimeValue: overtime.totalValue,
    nightShiftValue,
    insalubrityValue,
    periculosityValue,
    dsrValue,
    grossSalary,
    inssDiscount,
    irrfDiscount,
    vtDiscount,
    advancesDiscount,
    absencesDiscount,
    alimonyDiscount,
    totalDiscounts,
    netSalary,
    fgtsValue,
    companyCost,
  };
}
