import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { saldoDisponivel, ajustarCreditos, valorCiclo } from '../utils/creditos';

// Calcula período do plano baseado no tipo
function getPeriodoBounds(plano: string): { inicio: string; fim: string } {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth(); // 0-indexed

  if (plano === 'mensal') {
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0);
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0],
    };
  } else if (plano === 'trimestral') {
    const trimestre = Math.floor(mes / 3);
    const inicio = new Date(ano, trimestre * 3, 1);
    const fim = new Date(ano, trimestre * 3 + 3, 0);
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0],
    };
  } else if (plano === 'semestral') {
    const semestre = mes < 6 ? 0 : 1;
    const inicio = new Date(ano, semestre * 6, 1);
    const fim = new Date(ano, semestre * 6 + 6, 0);
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0],
    };
  }
  // aula_avulsa ou padrão: mês atual
  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 0);
  return {
    inicio: inicio.toISOString().split('T')[0],
    fim: fim.toISOString().split('T')[0],
  };
}

// pg-mem tem um bug de inferência de tipos ao comparar o resultado de
// "date - date" com BETWEEN/</>= (erro "cannot cast type integer to
// interval"), mesmo essa subtração retornando o integer correto quando usada
// sem comparação. Por isso calculamos "aviso_vencimento" em JS a partir do
// dado bruto de dias (sem BETWEEN na query).
export async function getAlunos(req: AuthRequest, res: Response) {
  try {
    const avisoVencimentoSql = `((COALESCE(a.plano_renovado_em, pa.data)::date + CASE a.plano
              WHEN 'mensal'      THEN 30
              WHEN 'trimestral'  THEN 90
              WHEN 'semestral'   THEN 180
              WHEN 'anual'       THEN 365
              ELSE 0
            END) - CURRENT_DATE)`;

    const result = await pool.query(`
      WITH primeira_aula AS (
        SELECT aluno_id, MIN(data) AS data
        FROM aulas
        WHERE is_reposicao = false
          AND (is_avulsa_extra IS NULL OR is_avulsa_extra = false)
          AND (status != 'cancelado' OR cancelado_por = 'personal' OR cobrar_falta = true)
        GROUP BY aluno_id
      )
      SELECT
        a.id,
        a.usuario_id,
        a.plano,
        a.status,
        a.objetivo,
        a.frequencia_semanal,
        a.criado_em,
        a.valor_aula,
        a.valor_plano,
        a.creditos,
        a.creditos_extras,
        a.creditos_extras_validade,
        a.vigencia_fim,
        u.nome,
        u.telefone,
        u.usuario,
        CASE
          WHEN a.plano NOT IN ('aula_avulsa') AND COALESCE(a.plano_renovado_em, pa.data) IS NOT NULL THEN
            (COALESCE(a.plano_renovado_em, pa.data)::date + CASE a.plano
              WHEN 'mensal'      THEN 30
              WHEN 'trimestral'  THEN 90
              WHEN 'semestral'   THEN 180
              WHEN 'anual'       THEN 365
              ELSE 0
            END)
          ELSE NULL
        END AS plano_fim,
        CASE
          WHEN a.plano NOT IN ('aula_avulsa') AND COALESCE(a.plano_renovado_em, pa.data) IS NOT NULL THEN
            ${avisoVencimentoSql}
          ELSE NULL
        END AS aviso_vencimento
      FROM alunos a
      INNER JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN primeira_aula pa ON pa.aluno_id = a.id
      ORDER BY u.nome
    `);

    const rows = result.rows.map((row: any) => ({
      ...row,
      aviso_vencimento: typeof row.aviso_vencimento === 'number'
        ? row.aviso_vencimento >= 0 && row.aviso_vencimento <= 7
        : false,
    }));

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
}

export async function getAluno(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        a.*,
        u.nome,
        u.telefone,
        u.usuario
      FROM alunos a
      INNER JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Aluno não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar aluno:', error);
    res.status(500).json({ error: 'Erro ao buscar aluno' });
  }
}

export async function createAluno(req: AuthRequest, res: Response) {
  try {
    const { usuario_id, plano, status, frequencia_semanal, objetivo, valor_aula, valor_plano } = req.body;

    if (!usuario_id || !plano) {
      throw new AppError('usuario_id e plano são obrigatórios', 400);
    }

    const result = await pool.query(
      `INSERT INTO alunos (usuario_id, plano, status, frequencia_semanal, objetivo, valor_aula, valor_plano)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [usuario_id, plano, status || 'ativo', frequencia_semanal || 2, objetivo, valor_aula ?? null, valor_plano ?? null]
    );

    const aluno = result.rows[0];

    // Cadastro não gera mais cobrança automática. O plano é só rótulo; os
    // créditos entram por cobrança manual (nº de aulas) ou recarga.
    res.status(201).json(aluno);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar aluno:', error);
    res.status(500).json({ error: 'Erro ao criar aluno' });
  }
}

export async function updateAluno(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { plano, status, frequencia_semanal, objetivo, valor_aula, valor_plano } = req.body;

    const result = await pool.query(
      `UPDATE alunos
       SET plano = COALESCE($1, plano),
           status = COALESCE($2, status),
           frequencia_semanal = COALESCE($3, frequencia_semanal),
           objetivo = COALESCE($4, objetivo),
           valor_aula = COALESCE($5, valor_aula),
           valor_plano = COALESCE($6, valor_plano)
       WHERE id = $7
       RETURNING *`,
      [plano, status, frequencia_semanal, objetivo, valor_aula, valor_plano, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Aluno não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar aluno:', error);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
}

export async function deleteAluno(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM alunos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Aluno não encontrado', 404);
    }

    res.json({ message: 'Aluno deletado com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar aluno:', error);
    res.status(500).json({ error: 'Erro ao deletar aluno' });
  }
}

export async function getPresencasAluno(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT COUNT(*) as total
       FROM presencas
       WHERE aluno_id = $1 AND status = 'confirmado'`,
      [id]
    );

    res.json({ presencas: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Erro ao buscar presenças do aluno:', error);
    res.status(500).json({ error: 'Erro ao buscar presenças' });
  }
}

export async function getProgressoAulas(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const alunoResult = await pool.query(
      `SELECT a.plano, a.frequencia_semanal, a.criado_em, a.plano_renovado_em, u.nome
       FROM alunos a
       INNER JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (alunoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const aluno = alunoResult.rows[0];
    const freq = aluno.frequencia_semanal || 2;

    // Data de referência: query param ?data= ou hoje
    const dataRefStr: string = req.query.data
      ? (req.query.data as string)
      : new Date().toISOString().split('T')[0];

    // plano_renovado_em: se renovado, só contam aulas a partir da renovação
    const renovadoEm: string | null = aluno.plano_renovado_em
      ? String(aluno.plano_renovado_em).substring(0, 10)
      : null;

    // ─── SEMANAS FLUTUANTES ────────────────────────────────────────────────
    // Cada semana começa na data da primeira aula daquele grupo e dura 7 dias.
    // A próxima semana começa na primeira aula marcada FORA dessa janela.
    // Após renovação, só contam aulas a partir de plano_renovado_em.
    // ───────────────────────────────────────────────────────────────────────

    // Buscar todas as aulas que consomem cota (pendentes + realizadas + canceladas com consumo)
    const quotaClassesResult = await pool.query(
      `SELECT data, status, cancelado_por, cobrar_falta
       FROM aulas
       WHERE aluno_id = $1
       AND is_reposicao = false
       AND (is_avulsa_extra IS NULL OR is_avulsa_extra = false)
       AND (
         status != 'cancelado'
         OR cancelado_por = 'personal'
         OR cobrar_falta = true
       )
       ${renovadoEm ? 'AND data >= $2' : ''}
       ORDER BY data ASC`,
      renovadoEm ? [id, renovadoEm] : [id]
    );

    // Agrupar em semanas flutuantes (greedy)
    interface WeekInfo { start: string; end: string; feitas: number; agendadas: number; }
    const weeks: WeekInfo[] = [];

    for (const row of quotaClassesResult.rows) {
      const isConsumo = row.status === 'realizado'
        || (row.status === 'faltou' && row.cobrar_falta)
        || (row.status === 'cancelado' && (row.cobrar_falta || row.cancelado_por === 'personal'));
      const isPendente = ['aguardando', 'confirmado', 'aprovado', 'em_andamento'].includes(row.status);

      const lastWeek = weeks[weeks.length - 1];
      if (lastWeek && row.data <= lastWeek.end) {
        if (isConsumo) lastWeek.feitas++;
        if (isPendente) lastWeek.agendadas++;
      } else {
        const endDate = new Date(row.data + 'T00:00:00');
        endDate.setDate(endDate.getDate() + 6);
        weeks.push({
          start: row.data,
          end: endDate.toISOString().split('T')[0],
          feitas: isConsumo ? 1 : 0,
          agendadas: isPendente ? 1 : 0,
        });
      }
    }

    // Encontrar semana da data de referência
    const currentWeek = weeks.find(w => dataRefStr >= w.start && dataRefStr <= w.end);
    const weekIndex = weeks.findIndex(w => dataRefStr >= w.start && dataRefStr <= w.end);

    const aulasFeitas = currentWeek?.feitas ?? 0;
    const agendadas = currentWeek?.agendadas ?? 0;
    const semanaAtual = weekIndex >= 0 ? weekIndex + 1 : weeks.length + 1;

    // ─── VENCIMENTO DO PLANO ──────────────────────────────────────────────────
    const PLANO_DURACAO: Record<string, number> = {
      mensal: 30, trimestral: 90, semestral: 180, anual: 365,
    };
    const duracaoPlano = PLANO_DURACAO[aluno.plano];
    const primeiraAulaGlobal = weeks.length > 0 ? weeks[0].start : null;
    let planoInicio: string | null = null;
    let planoFim: string | null = null;
    let diasRestantesPlano: number | null = null;
    let avisoVencimento = false;

    if (duracaoPlano && primeiraAulaGlobal) {
      planoInicio = primeiraAulaGlobal;
      const fimDate = new Date(primeiraAulaGlobal + 'T00:00:00');
      fimDate.setDate(fimDate.getDate() + duracaoPlano);
      planoFim = fimDate.toISOString().split('T')[0];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      diasRestantesPlano = Math.ceil((fimDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      avisoVencimento = diasRestantesPlano >= 0 && diasRestantesPlano <= 7;
    }
    // ─────────────────────────────────────────────────────────────────────────

    let inicio: string;
    let fim: string;
    if (currentWeek) {
      inicio = currentWeek.start;
      fim = currentWeek.end;
    } else {
      // Fora de qualquer semana existente: nova semana começaria aqui
      inicio = dataRefStr;
      const fimDate = new Date(dataRefStr + 'T00:00:00');
      fimDate.setDate(fimDate.getDate() + 6);
      fim = fimDate.toISOString().split('T')[0];
    }

    // Reposições feitas nesta semana
    const reposicoesFeitas = await pool.query(
      `SELECT COUNT(*) as total FROM aulas
       WHERE aluno_id = $1 AND data >= $2 AND data <= $3
       AND is_reposicao = true AND status = 'realizado'`,
      [id, inicio, fim]
    );

    // Reposições agendadas nesta semana
    const reposicoesAgendadas = await pool.query(
      `SELECT COUNT(*) as total FROM aulas
       WHERE aluno_id = $1 AND data >= $2 AND data <= $3
       AND is_reposicao = true
       AND status IN ('aguardando', 'confirmado', 'aprovado', 'em_andamento')`,
      [id, inicio, fim]
    );

    const reposicoesFestasSemana = parseInt(reposicoesFeitas.rows[0].total);
    const reposicoesAgendadasSemana = parseInt(reposicoesAgendadas.rows[0].total);

    // Reposições devidas: cancelamentos pelo personal
    const reposicoesDevidasResult = await pool.query(
      `SELECT COUNT(*) as total FROM aulas
       WHERE aluno_id = $1 AND cancelado_por = 'personal' AND status = 'cancelado'`,
      [id]
    );
    const reposicoesDevidas = parseInt(reposicoesDevidasResult.rows[0].total);

    // Reposições usadas (inclusive faltadas — o aluno perde a reposição)
    const reposicoesUsadasResult = await pool.query(
      `SELECT COUNT(*) as total FROM aulas
       WHERE aluno_id = $1 AND is_reposicao = true
       AND status IN ('aguardando', 'confirmado', 'aprovado', 'em_andamento', 'realizado', 'faltou')`,
      [id]
    );
    const reposicoesUsadas = parseInt(reposicoesUsadasResult.rows[0].total);
    const reposicoesPendentes = Math.max(0, reposicoesDevidas - reposicoesUsadas);

    const totalEsperado = freq;
    const restantes = Math.max(0, totalEsperado - aulasFeitas - agendadas);

    // ─── CRÉDITOS ───────────────────────────────────────────────────────────
    const credRes = await pool.query(
      'SELECT creditos, creditos_extras, creditos_extras_validade, vigencia_fim FROM alunos WHERE id = $1',
      [id]
    );
    const credRow = credRes.rows[0] || {};
    const saldoCreditos = saldoDisponivel(credRow);

    res.json({
      aluno_id: id,
      nome: aluno.nome,
      plano: aluno.plano,
      periodo: { inicio, fim },
      numero_semana: semanaAtual,
      frequencia_semanal: freq,
      total_esperado: totalEsperado,
      aulas_feitas: aulasFeitas,
      aulas_agendadas: agendadas,
      aulas_restantes: restantes,
      reposicoes_pendentes: reposicoesPendentes,
      reposicoes_agendadas: reposicoesAgendadasSemana,
      reposicoes_feitas_semana: reposicoesFestasSemana,
      percentual: totalEsperado > 0 ? Math.round((aulasFeitas / totalEsperado) * 100) : 0,
      plano_inicio: planoInicio,
      plano_fim: planoFim,
      dias_restantes_plano: diasRestantesPlano,
      aviso_vencimento: avisoVencimento,
      // Saldo de créditos (novo modelo)
      creditos_restantes: saldoCreditos,
      creditos_ciclo: credRow.creditos || 0,
      creditos_extras: credRow.creditos_extras || 0,
      creditos_extras_validade: credRow.creditos_extras_validade || null,
      vigencia_fim: credRow.vigencia_fim || null,
    });
  } catch (error: any) {
    console.error('Erro ao buscar progresso de aulas:', error?.message);
    res.status(500).json({ error: 'Erro ao buscar progresso de aulas' });
  }
}

// Recarga manual de créditos (o personal adiciona/ajusta o saldo do aluno)
export async function recarregarCreditos(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { quantidade, descricao } = req.body;
    const q = parseInt(quantidade, 10);
    if (!Number.isFinite(q) || q === 0) {
      throw new AppError('quantidade inválida', 400);
    }
    const saldo = await ajustarCreditos(id, q, descricao || 'Recarga manual');
    res.json({ aluno_id: id, saldo_creditos: saldo });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao recarregar créditos:', error);
    res.status(500).json({ error: 'Erro ao recarregar créditos' });
  }
}
