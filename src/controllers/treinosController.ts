import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

export async function getTreinos(req: AuthRequest, res: Response) {
  try {
    const { aluno_id } = req.query;

    let query = `
      SELECT 
        t.*,
        a.usuario_id,
        u.nome as aluno_nome
      FROM treinos t
      INNER JOIN alunos a ON t.aluno_id = a.id
      INNER JOIN usuarios u ON a.usuario_id = u.id
    `;

    const params: any[] = [];

    if (aluno_id) {
      query += ' WHERE t.aluno_id = $1';
      params.push(aluno_id);
    }

    query += ' ORDER BY t.criado_em DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar treinos:', error);
    res.status(500).json({ error: 'Erro ao buscar treinos' });
  }
}

export async function getTreino(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM treinos WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Treino não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar treino:', error);
    res.status(500).json({ error: 'Erro ao buscar treino' });
  }
}

export async function createTreino(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, nome, categoria, exercicios } = req.body;

    if (!aluno_id || !nome || !categoria) {
      throw new AppError('aluno_id, nome e categoria são obrigatórios', 400);
    }

    const result = await pool.query(
      `INSERT INTO treinos (aluno_id, nome, categoria, exercicios)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [aluno_id, nome, categoria, JSON.stringify(exercicios || [])]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar treino:', error);
    res.status(500).json({ error: 'Erro ao criar treino' });
  }
}

export async function updateTreino(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nome, categoria, exercicios } = req.body;

    const result = await pool.query(
      `UPDATE treinos 
       SET nome = COALESCE($1, nome),
           categoria = COALESCE($2, categoria),
           exercicios = COALESCE($3, exercicios)
       WHERE id = $4
       RETURNING *`,
      [nome, categoria, exercicios ? JSON.stringify(exercicios) : null, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Treino não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar treino:', error);
    res.status(500).json({ error: 'Erro ao atualizar treino' });
  }
}

export async function deleteTreino(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM treinos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Treino não encontrado', 404);
    }

    res.json({ message: 'Treino deletado com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar treino:', error);
    res.status(500).json({ error: 'Erro ao deletar treino' });
  }
}
