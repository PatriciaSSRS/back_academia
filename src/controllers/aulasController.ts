import { Request, Response } from 'express';
import pool from '../config/database';
import { AppError } from '../middlewares/error';

// Listar aulas com filtros
export async function getAulas(req: Request, res: Response) {
  try {
    const { aluno_id, data_inicio, data_fim, status, tipo } = req.query;

    let query = 'SELECT * FROM view_aulas WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (aluno_id) {
      query += ` AND aluno_id = $${paramCount}`;
      params.push(aluno_id);
      paramCount++;
    }

    if (data_inicio) {
      query += ` AND data >= $${paramCount}`;
      params.push(data_inicio);
      paramCount++;
    }

    if (data_fim) {
      query += ` AND data <= $${paramCount}`;
      params.push(data_fim);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (tipo) {
      query += ` AND tipo = $${paramCount}`;
      params.push(tipo);
      paramCount++;
    }

    query += ' ORDER BY data DESC, horario DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar aulas:', error);
    res.status(500).json({ error: 'Erro ao buscar aulas' });
  }
}

// Buscar aula por ID
export async function getAula(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM view_aulas WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar aula:', error);
    res.status(500).json({ error: 'Erro ao buscar aula' });
  }
}

// Criar nova aula
export async function createAula(req: Request, res: Response) {
  try {
    const { aluno_id, data, horario, tipo, duracao, observacoes } = req.body;

    if (!aluno_id || !data || !horario || !tipo) {
      throw new AppError('Campos obrigatórios: aluno_id, data, horario, tipo', 400);
    }

    const result = await pool.query(
      `INSERT INTO aulas (aluno_id, data, horario, tipo, duracao, observacoes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'aguardando')
       RETURNING *`,
      [aluno_id, data, horario, tipo, duracao || 60, observacoes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar aula:', error);
    res.status(500).json({ error: 'Erro ao criar aula' });
  }
}

// Atualizar aula
export async function updateAula(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { data, horario, tipo, status, duracao, observacoes } = req.body;

    const result = await pool.query(
      `UPDATE aulas 
       SET data = COALESCE($1, data),
           horario = COALESCE($2, horario),
           tipo = COALESCE($3, tipo),
           status = COALESCE($4, status),
           duracao = COALESCE($5, duracao),
           observacoes = COALESCE($6, observacoes),
           atualizado_em = NOW()
       WHERE id = $7
       RETURNING *`,
      [data, horario, tipo, status, duracao, observacoes, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar aula:', error);
    res.status(500).json({ error: 'Erro ao atualizar aula' });
  }
}

// Aprovar aula
export async function aprovarAula(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE aulas 
       SET status = 'aprovado',
           atualizado_em = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao aprovar aula:', error);
    res.status(500).json({ error: 'Erro ao aprovar aula' });
  }
}

// Cancelar aula
export async function cancelarAula(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE aulas 
       SET status = 'cancelado',
           atualizado_em = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao cancelar aula:', error);
    res.status(500).json({ error: 'Erro ao cancelar aula' });
  }
}

// Deletar aula
export async function deleteAula(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM aulas WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    res.json({ message: 'Aula deletada com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar aula:', error);
    res.status(500).json({ error: 'Erro ao deletar aula' });
  }
}
