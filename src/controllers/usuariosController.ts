import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

export async function getUsuarios(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      'SELECT id, perfil, nome, telefone, usuario, criado_em FROM usuarios ORDER BY nome'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
}

// Retorna a config de recebimento PIX do personal (recebedor).
// App single-personal: pega o único usuário perfil='personal'.
// Acessível por personal e aluno (o aluno precisa da chave para pagar).
export async function getPixRecebedor(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      `SELECT chave_pix, nome_recebedor, cidade_recebedor
       FROM usuarios WHERE perfil = 'personal'
       ORDER BY (chave_pix IS NOT NULL AND chave_pix <> '') DESC, criado_em ASC
       LIMIT 1`
    );
    const row = result.rows[0] || {};
    res.json({
      chave_pix: row.chave_pix || '',
      nome_recebedor: row.nome_recebedor || '',
      cidade_recebedor: row.cidade_recebedor || '',
    });
  } catch (error) {
    console.error('Erro ao buscar PIX do recebedor:', error);
    res.status(500).json({ error: 'Erro ao buscar dados de recebimento' });
  }
}

// Atualiza a chave PIX do personal autenticado.
export async function updatePix(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.perfil !== 'personal') {
      throw new AppError('Apenas o personal pode configurar a chave PIX', 403);
    }
    const { chave_pix, nome_recebedor, cidade_recebedor } = req.body || {};
    const result = await pool.query(
      `UPDATE usuarios
       SET chave_pix = $1, nome_recebedor = $2, cidade_recebedor = $3
       WHERE id = $4
       RETURNING chave_pix, nome_recebedor, cidade_recebedor`,
      [chave_pix || null, nome_recebedor || null, cidade_recebedor || null, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar PIX:', error);
    res.status(500).json({ error: 'Erro ao salvar chave PIX' });
  }
}

export async function getUsuario(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, perfil, nome, telefone, usuario, criado_em FROM usuarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}
