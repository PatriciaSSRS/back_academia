import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

export async function getObservacoes(req: AuthRequest, res: Response) {
  try {
    const { aluno_id } = req.query;

    let query = `
      SELECT 
        o.*,
        u.nome as personal_nome,
        a.usuario_id
      FROM observacoes_alunos o
      INNER JOIN usuarios u ON o.personal_id = u.id
      INNER JOIN alunos a ON o.aluno_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (aluno_id) {
      params.push(aluno_id);
      query += ` AND o.aluno_id = $${params.length}`;
    }

    query += ` ORDER BY o.criado_em DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar observações:', error);
    res.status(500).json({ error: 'Erro ao buscar observações' });
  }
}

export async function getObservacao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*, u.nome as personal_nome
       FROM observacoes_alunos o
       INNER JOIN usuarios u ON o.personal_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Observação não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar observação:', error);
    res.status(500).json({ error: 'Erro ao buscar observação' });
  }
}

export async function createObservacao(req: AuthRequest, res: Response) {
  try {
    const personalId = req.user?.userId;
    const { aluno_id, titulo, conteudo, tipo } = req.body;

    if (!personalId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!aluno_id || !titulo || !conteudo) {
      throw new AppError('aluno_id, titulo e conteudo são obrigatórios', 400);
    }

    const result = await pool.query(
      `INSERT INTO observacoes_alunos (aluno_id, personal_id, titulo, conteudo, tipo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [aluno_id, personalId, titulo, conteudo, tipo || 'geral']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar observação:', error);
    res.status(500).json({ error: 'Erro ao criar observação' });
  }
}

export async function updateObservacao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { titulo, conteudo, tipo } = req.body;

    const result = await pool.query(
      `UPDATE observacoes_alunos 
       SET titulo = COALESCE($1, titulo),
           conteudo = COALESCE($2, conteudo),
           tipo = COALESCE($3, tipo),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [titulo, conteudo, tipo, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Observação não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar observação:', error);
    res.status(500).json({ error: 'Erro ao atualizar observação' });
  }
}

export async function deleteObservacao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM observacoes_alunos WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Observação não encontrada', 404);
    }

    res.json({ message: 'Observação deletada com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar observação:', error);
    res.status(500).json({ error: 'Erro ao deletar observação' });
  }
}
