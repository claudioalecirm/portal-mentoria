-- ============================================================
-- PORTAL MENTORIA — CLAUDIO ALECRIM
-- Execute este SQL no Supabase > SQL Editor > New Query
-- ============================================================

-- EXTENSÃO UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: usuarios
-- ============================================================
create table if not exists usuarios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  email text unique not null,
  senha_hash text not null,
  role text not null check (role in ('mentor','aluno')),
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: mentorias
-- ============================================================
create table if not exists mentorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: encontros_template
-- (estrutura de encontros de cada mentoria)
-- ============================================================
create table if not exists encontros_template (
  id uuid primary key default uuid_generate_v4(),
  mentoria_id uuid references mentorias(id) on delete cascade,
  numero int not null,
  nome text not null
);

-- ============================================================
-- TABELA: alunos
-- (vínculo entre usuario e mentoria + dados do diagnóstico)
-- ============================================================
create table if not exists alunos (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  mentoria_id uuid references mentorias(id),
  progresso int default 0 check (progresso >= 0 and progresso <= 100),
  acesso_ativo boolean default true,
  -- Ficha diagnóstico inicial
  telefone text,
  motivacao text,
  resultado_esperado text,
  area_foco text,
  grande_desafio text,
  obstaculo text,
  satisfacao_atual int,
  tentativas_anteriores text,
  comprometimento text,
  visao_ideal text,
  info_adicional text,
  -- Financeiro
  forma_pagamento text default 'boleto',
  total_parcelas int default 4,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: encontros
-- (encontros reais de cada aluno — baseados no template)
-- ============================================================
create table if not exists encontros (
  id uuid primary key default uuid_generate_v4(),
  aluno_id uuid references alunos(id) on delete cascade,
  numero int not null,
  nome text not null,
  status text default 'pend' check (status in ('done','nxt','pend')),
  data_realizada date,
  resumo text,
  ferramentas text,
  tarefas_texto text,
  -- Próximo encontro agendado
  proximo_nome text,
  proximo_data date,
  proximo_hora time,
  proximo_modalidade text default 'online',
  proximo_link text,
  proximo_endereco text,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: tarefas
-- ============================================================
create table if not exists tarefas (
  id uuid primary key default uuid_generate_v4(),
  aluno_id uuid references alunos(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('texto','pdf')),
  arquivo_url text,
  resposta text,
  concluida boolean default false,
  concluida_em timestamptz,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: mensagens
-- ============================================================
create table if not exists mensagens (
  id uuid primary key default uuid_generate_v4(),
  aluno_id uuid references alunos(id) on delete cascade,
  de text not null check (de in ('aluno','mentor')),
  texto text not null,
  lida boolean default false,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: ferramentas
-- ============================================================
create table if not exists ferramentas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  url text,
  ativo_global boolean default true,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: ferramentas_aluno
-- (quais ferramentas estão habilitadas por aluno)
-- ============================================================
create table if not exists ferramentas_aluno (
  id uuid primary key default uuid_generate_v4(),
  aluno_id uuid references alunos(id) on delete cascade,
  ferramenta_id uuid references ferramentas(id) on delete cascade,
  habilitada boolean default false,
  unique(aluno_id, ferramenta_id)
);

-- ============================================================
-- TABELA: parcelas
-- ============================================================
create table if not exists parcelas (
  id uuid primary key default uuid_generate_v4(),
  aluno_id uuid references alunos(id) on delete cascade,
  numero int not null,
  valor numeric(10,2),
  vencimento date,
  paga boolean default false,
  boleto_url text,
  criado_em timestamptz default now()
);

-- ============================================================
-- TABELA: push_tokens
-- (tokens de Web Push por usuário)
-- ============================================================
create table if not exists push_tokens (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz default now(),
  unique(usuario_id, endpoint)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table usuarios enable row level security;
alter table alunos enable row level security;
alter table encontros enable row level security;
alter table tarefas enable row level security;
alter table mensagens enable row level security;
alter table parcelas enable row level security;
alter table ferramentas enable row level security;
alter table ferramentas_aluno enable row level security;
alter table mentorias enable row level security;
alter table encontros_template enable row level security;
alter table push_tokens enable row level security;

-- Políticas abertas para service_role (backend)
-- O frontend usa service_role via Vercel Functions (seguro)
create policy "service_role full access usuarios" on usuarios for all using (true);
create policy "service_role full access alunos" on alunos for all using (true);
create policy "service_role full access encontros" on encontros for all using (true);
create policy "service_role full access tarefas" on tarefas for all using (true);
create policy "service_role full access mensagens" on mensagens for all using (true);
create policy "service_role full access parcelas" on parcelas for all using (true);
create policy "service_role full access ferramentas" on ferramentas for all using (true);
create policy "service_role full access ferramentas_aluno" on ferramentas_aluno for all using (true);
create policy "service_role full access mentorias" on mentorias for all using (true);
create policy "service_role full access encontros_template" on encontros_template for all using (true);
create policy "service_role full access push_tokens" on push_tokens for all using (true);

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Mentor principal
insert into usuarios (id, nome, email, senha_hash, role) values
  ('00000000-0000-0000-0000-000000000001', 'Claudio Alecrim', 'mentor@ca.com', 'mentor_hash_1234', 'mentor')
on conflict (email) do nothing;

-- Mentorias
insert into mentorias (id, nome) values
  ('10000000-0000-0000-0000-000000000001', 'Governo Pessoal'),
  ('10000000-0000-0000-0000-000000000002', 'Homem Espiritual')
on conflict do nothing;

-- Encontros template — Governo Pessoal
insert into encontros_template (mentoria_id, numero, nome) values
  ('10000000-0000-0000-0000-000000000001', 1, 'Diagnóstico Inicial'),
  ('10000000-0000-0000-0000-000000000001', 2, 'Governo da Mente'),
  ('10000000-0000-0000-0000-000000000001', 3, 'Mapeamento Emocional'),
  ('10000000-0000-0000-0000-000000000001', 4, 'Temperamento e Padrões'),
  ('10000000-0000-0000-0000-000000000001', 5, 'Governo das Relações'),
  ('10000000-0000-0000-0000-000000000001', 6, 'Governo da Vontade'),
  ('10000000-0000-0000-0000-000000000001', 7, 'Plano de Ação'),
  ('10000000-0000-0000-0000-000000000001', 8, 'Encerramento')
on conflict do nothing;

-- Encontros template — Homem Espiritual
insert into encontros_template (mentoria_id, numero, nome) values
  ('10000000-0000-0000-0000-000000000002', 1, 'Identidade Masculina'),
  ('10000000-0000-0000-0000-000000000002', 2, 'Disciplina Espiritual'),
  ('10000000-0000-0000-0000-000000000002', 3, 'Autoridade Interior'),
  ('10000000-0000-0000-0000-000000000002', 4, 'Família e Propósito'),
  ('10000000-0000-0000-0000-000000000002', 5, 'Maturidade Espiritual'),
  ('10000000-0000-0000-0000-000000000002', 6, 'Governo Espiritual'),
  ('10000000-0000-0000-0000-000000000002', 7, 'Legado'),
  ('10000000-0000-0000-0000-000000000002', 8, 'Encerramento')
on conflict do nothing;

-- Ferramentas
insert into ferramentas (id, nome, url, ativo_global) values
  ('20000000-0000-0000-0000-000000000001', 'ATE', '/ferramentas/ate', true),
  ('20000000-0000-0000-0000-000000000002', 'Código DNA', '/ferramentas/codigo-dna', true),
  ('20000000-0000-0000-0000-000000000003', 'Diagnóstico de Perdão', '/ferramentas/perdao', true),
  ('20000000-0000-0000-0000-000000000004', 'Alinhamento de Expectativas', '/ferramentas/alinhamento', true),
  ('20000000-0000-0000-0000-000000000005', 'Mapeamento de Âncoras', '/ferramentas/ancoras', false)
on conflict do nothing;

-- Aluno de teste (Ricardo Mendes)
insert into usuarios (id, nome, email, senha_hash, role) values
  ('00000000-0000-0000-0000-000000000002', 'Ricardo Mendes', 'ricardo@email.com', 'aluno_hash_2345', 'aluno')
on conflict (email) do nothing;

insert into alunos (id, usuario_id, mentoria_id, progresso, telefone, motivacao, resultado_esperado, area_foco, grande_desafio, obstaculo, comprometimento, visao_ideal) values
  ('30000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   62, '41998887766',
   'Crescer como líder e pai ao mesmo tempo',
   'Equilíbrio pessoal e profissional',
   'Família e carreira',
   'Separar trabalho de família',
   'Sem limites claros na agenda',
   'Estou realmente decidido a mudar',
   'Casa organizada, negócio crescendo, presente com os filhos')
on conflict do nothing;
