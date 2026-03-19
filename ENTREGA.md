# Fieldis — Documento de Entrega

## Bem-vindo ao Fieldis

O Fieldis é o sistema de gestão operacional feito para empresas de montagem elétrica e mecânica industrial. Ele centraliza o controle de funcionários, projetos, presença em campo, folha de pagamento, documentos obrigatórios e custos por obra em uma única plataforma. Com o Fieldis, sua equipe de RH, financeiro e supervisores trabalham com as mesmas informações, sem planilhas paralelas e sem retrabalho.

---

## O que está incluído nesta entrega

O sistema entregue cobre o ciclo operacional completo de uma empresa de montagem. São 8 módulos integrados: cadastro de funcionários com todos os dados trabalhistas e contratuais, gestão de projetos com alocação de equipe e controle de custos, registro de presença em campo com entrada em lote e resumo mensal, folha de pagamento com motor de cálculo automático (INSS, IRRF, FGTS, adicionais e descontos), adiantamentos salariais com fluxo de aprovação, controle financeiro com gráficos e KPIs, upload e controle de documentos obrigatórios (ASO, NR-10, NR-35, CNH) com alerta de vencimento, e holerite imprimível para entrega ao funcionário.

O sistema conta com 6 perfis de acesso distintos, cada um com permissões específicas para o que a pessoa pode ver e fazer. Todas as informações são isoladas por empresa — cada empresa acessa apenas seus próprios dados.

---

## Como acessar o sistema

**URL de acesso:** [endereço será informado na implantação]

**Logins para demonstração:**

| Perfil | Email | Senha | O que pode fazer |
|--------|-------|-------|-----------------|
| Administrador | admin@demo.com | 123456 | Acesso total — gerencia tudo na empresa |
| Gestor de RH | rh@demo.com | 123456 | Admite funcionários, calcula folha, registra ponto, aprova adiantamentos |
| Gestor Financeiro | financeiro@demo.com | 123456 | Confere e fecha folha, aprova adiantamentos, acompanha custos |
| Supervisor de Campo | supervisor@demo.com | 123456 | Registra presença da equipe no campo, aloca funcionários aos seus projetos |
| Funcionário | funcionario@demo.com | 123456 | Consulta seu ponto, solicita adiantamento, vê holerites e documentos |
| Auditor | auditor@demo.com | 123456 | Visualiza todos os dados sem alterar nada — acesso somente leitura |

Todos os logins pertencem à empresa demo "Montagem Industrial Demo Ltda".

---

## Guia rápido por perfil

**Administrador** — É o dono ou diretor da empresa. Ao abrir o sistema, vê o Dashboard com os números gerais: total de funcionários, projetos ativos, pontos do dia, custo mensal, adiantamentos pendentes e documentos vencendo. Pode acessar qualquer módulo, criar usuários, configurar dados da empresa e acompanhar tudo. É o único que pode excluir despesas de projetos e desativar usuários.

**Gestor de RH** — É quem cuida das pessoas. No dia a dia, admite novos funcionários pelo formulário em 4 etapas, faz upload de documentos obrigatórios com controle de validade, aloca equipes nos projetos e registra ponto quando necessário. No final do mês, cria o período da folha, clica em "Calcular Folha", confere cada holerite no detalhamento individual, faz ajustes manuais se preciso e envia para revisão do financeiro. Também aprova adiantamentos diretamente na tela da folha.

**Gestor Financeiro** — É quem confere os números antes do pagamento. Acessa a folha para revisar os valores calculados pelo RH, fechar o período e exportar o CSV para importação bancária. Na tela de Financeiro, vê os KPIs do mês, gráficos de custo por projeto e tabela de adiantamentos com filtro por status. Pode aprovar ou rejeitar solicitações de adiantamento.

**Supervisor de Campo** — É o encarregado que está na frente de serviço. Pela manhã, abre a tela de Ponto no celular ou tablet, seleciona o projeto onde está trabalhando, marca os funcionários presentes e clica em "Registrar Entrada". No final do expediente, registra a saída de cada um. O sistema calcula as horas automaticamente. O supervisor vê apenas os projetos aos quais está vinculado.

**Funcionário** — É o montador, eletricista ou auxiliar que trabalha no campo. Ao abrir o sistema, vê seu ponto (em modo de consulta — quem registra é o supervisor), pode solicitar adiantamento informando valor e motivo, consulta seus holerites com link para abrir o demonstrativo de pagamento, e vê os documentos que o RH enviou (ASO, NR-10, etc.).

**Auditor** — É o auditor externo ou interno que precisa conferir dados sem alterar nada. Vê todas as telas do sistema com um banner amarelo "Modo somente leitura". Pode consultar funcionários, projetos, ponto, folha, financeiro e exportar relatórios. Nenhum botão de ação aparece para este perfil.

---

## Fluxo do mês — passo a passo

**Semana 1 a 4 — No campo**

Todo dia de manhã, o supervisor abre o sistema e registra a presença da equipe. Seleciona o projeto, marca os funcionários que chegaram e clica em "Registrar Entrada". O GPS do celular é capturado automaticamente. No final do expediente, registra a saída e o sistema calcula as horas trabalhadas e as horas extras de cada funcionário.

**Durante o mês — No escritório**

O RH acompanha o Dashboard para ver se há documentos vencendo (ASO, NR-10, NR-35) e providencia a renovação. Quando admite um novo funcionário, preenche o formulário com dados pessoais, contrato, remuneração e benefícios. Faz upload dos documentos obrigatórios. Aloca o funcionário no projeto correto.

**Final do mês — Fechamento da folha**

O RH abre a tela de Folha e cria um novo período (mês/ano). Antes de calcular, o sistema verifica se há funcionários sem registro de ponto e avisa. Ao calcular, o motor processa automaticamente: salário proporcional, horas extras, insalubridade, periculosidade, adicional noturno, DSR, INSS, IRRF, vale-transporte, adiantamentos aprovados, faltas e pensão alimentícia. O RH confere cada holerite clicando no funcionário, pode editar manualmente qualquer valor e vê o novo líquido em tempo real. Quando tudo estiver conferido, clica em "Enviar para Revisão". O Gestor Financeiro então acessa a folha, confere os totais e clica em "Fechar Folha". O CSV pode ser exportado para importação no sistema bancário.

**Quando o funcionário precisa de adiantamento**

O funcionário abre a página "Adiantamento" no sistema, informa o valor desejado, o motivo e o mês em que quer que seja descontado. A solicitação fica pendente até que o RH ou o Financeiro aprove. Quando a folha do mês de desconto é calculada, o sistema busca automaticamente os adiantamentos aprovados e desconta do salário líquido.

---

## Dados de demonstração incluídos

Para facilitar a avaliação do sistema, a base de demonstração já vem com dados pré-cadastrados.

A empresa demo é a "Montagem Industrial Demo Ltda" (CNPJ 12.345.678/0001-90), com 3 projetos ativos: Subestação Solar 230kV em São Paulo (orçamento R$ 2,5 milhões), Planta Petroquímica Norte em Curitiba (orçamento R$ 4,8 milhões) e Retrofit Usina Termelétrica em São Bernardo do Campo (orçamento R$ 1,2 milhões, em fase de planejamento).

São 12 funcionários cadastrados com dados completos: montadores, eletricistas, auxiliares de montagem, soldadores e caldeireiros, com salários entre R$ 1.800 e R$ 4.500. Alguns têm insalubridade e periculosidade configuradas. Os funcionários estão alocados nos projetos A e B. O supervisor Roberto está vinculado ao Projeto A.

Os últimos 7 dias úteis possuem registros de ponto para os 6 funcionários do Projeto A, com entrada às 7h e saída às 16h.

---

## Perfis de acesso — o que cada um vê

O sistema controla rigorosamente o que cada pessoa pode ver e fazer. O Supervisor de Campo vê apenas os projetos aos quais está vinculado — se a empresa tem 10 projetos mas ele está em 2, vê apenas esses 2. O Funcionário vê exclusivamente seus próprios dados: seu ponto, seus holerites, seus documentos e seus adiantamentos. Ele não vê dados de colegas.

O Gestor Financeiro acessa apenas Folha e Financeiro — não vê a lista de funcionários, não vê projetos e não registra ponto. O CPF dos funcionários não aparece para ele na folha. O Auditor vê tudo mas não pode alterar nada — todos os botões de ação ficam escondidos e um banner amarelo indica o modo somente leitura em cada tela.

Dados sensíveis como salário, CPF, RG e dados bancários são visíveis apenas para o Administrador, o Gestor de RH e o Auditor. Nenhum outro perfil tem acesso a essas informações.

---

## Documentos — como funciona o upload

O sistema aceita arquivos nos formatos PDF, JPG e PNG, com tamanho máximo de 10 MB por arquivo. Para enviar um documento, o RH abre a ficha do funcionário, vai na aba "Documentos", clica em "Upload" no tipo desejado (ASO, NR-10, NR-35, CNH, etc.) e seleciona o arquivo. Para documentos com validade, o sistema pede a data de vencimento.

Após o envio, o documento fica disponível para visualização e download diretamente no sistema. Os botões "Ver" e "Baixar" aparecem ao lado de cada documento enviado. Os arquivos ficam armazenados no servidor do sistema e são protegidos — apenas usuários autenticados da mesma empresa conseguem acessá-los.

O sistema monitora automaticamente as datas de vencimento. Documentos que vão vencer nos próximos 30 dias geram um alerta no sino de notificações. Documentos vencidos são marcados automaticamente como "Expirado" todos os dias às 8h.

O Funcionário pode consultar seus próprios documentos na página "Documentos" do menu lateral, com botões para ver e baixar cada arquivo. Ele não pode fazer upload — apenas o RH tem essa permissão.

---

## Cálculo de folha — o que é calculado automaticamente

O motor de cálculo do Fieldis processa automaticamente todas as verbas trabalhistas para cada funcionário. Os proventos calculados incluem: salário base proporcional aos dias trabalhados, horas extras com adicional de 50%, adicional noturno, insalubridade por grau (10%, 20% ou 40% do salário mínimo), periculosidade (30% do salário base) e Descanso Semanal Remunerado (DSR).

Os descontos calculados incluem: INSS com tabela progressiva, Imposto de Renda Retido na Fonte (IRRF) com deduções por dependente, vale-transporte (6% do salário base), adiantamentos salariais aprovados no mês, desconto por faltas e pensão alimentícia quando aplicável.

O FGTS (8% do salário bruto) é calculado como custo empresa — aparece no holerite como informação mas não desconta do funcionário. O custo total da empresa por funcionário (salário bruto + FGTS) é usado no controle de custos por projeto.

As tabelas de INSS e IRRF utilizadas são as de 2024. Quando o governo publicar novas tabelas, elas devem ser atualizadas no sistema. Consulte o suporte técnico para realizar a atualização.

---

## O que vem nas próximas versões

O Fieldis está em evolução contínua. As funcionalidades planejadas para as próximas versões incluem: geração de holerite em PDF para download direto pelo funcionário, mapa de geolocalização mostrando onde cada funcionário registrou presença, notificações de folha pendente no sino do sistema (hoje os alertas de folha rodam em segundo plano), log completo de auditoria mostrando quem fez cada ação e quando, opção de reabrir uma folha fechada por engano (restrito ao Administrador), migração do armazenamento de documentos para nuvem (permitindo uso em múltiplos servidores) e relatório comparativo de folha entre meses.

---

## Suporte e contato

Em caso de dúvidas, problemas ou solicitações:

**Empresa:** [Nome da empresa desenvolvedora]
**Email de suporte:** [email@suporte.com]
**WhatsApp:** [número com DDD]
**Telefone:** [número com DDD]
**Horário de atendimento:** [dias e horários]

---

## Notas técnicas (para o responsável de TI)

Esta seção é destinada ao profissional de tecnologia responsável pela infraestrutura.

**Stack tecnológica:** O Fieldis é composto por um frontend em Next.js 14 (React 18), uma API em Fastify 4 (Node.js), banco de dados PostgreSQL 16 com Row Level Security para isolamento multi-tenant, e Redis 7 para cache e controle de sessões. Todo o código é TypeScript.

**Backup do banco de dados:** O banco PostgreSQL deve ser backupeado regularmente. Comando recomendado:
```
pg_dump -U postgres fieldis > backup_$(date +%Y%m%d).sql
```
Configure um cron para executar diariamente e armazenar em local seguro.

**Arquivos de documentos:** Os documentos enviados pelo RH ficam armazenados em `apps/api/uploads/`. Este diretório deve ser incluído na rotina de backup. Cada arquivo é nomeado com o padrão `{companyId}_{employeeId}_{tipo}_{timestamp}.{ext}` para garantir unicidade.

**Como reiniciar o sistema:** Se o sistema travar ou apresentar comportamento inesperado:
```
# Reiniciar a API
cd apps/api && npm run start

# Reiniciar o frontend
cd apps/web && npm run start

# Reiniciar os serviços de infraestrutura
docker compose restart
```

**Variáveis de ambiente importantes:**
- `DATABASE_URL` — conexão com o PostgreSQL
- `REDIS_URL` — conexão com o Redis
- `JWT_SECRET` — chave secreta para tokens de autenticação (nunca compartilhar)
- `NEXT_PUBLIC_API_URL` — URL da API para o frontend
- `FRONTEND_URL` — URL do frontend para CORS

**Monitoramento:** O sistema registra logs estruturados via Fastify. Alertas automáticos de documentos vencendo e folha pendente rodam diariamente às 8h e 8h30 respectivamente.
