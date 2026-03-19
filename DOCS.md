# Fieldis — Documentação do Sistema

> Última atualização: 19 de março de 2026

## 1. O que é o Fieldis

O Fieldis é um sistema SaaS de gestão operacional voltado para empresas de montagem elétrica e mecânica industrial. Ele centraliza o controle de funcionários, projetos (obras), presença em campo, folha de pagamento e financeiro em uma única plataforma web.

No dia a dia de empresas desse nicho, supervisores precisam registrar a presença de equipes em frentes de serviço espalhadas por diferentes localidades. O RH precisa gerenciar admissões, documentos obrigatórios (ASO, NR-10, NR-35), calcular folhas com regras específicas como insalubridade, periculosidade e adicional noturno. O financeiro precisa acompanhar custos por projeto e aprovar adiantamentos salariais. O Fieldis resolve tudo isso de forma integrada.

O sistema é multi-tenant: cada empresa opera em um ambiente isolado, com seus próprios dados protegidos por Row Level Security (RLS) no PostgreSQL. Isso permite que múltiplas empresas usem a mesma instância sem risco de vazamento de dados.

O diferencial em relação a sistemas genéricos de RH é a modelagem voltada ao setor: alocação de funcionários por obra, controle de ponto vinculado a projetos, cálculo de folha com adicionais de periculosidade e insalubridade, rastreamento de EPIs e documentos com validade (NRs, ASOs). Conceitos como "frente de serviço", "supervisor de campo" e "alocação por obra" são nativos do sistema.

---

## 2. Arquitetura geral

O projeto é um monorepo gerenciado por Turborepo com a seguinte estrutura:

| Pacote | Descrição | Tecnologia |
|--------|-----------|------------|
| `apps/api` | API REST do backend | Fastify 4.27, TypeScript, porta 3001 |
| `apps/web` | Frontend web (SPA) | Next.js 14.2, React 18, porta 3000 |
| `packages/database` | Schema Prisma, client, seed e RLS | Prisma 5.14, PostgreSQL 16 |
| `packages/calculator` | Motor de cálculo de folha de pagamento | TypeScript puro, sem dependências |
| `packages/shared` | Schemas Zod, tipos e funções utilitárias | Zod 3.23 |

### Docker Compose

O `docker-compose.yml` sobe dois serviços:

- **postgres** — PostgreSQL 16 Alpine na porta 5432. Monta o volume `postgres_data` para persistência e executa `rls-setup.sql` na inicialização para configurar as políticas de RLS.
- **redis** — Redis 7 Alpine na porta 6379. Usado para blacklist de tokens JWT e cache do dashboard (TTL de 30 segundos).

---

## 3. Stack tecnológica

| Camada | Tecnologia | Versão | Motivo |
|--------|-----------|--------|--------|
| Backend | Fastify | 4.27 | Performance superior ao Express, suporte nativo a schemas e plugins |
| Frontend | Next.js (App Router) | 14.2 | SSR, roteamento baseado em arquivos, middleware de auth |
| Linguagem | TypeScript | 5.4 | Tipagem estática compartilhada entre frontend e backend |
| Banco de dados | PostgreSQL | 16 | RLS nativo para multi-tenancy, TIMESTAMPTZ para datas |
| ORM | Prisma | 5.14 | Type-safe queries, migrations, studio para debug |
| Cache | Redis (ioredis) | 7 | Token blacklist e cache de dashboard |
| Autenticação (frontend) | NextAuth.js | 4.24 | Integração com Next.js, strategy JWT |
| Autenticação (backend) | @fastify/jwt | 8.0 | Verificação de JWT no Fastify |
| Hash de senha | bcryptjs | 2.4 | Hashing seguro de senhas |
| Validação | Zod | 3.23 | Schemas compartilhados entre frontend e backend |
| Formulários | React Hook Form | 7.51 | Performance, integração com Zod via resolvers |
| Estado do servidor | TanStack React Query | 5.40 | Cache, refetch automático, mutations |
| HTTP client | Axios | 1.7 | Interceptors para token e tratamento de 401 |
| Gráficos | Recharts | 2.12 | Gráficos de barra e linha no dashboard e financeiro |
| UI | Tailwind CSS | 3.4 | Estilização utilitária, design system consistente |
| Ícones | Lucide React | 0.378 | Ícones SVG leves e consistentes |
| Notificações | Sonner | 1.5 | Toasts não-intrusivos |
| Monorepo | Turborepo | 2.0 | Orquestração de builds e dev com cache |
| Agendamento | node-cron | 3.0 | Jobs diários de alertas de documentos e folha |
| Rate limiting | @fastify/rate-limit | 9.1 | 100 req/min por IP |
| Upload | @fastify/multipart | 8.1 | Upload de arquivos até 10 MB |
| Documentação API | @fastify/swagger + swagger-ui | 8.15 / 4.2 | OpenAPI disponível em `/docs` |

---

## 4. Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- npm 10+

### Passo a passo

```bash
# 1. Clonar o repositório
git clone <repo-url> && cd obras-saas

# 2. Instalar dependências (workspaces)
npm install

# 3. Subir PostgreSQL e Redis
docker compose up -d

# 4. Aplicar schema no banco
npm run db:push

# 5. Popular com dados de demonstração
npm run db:seed

# 6. Rodar em modo de desenvolvimento
npm run dev
```

### URLs de acesso

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Swagger UI | http://localhost:3001/docs |
| Prisma Studio | `npm run db:studio` → http://localhost:5555 |

### Logins de teste

| Email | Senha | Perfil | Descrição |
|-------|-------|--------|-----------|
| admin@demo.com | 123456 | COMPANY_ADMIN | Administrador da empresa, acesso total |
| rh@demo.com | 123456 | RH_MANAGER | Gerente de RH, gerencia funcionários e folha |
| financeiro@demo.com | 123456 | FINANCIAL_MANAGER | Gerente financeiro, confere folha e aprova adiantamentos |
| supervisor@demo.com | 123456 | SUPERVISOR | Supervisor de campo, registra ponto da equipe |
| funcionario@demo.com | 123456 | EMPLOYEE | Funcionário (Paulo Ferreira), vê ponto, holerites e documentos |
| auditor@demo.com | 123456 | AUDITOR | Auditor somente leitura, acesso total de visualização |

Todos os usuários pertencem à empresa demo "Montagem Industrial Demo Ltda" (CNPJ: 12.345.678/0001-90).

---

## 5. Perfis de acesso

O sistema define 7 perfis no enum `UserRole`. Cada perfil controla quais páginas aparecem na sidebar e quais ações são permitidas.

### SUPER_ADMIN

- **O que representa**: Administrador do sistema (plataforma). Não pertence a nenhuma empresa específica.
- **Sidebar**: Todas as páginas.
- **Permissões**: Acesso irrestrito. O `roleGuard` do backend sempre permite passagem para SUPER_ADMIN.
- **Uso típico**: Suporte técnico, configuração da plataforma.

### COMPANY_ADMIN

- **O que representa**: Dono ou diretor da empresa de montagem.
- **Sidebar**: Dashboard, Funcionários, Projetos, Ponto, Folha, Financeiro, Configurações.
- **Permissões**: Tudo dentro da empresa — criar/editar/deletar funcionários, projetos, calcular e fechar folha, aprovar adiantamentos, exportar relatórios, gerenciar configurações.
- **Uso típico**: Supervisão geral da operação, decisões financeiras.

### RH_MANAGER

- **O que representa**: Gerente de Recursos Humanos.
- **Sidebar**: Dashboard, Funcionários, Projetos, Ponto, Folha.
- **Permissões**: Gerenciar funcionários (admissão, edição, desligamento), upload de documentos, alocar e desalocar equipes, registrar ponto, calcular e fechar folha, aprovar adiantamentos, solicitar adiantamentos.
- **Não pode**: Acessar Financeiro, acessar Configurações, deletar projetos.
- **Uso típico**: Admissão de novos funcionários, cálculo mensal da folha.

### FINANCIAL_MANAGER

- **O que representa**: Gerente Financeiro.
- **Sidebar**: Dashboard, Folha, Financeiro.
- **Permissões**: Visualizar e fechar folha, aprovar/rejeitar adiantamentos, exportar relatórios financeiros, visualizar dashboard.
- **Não pode**: Gerenciar funcionários, projetos, registrar ponto, calcular folha.
- **Uso típico**: Conferência da folha antes do pagamento, aprovação de adiantamentos.

### SUPERVISOR

- **O que representa**: Supervisor de campo / encarregado de frente de serviço.
- **Sidebar**: Dashboard, Projetos, Ponto.
- **Permissões**: Registrar ponto (individual e em lote) para os projetos onde está alocado, alocar funcionários aos seus projetos, visualizar equipe dos seus projetos.
- **Não pode**: Acessar Funcionários, Folha, Financeiro ou Configurações. Não pode desalocar funcionários, solicitar adiantamentos, calcular/fechar folha, deletar projetos nem gerenciar funcionários globalmente.
- **Uso típico**: Pela manhã na frente de serviço, marca presença da equipe.

### EMPLOYEE

- **O que representa**: Funcionário operacional (montador, eletricista, auxiliar).
- **Sidebar**: Ponto, Adiantamento, Holerites, Documentos. O Dashboard não é exibido para este perfil.
- **Permissões**: Ver apenas seus próprios registros de ponto. Solicitar adiantamento na página `/adiantamento`. Consultar seus próprios holerites na página `/holerites` com link para holerite imprimível. Pode consultar documentos (via API, endpoint `/employees/:id/documents` com restrição self-view).
- **Não pode**: Ver Dashboard, Funcionários, Projetos, Folha, Financeiro ou Configurações. Não pode ver dados de outros funcionários.
- **Uso típico**: Visualizar seus registros de ponto, solicitar adiantamento, consultar holerites.

### AUDITOR

- **O que representa**: Auditor externo ou interno com acesso somente leitura.
- **Sidebar**: Dashboard, Funcionários, Projetos, Ponto, Folha, Financeiro.
- **Permissões**: Visualizar todos os dados, mas não pode criar, editar ou deletar nada. Acesso de leitura total.
- **Não pode**: Qualquer operação de escrita.
- **Uso típico**: Auditoria de conformidade, verificação de folha.

### Matriz de permissões (frontend)

Permissões derivadas do hook `usePermissions` baseado no `role` da sessão:

| Permissão | SUPER_ADMIN | COMPANY_ADMIN | RH_MANAGER | FINANCIAL_MANAGER | SUPERVISOR | EMPLOYEE | AUDITOR |
|-----------|:-----------:|:-------------:|:----------:|:-----------------:|:----------:|:--------:|:-------:|
| canManageEmployees | ✓ | ✓ | ✓ | — | — | — | — |
| canViewFinancial | ✓ | ✓ | — | ✓ | — | — | ✓ |
| canManageFinancial | ✓ | ✓ | — | ✓ | — | — | — |
| canClosePayroll | ✓ | ✓ | ✓ | ✓ | — | — | — |
| canCalculatePayroll | ✓ | ✓ | ✓ | — | — | — | — |
| canApproveAdvances | ✓ | ✓ | ✓ | ✓ | — | — | — |
| canManageProjects | ✓ | ✓ | ✓ | — | — | — | — |
| canDeleteProjects | ✓ | ✓ | — | — | — | — | — |
| canAllocate | ✓ | ✓ | ✓ | — | ✓ | — | — |
| canDeallocate | ✓ | ✓ | ✓ | — | — | — | — |
| canRecordPresence | ✓ | ✓ | ✓ | — | ✓ | — | — |
| canEditPonto | ✓ | ✓ | ✓ | — | — | — | — |
| canUploadDocuments | ✓ | ✓ | ✓ | — | — | — | — |
| canRequestAdvance | ✓ | ✓ | ✓ | — | — | ✓ | — |
| canViewSettings | ✓ | ✓ | — | — | — | — | — |
| canViewPayroll | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| isReadOnly | — | — | — | — | — | — | ✓ |

### Visibilidade da sidebar

| Página | Regra | Perfis que veem |
|--------|-------|-----------------|
| Dashboard | `!isEmployee` | Todos exceto EMPLOYEE |
| Funcionários | `canManageEmployees \|\| isReadOnly` | SUPER_ADMIN, COMPANY_ADMIN, RH_MANAGER, AUDITOR |
| Projetos | `canManageProjects \|\| isSupervisor \|\| isReadOnly` | SUPER_ADMIN, COMPANY_ADMIN, RH_MANAGER, SUPERVISOR, AUDITOR |
| Ponto | `canRecordPresence \|\| isReadOnly \|\| isEmployee` | Todos exceto FINANCIAL_MANAGER |
| Adiantamento | `isEmployee` | EMPLOYEE |
| Holerites | `isEmployee` | EMPLOYEE |
| Documentos | `isEmployee` | EMPLOYEE |
| Folha | `canViewPayroll` | SUPER_ADMIN, COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, AUDITOR |
| Financeiro | `canViewFinancial` | SUPER_ADMIN, COMPANY_ADMIN, FINANCIAL_MANAGER, AUDITOR |
| Configurações | `canViewSettings` | SUPER_ADMIN, COMPANY_ADMIN |

### Proteção de rotas (layout.tsx)

O layout autenticado redireciona se o usuário tentar acessar sem permissão:
- `/configuracoes` sem `canViewSettings` → `/dashboard`
- `/financeiro` sem `canViewFinancial` → `/dashboard`
- `/folha` sem `canViewPayroll` → `/dashboard`
- `/obras` sem `canManageProjects`, `isSupervisor` ou `isReadOnly` → `/dashboard`
- `/funcionarios` sem `canManageEmployees` ou `isReadOnly` → `/ponto` (SUPERVISOR, EMPLOYEE), `/financeiro` (FINANCIAL_MANAGER), `/dashboard` (outros)
- `/ponto` sem `canRecordPresence`, `isReadOnly` ou `isEmployee` → `/financeiro` (FINANCIAL_MANAGER), `/dashboard` (outros)
- `/holerites` sem `isEmployee` → `/dashboard`
- `/documentos` sem `isEmployee` → `/dashboard`
- `/adiantamento` sem `isEmployee` → `/dashboard`

### Terminologia

O sistema usa "Projeto" na interface do usuário e "obras" nos endpoints da API e no banco de dados, por razões históricas. No nicho de montagem eletromecânica, ambos os termos são usados — "obra" é mais comum no campo e "projeto" é mais comum na gestão. A interface padroniza em "Projeto" em todas as telas.

O SUPERVISOR vê uma indicação de escopo ("Exibindo apenas os projetos sob sua responsabilidade") na tela de projetos. O EMPLOYEE vê uma indicação de modo consulta ("Você está em modo de consulta") na tela de ponto.

---

## 6. Fluxo do dia a dia

### Manhã na frente de serviço (SUPERVISOR)

1. O supervisor abre a página **Ponto** no celular ou tablet.
2. Seleciona o projeto (obra) onde está trabalhando hoje.
3. A data já vem preenchida com o dia atual (horário local de Brasília).
4. O sistema mostra a lista de funcionários alocados naquele projeto que ainda não têm entrada registrada.
5. O supervisor marca os funcionários presentes (checkbox individual ou "selecionar todos").
6. Clica em **Registrar Entrada** — o sistema registra o horário atual como `clockIn` para todos os selecionados em lote.
7. O GPS do dispositivo é capturado automaticamente (se autorizado).
8. No final do expediente, o supervisor clica em **Registrar Saída** para cada funcionário. O sistema calcula automaticamente as horas trabalhadas e horas extras.

### Durante o dia (RH_MANAGER)

1. **Admissão**: Na página **Funcionários > Novo**, preenche o formulário em 4 etapas (dados pessoais, contrato, remuneração, benefícios).
2. **Documentos**: Na ficha do funcionário, aba "Documentos", faz upload de ASO, NR-10, NR-35 com data de validade. O sistema alerta automaticamente quando estão vencendo (30 dias antes) ou vencidos.
3. **Alocação**: Na página do projeto, aba "Equipe", aloca funcionários à obra. Ao alocar em um novo projeto, a alocação anterior é desativada automaticamente.
4. **Acompanhamento**: No Dashboard, acompanha KPIs: total de funcionários, obras ativas, pontos registrados hoje, custo mensal, adiantamentos pendentes, documentos vencendo.

### Final do mês (RH_MANAGER + FINANCIAL_MANAGER)

1. O RH abre a página **Folha** e cria um novo período (mês/ano).
2. Clica em **Calcular Folha**. O sistema:
   - Busca todos os funcionários ativos.
   - Soma horas extras e dias trabalhados a partir dos registros de ponto.
   - Calcula faltas (dias úteis esperados - dias efetivamente trabalhados).
   - Busca adiantamentos aprovados para o período.
   - Executa o motor de cálculo (`@fieldis/calculator`): INSS progressivo, IRRF, DSR, insalubridade, periculosidade, VT, FGTS.
   - Gera um item de folha para cada funcionário.
3. O RH confere os valores clicando em cada funcionário na tabela para ver o holerite detalhado (proventos, descontos, FGTS). Pode editar manualmente horas extras, adicionais e descontos diretamente no drawer. O sistema mostra funcionários ignorados no cálculo (ex: sem salário base) para que o RH corrija e recalcule.
4. Clica em **Enviar para Revisão** → status muda para REVIEW.
5. O Financial Manager confere e clica em **Fechar Folha** novamente → status muda para CLOSED.
6. O CSV pode ser exportado para importação no sistema bancário.

### Solicitação de adiantamento (EMPLOYEE → RH_MANAGER)

1. O funcionário (ou o RH em nome dele) cria uma solicitação na página **Financeiro** ou via API, informando valor, motivo e mês de desconto.
2. O adiantamento fica com status PENDING.
3. O RH ou Financial Manager acessa a página **Financeiro**, vê a lista de adiantamentos pendentes e clica em **Aprovar** ou **Rejeitar**.
4. Quando a folha do mês de desconto é calculada, o sistema busca automaticamente os adiantamentos APPROVED para aquele período e desconta do salário líquido.
5. Após o desconto, o status muda para DISCOUNTED.

---

## 7. Módulos do sistema

### 7.1 Funcionários

**O que faz**: Cadastro completo de funcionários com dados pessoais, contratuais, remuneração, benefícios e documentos.

**Páginas**:
- `/funcionarios` — Lista com busca, filtro por status e paginação
- `/funcionarios/novo` — Formulário de admissão em 4 etapas
- `/funcionarios/[id]` — Ficha completa com abas (Dados Pessoais, Documentos, Histórico de Projetos, Ponto, Holerites). Aba Dados Pessoais tem formulário completo em seções accordeon (pessoais, contratuais, remuneração/adicionais, benefícios, bancários). CPF formatado com máscara. Aba Documentos com mapeamento correto para enum DocumentType e upload funcional com dialog de validade. Aba Ponto busca registros via GET /ponto com filtro de mês/ano. Aba Holerites busca via GET /employees/:id/payslips com link para holerite imprimível.

**Endpoints**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /employees | Listar funcionários (paginado, busca, filtro status/obra) | Todos (EMPLOYEE vê só a si mesmo) |
| POST | /employees | Criar funcionário | COMPANY_ADMIN, RH_MANAGER |
| GET | /employees/:id | Detalhe com alocações, documentos e adiantamentos | COMPANY_ADMIN, RH_MANAGER, AUDITOR (sem banco), EMPLOYEE (só a si mesmo, sem banco/adiantamentos). SUPERVISOR e FINANCIAL_MANAGER recebem 403 |
| PATCH | /employees/:id | Atualizar dados | COMPANY_ADMIN, RH_MANAGER |
| DELETE | /employees/:id | Desligar (soft delete: status=TERMINATED) | COMPANY_ADMIN, RH_MANAGER |
| GET | /employees/:id/documents | Listar documentos | Todos (EMPLOYEE vê só os próprios) |
| POST | /employees/:id/documents | Upload de documento (multipart, arquivo binário salvo em disco) | COMPANY_ADMIN, RH_MANAGER |
| GET | /employees/:id/payslips | Listar holerites | Todos (EMPLOYEE vê só os próprios) |
| GET | /documentos/:fileName | Servir arquivo com verificação JWT + companyId | Todos (autenticados, mesmo company) |

**Regras de negócio**:
- CPF é único por empresa (`@@unique([companyId, cpf])`).
- Desligamento é soft delete: seta `status = TERMINATED`, `terminatedAt = now()` e desativa todas as alocações.
- Funcionários têm tipo de salário configurável: MONTHLY, HOURLY ou DAILY.
- GET /employees/:id retorna alocações achatadas (campo `allocations` com `obraName`, `obraCode`, `startDate`, `endDate`, `active`).
- Aba Ponto busca registros via chamada separada a GET /ponto com filtro `employeeId` + `startDate`/`endDate` (não embutido no GET /employees/:id para evitar payload excessivo).
- Aba Holerites busca via GET /employees/:id/payslips com link para holerite imprimível em `/folha/holerite/[periodId]/[employeeId]`.
- Aba Documentos usa mapeamento de labels para enum `DocumentType` do banco (ex: "ASO" → `ASO`, "NR-06 (EPI)" → `TERMO_EPI`, "NR-10" → `NR_10`, "NR-35" → `NR_35`).
- Upload de documentos envia arquivo binário real via multipart/form-data para POST /employees/:id/documents. Arquivo salvo em `apps/api/uploads/` com nome único (`companyId_employeeId_type_timestamp.ext`). Formatos aceitos: PDF, JPG, JPEG, PNG. Tamanho máximo: 10 MB. Dialog de validade aparece para documentos com vencimento (ASO, NR-10, NR-33, NR-35, CNH). Botões "Ver" e "Baixar" aparecem para documentos com arquivo real. Spinner de progresso durante upload.
- Formulário de edição organizado em 5 seções accordeon: dados pessoais (aberto), contratuais (fechado), remuneração/adicionais (fechado), benefícios (fechado), bancários (fechado). Todos os 30+ campos do schema são editáveis via PATCH /employees/:id.

**Visibilidade por perfil**:

| Funcionalidade | COMPANY_ADMIN | RH_MANAGER | FINANCIAL_MANAGER | SUPERVISOR | EMPLOYEE | AUDITOR |
|---|---|---|---|---|---|---|
| Ver /funcionarios na sidebar | Sim | Sim | Não | Não | Não | Sim |
| Acessar /funcionarios via URL | Sim | Sim | Redireciona p/ /financeiro | Redireciona p/ /ponto | Redireciona p/ /ponto | Sim |
| Ver CPF na tabela e detalhe | Sim | Sim | — | — | — | Sim |
| Ver salário na tabela e detalhe | Sim | Sim | — | — | — | Sim |
| Ver RG no detalhe | Sim | Sim | — | — | — | Sim |
| Criar funcionário | Sim | Sim | — | — | — | Não |
| Editar dados do funcionário | Sim | Sim | — | — | — | Não |
| Upload de documentos | Sim | Sim | — | — | — | Não |
| Aba Holerites | Sim | Sim | — | — | Sim (próprios) | Sim |
| Aba Documentos (ver, baixar, upload) | Sim | Sim | — | — | — | Sim |
| Página /documentos (ver e baixar próprios) | — | — | — | — | Sim | — |
| Aba Ponto | Sim | Sim | — | — | — | Sim |
| Aba Histórico de Projetos | Sim | Sim | — | — | — | Sim |
| GET /employees/:id — dados bancários | Sim | Sim | 403 | 403 | Não retorna | Não retorna |
| GET /employees/:id — adiantamentos | Sim | Sim | 403 | 403 | Não retorna | Sim |
| Banner "modo leitura" | Não | Não | — | — | — | Sim |

### 7.2 Projetos (Obras)

**O que faz**: Cadastro de obras/projetos com alocação de equipe, edição de dados e acompanhamento de custos.

**Páginas**:
- `/obras` — Grid de cards com busca, progresso financeiro, contagem de funcionários e botão de edição
- `/obras/[id]` — Detalhe com abas (Visão Geral, Equipe, Ponto, Custo) e botão "Editar" no header

**Endpoints**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /obras | Listar projetos com custo real e contagem de alocados | Todos |
| POST | /obras | Criar projeto | COMPANY_ADMIN, RH_MANAGER |
| GET | /obras/:id | Detalhe com equipe, ponto e custo realizado | Todos |
| PATCH | /obras/:id | Atualizar dados do projeto (status, orçamento, datas, etc.) | COMPANY_ADMIN, RH_MANAGER |
| GET | /obras/:id/equipe | Listar equipe alocada ativa | Todos |
| POST | /obras/:id/equipe | Alocar funcionário (desativa alocação anterior) | COMPANY_ADMIN, RH_MANAGER, SUPERVISOR |
| DELETE | /obras/:id/equipe | Desalocar funcionário | COMPANY_ADMIN, RH_MANAGER |

**Ciclo de vida do projeto**:

```
PLANNING → ACTIVE → PAUSED → ACTIVE → FINISHED
                  → FINISHED
```

- PLANNING → ACTIVE: quando a obra começa
- ACTIVE → PAUSED: paralisação temporária
- PAUSED → ACTIVE: retomada
- ACTIVE/PAUSED → FINISHED: obra concluída (com confirmação no frontend)
- FINISHED: estado final, campos ficam somente leitura

**Edição de projetos**:
- Campos frequentes (visíveis diretamente no modal): status, data de término, orçamento
- Campos raramente alterados (dentro de accordeon "Dados gerais"): nome, código, endereço, cidade, estado, data de início
- Ao mudar status para FINISHED, o sistema exibe diálogo de confirmação
- Projetos com status FINISHED não exibem botão de edição

**Regras de negócio**:
- Ao alocar um funcionário a uma obra, qualquer alocação ativa anterior é desativada automaticamente (um funcionário só está em uma obra por vez).
- O custo realizado (`realCost`) é a soma de `companyCost` de todos os `payrollItems` (MO) + `amount` de todos os `projectCosts` (despesas avulsas) vinculados à obra. O backend retorna também `realCostMO` e `realCostExtras` para breakdown.
- Supervisores só podem alocar funcionários em projetos onde eles mesmos estão vinculados (via `ObraUser`).

**Visibilidade por perfil**:

| Funcionalidade | COMPANY_ADMIN | RH_MANAGER | FINANCIAL_MANAGER | SUPERVISOR | AUDITOR |
|---|---|---|---|---|---|
| Ver /obras na sidebar | Sim | Sim | Não | Sim | Sim |
| Acessar /obras via URL | Sim | Sim | Redireciona p/ dashboard | Sim | Sim |
| Listar projetos (GET /obras) | Todos | Todos | — | Apenas vinculados (ObraUser) | Todos |
| Ver custo orçado/realizado nos cards | Sim | Sim | — | Não | Sim |
| Ver barra de progresso financeiro | Sim | Sim | — | Não | Sim |
| Criar projeto | Sim | Sim | — | Não | Não |
| Editar projeto | Sim | Sim | — | Não | Não |
| Aba Visão Geral — card Financeiro | Sim | Sim | — | Não | Sim |
| Aba Equipe — botão Alocar | Sim | Sim | — | Só nos projetos dele | Não |
| Aba Equipe — botão Desalocar | Sim | Sim | — | Não | Não |
| Aba Ponto | Sim | Sim | — | Sim | Sim |
| Aba Custo (gráfico) | Sim | Sim | — | Não | Sim |
| Banner "modo leitura" | Não | Não | — | Não | Sim |
| GET /obras/:id retorna campo `users` | Sim (array ObraUser com userId) | Idem | — | Idem | Idem |

### 7.3 Presença em campo (Ponto)

**O que faz**: Registro de entrada e saída dos funcionários por obra, individual ou em lote.

**Páginas**:
- `/ponto` — Duas abas: "Registro Diário" (seleção de data, registro em lote, tabela do dia) e "Resumo Mensal" (seleção de mês/ano, tabela consolidada por funcionário com dias trabalhados, horas, extras e faltas). A aba "Resumo Mensal" não é visível para EMPLOYEE.

**Endpoints**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /ponto | Listar registros (filtro por obra, funcionário, data) | Todos (EMPLOYEE vê só os próprios, SUPERVISOR vê só seus projetos) |
| POST | /ponto | Criar registro (individual ou bulk) | COMPANY_ADMIN, RH_MANAGER, SUPERVISOR |
| PATCH | /ponto/:id/saida | Registrar saída e calcular horas | COMPANY_ADMIN, RH_MANAGER, SUPERVISOR |
| GET | /ponto/resumo | Resumo mensal por funcionário (dias, horas, extras, faltas) | COMPANY_ADMIN, RH_MANAGER, SUPERVISOR, AUDITOR |

**Regras de negócio**:
- O filtro de data interpreta datas no fuso de Brasília (UTC-3). O dia 16/03 no seletor filtra registros de 03:00 UTC do dia 16 até 03:00 UTC do dia 17.
- Ao registrar saída, o sistema calcula `workedMinutes` (total - intervalo) e `overtimeMinutes` (trabalhado - jornada esperada do funcionário).
- A data padrão ao abrir a página é o dia local atual (não UTC).
- Suporta geolocalização (campos `latIn`, `lngIn`), embora a UI de mapa não esteja implementada.
- SUPERVISOR só pode registrar ponto (POST /ponto) e saída (PATCH /ponto/:id/saida) em projetos onde está vinculado via ObraUser. Caso contrário, recebe 403.

**Visibilidade por perfil**:

| Funcionalidade | COMPANY_ADMIN | RH_MANAGER | FINANCIAL_MANAGER | SUPERVISOR | EMPLOYEE | AUDITOR |
|---|---|---|---|---|---|---|
| Ver /ponto na sidebar | Sim | Sim | Não | Sim | Sim | Sim |
| Acessar /ponto via URL | Sim | Sim | Redireciona p/ /financeiro | Sim | Sim | Sim |
| Seletor de projeto — lista | Todas ativas | Todas ativas | — | Apenas vinculados (ObraUser) | Apenas alocados | Todas ativas |
| Card "Registrar Entrada" | Sim | Sim | — | Sim | Não | Não |
| Botão "Registrar Saída" | Sim | Sim | — | Sim | Não | Não |
| Coluna "Ações" na tabela | Sim | Sim | — | Sim | Não | Não |
| Aba "Resumo Mensal" | Sim | Sim | — | Sim | Não | Sim |
| Ver registros de ponto | Todos | Todos | — | Só dos projetos dele | Só os próprios | Todos |
| POST /ponto | Sim | Sim | 403 | Sim (validação ObraUser) | 403 | 403 |
| PATCH /ponto/:id/saida | Sim | Sim | 403 | Sim (validação ObraUser) | 403 | 403 |
| Banner "modo leitura" | Não | Não | — | Não | Não | Sim |

### 7.4 Folha de pagamento

**O que faz**: Criação de períodos mensais, cálculo automático da folha com todas as verbas trabalhistas, conferência, fechamento e exportação.

**Páginas**:
- `/folha` — Lista de períodos à esquerda, detalhe do período à direita. Clicar em um funcionário na tabela abre drawer com holerite detalhado (proventos, descontos, líquido, FGTS) e botão de edição manual.
- `/folha/holerite/[periodId]/[employeeId]` — Holerite imprimível em formato A4 com cabeçalho da empresa, dados do funcionário, proventos e descontos lado a lado, salário líquido em destaque, FGTS informativo e linha de assinatura. Botão "Imprimir" chama `window.print()`. Sidebar e header são ocultados via `@media print`. Acessível para EMPLOYEE quando employeeId corresponde ao próprio.

**Endpoints**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /folha/periodos | Listar períodos com totais | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, AUDITOR |
| POST | /folha/periodos | Criar período (mês/ano) | COMPANY_ADMIN, RH_MANAGER |
| GET | /folha/periodos/:id | Detalhe do período com todos os itens | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, AUDITOR |
| POST | /folha/periodos/:id/calcular | Calcular folha para todos os funcionários ativos | COMPANY_ADMIN, RH_MANAGER |
| PATCH | /folha/periodos/:id/fechar | Fechar período (OPEN→REVIEW→CLOSED) | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER |
| GET | /folha/periodos/:id/export | Exportar CSV da folha | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, AUDITOR |
| GET | /folha/periodos/:id/items/:employeeId | Ver item individual (holerite) | Todos (EMPLOYEE vê só o próprio) |
| PATCH | /folha/periodos/:id/items/:employeeId | Editar item manualmente | COMPANY_ADMIN, RH_MANAGER |
| GET | /folha/periodos/:id/items/:employeeId/payslip | Dados para holerite com info da empresa | Todos (EMPLOYEE vê só o próprio) |

**Regras de negócio**:
- Não pode existir dois períodos para o mesmo mês/ano na mesma empresa (`@@unique([companyId, month, year])`).
- O cálculo usa o motor `@fieldis/calculator` e processa todos os funcionários ativos com `baseSalary > 0`.
- Adiantamentos aprovados para o período são automaticamente descontados e marcados como DISCOUNTED.
- Fluxo de status: OPEN → REVIEW (primeiro fechamento) → CLOSED (segundo fechamento).
- Itens de folha não podem ser editados após o período ser CLOSED ou PAID.

**Visibilidade por perfil**:

| Funcionalidade | COMPANY_ADMIN | RH_MANAGER | FINANCIAL_MANAGER | SUPERVISOR | EMPLOYEE | AUDITOR |
|---|---|---|---|---|---|---|
| Ver /folha na sidebar | Sim | Sim | Sim | Não | Não | Sim |
| Acessar /folha via URL | Sim | Sim | Sim | Redireciona p/ dashboard | Redireciona p/ dashboard | Sim |
| Criar período | Sim | Sim | Não | — | — | Não |
| Calcular folha | Sim | Sim | Não | — | — | Não |
| Fechar folha | Sim | Sim | Sim | — | — | Não |
| Exportar CSV | Sim | Sim | Sim | — | — | Sim |
| Ver CPF nos itens (GET /periodos/:id) | Sim | Sim | Não (removido) | — | — | Sim |
| Dados bancários nos endpoints de holerite | Sim | Sim | Não (removido) | — | Não (removido) | Não (removido) |
| Ajustar itens manualmente | Sim | Sim | Não | — | — | Não |
| Ver holerite individual (drawer) | Sim | Sim | Sim | — | — | Sim |
| Editar item no drawer | Sim | Sim | Não | — | — | Não |
| Holerite imprimível (abrir em nova aba) | Sim | Sim | Sim | — | Sim (próprio) | Sim |
| Banner "modo leitura" | Não | Não | Não | — | — | Sim |

**Funcionalidades do frontend**:

- **Holerite individual clicável**: Ao clicar em qualquer linha da tabela, abre um drawer/dialog com o detalhamento completo do holerite (proventos linha a linha, descontos linha a linha, total bruto, total descontos, líquido em destaque e FGTS informativo). Usa o endpoint `GET /folha/periodos/:id/items/:employeeId`.

- **Edição manual de item**: Dentro do drawer, botão "Editar" (visível apenas para COMPANY_ADMIN e RH_MANAGER em períodos OPEN ou REVIEW) abre formulário inline com campos ajustáveis (horas extras, noturno, insalubridade, periculosidade, DSR, VT, adiantamentos, faltas, pensão). O novo líquido é calculado em tempo real. Usa o endpoint `PATCH /folha/periodos/:id/items/:employeeId`.

- **Verificação pré-cálculo**: Antes de calcular, o sistema verifica se há funcionários ativos sem registros de ponto no mês. Se houver, abre um dialog de aviso listando os nomes, com opções "Cancelar — verificar o ponto" e "Calcular mesmo assim". Usa o endpoint `GET /ponto/resumo` para fazer a verificação.

- **Feedback do cálculo**: Ao calcular a folha, ao invés de um toast genérico, abre um dialog mostrando quantos funcionários foram processados e, se houver ignorados, lista nome e motivo de cada um com opção de recalcular.

- **Rótulo de fechamento contextual**: O botão mostra "Enviar para Revisão" quando status é OPEN (com tooltip explicativo) e "Fechar Folha" quando status é REVIEW.

- **Holerite imprimível**: Botão "Abrir para imprimir" no drawer abre nova aba com `/folha/holerite/[periodId]/[employeeId]`. Página renderiza holerite formatado para A4 com `@media print` que oculta sidebar, header e botões. Inclui cabeçalho da empresa (nome + CNPJ), dados do funcionário, proventos e descontos em colunas, líquido em destaque, FGTS e linha de assinatura.

### 7.5 Adiantamentos

**O que faz**: Solicitação, aprovação e desconto automático de adiantamentos salariais.

**Páginas**:
- `/financeiro` — Tabela com filtro de status (Pendentes/Aprovados/Rejeitados/Descontados/Todos), total por filtro e botões de aprovar/rejeitar nos pendentes
- `/adiantamento` — Formulário de solicitação para EMPLOYEE + histórico das próprias solicitações
- `/folha` — Seção "Adiantamentos aguardando aprovação" visível para RH_MANAGER e COMPANY_ADMIN quando há pendentes

**Endpoints**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /adiantamentos | Listar adiantamentos (filtro por status, funcionário) | Todos (EMPLOYEE vê só os próprios) |
| POST | /adiantamentos | Solicitar adiantamento | COMPANY_ADMIN, RH_MANAGER, EMPLOYEE |
| PATCH | /adiantamentos/:id/aprovar | Aprovar adiantamento | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER |
| PATCH | /adiantamentos/:id/rejeitar | Rejeitar adiantamento | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER |

**Regras de negócio**:
- EMPLOYEE só pode solicitar adiantamento para si mesmo.
- Só adiantamentos com status PENDING podem ser aprovados/rejeitados.
- Na hora do cálculo da folha, adiantamentos APPROVED para o mês/ano do período são somados e descontados automaticamente.

**Visibilidade por perfil**:

| Funcionalidade | COMPANY_ADMIN | RH_MANAGER | FINANCIAL_MANAGER | EMPLOYEE | AUDITOR |
|---|---|---|---|---|---|
| Ver /adiantamento na sidebar | Não | Não | Não | Sim | Não |
| Solicitar adiantamento | Sim (via API) | Sim (via API) | Não | Sim (página /adiantamento) | Não |
| Ver lista de adiantamentos | Em /financeiro | Em /folha (pendentes) | Em /financeiro | Em /adiantamento (próprios) | Em /financeiro |
| Aprovar/rejeitar | Em /financeiro e /folha | Em /folha | Em /financeiro | Não | Não |

### 7.6 Financeiro

**O que faz**: Dashboard financeiro com KPIs, gráficos de custo por projeto, evolução mensal de custo MO e gestão de adiantamentos.

**Páginas**:
- `/financeiro` — 4 KPIs no topo (folha do mês, adiantamentos pendentes, custo MO, variação mensal), gráfico de barras (orçado vs realizado por obra), gráfico de linha (custo MO por mês), tabela de adiantamentos com filtro de status e total

**Endpoints**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /dashboard | KPIs gerais e estatísticas por obra | Todos |
| GET | /dashboard/financial | Custo por obra e evolução mensal (6 meses) | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, AUDITOR |
| GET | /dashboard/export | CSV financeiro com todas as obras | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, AUDITOR |

**Visibilidade por perfil**:

| Funcionalidade | COMPANY_ADMIN | FINANCIAL_MANAGER | AUDITOR |
|---|---|---|---|
| KPIs no topo | Sim | Sim | Sim |
| Gráficos | Sim | Sim | Sim |
| Tabela de adiantamentos | Sim (com ações) | Sim (com ações) | Sim (somente leitura) |
| Exportar CSV | Sim | Sim | Sim |
| Banner "modo leitura" | Não | Não | Sim |

### 7.7 Custos avulsos por projeto

**O que faz**: Lançamento, edição e exclusão de despesas avulsas (materiais, equipamentos, transporte, alimentação, hospedagem, etc.) por projeto, além da mão de obra calculada pela folha.

**Páginas**:
- `/obras/[id]` — Aba "Custo" reformulada com 3 cards de resumo (MO, Despesas, Total), gráfico de barras (Orçado | MO | Despesas), tabela de despesas com badges de categoria, botões de editar e excluir, botão "+ Nova despesa" com dialog de criação/edição.

**Endpoints**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /obras/:id/custos | Listar custos avulsos do projeto | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, AUDITOR |
| POST | /obras/:id/custos | Criar custo avulso | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER |
| PATCH | /obras/:id/custos/:costId | Editar custo (criador ou COMPANY_ADMIN) | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER |
| DELETE | /obras/:id/custos/:costId | Excluir custo | COMPANY_ADMIN |

**Categorias**:
- MATERIAL — materiais elétricos e mecânicos
- EQUIPAMENTO — guindastes, plataformas, máquinas de solda
- TRANSPORTE — frete, combustível, deslocamento
- ALIMENTACAO — refeições, marmitas da equipe
- HOSPEDAGEM — diárias, alojamento
- OUTROS — despesas que não se encaixam nas categorias acima

**Impacto no realCost**:
- O campo `realCost` nos cards de projeto agora soma MO (companyCost de payrollItems) + custos avulsos (amount de projectCosts).
- Campos adicionais retornados: `realCostMO` (só MO), `realCostExtras` (só despesas), `realCost` (total).
- Tooltip no valor realizado dos cards mostra o breakdown: "MO: R$ X | Despesas: R$ Y".
- O gráfico "Custo Total por Projeto" em /financeiro também inclui custos avulsos.

**Modelo de dados** (ProjectCost):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| companyId | FK → Company | Multi-tenancy |
| obraId | FK → Obra | Projeto ao qual pertence |
| category | ProjectCostCategory | Categoria da despesa |
| description | String | Descrição livre |
| amount | Float | Valor em reais |
| date | DateTime | Data do lançamento/compra |
| invoiceNumber | String? | Número da nota fiscal |
| createdById | FK → User | Quem lançou |

### 7.8 Alertas e notificações

**O que faz**: Sistema de alertas automáticos para documentos vencendo/vencidos, adiantamentos pendentes e folha em aberto.

**Cron jobs** (arquivo `apps/api/src/jobs/alerts.ts`):
- **08:00 diário**: Verifica documentos vencendo em 30 dias e documentos já vencidos. Marca documentos expirados automaticamente com `status = EXPIRED`.
- **08:30 diário**: A partir do dia 25, verifica se o período da folha do mês atual existe. A partir do dia 1, verifica se a folha do mês anterior ainda está OPEN.

**Endpoint de notificações**:

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /notifications | Retorna notificações ativas | Todos |

Tipos de notificação retornados:
- `doc_expiring` — Documento vencendo em 30 dias
- `doc_expired` — Documento já vencido
- `advance_pending` — Adiantamentos aguardando aprovação
- `payroll_open` — Folha do mês ainda não fechada

O frontend faz polling a cada 60 segundos e exibe o contador no ícone de sino do Header.

---

## 8. Banco de dados

### Company

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| name | String | Razão social |
| cnpj | String (unique) | CNPJ da empresa |
| plan | PlanType | Plano: BASICO, PROFISSIONAL, EMPRESARIAL |
| active | Boolean | Se a empresa está ativa |
| phone, email, address | String? | Contato e endereço |

Raiz do multi-tenancy. Todas as outras tabelas referenciam `companyId`.

### User

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa do usuário |
| email | String | Email de login |
| name | String | Nome de exibição |
| password | String | Hash bcrypt |
| role | UserRole | Perfil de acesso |
| active | Boolean | Se pode fazer login |
| employeeId | String? (FK) | Funcionário vinculado (para EMPLOYEE/SUPERVISOR) |

- **Unique**: `(companyId, email)` — email único por empresa.
- **Relacionamentos**: Company, Employee (opcional), ObraUser.

### Obra

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| name | String | Nome do projeto |
| code | String | Código identificador (ex: PRJ-001) |
| address, city, state | String? | Localização |
| status | ObraStatus | PLANNING, ACTIVE, PAUSED, FINISHED |
| startDate | DateTime | Início previsto |
| endDate | DateTime? | Término previsto |
| budgetedCost | Float | Orçamento aprovado |

- **Índice**: `(companyId, status)` — filtragem rápida por status.
- **Relacionamentos**: Company, ObraUser, EmployeeAllocation, TimeRecord, EpiDelivery, PayrollItem, ProjectCost.

### ProjectCost

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Multi-tenancy |
| obraId | String (FK) | Projeto ao qual pertence |
| category | ProjectCostCategory | MATERIAL, EQUIPAMENTO, TRANSPORTE, ALIMENTACAO, HOSPEDAGEM, OUTROS |
| description | String | Descrição livre |
| amount | Float | Valor em reais |
| date | DateTime | Data do lançamento/compra |
| invoiceNumber | String? | Número da nota fiscal |
| createdById | String (FK) | Quem lançou |

- **Índice**: `(companyId, obraId)`.

### DocumentType (enum)

`RG`, `CPF`, `CTPS`, `PIS`, `ASO`, `CNH`, `COMPROVANTE_RESIDENCIA`, `CONTRATO_TRABALHO`, `TERMO_EPI`, `NR_10`, `NR_33`, `NR_35`, `OUTROS`.

### Employee

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| name | String | Nome completo |
| cpf | String | CPF (11 dígitos) |
| rg, pis, ctpsNumber | String? | Documentos de identificação |
| birthDate | DateTime? | Data de nascimento |
| phone, email, address | String? | Contato |
| role | String | Função (ex: Montador Eletricista) |
| department | String? | Departamento |
| status | EmployeeStatus | ACTIVE, ON_LEAVE, VACATION, TERMINATED |
| hireDate | DateTime | Data de admissão |
| terminatedAt | DateTime? | Data de desligamento |
| baseSalary | Float | Salário base |
| salaryType | SalaryType | MONTHLY, HOURLY, DAILY |
| hoursPerDay | Float | Jornada diária (default: 8) |
| hasInsalubrity | Boolean | Recebe insalubridade |
| insalubrityGrade | String? | Grau: 10%, 20%, 40% |
| hasPericulosity | Boolean | Recebe periculosidade |
| hasNightShift | Boolean | Adicional noturno |
| hasVT, hasVA | Boolean | Vale transporte / alimentação |
| vaAmount | Float? | Valor do VA |
| dependentsCount | Int | Número de dependentes (para IRRF) |
| hasAlimony | Boolean | Pensão alimentícia |
| alimonyAmount | Float? | Valor da pensão |
| bankCode, bankAgency, bankAccount | String? | Dados bancários |

- **Unique**: `(companyId, cpf)` — CPF único por empresa.
- **Índice**: `(companyId, status)`.

### EmployeeAllocation

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| employeeId | String (FK) | Funcionário |
| obraId | String (FK) | Obra/projeto |
| startDate | DateTime | Início da alocação |
| endDate | DateTime? | Fim da alocação |
| active | Boolean | Se está ativa |

- **Unique**: `(employeeId, obraId, startDate)` — evita duplicatas.
- **Índice**: `(companyId, obraId, active)` — consulta rápida de equipe ativa.

### Document

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| employeeId | String (FK) | Funcionário dono |
| type | DocumentType | RG, CPF, ASO, NR-10, etc. |
| fileUrl | String? | URL do arquivo |
| fileName | String? | Nome do arquivo |
| status | DocumentStatus | PENDING, VALID, EXPIRED, REJECTED |
| issuedAt | DateTime? | Data de emissão |
| expiresAt | DateTime? | Data de vencimento |

- **Índice**: `(companyId, expiresAt)` — consulta eficiente de documentos vencendo.

### TimeRecord

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| employeeId | String (FK) | Funcionário |
| obraId | String (FK) | Obra/projeto |
| clockIn | DateTime | Hora de entrada |
| clockOut | DateTime? | Hora de saída |
| breakMinutes | Int | Minutos de intervalo |
| workedMinutes | Int? | Minutos trabalhados (calculado na saída) |
| overtimeMinutes | Int? | Minutos extras (calculado na saída) |
| latIn, lngIn | Float? | Coordenadas GPS da entrada |
| photoInUrl | String? | Foto da entrada |
| source | String? | Origem: MANUAL, MOBILE, WEB |
| recordedById | String? | Quem registrou |
| isAbsence | Boolean | Se é uma falta |

- **Índice**: `(companyId, clockIn)` — filtragem por data.

### PayrollPeriod

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| month | Int | Mês (1-12) |
| year | Int | Ano |
| status | PayrollStatus | OPEN, REVIEW, CLOSED, PAID |
| closedAt | DateTime? | Data de fechamento |
| closedById | String? | Quem fechou |
| paidAt | DateTime? | Data de pagamento |

- **Unique**: `(companyId, month, year)` — um período por mês/ano/empresa.

### PayrollItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| periodId | String (FK) | Período da folha |
| employeeId | String (FK) | Funcionário |
| obraId | String? (FK) | Obra (opcional) |
| baseSalary | Float | Salário base proporcional |
| workedDays | Int | Dias trabalhados |
| overtimeHours, overtimeValue | Float | Horas extras e valor |
| nightShiftValue | Float | Adicional noturno |
| insalubrityValue | Float | Insalubridade |
| periculosityValue | Float | Periculosidade |
| dsrValue | Float | DSR sobre horas extras |
| inssDiscount | Float | Desconto INSS |
| irrfDiscount | Float | Desconto IRRF |
| vtDiscount | Float | Desconto vale transporte |
| advancesDiscount | Float | Desconto adiantamentos |
| absencesDiscount | Float | Desconto faltas |
| alimonyDiscount | Float | Desconto pensão |
| fgtsValue | Float | FGTS (custo empresa) |
| grossSalary | Float | Salário bruto |
| totalDiscounts | Float | Total de descontos |
| netSalary | Float | Salário líquido |
| companyCost | Float | Custo total para a empresa |

- **Unique**: `(periodId, employeeId)` — um item por funcionário por período.

### Advance

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| employeeId | String (FK) | Funcionário |
| amount | Float | Valor do adiantamento |
| reason | String? | Motivo |
| status | AdvanceStatus | PENDING, APPROVED, REJECTED, DISCOUNTED |
| requestedAt | DateTime | Data da solicitação |
| reviewedAt | DateTime? | Data da aprovação/rejeição |
| discountMonth | Int? | Mês de desconto |
| discountYear | Int? | Ano de desconto |

### EpiDelivery

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| companyId | String (FK) | Empresa |
| employeeId | String (FK) | Funcionário |
| obraId | String (FK) | Obra |
| itemName | String | Nome do EPI (ex: Capacete, Luva) |
| itemCode | String? | Código do item |
| quantity | Int | Quantidade entregue |
| deliveredAt | DateTime | Data de entrega |
| signatureUrl | String? | URL da assinatura digital |
| expiresAt | DateTime? | Validade do EPI |

### ObraUser

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (UUID) | Chave primária |
| userId | String (FK) | Usuário |
| obraId | String (FK) | Obra |

- **Unique**: `(userId, obraId)` — tabela de junção para supervisores vinculados a obras.

---

## 9. Multi-tenant

### O que é row-level tenancy

O Fieldis usa isolamento por linha (row-level tenancy). Todas as tabelas de dados possuem uma coluna `companyId` que identifica a qual empresa aquele registro pertence. Não existem schemas ou bancos separados por empresa.

### Como `companyId` é usado

Toda query Prisma inclui `where: { companyId }` como filtro obrigatório. O `companyId` vem do token JWT do usuário autenticado e é injetado no objeto `request` pelo `tenantMiddleware`.

### Como o middleware extrai o tenant

1. O `tenantMiddleware` (`apps/api/src/middleware/tenant.ts`) intercepta toda requisição protegida.
2. Decodifica o JWT e extrai `companyId`, `userId`, `role` e `employeeId`.
3. Verifica se o `jti` (JWT ID) está na blacklist do Redis.
4. Valida o formato UUID do `companyId` com regex para prevenir SQL injection.
5. Injeta os campos no objeto `request` do Fastify.

### Como o RLS funciona

Após a validação do token, o middleware executa:

```sql
SET LOCAL "app.current_tenant" = '<companyId>'
```

O arquivo `rls-setup.sql` (montado no Docker via volume) configura políticas RLS em todas as tabelas de dados:

```sql
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "User"
  USING ("companyId" = current_setting('app.current_tenant'));
```

Isso é aplicado nas tabelas: User, Obra, Employee, EmployeeAllocation, Document, TimeRecord, EpiDelivery, PayrollPeriod, PayrollItem, Advance.

### O que acontece se um bug tentar acessar dados de outra empresa

Mesmo que o código da aplicação tenha um bug e esqueça de filtrar por `companyId`, o PostgreSQL RLS impede o acesso. A query simplesmente retorna zero resultados para registros de outras empresas. É uma segunda camada de segurança além do filtro na aplicação.

---

## 10. Autenticação e permissões

### Fluxo de login

1. O usuário acessa `/login` e preenche email e senha.
2. O NextAuth (CredentialsProvider) envia um POST para `{API_URL}/auth/login`.
3. O backend verifica o email no banco, compara a senha com bcrypt, e gera um JWT.
4. O JWT contém: `jti` (UUID único), `userId`, `companyId`, `role`, `email`, `employeeId`.
5. O token expira em 8 horas (configurável via `JWT_EXPIRES_IN`).
6. O NextAuth armazena o `accessToken` na sessão JWT do lado do cliente (max age: 28800s).

### Payload do token JWT

```json
{
  "jti": "uuid-unico-do-token",
  "userId": "uuid-do-usuario",
  "companyId": "uuid-da-empresa",
  "role": "COMPANY_ADMIN",
  "email": "admin@demo.com",
  "employeeId": "uuid-ou-null"
}
```

### Como o `roleGuard` funciona no backend

O `roleGuard` (`apps/api/src/middleware/roleGuard.ts`) é uma factory function:

```typescript
roleGuard(['COMPANY_ADMIN', 'RH_MANAGER'])
```

Retorna um middleware que:
- Sempre permite `SUPER_ADMIN`.
- Verifica se `request.role` está na lista de roles permitidos.
- Retorna 403 `"Sem permissão"` se não estiver.

### Como o `usePermissions` funciona no frontend

O hook `usePermissions` (`apps/web/src/hooks/usePermissions.ts`) usa a sessão do NextAuth para derivar permissões booleanas:

```typescript
const { canManageEmployees, canViewFinancial, canCalculatePayroll } = usePermissions()
```

Cada permissão é um boolean calculado a partir do `role` na sessão. Exemplos:
- `canManageEmployees` = SUPER_ADMIN | COMPANY_ADMIN | RH_MANAGER
- `canCalculatePayroll` = SUPER_ADMIN | COMPANY_ADMIN | RH_MANAGER
- `canApproveAdvances` = SUPER_ADMIN | COMPANY_ADMIN | RH_MANAGER | FINANCIAL_MANAGER

### Como o RoleGate funciona

O componente `RoleGate` (`apps/web/src/components/RoleGate.tsx`) recebe uma lista de `roles` e renderiza `children` apenas se o usuário tem o role adequado (ou é SUPER_ADMIN). Caso contrário, renderiza `fallback` (default: `null`).

### Como a sidebar é filtrada

A sidebar (`apps/web/src/components/layout/Sidebar.tsx`) usa as permissões do `usePermissions` para decidir quais itens exibir:
- Dashboard: visível para todos exceto EMPLOYEE
- Funcionários: `canManageEmployees` ou `isAuditor`
- Projetos: `canManageProjects` ou `isSupervisor` ou `isAuditor`
- Ponto: `canRecordPresence` ou `isEmployee` ou `isAuditor`
- Folha: `canViewPayroll`
- Financeiro: `canViewFinancial`
- Configurações: `canViewSettings`

### Fluxo completo de uma requisição autenticada

```
Login → NextAuth armazena accessToken na sessão
    → Requisição HTTP com header Authorization: Bearer {token}
        → Axios interceptor injeta o token automaticamente
            → Fastify recebe a requisição
                → tenantMiddleware: verifica JWT, checa blacklist, valida UUID, seta RLS
                    → roleGuard: verifica role permitido para a rota
                        → Handler da rota: executa query Prisma com companyId
                            → PostgreSQL: RLS filtra por app.current_tenant
```

---

## 11. Cálculo de folha de pagamento

O motor de cálculo está em `packages/calculator/src/index.ts` e usa as tabelas brasileiras de 2024.

### Componentes do cálculo

**Proventos (adições ao salário bruto)**:
- Salário base (proporcional aos dias trabalhados)
- Horas extras
- Adicional noturno
- Insalubridade
- Periculosidade
- DSR (Descanso Semanal Remunerado) sobre horas extras

**Descontos**:
- INSS (contribuição do empregado)
- IRRF (imposto de renda)
- Vale transporte
- Adiantamentos
- Faltas
- Pensão alimentícia

**Custo empresa** (não desconta do funcionário):
- FGTS (8% do bruto)

### INSS progressivo (tabela 2024)

| Faixa | Alíquota | Teto da faixa |
|-------|----------|---------------|
| Até R$ 1.412,00 | 7,5% | R$ 105,90 |
| R$ 1.412,01 a R$ 2.666,68 | 9% | R$ 112,92 |
| R$ 2.666,69 a R$ 4.000,03 | 12% | R$ 159,98 |
| R$ 4.000,04 a R$ 7.786,02 | 14% | R$ 530,04 |

O cálculo é progressivo: cada faixa aplica sua alíquota apenas sobre o valor que cai dentro dela. O teto de contribuição é R$ 7.786,02.

```typescript
function calcINSS(grossSalary: number): number {
  let remaining = grossSalary
  let inss = 0
  for (const bracket of INSS_BRACKETS) {
    const taxable = Math.min(remaining, bracket.max - (bracket.min || 0))
    if (taxable <= 0) break
    inss += taxable * bracket.rate
    remaining -= taxable
  }
  return Math.round(inss * 100) / 100
}
```

### IRRF progressivo (tabela 2024)

| Base de cálculo | Alíquota | Dedução |
|-----------------|----------|---------|
| Até R$ 2.259,20 | Isento | — |
| R$ 2.259,21 a R$ 2.826,65 | 7,5% | R$ 169,44 |
| R$ 2.826,66 a R$ 3.751,05 | 15% | R$ 381,44 |
| R$ 3.751,06 a R$ 4.664,68 | 22,5% | R$ 662,77 |
| Acima de R$ 4.664,68 | 27,5% | R$ 896,00 |

A base de cálculo do IRRF é: `salário bruto - INSS - (dependentes × R$ 189,59)`.

### Horas extras

```typescript
function calcOvertime({ hourlyRate, weekdayHours, sundayHours, holidayHours }): number {
  return hourlyRate * weekdayHours * 1.5     // 50% dia útil
       + hourlyRate * sundayHours * 2.0      // 100% domingo
       + hourlyRate * holidayHours * 2.0     // 100% feriado
}
```

### DSR (Descanso Semanal Remunerado)

O DSR é calculado sobre o valor das horas extras:

```typescript
function calcDSR(overtimeValue: number, workDays: number, restDays: number): number {
  if (workDays === 0) return 0
  return (overtimeValue / workDays) * restDays
}
```

### Insalubridade

Calculada sobre o salário mínimo (R$ 1.412,00):
- Grau mínimo: 10% → R$ 141,20
- Grau médio: 20% → R$ 282,40
- Grau máximo: 40% → R$ 564,80

### Periculosidade

30% do salário base: `baseSalary × 0.30`

### Vale Transporte (VT)

Desconto limitado a 6% do salário base:

```typescript
function calcVT(baseSalary: number, vtAmount: number): number {
  const maxDiscount = baseSalary * 0.06
  return Math.min(vtAmount, maxDiscount)
}
```

### FGTS

8% do salário bruto: `grossSalary × 0.08`. É custo da empresa, não desconta do funcionário.

### Fluxo de status do período

```
OPEN → (calcular) → OPEN → (fechar 1ª vez) → REVIEW → (fechar 2ª vez) → CLOSED → (pagar) → PAID
```

---

## 12. API — referência de endpoints

### Auth

| Método | Rota | Descrição | Roles | Body/Params |
|--------|------|-----------|-------|-------------|
| POST | /auth/login | Login | Público | `{ email, password }` |
| POST | /auth/refresh | Renovar token | Autenticado | — |
| POST | /auth/logout | Invalidar token | Autenticado | — |

### Health

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /health | Health check | Público |

### Employees

| Método | Rota | Descrição | Roles | Params |
|--------|------|-----------|-------|--------|
| GET | /employees | Listar | Todos | `?status, search, obraId, page, limit` |
| POST | /employees | Criar | ADMIN, RH | Body: CreateEmployeeSchema |
| GET | /employees/:id | Detalhe | Todos | — |
| PATCH | /employees/:id | Atualizar | ADMIN, RH | Body: UpdateEmployeeSchema |
| DELETE | /employees/:id | Desligar | ADMIN, RH | — |
| GET | /employees/:id/documents | Documentos | Todos | — |
| POST | /employees/:id/documents | Upload doc | ADMIN, RH | `{ type, fileName, fileUrl, issuedAt?, expiresAt? }` |
| GET | /employees/:id/payslips | Holerites | Todos | — |

### Obras

| Método | Rota | Descrição | Roles | Params |
|--------|------|-----------|-------|--------|
| GET | /obras | Listar | Todos | `?status, search, page, limit` |
| POST | /obras | Criar | ADMIN, RH | Body: CreateObraSchema |
| GET | /obras/:id | Detalhe | Todos | — |
| PATCH | /obras/:id | Atualizar | ADMIN, RH | Body: UpdateObraSchema |
| GET | /obras/:id/equipe | Equipe ativa | Todos | — |
| POST | /obras/:id/equipe | Alocar | ADMIN, RH, SUPERVISOR | `{ employeeId, startDate }` |
| DELETE | /obras/:id/equipe | Desalocar | ADMIN, RH | `{ employeeId }` |

### Ponto

| Método | Rota | Descrição | Roles | Params |
|--------|------|-----------|-------|--------|
| GET | /ponto | Listar registros | Todos | `?obraId, employeeId, date, startDate, endDate, page, limit` |
| POST | /ponto | Registrar entrada (individual ou bulk) | ADMIN, RH, SUPERVISOR | Body: TimeRecordSchema ou BulkTimeRecordSchema |
| PATCH | /ponto/:id/saida | Registrar saída | ADMIN, RH, SUPERVISOR | `{ clockOut? }` |

### Folha

| Método | Rota | Descrição | Roles | Params |
|--------|------|-----------|-------|--------|
| GET | /folha/periodos | Listar períodos | ADMIN, RH, FIN, AUDITOR | — |
| POST | /folha/periodos | Criar período | ADMIN, RH | `{ month, year }` |
| GET | /folha/periodos/:id | Detalhe do período | ADMIN, RH, FIN, AUDITOR | — |
| POST | /folha/periodos/:id/calcular | Calcular folha | ADMIN, RH | — |
| PATCH | /folha/periodos/:id/fechar | Fechar período | ADMIN, RH, FIN | — |
| GET | /folha/periodos/:id/export | Exportar CSV | ADMIN, RH, FIN, AUDITOR | — |
| GET | /folha/periodos/:id/items/:eid | Ver holerite | Todos | — |
| PATCH | /folha/periodos/:id/items/:eid | Editar item | ADMIN, RH | Body parcial |
| GET | /folha/periodos/:id/items/:eid/payslip | Dados holerite + empresa | Todos | — |

### Adiantamentos

| Método | Rota | Descrição | Roles | Params |
|--------|------|-----------|-------|--------|
| GET | /adiantamentos | Listar | Todos | `?status, employeeId, page, limit` |
| POST | /adiantamentos | Solicitar | ADMIN, RH, EMPLOYEE | Body: CreateAdvanceSchema |
| PATCH | /adiantamentos/:id/aprovar | Aprovar | ADMIN, RH, FIN | — |
| PATCH | /adiantamentos/:id/rejeitar | Rejeitar | ADMIN, RH, FIN | — |

### Dashboard

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /dashboard | KPIs e estatísticas | Todos |
| GET | /dashboard/financial | Dados financeiros | Todos |
| GET | /dashboard/export | CSV financeiro | Todos |

### Notificações

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /notifications | Alertas ativos | Todos |

---

## 13. Variáveis de ambiente

| Variável | Descrição | Exemplo | Obrigatória | App |
|----------|-----------|---------|-------------|-----|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://user:pass@localhost:5432/fieldis` | Sim | api, database |
| `REDIS_URL` | String de conexão Redis | `redis://localhost:6379` | Não (fallback graceful) | api |
| `JWT_SECRET` | Chave secreta para assinar JWTs | `obras-rh-jwt-secret-minimo-32-chars` | Sim | api |
| `JWT_EXPIRES_IN` | Tempo de expiração do token | `15m`, `8h` | Não (default: 8h) | api |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh | `7d` | Não | api |
| `API_PORT` | Porta do servidor Fastify | `3001` | Não (default: 3001) | api |
| `API_HOST` | Host do servidor | `0.0.0.0` | Não (default: 0.0.0.0) | api |
| `FRONTEND_URL` | URL do frontend (CORS) | `http://localhost:3000` | Não | api |
| `LOG_LEVEL` | Nível de log do Fastify | `info`, `debug` | Não (default: info) | api |
| `NEXTAUTH_SECRET` | Chave secreta do NextAuth | `obras-rh-nextauth-secret-aqui-32chars` | Sim | web |
| `NEXTAUTH_URL` | URL base do NextAuth | `http://localhost:3000` | Sim | web |
| `NEXT_PUBLIC_API_URL` | URL da API (visível no browser) | `http://localhost:3001/api/v1` | Sim | web |
| `API_URL` | URL da API (server-side) | `http://localhost:3001/api/v1` | Não | web |

---

## 14. Estrutura de pastas

```
obras-saas/
├── package.json              # Workspace root (npm workspaces)
├── package-lock.json
├── tsconfig.base.json        # Config TypeScript base compartilhada
├── turbo.json                # Configuração do Turborepo (tasks: dev, build, db:push, db:seed)
├── docker-compose.yml        # PostgreSQL 16 + Redis 7
├── .env                      # Variáveis de ambiente raiz
├── .gitignore
├── DOCS.md                   # Este arquivo
│
├── apps/
│   ├── api/                  # Backend Fastify
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env
│   │   └── src/
│   │       ├── server.ts              # Bootstrap: plugins, rotas, CORS, rate limit, swagger
│   │       ├── middleware/
│   │       │   ├── tenant.ts          # Multi-tenant: JWT verify, blacklist, RLS SET LOCAL
│   │       │   └── roleGuard.ts       # Factory de middleware RBAC
│   │       ├── plugins/
│   │       │   └── auth.ts            # Decorator fastify.authenticate()
│   │       ├── lib/
│   │       │   └── redis.ts           # Client ioredis (blacklist + cache)
│   │       ├── jobs/
│   │       │   └── alerts.ts          # Cron diário: documentos vencendo, folha em aberto
│   │       └── routes/
│   │           ├── auth/index.ts      # Login, refresh, logout
│   │           ├── dashboard/index.ts # KPIs, financial, export CSV
│   │           ├── employees/index.ts # CRUD funcionários, documentos, holerites
│   │           ├── obras/index.ts     # CRUD projetos, alocação de equipe
│   │           ├── ponto/index.ts     # Clock in/out, bulk, filtro por data (BRT)
│   │           ├── folha/index.ts     # Períodos, cálculo, fechamento, export CSV
│   │           ├── adiantamentos/index.ts # Solicitação, aprovação, rejeição
│   │           └── notifications/index.ts # Alertas em tempo real
│   │
│   └── web/                  # Frontend Next.js
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env
│       ├── next.config.js             # transpilePackages: @fieldis/shared
│       ├── tailwind.config.ts         # Design tokens: cores, fontes
│       ├── postcss.config.js
│       └── src/
│           ├── app/
│           │   ├── layout.tsx         # Root layout, metadata, Providers
│           │   ├── page.tsx           # Redirect "/" → "/login"
│           │   ├── providers.tsx      # SessionProvider + QueryClientProvider
│           │   ├── globals.css        # Tailwind base + fontes customizadas
│           │   ├── (auth)/
│           │   │   └── login/page.tsx # Tela de login
│           │   ├── (app)/
│           │   │   ├── layout.tsx     # Layout autenticado: Sidebar + Header + proteção de rotas
│           │   │   ├── dashboard/page.tsx      # KPIs e tabela de obras
│           │   │   ├── funcionarios/
│           │   │   │   ├── page.tsx             # Lista com busca e filtros
│           │   │   │   ├── novo/page.tsx        # Formulário 4 etapas
│           │   │   │   └── [id]/page.tsx        # Ficha com abas
│           │   │   ├── obras/
│           │   │   │   ├── page.tsx             # Grid de cards
│           │   │   │   └── [id]/page.tsx        # Detalhe com abas
│           │   │   ├── ponto/page.tsx           # Registro de presença
│           │   │   ├── folha/page.tsx           # Gestão de folha
│           │   │   ├── financeiro/page.tsx      # Gráficos e adiantamentos
│           │   │   └── configuracoes/page.tsx   # Dados da empresa e segurança
│           │   └── api/auth/[...nextauth]/route.ts # Handler NextAuth
│           ├── components/
│           │   ├── RoleGate.tsx        # Renderização condicional por role
│           │   ├── layout/
│           │   │   ├── Sidebar.tsx     # Navegação lateral responsiva
│           │   │   └── Header.tsx      # Barra superior com notificações e perfil
│           │   └── ui/                 # Componentes UI reutilizáveis
│           │       ├── Badge.tsx
│           │       ├── Button.tsx
│           │       ├── Card.tsx
│           │       ├── Dialog.tsx
│           │       ├── Input.tsx
│           │       ├── Select.tsx
│           │       ├── Skeleton.tsx
│           │       ├── Table.tsx
│           │       └── Tabs.tsx
│           ├── hooks/
│           │   ├── useApi.ts           # React Query hooks para todos os endpoints
│           │   └── usePermissions.ts   # Permissões derivadas do role
│           ├── lib/
│           │   ├── api.ts              # Axios instance com interceptors
│           │   ├── auth.ts             # Configuração NextAuth (CredentialsProvider)
│           │   └── utils.ts            # cn() para classnames
│           └── types/
│               └── next-auth.d.ts      # Type augmentation do NextAuth
│
└── packages/
    ├── database/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env
    │   ├── index.ts                    # Singleton PrismaClient
    │   └── prisma/
    │       ├── schema.prisma           # 12 modelos, 9 enums, multi-tenant
    │       ├── seed.ts                 # Dados demo: empresa, usuários, obras, funcionários
    │       └── rls-setup.sql           # Políticas RLS para isolamento de tenant
    │
    ├── shared/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts                # Schemas Zod + utilitários (formatCurrency, formatCPF, etc.)
    │
    └── calculator/
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts                # Motor de cálculo: INSS, IRRF, FGTS, DSR, extras, etc.
```

---

## 15. Decisões técnicas e trade-offs

### Monorepo vs repos separados

- **Escolhido**: Monorepo com Turborepo e npm workspaces.
- **Por quê**: Compartilhamento de tipos e schemas Zod entre frontend e backend. Uma única instalação, um único `npm run dev` sobe tudo.
- **Descartado**: Repos separados (mais complexidade de CI/CD e versionamento de pacotes compartilhados).
- **Revisitar quando**: A equipe crescer e o tempo de build se tornar gargalo. Considerar Nx ou split em micro-repos.

### Row-level tenancy vs schema por tenant

- **Escolhido**: Row-level tenancy com `companyId` em todas as tabelas + RLS do PostgreSQL.
- **Por quê**: Simples de implementar, um único schema Prisma, migrations aplicam para todos. RLS como segunda camada de segurança.
- **Descartado**: Schema por tenant (complexidade de migrations multi-schema, Prisma não suporta nativamente).
- **Revisitar quando**: Houver necessidade de isolamento regulatório ou clientes com volumes muito diferentes que justifiquem bancos separados.

### Fastify vs Express

- **Escolhido**: Fastify 4.
- **Por quê**: Performance superior em benchmarks, sistema de plugins, suporte nativo a schemas/serialização, tipagem TypeScript melhor.
- **Descartado**: Express (ecossistema maior mas performance inferior, middleware chain menos organizado).
- **Revisitar quando**: Dificilmente. Fastify é uma escolha sólida para APIs Node.js.

### NextAuth vs JWT próprio

- **Escolhido**: Combinação — NextAuth no frontend (session management), JWT próprio no backend (Fastify JWT).
- **Por quê**: NextAuth simplifica o fluxo de login no Next.js. O backend gera o JWT e o NextAuth apenas o armazena na sessão.
- **Descartado**: Auth0/Clerk (custo adicional, dependência externa para um MVP).
- **Revisitar quando**: Precisar de SSO, OAuth com Google/Microsoft, ou MFA.

### Prisma vs query builder

- **Escolhido**: Prisma ORM.
- **Por quê**: Type-safe queries geradas a partir do schema, migrations automáticas, Prisma Studio para debug.
- **Descartado**: Knex/Drizzle (menos type-safe), SQL puro (produtividade menor).
- **Revisitar quando**: Queries muito complexas que o Prisma não consegue expressar eficientemente, ou quando o overhead do Prisma Engine se tornar um problema de performance.

### React Query vs SWR

- **Escolhido**: TanStack React Query v5.
- **Por quê**: Mutations com invalidação de cache, devtools, mais controle sobre refetch e staleTime.
- **Descartado**: SWR (mais simples mas menos controle sobre mutations).
- **Revisitar quando**: Não é provável. React Query é a escolha padrão do ecossistema.

### Float vs Decimal para valores monetários

- **Escolhido**: Float (campo `Float` no Prisma → `double precision` no PostgreSQL).
- **Por quê**: Simplicidade. O Prisma com `Decimal` retorna objetos `Prisma.Decimal` que precisam de conversão manual para número. Float simplifica o código.
- **Descartado**: Decimal (mais preciso para operações financeiras).
- **Revisitar quando**: Houver problemas de arredondamento em valores altos (acima de R$ 10 milhões) ou quando conformidade financeira exigir precisão de centavos. Para o escopo atual (folhas e orçamentos de obras), Float com 2 casas é suficiente.

---

## 16. Problemas conhecidos e limitações atuais

| Item | Status | Detalhes |
|------|--------|----------|
| Geração de holerite PDF | Não implementado | O campo `payslipUrl` existe no banco mas nunca é preenchido. Não há geração de PDF. |
| Exportação CSV da folha | Implementado | Funciona via `GET /folha/periodos/:id/export`. |
| Exportação CSV financeiro | Implementado | Funciona via `GET /dashboard/export`. |
| Geolocalização no ponto | Parcial | O frontend captura GPS e os campos `latIn`/`lngIn` existem, mas a UI não exibe mapa nem valida geofencing. |
| Redis para blacklist | Implementado | Funciona, mas se o Redis estiver indisponível o sistema apenas loga um warning e continua (tokens não são invalidados). |
| RLS no banco | Configurado | O SQL existe e é montado via Docker. As políticas são aplicadas na inicialização do container. |
| Upload real de arquivos | Não implementado | O plugin `@fastify/multipart` está registrado mas nenhuma rota faz upload real de arquivo. Documentos recebem `fileUrl` como string. |
| Notificações em tempo real | Polling | O frontend faz polling a cada 60 segundos. Não usa WebSocket. |
| Validação de horário de verão | Não aplicável | O Brasil aboliu o horário de verão em 2019. O offset UTC-3 é fixo. |
| Testes automatizados | Não implementados | O `packages/calculator` tem `vitest` como devDependency mas não há arquivos de teste. Nenhum outro pacote tem testes. |
| Paginação no frontend | Parcial | A página de funcionários tem paginação completa. Outras páginas (obras, ponto) não implementam navegação de páginas. |
| Edição manual de folha | Parcial | É possível editar valores individuais, mas o recálculo parcial (apenas gross/net) pode divergir do cálculo completo. |
| Status PAID na folha | Não implementado | O enum existe mas não há endpoint para marcar como PAID. |
| EPI Delivery | Apenas banco | O modelo existe no Prisma mas não há rotas de API nem tela no frontend. |
| Página de configurações | Parcial | A UI existe mas os endpoints de atualização de dados da empresa e troca de senha não estão implementados. |

---

## 17. Glossário

| Termo | Descrição |
|-------|-----------|
| **Frente de serviço** | Local físico onde os funcionários estão trabalhando. Pode ser uma subestação, planta industrial ou usina. No sistema, corresponde a uma Obra. |
| **Supervisor de Campo** | Encarregado responsável pela equipe em uma frente de serviço. Registra presença, controla a operação no local. Role: SUPERVISOR. |
| **Presença em campo** | Registro de que o funcionário compareceu ao trabalho na obra. Equivale ao ponto (clock in/out). |
| **ASO** | Atestado de Saúde Ocupacional. Exame médico obrigatório para admissão, periódico e demissão. Tem data de validade. |
| **NR-10** | Norma Regulamentadora 10 — Segurança em Instalações e Serviços em Eletricidade. Certificação obrigatória para quem trabalha com eletricidade. Validade: 2 anos. |
| **NR-13** | Norma Regulamentadora 13 — Caldeiras, Vasos de Pressão e Tubulações. Certificação para quem opera ou faz manutenção nesses equipamentos. |
| **NR-33** | Norma Regulamentadora 33 — Segurança e Saúde nos Trabalhos em Espaços Confinados. |
| **NR-35** | Norma Regulamentadora 35 — Trabalho em Altura. Obrigatória para atividades acima de 2 metros. Validade: 2 anos. |
| **Insalubridade** | Adicional pago quando o trabalhador é exposto a agentes nocivos à saúde (ruído, calor, poeira). Calculado sobre o salário mínimo: 10% (mínimo), 20% (médio), 40% (máximo). |
| **Periculosidade** | Adicional de 30% sobre o salário base, pago quando há risco de vida (eletricidade, explosivos, inflamáveis). |
| **DSR** | Descanso Semanal Remunerado. Reflexo das horas extras nos dias de descanso (domingos e feriados). Calculado como: (valor extras / dias úteis) × dias de descanso. |
| **FGTS** | Fundo de Garantia do Tempo de Serviço. Depósito de 8% do salário bruto pela empresa em conta vinculada do trabalhador. Não é descontado do salário. |
| **INSS** | Instituto Nacional do Seguro Social. Contribuição previdenciária descontada do salário do empregado. Alíquota progressiva de 7,5% a 14%. |
| **IRRF** | Imposto de Renda Retido na Fonte. Descontado do salário conforme tabela progressiva. Dependentes geram dedução de R$ 189,59 cada. |
| **eSocial** | Sistema do governo federal que unifica o envio de informações trabalhistas, previdenciárias e fiscais. O Fieldis não integra diretamente com o eSocial (limitação atual). |
| **Holerite** | Contracheque / demonstrativo de pagamento. Documento que detalha todos os proventos e descontos do funcionário no mês. |
| **Período de competência** | Mês/ano de referência da folha de pagamento. Ex: competência 03/2026 = folha de março de 2026. |
| **Vale Transporte (VT)** | Benefício de transporte com desconto limitado a 6% do salário base do funcionário. |
| **Vale Alimentação (VA)** | Benefício alimentar com valor configurável por funcionário. |
| **EPI** | Equipamento de Proteção Individual. Capacete, luvas, óculos, cinto de segurança. O sistema rastreia entregas por funcionário e obra. |
| **CTPS** | Carteira de Trabalho e Previdência Social. Documento que registra o vínculo empregatício. |
| **PIS** | Programa de Integração Social. Número cadastral do trabalhador usado para identificação no FGTS e seguro-desemprego. |
| **Soft delete** | Técnica de exclusão lógica: em vez de deletar o registro do banco, marca como inativo/terminado. Usado no desligamento de funcionários. |

---

## 18. Gestão de usuários

### Quem pode cadastrar quem

| Criador | Pode criar |
|---------|-----------|
| SUPER_ADMIN | COMPANY_ADMIN, RH_MANAGER, FINANCIAL_MANAGER, SUPERVISOR, EMPLOYEE, AUDITOR |
| COMPANY_ADMIN | RH_MANAGER, FINANCIAL_MANAGER, SUPERVISOR, EMPLOYEE, AUDITOR (não pode criar outro COMPANY_ADMIN) |
| RH_MANAGER | SUPERVISOR, EMPLOYEE (apenas) |

Nenhum outro perfil pode criar usuários.

### Senha inicial

Ao criar um usuário, a senha pode ser definida pelo criador ou gerada automaticamente. Se o campo `password` não for informado, o sistema gera uma senha aleatória de 8 caracteres (base64url). A senha gerada é retornada na resposta da criação para que o administrador possa compartilhá-la com o novo usuário. Todas as senhas são armazenadas com hash bcrypt (salt 10).

### Vinculação EMPLOYEE → Funcionário

O campo `employeeId` no model `User` permite vincular um usuário do tipo EMPLOYEE a um registro de `Employee`. Isso é opcional na criação do usuário. Quando vinculado, o EMPLOYEE só consegue ver seus próprios registros de ponto, holerites e documentos (filtro `request.employeeId` no backend).

### Vinculação SUPERVISOR → Projetos

A tabela `ObraUser` vincula um `User` a uma ou mais `Obra`. Ao criar um SUPERVISOR, é possível já informar `obraIds` para vincular aos projetos imediatamente. Também é possível gerenciar os vínculos posteriormente via os endpoints `POST /users/:id/projetos` e `DELETE /users/:id/projetos/:obraId`.

### Endpoints

| Método | Rota | Descrição | Roles |
|--------|------|-----------|-------|
| GET | /users | Listar usuários (filtro por role, status, busca) | COMPANY_ADMIN, RH_MANAGER |
| POST | /users | Criar usuário | COMPANY_ADMIN, RH_MANAGER |
| GET | /users/:id | Detalhe do usuário com projetos | COMPANY_ADMIN, RH_MANAGER |
| PATCH | /users/:id | Atualizar nome, email, role, active | COMPANY_ADMIN, RH_MANAGER |
| PATCH | /users/:id/senha | Redefinir senha | COMPANY_ADMIN, RH_MANAGER |
| DELETE | /users/:id | Desativar (active=false) | COMPANY_ADMIN |
| POST | /users/:id/projetos | Vincular supervisor a projetos | COMPANY_ADMIN, RH_MANAGER |
| DELETE | /users/:id/projetos/:obraId | Desvincular de projeto | COMPANY_ADMIN, RH_MANAGER |

### Tela no frontend

A página de gestão de usuários fica em `/configuracoes/usuarios` e é acessível via o item "Usuários" na sidebar (visível para SUPER_ADMIN, COMPANY_ADMIN e RH_MANAGER). A página permite:

- Listar todos os usuários da empresa com filtro por perfil e busca
- Criar novos usuários com seleção de perfil, senha opcional, vinculação a projetos (SUPERVISOR) ou funcionário (EMPLOYEE)
- Editar dados do usuário (nome, email, perfil, status)
- Desativar usuários (soft delete)

---

## Deploy em produção

### Arquitetura

| Serviço | Plataforma | Função |
|---------|-----------|--------|
| Frontend | Vercel | Next.js 14, SSR, autenticação via NextAuth |
| API | Railway | Fastify 4, lógica de negócio, cálculo de folha |
| Banco | Neon | PostgreSQL 16, RLS multi-tenant |
| Cache | Railway | Redis 7, blacklist de tokens e cache do dashboard |
| Documentos | Disco local (Railway) ou Cloudflare R2 | Upload de ASOs, NRs, CNH |

### Ordem de deploy

1. **Neon** — Criar banco e copiar a connection string
2. **Railway** — Deploy da API + Redis, rodar migrations
3. **Vercel** — Deploy do frontend, conectar à API

### Passo a passo

**1. Neon (banco de dados)**

Criar projeto no Neon, copiar a connection string. O formato será:
```
postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/fieldis?sslmode=require
```
O `?sslmode=require` é obrigatório — o Neon exige SSL.

**2. Railway (API + Redis)**

Criar novo projeto no Railway. Adicionar dois serviços:

Serviço 1 — **Redis**: Adicionar serviço Redis pelo template do Railway. A `REDIS_URL` é gerada automaticamente.

Serviço 2 — **API**: Conectar ao repositório GitHub. Configurar:
- Root Directory: `/` (raiz — o Dockerfile referencia o monorepo inteiro)
- Dockerfile Path: `apps/api/Dockerfile`

Variáveis de ambiente:
```
DATABASE_URL=postgresql://user:pass@host.neon.tech/fieldis?sslmode=require
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<gerar com: openssl rand -hex 32>
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
API_HOST=0.0.0.0
FRONTEND_URL=https://seu-projeto.vercel.app
LOG_LEVEL=info
```

O Railway injeta `PORT` automaticamente — o servidor já lê `process.env.PORT`.

**3. Vercel (frontend)**

Criar projeto no Vercel conectando ao repositório GitHub. Configurar:
- Framework: Next.js
- Root Directory: `apps/web`

O `vercel.json` em `apps/web/` já configura o build command para o monorepo.

Variáveis de ambiente:
```
NEXTAUTH_SECRET=<gerar com: openssl rand -hex 32>
NEXTAUTH_URL=https://seu-projeto.vercel.app
NEXT_PUBLIC_API_URL=https://sua-api.railway.app/api/v1
API_URL=https://sua-api.railway.app/api/v1
```

### Variáveis de ambiente por serviço

**Vercel (frontend):**
- `NEXTAUTH_SECRET` — chave secreta para sessões
- `NEXTAUTH_URL` — URL pública do frontend
- `NEXT_PUBLIC_API_URL` — URL da API (exposta ao browser)
- `API_URL` — URL da API (server-side)

**Railway API:**
- `DATABASE_URL` — connection string do Neon com `?sslmode=require`
- `REDIS_URL` — gerado pelo Redis do Railway
- `JWT_SECRET` — chave secreta para tokens JWT
- `JWT_EXPIRES_IN` — duração do token (ex: `8h`)
- `JWT_REFRESH_EXPIRES_IN` — duração do refresh token (ex: `7d`)
- `API_HOST` — `0.0.0.0`
- `FRONTEND_URL` — URL do Vercel (para CORS)
- `LOG_LEVEL` — `info` ou `warn`

**Railway Redis:**
- Sem configuração manual — Railway provê automaticamente

**Neon:**
- Sem variáveis no Neon — a connection string é usada como `DATABASE_URL` no Railway

**Cloudflare R2 (opcional):**
- `R2_BUCKET` — nome do bucket
- `R2_ACCOUNT_ID` — ID da conta Cloudflare
- `R2_ACCESS_KEY_ID` — chave de acesso
- `R2_SECRET_ACCESS_KEY` — chave secreta
- Instalar `@aws-sdk/client-s3` quando ativar

### Storage de documentos

Por padrão, os documentos são salvos no disco do Railway em `uploads/`. Para produção escalada ou múltiplas instâncias, configurar Cloudflare R2 preenchendo as variáveis `R2_*`. O código detecta automaticamente — se `R2_BUCKET` estiver definido, usa R2; caso contrário, usa disco local.

### Migrations

As migrations rodam automaticamente no startup do container Docker (`prisma migrate deploy`). Para rodar manualmente:
```bash
DATABASE_URL="..." npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

### Seed (dados de demonstração)

Para popular o banco com dados de demo após o deploy:
```bash
DATABASE_URL="..." npx tsx packages/database/prisma/seed.ts
```
