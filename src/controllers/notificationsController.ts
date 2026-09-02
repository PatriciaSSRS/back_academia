import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    const { userId, perfil } = req.user;

    if (perfil === 'personal') {
      // Notificações para Personal Trainer
      
      // 1. Mensagens não lidas (recebidas pelo personal)
      const mensagensResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM mensagens 
         WHERE destinatario_id = $1 AND lida = FALSE`,
        [userId]
      );

      // 2. Observações não lidas (criadas recentemente - últimas 24h)
      // Como o personal CRIA as observações, não faz sentido contar não lidas
      // Vou considerar como "novas" se foram atualizadas recentemente
      const observacoesResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM observacoes_alunos 
         WHERE personal_id = $1 
         AND atualizado_em > NOW() - INTERVAL '24 hours'
         AND atualizado_em != criado_em`,
        [userId]
      );

      // 3. Alunos novos (últimos 7 dias) - não precisa contar, removido
      // Personal não precisa de notificação de alunos novos aqui

      res.json({
        mensagens: parseInt(mensagensResult.rows[0].count),
        observacoes: parseInt(observacoesResult.rows[0].count),
        alunos: 0,
      });

    } else if (perfil === 'aluno') {
      // Notificações para Aluno
      
      // 1. Mensagens não lidas
      const mensagensResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM mensagens 
         WHERE destinatario_id = $1 AND lida = FALSE`,
        [userId]
      );

      // 2. Observações não lidas (novas observações criadas pelo personal)
      // Buscar o aluno_id do usuário
      const alunoResult = await pool.query(
        `SELECT id FROM alunos WHERE usuario_id = $1`,
        [userId]
      );

      let observacoesCount = 0;
      if (alunoResult.rows.length > 0) {
        const alunoId = alunoResult.rows[0].id;
        const observacoesResult = await pool.query(
          `SELECT COUNT(*) as count 
           FROM observacoes_alunos 
           WHERE aluno_id = $1 AND lida = FALSE`,
          [alunoId]
        );
        observacoesCount = parseInt(observacoesResult.rows[0].count);
      }

      res.json({
        mensagens: parseInt(mensagensResult.rows[0].count),
        notas: observacoesCount,
      });
    } else {
      throw new AppError('Perfil inválido', 400);
    }

  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
}
