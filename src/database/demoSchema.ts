// Schema completo do banco, usado para popular o Postgres em memória
// (pg-mem) que esta API mocada usa como único "banco de dados". Reconstruído
// lendo à risca o SQL usado pelos controllers (src/controllers/*.ts).
//
// Qualquer coluna/tabela nova usada por um controller precisa ser refletida
// aqui também, senão a API quebra com "column does not exist".

export const DEMO_SCHEMA_SQL = `
-- =============================================
-- usuarios
-- =============================================
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil text NOT NULL CHECK (perfil IN ('personal', 'aluno')),
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  usuario text NOT NULL UNIQUE,
  senha text NOT NULL,
  chave_pix text,
  nome_recebedor text,
  cidade_recebedor text,
  criado_em timestamp DEFAULT now()
);

CREATE INDEX idx_usuarios_perfil ON usuarios (perfil);
CREATE INDEX idx_usuarios_usuario ON usuarios (usuario);

-- =============================================
-- alunos
-- =============================================
CREATE TABLE alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  plano text CHECK (plano IS NULL OR plano IN ('mensal', 'trimestral', 'semestral', 'anual', 'aula_avulsa')),
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  frequencia_semanal int4 CHECK (frequencia_semanal >= 1 AND frequencia_semanal <= 7),
  objetivo text,
  valor_aula numeric(10, 2),
  valor_plano numeric(10, 2),
  creditos integer NOT NULL DEFAULT 0,
  creditos_extras integer NOT NULL DEFAULT 0,
  creditos_extras_validade date,
  vigencia_fim date,
  plano_renovado_em date,
  criado_em timestamp DEFAULT now()
);

CREATE INDEX idx_alunos_status ON alunos (status);
CREATE INDEX idx_alunos_usuario_id ON alunos (usuario_id);

-- =============================================
-- aulas (fonte única de verdade p/ agendamentos + presenças, passado e futuro)
-- =============================================
CREATE TABLE aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE,
  data date NOT NULL,
  horario time NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('personal', 'musculacao', 'avaliacao')),
  status text DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'confirmado', 'aprovado', 'cancelado', 'em_andamento', 'realizado', 'faltou')),
  duracao int4 DEFAULT 60,
  observacoes text,
  is_reposicao boolean NOT NULL DEFAULT false,
  is_avulsa_extra boolean NOT NULL DEFAULT false,
  usou_credito boolean NOT NULL DEFAULT false,
  cobrar_falta boolean DEFAULT false,
  cancelado_por text CHECK (cancelado_por IS NULL OR cancelado_por IN ('personal', 'aluno')),
  data_hora_cancelamento timestamp,
  data_hora_falta timestamp,
  hora_inicio timestamp,
  hora_fim timestamp,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

CREATE INDEX idx_aulas_aluno_id ON aulas (aluno_id);
CREATE INDEX idx_aulas_data ON aulas (data);
CREATE INDEX idx_aulas_data_horario ON aulas (data, horario);
CREATE INDEX idx_aulas_data_status ON aulas (data, status);
CREATE INDEX idx_aulas_status ON aulas (status);

-- =============================================
-- avaliacoes
-- =============================================
CREATE TABLE avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  peso numeric(5, 2),
  altura numeric(5, 2),
  idade integer,
  sexo varchar(10),
  imc numeric(5, 2),
  gordura_corporal numeric(5, 2),
  massa_muscular numeric(5, 2),
  protocolo text,
  circunferencias jsonb DEFAULT '{}',
  dobras jsonb DEFAULT '{}',
  observacoes text,
  criado_em timestamp DEFAULT now()
);

CREATE INDEX idx_avaliacoes_aluno_id ON avaliacoes (aluno_id);
CREATE INDEX idx_avaliacoes_data ON avaliacoes (data);

-- =============================================
-- mensagens
-- =============================================
CREATE TABLE mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id uuid NOT NULL REFERENCES usuarios(id),
  destinatario_id uuid NOT NULL REFERENCES usuarios(id),
  texto text NOT NULL,
  lida bool DEFAULT false,
  criado_em timestamp DEFAULT now()
);

-- =============================================
-- observacoes_alunos
-- =============================================
CREATE TABLE observacoes_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo varchar(100) NOT NULL,
  conteudo text NOT NULL,
  tipo varchar(20) DEFAULT 'geral' CHECK (tipo IN ('medica', 'nutricional', 'fisica', 'geral', 'objetivo')),
  lida boolean DEFAULT false,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_observacoes_aluno ON observacoes_alunos (aluno_id);
CREATE INDEX idx_observacoes_personal ON observacoes_alunos (personal_id);

-- =============================================
-- pagamentos
-- =============================================
CREATE TABLE pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE,
  valor numeric(10, 2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  descricao text,
  tipo text DEFAULT 'normal',
  referencia_aula_id uuid REFERENCES aulas(id) ON DELETE SET NULL,
  criado_em timestamp DEFAULT now()
);

CREATE INDEX idx_pagamentos_aluno_id ON pagamentos (aluno_id);
CREATE INDEX idx_pagamentos_data_vencimento ON pagamentos (data_vencimento);
CREATE INDEX idx_pagamentos_status ON pagamentos (status);

-- =============================================
-- presencas (legado — hoje só lida em getPresencasAluno; escrita real é em 'aulas')
-- =============================================
CREATE TABLE presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE,
  data date NOT NULL,
  horario time NOT NULL,
  tipo text CHECK (tipo IS NULL OR tipo IN ('personal', 'musculacao')),
  status text DEFAULT 'confirmado',
  observacoes text,
  hora_inicio timestamp,
  hora_fim timestamp,
  duracao_minutos int4,
  criado_em timestamp DEFAULT now()
);

CREATE INDEX idx_presencas_aluno_id ON presencas (aluno_id);
CREATE INDEX idx_presencas_data ON presencas (data);
CREATE INDEX idx_presencas_status ON presencas (status);

-- =============================================
-- treinos
-- =============================================
CREATE TABLE treinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text CHECK (categoria IS NULL OR categoria IN ('hipertrofia', 'emagrecimento')),
  exercicios jsonb NOT NULL DEFAULT '[]',
  criado_em timestamp DEFAULT now()
);

CREATE INDEX idx_treinos_aluno_id ON treinos (aluno_id);
CREATE INDEX idx_treinos_categoria ON treinos (categoria);

-- =============================================
-- modelos_treino (tabela inteira sem .sql em repo — reconstruída do controller)
-- =============================================
CREATE TABLE modelos_treino (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  exercicios jsonb DEFAULT '[]',
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

-- =============================================
-- password_resets
-- =============================================
CREATE TABLE password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  canal text NOT NULL CHECK (canal IN ('email', 'whatsapp')),
  expira_em timestamp NOT NULL,
  usado_em timestamp,
  criado_em timestamp DEFAULT now()
);

CREATE UNIQUE INDEX password_resets_token_hash_idx ON password_resets (token_hash);
CREATE INDEX idx_password_resets_usuario_id ON password_resets (usuario_id);

-- =============================================
-- creditos_movimentos
-- =============================================
CREATE TABLE creditos_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('compra', 'consumo', 'estorno', 'ajuste', 'rollover')),
  saldo_apos integer,
  referencia_aula_id uuid REFERENCES aulas(id) ON DELETE SET NULL,
  referencia_pagamento_id uuid REFERENCES pagamentos(id) ON DELETE SET NULL,
  descricao text,
  criado_em timestamp DEFAULT now()
);

CREATE INDEX idx_creditos_mov_aluno ON creditos_movimentos (aluno_id);
CREATE INDEX idx_creditos_mov_aula ON creditos_movimentos (referencia_aula_id);

-- =============================================
-- views
-- =============================================
CREATE VIEW view_aulas AS
SELECT a.id, a.aluno_id, a.data, a.horario, a.tipo, a.status,
       a.duracao, a.observacoes, a.criado_em, a.atualizado_em,
       u.nome AS aluno_nome, u.telefone AS aluno_telefone
FROM aulas a
JOIN alunos al ON a.aluno_id = al.id
JOIN usuarios u ON al.usuario_id = u.id;
`;
