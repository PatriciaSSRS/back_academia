import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

export async function getAvaliacoes(req: AuthRequest, res: Response) {
  try {
    const { aluno_id } = req.query;

    let query = `
      SELECT 
        av.*,
        a.usuario_id,
        u.nome as aluno_nome
      FROM avaliacoes av
      INNER JOIN alunos a ON av.aluno_id = a.id
      INNER JOIN usuarios u ON a.usuario_id = u.id
    `;

    const params: any[] = [];

    if (aluno_id) {
      query += ' WHERE av.aluno_id = $1';
      params.push(aluno_id);
    }

    query += ' ORDER BY av.data DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
}

export async function getAvaliacao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM avaliacoes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Avaliação não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ error: 'Erro ao buscar avaliação' });
  }
}

export async function createAvaliacao(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, data, peso, altura, idade, sexo, imc, gordura_corporal, massa_muscular, protocolo, circunferencias, dobras, observacoes } = req.body;

    if (!aluno_id) {
      throw new AppError('aluno_id é obrigatório', 400);
    }

    // Validações
    if (peso && (peso < 20 || peso > 300)) {
      throw new AppError('Peso deve estar entre 20 e 300 kg', 400);
    }

    if (altura && (altura < 0.5 || altura > 2.5)) {
      throw new AppError('Altura deve estar entre 0.5 e 2.5 metros (50 a 250 cm)', 400);
    }

    const result = await pool.query(
      `INSERT INTO avaliacoes (aluno_id, data, peso, altura, idade, sexo, imc, gordura_corporal, massa_muscular, protocolo, circunferencias, dobras, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        aluno_id,
        data || new Date(),
        peso,
        altura,
        idade,
        sexo,
        imc,
        gordura_corporal,
        massa_muscular,
        protocolo,
        JSON.stringify(circunferencias || {}),
        JSON.stringify(dobras || {}),
        observacoes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    
    // Tratar erros específicos do PostgreSQL
    if (error.code === '22003' || error.message?.includes('numeric field overflow')) {
      return res.status(400).json({ 
        error: 'Valor numérico muito alto em um dos campos. Verifique altura (deve estar em metros: 1.75), peso e medidas.' 
      });
    }
    
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({ error: 'Erro ao criar avaliação' });
  }
}

export async function deleteAvaliacao(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM avaliacoes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Avaliação não encontrada', 404);
    }

    res.json({ message: 'Avaliação deletada com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar avaliação:', error);
    res.status(500).json({ error: 'Erro ao deletar avaliação' });
  }
}
