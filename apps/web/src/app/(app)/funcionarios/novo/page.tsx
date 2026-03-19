'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateEmployeeSchema, type CreateEmployee } from '@fieldis/shared'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCreateEmployee } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, title: 'Dados Pessoais' },
  { id: 2, title: 'Contrato' },
  { id: 3, title: 'Remuneração' },
  { id: 4, title: 'Benefícios' },
]

export default function NovoFuncionarioPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const createEmployee = useCreateEmployee()

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CreateEmployee>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: {
      salaryType: 'MONTHLY',
      hoursPerDay: 8,
      hasInsalubrity: false,
      hasPericulosity: false,
      hasNightShift: false,
      hasVT: true,
      hasVA: false,
      vaAmount: 0,
      dependentsCount: 0,
      hasAlimony: false,
      alimonyAmount: 0,
    },
  })

  const hasInsalubrity = watch('hasInsalubrity')
  const hasVA = watch('hasVA')
  const hasAlimony = watch('hasAlimony')

  async function goToNext() {
    const fieldsToValidate: Record<number, (keyof CreateEmployee)[]> = {
      1: ['name', 'cpf'],
      2: ['role', 'hireDate'],
      3: ['baseSalary', 'salaryType'],
      4: [],
    }

    const valid = await trigger(fieldsToValidate[currentStep])
    if (valid) {
      setCurrentStep((s) => Math.min(s + 1, 4))
    }
  }

  function goToPrev() {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  async function onSubmit(data: CreateEmployee) {
    try {
      await createEmployee.mutateAsync(data as unknown as Record<string, unknown>)
      toast.success('Funcionário cadastrado com sucesso!')
      router.push('/funcionarios')
    } catch {
      toast.error('Erro ao cadastrar funcionário. Verifique os dados.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-[color,opacity] duration-150',
                  currentStep > step.id
                    ? 'bg-[#16a34a] text-[#f4f5f7]'
                    : currentStep === step.id
                      ? 'bg-[#2563eb] text-[#f4f5f7]'
                      : 'bg-[#f9fafb] text-[#6b7280]'
                )}
              >
                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={cn(
                  'hidden text-sm font-medium sm:block',
                  currentStep === step.id ? 'text-[#111827]' : 'text-[#9ca3af]'
                )}
              >
                {step.title}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8 sm:w-16',
                  currentStep > step.id ? 'bg-[#16a34a]' : 'bg-[#e3e6ed]'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nome Completo"
                  placeholder="Nome do funcionário"
                  error={errors.name?.message}
                  {...register('name')}
                />
                <Input
                  label="CPF"
                  placeholder="00000000000"
                  maxLength={11}
                  error={errors.cpf?.message}
                  className="font-mono-data"
                  {...register('cpf')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="RG"
                  placeholder="Número do RG"
                  {...register('rg')}
                />
                <Input
                  label="Data de Nascimento"
                  type="date"
                  {...register('birthDate')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  {...register('phone')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@exemplo.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
              <Input
                label="Endereço"
                placeholder="Rua, número, bairro, cidade - UF"
                {...register('address')}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Função"
                  placeholder="Ex: Pedreiro, Eletricista"
                  error={errors.role?.message}
                  {...register('role')}
                />
                <Input
                  label="Departamento"
                  placeholder="Departamento"
                  {...register('department')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Data de Admissão"
                  type="date"
                  error={errors.hireDate?.message}
                  {...register('hireDate')}
                />
                <Input
                  label="Número CTPS"
                  placeholder="Número da CTPS"
                  {...register('ctpsNumber')}
                />
              </div>
              <Input
                label="PIS/PASEP"
                placeholder="Número do PIS"
                {...register('pis')}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Remuneração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Salário Base"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.baseSalary?.message}
                  className="font-mono-data"
                  {...register('baseSalary', { valueAsNumber: true })}
                />
                <Select
                  label="Tipo de Salário"
                  options={[
                    { value: 'MONTHLY', label: 'Mensal' },
                    { value: 'HOURLY', label: 'Hora' },
                    { value: 'DAILY', label: 'Diário' },
                  ]}
                  {...register('salaryType')}
                />
              </div>
              <Input
                label="Horas por Dia"
                type="number"
                className="font-mono-data"
                {...register('hoursPerDay', { valueAsNumber: true })}
              />
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                    {...register('hasInsalubrity')}
                  />
                  <span className="text-sm text-[#111827]">Insalubridade</span>
                </label>
                {hasInsalubrity && (
                  <Select
                    label="Grau de Insalubridade"
                    options={[
                      { value: 'MINIMO', label: 'Mínimo (10%)' },
                      { value: 'MEDIO', label: 'Médio (20%)' },
                      { value: 'MAXIMO', label: 'Máximo (40%)' },
                    ]}
                    {...register('insalubrityGrade')}
                  />
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                    {...register('hasPericulosity')}
                  />
                  <span className="text-sm text-[#111827]">Periculosidade (30%)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                    {...register('hasNightShift')}
                  />
                  <span className="text-sm text-[#111827]">Adicional Noturno</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Benefícios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                    {...register('hasVT')}
                  />
                  <span className="text-sm text-[#111827]">Vale Transporte (VT)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                    {...register('hasVA')}
                  />
                  <span className="text-sm text-[#111827]">Vale Alimentação (VA)</span>
                </label>
                {hasVA && (
                  <Input
                    label="Valor VA"
                    type="number"
                    step="0.01"
                    className="font-mono-data"
                    {...register('vaAmount', { valueAsNumber: true })}
                  />
                )}
              </div>
              <Input
                label="Número de Dependentes"
                type="number"
                min={0}
                className="font-mono-data"
                {...register('dependentsCount', { valueAsNumber: true })}
              />
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e3e6ed] bg-[#f4f5f7] text-[#2563eb] focus:ring-[#2563eb]"
                    {...register('hasAlimony')}
                  />
                  <span className="text-sm text-[#111827]">Pensão Alimentícia</span>
                </label>
                {hasAlimony && (
                  <Input
                    label="Valor da Pensão"
                    type="number"
                    step="0.01"
                    className="font-mono-data"
                    {...register('alimonyAmount', { valueAsNumber: true })}
                  />
                )}
              </div>
              <div className="border-t border-[#e3e6ed] pt-4">
                <h4 className="mb-3 text-sm font-medium text-[#111827]">Dados Bancários</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Código do Banco"
                    placeholder="Ex: 001"
                    className="font-mono-data"
                    {...register('bankCode')}
                  />
                  <Input
                    label="Agência"
                    placeholder="0000"
                    className="font-mono-data"
                    {...register('bankAgency')}
                  />
                  <Input
                    label="Conta"
                    placeholder="00000-0"
                    className="font-mono-data"
                    {...register('bankAccount')}
                  />
                </div>
              </div>
              <Input
                label="Observações"
                placeholder="Observações adicionais"
                {...register('notes')}
              />
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrev}
            disabled={currentStep === 1}
          >
            Anterior
          </Button>

          {currentStep < 4 ? (
            <Button type="button" onClick={goToNext}>
              Próximo
            </Button>
          ) : (
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? 'Salvando...' : 'Cadastrar Funcionário'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
