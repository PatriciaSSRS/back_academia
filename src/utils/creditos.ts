import pool from '../config/database';

// =============================================
// Motor de CRÉDITOS (estilo Hubiq)
// Planos geram créditos por ciclo; consumo ao agendar; estorno no cancelamento;
// recarga manual ou via pagamento (renovação) com rollover da sobra.
// Não usa transação explícita (app de uso individual, baixa concorrência),
// seguindo o padrão do restante do backend.
// =============================================

// Semanas por ciclo de cada plano (aula_avulsa não tem ciclo)
export const CICLO_SEMANAS: Record<string, number> = { mensal: 4, trimestral: 12, semestral: 24 };
// Duração (dias) da vigência de cada plano
export const PLANO_DIAS: Record<string, number> = { mensal: 30, trimestral: 90, semestral: 180 };
// Validade (dias) da sobra que rola para o próximo ciclo
export const ROLLOVER_DIAS = 30;

export function cicloCreditos(plano: string, freq: number): number {
  const semanas = CICLO_SEMANAS[plano];
  if (!semanas) return 0; // aula_avulsa / desconhecido
  return semanas * (freq || 0);
}

// Valor total do ciclo: usa valor_plano (custom, p/ promoções) se definido,
// senão valor_aula × créditos do ciclo. aula_avulsa = valor por aula.
export function valorCiclo(plano: string, freq: number, valorAula: any, valorPlano?: any): number {
  if (valorPlano != null && Number(valorPlano) > 0) return Number(valorPlano);
  const creditos = cicloCreditos(plano, freq);
  const va = Number(valorAula) || 0;
  return creditos <= 0 ? va : va * creditos;
}

function hojeStr(): string {
  return new Date().toISOString().split('T')[0];
}

function addDiasStr(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

interface CreditoRow {
  creditos?: number;
  creditos_extras?: number;
  creditos_extras_validade?: any;
}

// Saldo disponível = extras válidos (não vencidos) + créditos do ciclo
export function saldoDisponivel(row: CreditoRow): number {
  const creditos = row.creditos || 0;
  const extras = row.creditos_extras || 0;
  const validade = row.creditos_extras_validade ? String(row.creditos_extras_validade).substring(0, 10) : null;
  const extrasOk = extras > 0 && (!validade || validade >= hojeStr());
  return (extrasOk ? extras : 0) + creditos;
}

export async function getSaldo(alunoId: string): Promise<number> {
  const r = await pool.query(
    'SELECT creditos, creditos_extras, creditos_extras_validade FROM alunos WHERE id = $1',
    [alunoId]
  );
  if (r.rows.length === 0) return 0;
  return saldoDisponivel(r.rows[0]);
}

async function registrarMovimento(
  alunoId: string,
  quantidade: number,
  tipo: 'compra' | 'consumo' | 'estorno' | 'ajuste' | 'rollover',
  saldoApos: number,
  opts: { aulaId?: string; pagamentoId?: string; descricao?: string } = {}
) {
  try {
    await pool.query(
      `INSERT INTO creditos_movimentos
         (aluno_id, quantidade, tipo, saldo_apos, referencia_aula_id, referencia_pagamento_id, descricao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [alunoId, quantidade, tipo, saldoApos, opts.aulaId || null, opts.pagamentoId || null, opts.descricao || null]
    );
  } catch (e: any) {
    // Não deixa o histórico quebrar a operação principal
    console.error('⚠️ Erro ao registrar movimento de crédito:', e?.message);
  }
}

// Consome 1 crédito (extras válidos primeiro). Retorna true se consumiu.
export async function consumirCredito(alunoId: string, opts: { aulaId?: string } = {}): Promise<boolean> {
  const r = await pool.query(
    'SELECT creditos, creditos_extras, creditos_extras_validade FROM alunos WHERE id = $1',
    [alunoId]
  );
  if (r.rows.length === 0) return false;
  const row = r.rows[0];
  const validade = row.creditos_extras_validade ? String(row.creditos_extras_validade).substring(0, 10) : null;
  const extrasOk = (row.creditos_extras || 0) > 0 && (!validade || validade >= hojeStr());

  if (extrasOk) {
    await pool.query('UPDATE alunos SET creditos_extras = creditos_extras - 1 WHERE id = $1', [alunoId]);
  } else if ((row.creditos || 0) > 0) {
    await pool.query('UPDATE alunos SET creditos = creditos - 1 WHERE id = $1', [alunoId]);
  } else {
    return false;
  }

  const saldo = await getSaldo(alunoId);
  await registrarMovimento(alunoId, -1, 'consumo', saldo, { aulaId: opts.aulaId, descricao: 'Consumo (agendamento)' });
  return true;
}

// Devolve 1 crédito (ao cancelar uma aula que havia consumido crédito).
export async function estornarCredito(alunoId: string, opts: { aulaId?: string } = {}): Promise<number> {
  await pool.query('UPDATE alunos SET creditos = creditos + 1 WHERE id = $1', [alunoId]);
  const saldo = await getSaldo(alunoId);
  await registrarMovimento(alunoId, 1, 'estorno', saldo, { aulaId: opts.aulaId, descricao: 'Estorno (cancelamento)' });
  return saldo;
}

// Recarga manual: adiciona (ou remove, se negativo) créditos ao ciclo atual.
export async function ajustarCreditos(alunoId: string, quantidade: number, descricao?: string): Promise<number> {
  await pool.query('UPDATE alunos SET creditos = GREATEST(0, creditos + $2) WHERE id = $1', [alunoId, quantidade]);
  const saldo = await getSaldo(alunoId);
  await registrarMovimento(
    alunoId,
    quantidade,
    quantidade >= 0 ? 'compra' : 'ajuste',
    saldo,
    { descricao: descricao || 'Recarga manual' }
  );
  return saldo;
}

// Renovação/compra de plano: a sobra do ciclo atual vira "extra" válida por
// exatamente 1 ciclo (expira no fim do próximo ciclo) e o ciclo é reabastecido
// conforme o plano/frequência do aluno.
export async function concederCiclo(alunoId: string, pagamentoId?: string): Promise<number> {
  const r = await pool.query(
    'SELECT plano, frequencia_semanal, creditos FROM alunos WHERE id = $1',
    [alunoId]
  );
  if (r.rows.length === 0) return 0;
  const { plano, frequencia_semanal, creditos } = r.rows[0];
  const novos = cicloCreditos(plano, frequencia_semanal || 0);

  if (novos <= 0) {
    // avulso / sem ciclo: cada renovação adiciona 1 crédito
    return ajustarCreditos(alunoId, 1, 'Compra de aula avulsa');
  }

  await pool.query(
    `UPDATE alunos
       SET creditos_extras = $2,
           creditos_extras_validade = $3,
           creditos = $4,
           vigencia_fim = $5,
           plano_renovado_em = CURRENT_DATE
     WHERE id = $1`,
    [alunoId, creditos || 0, addDiasStr(PLANO_DIAS[plano] || 30), novos, addDiasStr(PLANO_DIAS[plano] || 30)]
  );

  const saldo = await getSaldo(alunoId);
  await registrarMovimento(alunoId, novos, 'compra', saldo, { pagamentoId, descricao: 'Renovação de plano' });
  return saldo;
}
