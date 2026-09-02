import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';

// Popula o banco em memória (pg-mem) com dados fake. Roda uma única vez,
// logo depois do schema ser criado. Os dados resetam a cada restart do
// servidor (é tudo em RAM).

function fmtDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// Monta um timestamp (Date) a partir de um offset de dias (relativo a hoje) e
// um horário 'HH:MM:SS', opcionalmente somando minutos extras (p/ hora_fim).
function tsAt(offsetDays: number, horario: string, addMinutes = 0): Date {
  const [hh, mm, ss] = horario.split(':').map((n) => parseInt(n, 10) || 0);
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hh, mm, ss || 0, 0);
  d.setMinutes(d.getMinutes() + addMinutes);
  return d;
}

interface AlunoSeed {
  nome: string;
  usuario: string;
  telefone: string;
  email: string;
  plano: 'mensal' | 'trimestral' | 'semestral' | 'aula_avulsa';
  status: 'ativo' | 'inativo';
  freq: number;
  objetivo: string;
  valorAula: number;
  valorPlano: number | null;
  creditos: number;
  creditosExtras: number;
  planoRenovadoOffset: number | null;
}

const ALUNOS_SEED: AlunoSeed[] = [
  {
    nome: 'Ana Beatriz Costa', usuario: 'ana.costa', telefone: '(48) 99101-1001', email: 'ana.costa@example.com',
    plano: 'mensal', status: 'ativo', freq: 3, objetivo: 'Hipertrofia',
    // plano_fim cai a 5 dias de hoje de propósito — pra tela de Renovações
    // e o aviso de vencimento em /alunos terem conteúdo pra mostrar na demo.
    valorAula: 80, valorPlano: null, creditos: 5, creditosExtras: 0, planoRenovadoOffset: -25,
  },
  {
    nome: 'Bruno Almeida Santos', usuario: 'bruno.santos', telefone: '(48) 99101-1002', email: 'bruno.santos@example.com',
    plano: 'trimestral', status: 'ativo', freq: 2, objetivo: 'Condicionamento físico',
    // plano_fim já venceu há 2 dias, de propósito — mostra o caso "vencido"
    // na tela de Renovações, além do "vencendo em breve" da Ana.
    valorAula: 75, valorPlano: null, creditos: 10, creditosExtras: 2, planoRenovadoOffset: -92,
  },
  {
    nome: 'Carla Fernandes Lima', usuario: 'carla.lima', telefone: '(48) 99101-1003', email: 'carla.lima@example.com',
    plano: 'semestral', status: 'ativo', freq: 2, objetivo: 'Emagrecimento',
    valorAula: 70, valorPlano: 2200, creditos: 8, creditosExtras: 0, planoRenovadoOffset: -80,
  },
  {
    nome: 'Diego Rodrigues Oliveira', usuario: 'diego.oliveira', telefone: '(48) 99101-1004', email: 'diego.oliveira@example.com',
    plano: 'aula_avulsa', status: 'ativo', freq: 1, objetivo: 'Condicionamento físico',
    valorAula: 90, valorPlano: null, creditos: 2, creditosExtras: 0, planoRenovadoOffset: null,
  },
  {
    nome: 'Fernanda Souza Pereira', usuario: 'fernanda.pereira', telefone: '(48) 99101-1005', email: 'fernanda.pereira@example.com',
    plano: 'mensal', status: 'ativo', freq: 4, objetivo: 'Hipertrofia',
    valorAula: 85, valorPlano: null, creditos: 12, creditosExtras: 3, planoRenovadoOffset: -5,
  },
  {
    nome: 'Gustavo Henrique Martins', usuario: 'gustavo.martins', telefone: '(48) 99101-1006', email: 'gustavo.martins@example.com',
    plano: 'mensal', status: 'inativo', freq: 2, objetivo: 'Emagrecimento',
    valorAula: 70, valorPlano: null, creditos: 0, creditosExtras: 0, planoRenovadoOffset: -60,
  },
  {
    nome: 'Juliana Ribeiro Alves', usuario: 'juliana.alves', telefone: '(48) 99101-1007', email: 'juliana.alves@example.com',
    plano: 'trimestral', status: 'inativo', freq: 2, objetivo: 'Condicionamento físico',
    valorAula: 75, valorPlano: null, creditos: 0, creditosExtras: 0, planoRenovadoOffset: -100,
  },
  {
    nome: 'Rafael Nogueira Costa', usuario: 'rafael.costa', telefone: '(48) 99101-1008', email: 'rafael.costa@example.com',
    plano: 'semestral', status: 'ativo', freq: 3, objetivo: 'Hipertrofia',
    valorAula: 80, valorPlano: null, creditos: 6, creditosExtras: 0, planoRenovadoOffset: -14,
  },
];

const EXERCICIOS_HIPERTROFIA = [
  { nome: 'Supino reto', series: 4, repeticoes: '8-10', carga: '40kg', descanso: '90s' },
  { nome: 'Puxada frente', series: 4, repeticoes: '10-12', carga: '50kg', descanso: '60s' },
  { nome: 'Agachamento livre', series: 4, repeticoes: '8-10', carga: '60kg', descanso: '120s' },
  { nome: 'Desenvolvimento com halteres', series: 3, repeticoes: '10-12', carga: '14kg', descanso: '60s' },
  { nome: 'Rosca direta', series: 3, repeticoes: '12', carga: '20kg', descanso: '45s' },
];

const EXERCICIOS_EMAGRECIMENTO = [
  { nome: 'Esteira (corrida leve)', series: 1, repeticoes: '20min', carga: '-', descanso: '-' },
  { nome: 'Circuito funcional', series: 3, repeticoes: '45s cada estação', carga: 'peso corporal', descanso: '30s' },
  { nome: 'Agachamento com salto', series: 4, repeticoes: '15', carga: 'peso corporal', descanso: '45s' },
  { nome: 'Prancha abdominal', series: 3, repeticoes: '40s', carga: '-', descanso: '30s' },
  { nome: 'Corda naval', series: 4, repeticoes: '30s', carga: '-', descanso: '45s' },
];

const HORARIOS = ['07:00:00', '08:00:00', '09:00:00', '10:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00'];

export async function seedDemoData(pool: Pool): Promise<void> {
  const senhaHash = await bcrypt.hash('demo123', 10);

  // ── Personal (dono do app) ──────────────────────────────────────────────
  const personalResult = await pool.query(
    `INSERT INTO usuarios (perfil, nome, telefone, email, usuario, senha, chave_pix, nome_recebedor, cidade_recebedor)
     VALUES ('personal', $1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      'Lucas Möller', '(48) 99999-0000', 'lucas.moller@example.com', 'demo', senhaHash,
      'lucas.moller@example.com', 'Lucas Möller', 'Florianópolis',
    ]
  );
  const personalId: string = personalResult.rows[0].id;

  // ── Alunos (usuário + registro em alunos) ───────────────────────────────
  const alunoIds: { alunoId: string; usuarioId: string; seed: AlunoSeed }[] = [];

  for (const seed of ALUNOS_SEED) {
    const usuarioResult = await pool.query(
      `INSERT INTO usuarios (perfil, nome, telefone, email, usuario, senha)
       VALUES ('aluno', $1, $2, $3, $4, $5)
       RETURNING id`,
      [seed.nome, seed.telefone, seed.email, seed.usuario, senhaHash]
    );
    const usuarioId: string = usuarioResult.rows[0].id;

    const planoRenovadoEm = seed.planoRenovadoOffset != null ? fmtDate(seed.planoRenovadoOffset) : null;
    const vigenciaFim = seed.planoRenovadoOffset != null ? fmtDate(seed.planoRenovadoOffset + 180) : null;

    const alunoResult = await pool.query(
      `INSERT INTO alunos (usuario_id, plano, status, frequencia_semanal, objetivo, valor_aula, valor_plano, creditos, creditos_extras, creditos_extras_validade, vigencia_fim, plano_renovado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        usuarioId, seed.plano, seed.status, seed.freq, seed.objetivo, seed.valorAula, seed.valorPlano,
        seed.creditos, seed.creditosExtras, seed.creditosExtras > 0 ? fmtDate(30) : null, vigenciaFim, planoRenovadoEm,
      ]
    );
    const alunoId: string = alunoResult.rows[0].id;

    alunoIds.push({ alunoId, usuarioId, seed });
  }

  // ── Treinos (2 por aluno) ────────────────────────────────────────────────
  for (const { alunoId, seed } of alunoIds) {
    const categorias: Array<'hipertrofia' | 'emagrecimento'> = seed.objetivo === 'Emagrecimento'
      ? ['emagrecimento', 'hipertrofia']
      : ['hipertrofia', 'emagrecimento'];

    for (let i = 0; i < 2; i++) {
      const categoria = categorias[i];
      const exercicios = categoria === 'hipertrofia' ? EXERCICIOS_HIPERTROFIA : EXERCICIOS_EMAGRECIMENTO;
      await pool.query(
        `INSERT INTO treinos (aluno_id, nome, categoria, exercicios)
         VALUES ($1, $2, $3, $4)`,
        [
          alunoId,
          categoria === 'hipertrofia' ? `Treino ${i === 0 ? 'A' : 'B'} - Hipertrofia` : `Treino ${i === 0 ? 'A' : 'B'} - Emagrecimento`,
          categoria,
          JSON.stringify(exercicios),
        ]
      );
    }
  }

  // ── Avaliações (1-2 por aluno) ───────────────────────────────────────────
  let idx = 0;
  for (const { alunoId } of alunoIds) {
    const idade = 22 + (idx % 15);
    const sexo = idx % 2 === 0 ? 'feminino' : 'masculino';
    const altura = 1.60 + (idx % 5) * 0.03;
    const pesoInicial = 60 + (idx % 8) * 3;
    const imcInicial = Number((pesoInicial / (altura * altura)).toFixed(2));

    await pool.query(
      `INSERT INTO avaliacoes (aluno_id, data, peso, altura, idade, sexo, imc, gordura_corporal, massa_muscular, protocolo, circunferencias, dobras, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        alunoId, fmtDate(-45), pesoInicial, Number(altura.toFixed(2)), idade, sexo, imcInicial,
        18 + (idx % 10), 30 + (idx % 6), 'Dobras cutâneas (3 pontos)',
        JSON.stringify({ cintura: 78 + idx, quadril: 95 + idx, braco: 30 + (idx % 5) }),
        JSON.stringify({ triceps: 12 + (idx % 6), subescapular: 10 + (idx % 5), suprailiaca: 14 + (idx % 4) }),
        'Avaliação inicial de cadastro.',
      ]
    );

    // segunda avaliação (mais recente) só para metade dos alunos
    if (idx % 2 === 0) {
      const pesoAtual = pesoInicial - 1.5 - (idx % 3);
      const imcAtual = Number((pesoAtual / (altura * altura)).toFixed(2));
      await pool.query(
        `INSERT INTO avaliacoes (aluno_id, data, peso, altura, idade, sexo, imc, gordura_corporal, massa_muscular, protocolo, circunferencias, dobras, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          alunoId, fmtDate(-10), pesoAtual, Number(altura.toFixed(2)), idade, sexo, imcAtual,
          16 + (idx % 8), 31 + (idx % 6), 'Dobras cutâneas (3 pontos)',
          JSON.stringify({ cintura: 76 + idx, quadril: 94 + idx, braco: 31 + (idx % 5) }),
          JSON.stringify({ triceps: 11 + (idx % 6), subescapular: 9 + (idx % 5), suprailiaca: 13 + (idx % 4) }),
          'Reavaliação — evolução dentro do esperado.',
        ]
      );
    }
    idx++;
  }

  // ── Aulas (passado + hoje + futuro) ──────────────────────────────────────
  idx = 0;
  for (const { alunoId, seed } of alunoIds) {
    const horaBase = HORARIOS[idx % HORARIOS.length];
    const horaHoje = HORARIOS[(idx + 2) % HORARIOS.length];
    const horaFutura1 = HORARIOS[(idx + 4) % HORARIOS.length];
    const horaFutura2 = HORARIOS[(idx + 6) % HORARIOS.length];

    // 2 aulas passadas realizadas
    await pool.query(
      `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao, observacoes, usou_credito, hora_inicio, hora_fim)
       VALUES ($1, $2, $3, 'personal', 'realizado', 60, 'Treino executado conforme planejado.', true, $4, $5)`,
      [alunoId, fmtDate(-21), horaBase, tsAt(-21, horaBase), tsAt(-21, horaBase, 60)]
    );
    await pool.query(
      `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao, observacoes, usou_credito, hora_inicio, hora_fim)
       VALUES ($1, $2, $3, 'personal', 'realizado', 60, 'Boa evolução de carga.', true, $4, $5)`,
      [alunoId, fmtDate(-14), horaBase, tsAt(-14, horaBase), tsAt(-14, horaBase, 60)]
    );

    // 1 aula passada com falta (metade dos alunos)
    if (idx % 2 === 0) {
      await pool.query(
        `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao, cobrar_falta, data_hora_falta, usou_credito)
         VALUES ($1, $2, $3, 'personal', 'faltou', 60, true, $4, true)`,
        [alunoId, fmtDate(-9), horaBase, tsAt(-9, horaBase)]
      );
    }

    // 1 aula passada cancelada (a outra metade)
    if (idx % 2 === 1) {
      const canceladoPor = idx % 4 === 1 ? 'aluno' : 'personal';
      await pool.query(
        `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao, cancelado_por, cobrar_falta, data_hora_cancelamento)
         VALUES ($1, $2, $3, 'personal', 'cancelado', 60, $4, $5, $6)`,
        [alunoId, fmtDate(-6), horaBase, canceladoPor, canceladoPor === 'aluno', tsAt(-6, horaBase)]
      );
    }

    // 1 aula HOJE (agenda do dia) para os primeiros alunos
    if (idx < 5) {
      await pool.query(
        `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao)
         VALUES ($1, $2, $3, 'personal', $4, 60)`,
        [alunoId, fmtDate(0), horaHoje, idx % 2 === 0 ? 'confirmado' : 'aguardando']
      );
    }

    // 2 aulas futuras
    await pool.query(
      `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao)
       VALUES ($1, $2, $3, 'personal', 'confirmado', 60)`,
      [alunoId, fmtDate(4), horaFutura1]
    );
    await pool.query(
      `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao)
       VALUES ($1, $2, $3, 'personal', 'aguardando', 60)`,
      [alunoId, fmtDate(9), horaFutura2]
    );

    // 1 avaliação futura agendada, só para os 3 primeiros alunos
    if (idx < 3) {
      await pool.query(
        `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao)
         VALUES ($1, $2, $3, 'avaliacao', 'aguardando', 45)`,
        [alunoId, fmtDate(12 + idx), '11:00:00']
      );
    }

    // Registros legados em `presencas` (hoje só lidos por getPresencasAluno,
    // nunca escritos pelo fluxo atual — mantidos por fidelidade ao schema).
    if (idx % 2 === 0) {
      await pool.query(
        `INSERT INTO presencas (aluno_id, data, horario, tipo, status)
         VALUES ($1, $2, $3, 'personal', 'confirmado')`,
        [alunoId, fmtDate(-21), horaBase]
      );
      await pool.query(
        `INSERT INTO presencas (aluno_id, data, horario, tipo, status)
         VALUES ($1, $2, $3, 'personal', 'confirmado')`,
        [alunoId, fmtDate(-14), horaBase]
      );
    }

    idx++;
  }

  // ── Pagamentos ────────────────────────────────────────────────────────────
  idx = 0;
  for (const { alunoId, seed } of alunoIds) {
    const valorCiclo = seed.valorPlano ?? seed.valorAula * (seed.freq * 4);

    // pago (já quitado)
    await pool.query(
      `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, data_pagamento, status, descricao, tipo)
       VALUES ($1, $2, $3, $4, 'pago', $5, 'normal')`,
      [alunoId, valorCiclo, fmtDate(-20), fmtDate(-19), `Cobrança de plano — ${seed.plano}`]
    );

    // pendente (a vencer)
    await pool.query(
      `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, status, descricao, tipo)
       VALUES ($1, $2, $3, 'pendente', $4, 'normal')`,
      [alunoId, seed.valorAula, fmtDate(6), 'Cobrança de aula avulsa']
    );

    // vencido (metade dos alunos)
    if (idx % 2 === 0) {
      await pool.query(
        `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, status, descricao, tipo)
         VALUES ($1, $2, $3, 'vencido', $4, 'normal')`,
        [alunoId, seed.valorAula, fmtDate(-4), 'Cancelamento tardio']
      );
    }
    idx++;
  }

  // ── Mensagens (personal <-> cada aluno) ─────────────────────────────────
  idx = 0;
  for (const { usuarioId, seed } of alunoIds) {
    await pool.query(
      `INSERT INTO mensagens (remetente_id, destinatario_id, texto, lida) VALUES ($1, $2, $3, true)`,
      [personalId, usuarioId, `Oi ${seed.nome.split(' ')[0]}! Tudo certo para o treino desta semana?`]
    );
    await pool.query(
      `INSERT INTO mensagens (remetente_id, destinatario_id, texto, lida) VALUES ($1, $2, $3, $4)`,
      [usuarioId, personalId, 'Tudo certo, professor! Nos vemos no horário combinado.', idx % 3 !== 0]
    );
    if (idx % 3 === 0) {
      await pool.query(
        `INSERT INTO mensagens (remetente_id, destinatario_id, texto, lida) VALUES ($1, $2, $3, false)`,
        [usuarioId, personalId, 'Consigo remarcar para mais cedo essa semana?']
      );
    }
    idx++;
  }

  // ── Observações ───────────────────────────────────────────────────────────
  idx = 0;
  const tipos = ['medica', 'nutricional', 'fisica', 'geral', 'objetivo'];
  for (const { alunoId, seed } of alunoIds) {
    await pool.query(
      `INSERT INTO observacoes_alunos (aluno_id, personal_id, titulo, conteudo, tipo, lida)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        alunoId, personalId, 'Observação inicial',
        `Aluno(a) iniciou com foco em ${seed.objetivo.toLowerCase()}. Sem restrições relatadas.`,
        tipos[idx % tipos.length], idx % 2 === 0,
      ]
    );
    idx++;
  }

  // ── Modelos de treino (do personal) ─────────────────────────────────────
  await pool.query(
    `INSERT INTO modelos_treino (personal_id, nome, categoria, exercicios) VALUES ($1, $2, $3, $4)`,
    [personalId, 'Hipertrofia — Push/Pull/Legs (A)', 'hipertrofia', JSON.stringify(EXERCICIOS_HIPERTROFIA)]
  );
  await pool.query(
    `INSERT INTO modelos_treino (personal_id, nome, categoria, exercicios) VALUES ($1, $2, $3, $4)`,
    [personalId, 'Emagrecimento — Circuito Metabólico', 'emagrecimento', JSON.stringify(EXERCICIOS_EMAGRECIMENTO)]
  );
  await pool.query(
    `INSERT INTO modelos_treino (personal_id, nome, categoria, exercicios) VALUES ($1, $2, $3, $4)`,
    [personalId, 'Iniciante — Adaptação (4 semanas)', 'hipertrofia', JSON.stringify(EXERCICIOS_HIPERTROFIA.slice(0, 3))]
  );

  console.log(`🎭 Seed demo: ${alunoIds.length} alunos, 1 personal, dados de treinos/aulas/pagamentos/mensagens/observações criados.`);
}
