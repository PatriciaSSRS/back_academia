import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { ajustarCreditos } from '../utils/creditos';

export async function getPagamentos(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, status } = req.query;

    let query = `
      SELECT 
        p.*,
        a.usuario_id,
        u.nome as aluno_nome
      FROM pagamentos p
      INNER JOIN alunos a ON p.aluno_id = a.id
      INNER JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (aluno_id) {
      query += ` AND p.aluno_id = $${paramIndex}`;
      params.push(aluno_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY p.data_vencimento DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
}

export async function getPagamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM pagamentos WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar pagamento:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamento' });
  }
}

export async function createPagamento(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, valor, data_vencimento, status, descricao, tipo, quantidade_aulas } = req.body;

    if (!aluno_id || !valor) {
      throw new AppError('aluno_id e valor são obrigatórios', 400);
    }

    // Vencimento não é mais exigido no fluxo manual — usa hoje como referência.
    const venc = data_vencimento || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, status, descricao, tipo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [aluno_id, valor, venc, status || 'pendente', descricao || null, tipo || 'normal']
    );

    const pagamento = result.rows[0];

    // Regra nova: a cobrança já concede os créditos ao aluno (nº de aulas),
    // independentemente do pagamento. "Pago/Pendente" é só controle financeiro.
    const qtd = Math.trunc(Number(quantidade_aulas) || 0);
    if (qtd > 0) {
      await ajustarCreditos(aluno_id, qtd, descricao || `Cobrança de ${qtd} aula(s)`);
    }

    res.status(201).json(pagamento);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
}

export async function pagarPagamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { data_pagamento } = req.body;

    const dataPago = data_pagamento || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `UPDATE pagamentos 
       SET status = 'pago',
           data_pagamento = $1
       WHERE id = $2
       RETURNING *`,
      [dataPago, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    const pagamento = result.rows[0];

    // "Marcar como pago" agora é só controle financeiro — os créditos já foram
    // concedidos na criação da cobrança. Não gera renovação nem novo ciclo.
    res.json(pagamento);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao marcar pagamento como pago:', error);
    res.status(500).json({ error: 'Erro ao marcar pagamento como pago' });
  }
}

// pg-mem tem um bug de inferência de tipos ao comparar "date - date" com
// <=/BETWEEN ("cannot cast type integer to interval"), embora a subtração
// funcione normalmente sem comparação. Por isso removemos esse filtro do
// WHERE e filtramos em JS usando a coluna dias_restantes (calculada sem
// comparação, então funciona). pg-mem também não suporta subquery
// correlacionada (EXISTS referenciando a query externa), então
// "renovacao_pendente" também é calculado em JS, numa segunda query.

// Lista alunos com planos vencendo ou vencidos (para tela de Renovações)
export async function getRenovacoes(req: AuthRequest, res: Response) {
  try {
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
        a.frequencia_semanal,
        a.valor_aula,
        a.plano_renovado_em,
        u.nome,
        u.telefone,
        COALESCE(a.plano_renovado_em, pa.data) AS plano_inicio_efetivo,
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
            (COALESCE(a.plano_renovado_em, pa.data)::date + CASE a.plano
              WHEN 'mensal'      THEN 30
              WHEN 'trimestral'  THEN 90
              WHEN 'semestral'   THEN 180
              WHEN 'anual'       THEN 365
              ELSE 0
            END) - CURRENT_DATE
          ELSE NULL
        END AS dias_restantes
      FROM alunos a
      INNER JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN primeira_aula pa ON pa.aluno_id = a.id
      WHERE a.plano NOT IN ('aula_avulsa')
        AND a.status = 'ativo'
        AND COALESCE(a.plano_renovado_em, pa.data) IS NOT NULL
      ORDER BY plano_fim ASC
    `);

    const pendentes = await pool.query(
      `SELECT DISTINCT aluno_id FROM pagamentos WHERE tipo = 'renovacao' AND status = 'pendente'`
    );
    const alunoIdsComRenovacaoPendente = new Set(pendentes.rows.map((r: any) => r.aluno_id));
    const rows = result.rows
      .filter((row: any) => typeof row.dias_restantes === 'number' && row.dias_restantes <= 7)
      .map((row: any) => ({ ...row, renovacao_pendente: alunoIdsComRenovacaoPendente.has(row.id) }));

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar renovações:', error);
    res.status(500).json({ error: 'Erro ao buscar renovações' });
  }
}

export async function deletePagamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM pagamentos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    res.json({ message: 'Pagamento deletado com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar pagamento:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento' });
  }
}
