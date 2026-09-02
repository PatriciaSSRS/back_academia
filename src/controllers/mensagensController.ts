import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

export async function getConversas(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const query = `
      WITH ultimas_mensagens AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN remetente_id = $1 THEN destinatario_id 
            ELSE remetente_id 
          END
        )
          CASE 
            WHEN remetente_id = $1 THEN destinatario_id 
            ELSE remetente_id 
          END as contato_id,
          texto,
          criado_em,
          lida,
          remetente_id
        FROM mensagens
        WHERE remetente_id = $1 OR destinatario_id = $1
        ORDER BY 
          CASE 
            WHEN remetente_id = $1 THEN destinatario_id 
            ELSE remetente_id 
          END,
          criado_em DESC
      ),
      nao_lidas AS (
        SELECT 
          remetente_id,
          COUNT(*) as total
        FROM mensagens
        WHERE destinatario_id = $1 AND lida = false
        GROUP BY remetente_id
      )
      SELECT 
        u.id as usuario_id,
        u.nome as nome,
        um.texto as ultima_mensagem,
        um.criado_em as ultima_mensagem_data,
        COALESCE(nl.total, 0)::int as nao_lidas
      FROM ultimas_mensagens um
      INNER JOIN usuarios u ON u.id = um.contato_id
      LEFT JOIN nao_lidas nl ON nl.remetente_id = um.contato_id
      ORDER BY um.criado_em DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
}

export async function getMensagens(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { contato_id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const query = `
      SELECT 
        m.id,
        m.remetente_id,
        m.destinatario_id,
        m.texto,
        m.lida,
        m.criado_em,
        ur.nome as remetente_nome,
        ud.nome as destinatario_nome
      FROM mensagens m
      INNER JOIN usuarios ur ON m.remetente_id = ur.id
      INNER JOIN usuarios ud ON m.destinatario_id = ud.id
      WHERE 
        (m.remetente_id = $1 AND m.destinatario_id = $2)
        OR
        (m.remetente_id = $2 AND m.destinatario_id = $1)
      ORDER BY m.criado_em ASC
    `;

    const result = await pool.query(query, [userId, contato_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
}

export async function enviarMensagem(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { destinatario_id, texto } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!destinatario_id || !texto || !texto.trim()) {
      throw new AppError('Destinatário e texto são obrigatórios', 400);
    }

    const query = `
      INSERT INTO mensagens (remetente_id, destinatario_id, texto, lida)
      VALUES ($1, $2, $3, FALSE)
      RETURNING 
        id,
        remetente_id,
        destinatario_id,
        texto,
        lida,
        criado_em
    `;

    const result = await pool.query(query, [userId, destinatario_id, texto.trim()]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
}

export async function marcarComoLida(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { remetente_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!remetente_id) {
      throw new AppError('ID do remetente é obrigatório', 400);
    }

    const query = `
      UPDATE mensagens
      SET lida = true
      WHERE destinatario_id = $1 AND remetente_id = $2 AND lida = false
      RETURNING id
    `;

    const result = await pool.query(query, [userId, remetente_id]);
    
    res.json({ 
      mensagem: 'Mensagens marcadas como lidas',
      total: result.rowCount 
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao marcar mensagens como lidas:', error);
    res.status(500).json({ error: 'Erro ao marcar mensagens como lidas' });
  }
}

export async function contarNaoLidas(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const query = `
      SELECT COUNT(*)::int as total
      FROM mensagens
      WHERE destinatario_id = $1 AND lida = false
    `;

    const result = await pool.query(query, [userId]);
    res.json({ total: result.rows[0].total });
  } catch (error) {
    console.error('Erro ao contar mensagens não lidas:', error);
    res.status(500).json({ error: 'Erro ao contar mensagens não lidas' });
  }
}
