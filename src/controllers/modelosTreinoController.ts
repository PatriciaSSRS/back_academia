import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

export async function getModelos(req: AuthRequest, res: Response) {
  try {
    const personalId = req.user!.userId;

    const result = await pool.query(
      `SELECT * FROM modelos_treino WHERE personal_id = $1 ORDER BY criado_em DESC`,
      [personalId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar modelos de treino:', error);
    res.status(500).json({ error: 'Erro ao buscar modelos de treino' });
  }
}

export async function getModelo(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const personalId = req.user!.userId;

    const result = await pool.query(
      'SELECT * FROM modelos_treino WHERE id = $1 AND personal_id = $2',
      [id, personalId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Modelo não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar modelo:', error);
    res.status(500).json({ error: 'Erro ao buscar modelo' });
  }
}

export async function createModelo(req: AuthRequest, res: Response) {
  try {
    const personalId = req.user!.userId;
    const { nome, categoria, exercicios } = req.body;

    if (!nome || !categoria) {
      throw new AppError('nome e categoria são obrigatórios', 400);
    }

    const result = await pool.query(
      `INSERT INTO modelos_treino (personal_id, nome, categoria, exercicios)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [personalId, nome, categoria, JSON.stringify(exercicios || [])]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar modelo:', error);
    res.status(500).json({ error: 'Erro ao criar modelo' });
  }
}

export async function updateModelo(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const personalId = req.user!.userId;
    const { nome, categoria, exercicios } = req.body;

    const result = await pool.query(
      `UPDATE modelos_treino
       SET nome = COALESCE($1, nome),
           categoria = COALESCE($2, categoria),
           exercicios = COALESCE($3, exercicios),
           atualizado_em = NOW()
       WHERE id = $4 AND personal_id = $5
       RETURNING *`,
      [nome, categoria, exercicios ? JSON.stringify(exercicios) : null, id, personalId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Modelo não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar modelo:', error);
    res.status(500).json({ error: 'Erro ao atualizar modelo' });
  }
}

export async function deleteModelo(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const personalId = req.user!.userId;

    const result = await pool.query(
      'DELETE FROM modelos_treino WHERE id = $1 AND personal_id = $2 RETURNING *',
      [id, personalId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Modelo não encontrado', 404);
    }

    res.json({ message: 'Modelo deletado com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar modelo:', error);
    res.status(500).json({ error: 'Erro ao deletar modelo' });
  }
}
