import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

// ========== FUNÇÕES AUXILIARES DE TIMEZONE ==========

function getBrasiliaDate(): Date {
  // Obter data/hora atual em Brasília (UTC-3)
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brasiliaOffset = -3 * 60 * 60000; // UTC-3
  return new Date(utcTime + brasiliaOffset);
}

function getBrasiliaDateString(): string {
  const date = getBrasiliaDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ========== CONTROLLERS ==========

export async function getPresencas(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, data_inicio, data_fim, status } = req.query;

    let query = `
      SELECT 
        a.id,
        a.aluno_id,
        a.data,
        a.horario,
        a.tipo,
        a.status,
        a.duracao,
        a.observacoes,
        al.usuario_id,
        u.nome as aluno_nome
      FROM aulas a
      INNER JOIN alunos al ON a.aluno_id = al.id
      INNER JOIN usuarios u ON al.usuario_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (aluno_id) {
      query += ` AND a.aluno_id = $${paramIndex}`;
      params.push(aluno_id);
      paramIndex++;
    }

    if (data_inicio) {
      query += ` AND a.data >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      query += ` AND a.data <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY a.data DESC, a.horario DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar presenças:', error);
    res.status(500).json({ error: 'Erro ao buscar presenças' });
  }
}

export async function getPresenca(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM aulas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Presença não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar presença:', error);
    res.status(500).json({ error: 'Erro ao buscar presença' });
  }
}

export async function createPresenca(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, data, horario, tipo, status, observacoes } = req.body;

    if (!aluno_id || !data || !horario || !tipo) {
      throw new AppError('aluno_id, data, horario e tipo são obrigatórios', 400);
    }

    const result = await pool.query(
      `INSERT INTO aulas (aluno_id, data, horario, tipo, status, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [aluno_id, data, horario, tipo, status || 'aguardando', observacoes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar presença:', error);
    res.status(500).json({ error: 'Erro ao criar presença' });
  }
}

export async function updatePresenca(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { data, horario, tipo, status } = req.body;

    const result = await pool.query(
      `UPDATE aulas 
       SET data = COALESCE($1, data),
           horario = COALESCE($2, horario),
           tipo = COALESCE($3, tipo),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [data, horario, tipo, status, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Presença não encontrada', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar presença:', error);
    res.status(500).json({ error: 'Erro ao atualizar presença' });
  }
}

export async function deletePresenca(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM aulas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Presença não encontrada', 404);
    }

    res.json({ message: 'Presença deletada com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar presença:', error);
    res.status(500).json({ error: 'Erro ao deletar presença' });
  }
}

// ========== CONTROLE DIÁRIO DE PERSONALS ==========

export async function getAgendaHoje(req: AuthRequest, res: Response) {
  try {
    // Obter data de hoje em horário de Brasília (UTC-3)
    const hoje = getBrasiliaDateString();
    
    console.log('📅 BUSCANDO AGENDA DO DIA:', {
      agora_utc: new Date().toISOString(),
      agora_brasilia: getBrasiliaDate().toISOString(),
      data_filtro: hoje
    });
    
    const result = await pool.query(
      `SELECT 
        a.*,
        al.usuario_id,
        u.nome as aluno_nome,
        u.telefone as aluno_telefone
      FROM aulas a
      INNER JOIN alunos al ON a.aluno_id = al.id
      INNER JOIN usuarios u ON al.usuario_id = u.id
      WHERE a.data = $1
        AND a.tipo IN ('personal', 'avaliacao')
      ORDER BY a.horario ASC`,
      [hoje]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar agenda de hoje:', error);
    res.status(500).json({ error: 'Erro ao buscar agenda de hoje' });
  }
}

export async function iniciarPresenca(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE aulas 
       SET status = 'em_andamento',
           hora_inicio = NOW()
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
    console.error('Erro ao iniciar aula:', error);
    res.status(500).json({ error: 'Erro ao iniciar aula' });
  }
}

export async function finalizarPresenca(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;
    
    // Buscar hora de início + dados para cobrança de avulsa extra
    const aulaAtual = await pool.query(
      `SELECT a.hora_inicio, a.duracao, a.is_avulsa_extra, a.aluno_id, a.data, a.horario,
              al.valor_aula
       FROM aulas a LEFT JOIN alunos al ON a.aluno_id = al.id
       WHERE a.id = $1`,
      [id]
    );

    if (aulaAtual.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    const horaInicio = aulaAtual.rows[0].hora_inicio;
    let duracaoCalculada = aulaAtual.rows[0].duracao; // Usar duração padrão

    if (horaInicio) {
      const inicio = new Date(horaInicio);
      const fim = new Date();
      const diffMinutos = Math.round((fim.getTime() - inicio.getTime()) / 60000);
      // Garantir que a duração seja sempre positiva e no mínimo 1 minuto
      duracaoCalculada = Math.max(1, Math.abs(diffMinutos));
    }

    const result = await pool.query(
      `UPDATE aulas 
       SET status = 'realizado',
           hora_fim = NOW(),
           observacoes = $2,
           duracao = $3
       WHERE id = $1
       RETURNING *`,
      [id, observacoes, duracaoCalculada]
    );

    // Se for aula avulsa extra: cobrar imediatamente
    if (aulaAtual.rows[0]?.is_avulsa_extra) {
      try {
        const jaTemCobranca = await pool.query(
          'SELECT id FROM pagamentos WHERE referencia_aula_id = $1', [id]
        );
        if (jaTemCobranca.rows.length === 0) {
          const dadosAula = aulaAtual.rows[0];
          const valorAula = dadosAula.valor_aula > 0 ? dadosAula.valor_aula : 50.00;
          await pool.query(
            `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, status, descricao, referencia_aula_id)
             VALUES ($1, $2, CURRENT_DATE, 'pendente', $3, $4)`,
            [dadosAula.aluno_id, valorAula,
             `Aula avulsa extra - ${dadosAula.data} às ${dadosAula.horario}`, id]
          );
          console.log(`💰 Cobrança aula avulsa extra: R$ ${valorAula}`);
        }
      } catch (cobrancaErr) {
        console.error('⚠️ Erro ao cobrar aula avulsa extra:', cobrancaErr);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao finalizar aula:', error);
    res.status(500).json({ error: 'Erro ao finalizar aula' });
  }
}

export async function marcarFalta(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Buscar dados da aula para cobrar
    const aulaResult = await pool.query(
      `SELECT a.*, al.usuario_id, u.nome as aluno_nome
       FROM aulas a
       INNER JOIN alunos al ON a.aluno_id = al.id
       INNER JOIN usuarios u ON al.usuario_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (aulaResult.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    const aula = aulaResult.rows[0];

    // Atualizar status para faltou + marcar como aula consumida do plano
    const result = await pool.query(
      `UPDATE aulas 
       SET status = 'faltou', cobrar_falta = true, data_hora_falta = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Buscar valor_aula do aluno (com fallback)
    const alunoResult = await pool.query(
      'SELECT plano, valor_aula FROM alunos WHERE id = $1',
      [aula.aluno_id]
    );
    const valorAula = alunoResult.rows[0]?.valor_aula > 0 ? alunoResult.rows[0].valor_aula : 50.00;
    
    // Verificar se já existe cobrança para esta aula (evitar duplicatas)
    const cobrancaExistente = await pool.query(
      `SELECT id FROM pagamentos WHERE referencia_aula_id = $1`,
      [id]
    );

    // Gerar cobrança APENAS para plano avulsa e quando não for reposição
    const plano = alunoResult.rows[0]?.plano;
    if (cobrancaExistente.rows.length === 0 && plano === 'aula_avulsa' && !aula.is_reposicao) {
      // Tentar inserir com as colunas novas, se não existirem, usar estrutura antiga
      try {
        await pool.query(
          `INSERT INTO pagamentos (aluno_id, descricao, valor, data_vencimento, data_pagamento, status, referencia_aula_id)
           VALUES ($1, $2, $3, CURRENT_DATE, NULL, 'pendente', $4)`,
          [
            aula.aluno_id, 
            `Cobrança por falta - ${aula.aluno_nome} - ${aula.data} ${aula.horario}`,
            valorAula,
            id
          ]
        );
        console.log('✅ Cobrança automática criada para aula avulsa:', id);
      } catch (insertError: any) {
        console.warn('⚠️ Colunas novas não existem, usando estrutura antiga:', (insertError as any).message);
        await pool.query(
          `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, data_pagamento, status)
           VALUES ($1, $2, CURRENT_DATE, NULL, 'pendente')`,
          [aula.aluno_id, valorAula]
        );
      }
    } else if (aula.is_reposicao) {
      console.log('ℹ️ Reposição faltada — aula consumida, sem cobrança gerada');
    } else if (plano !== 'aula_avulsa') {
      console.log(`ℹ️ Plano "${plano}" — falta consome aula do plano, sem cobrança gerada`);
    } else {
      console.log('ℹ️ Cobrança já existe para esta aula, não criando duplicata');
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao marcar falta:', error);
    res.status(500).json({ error: 'Erro ao marcar falta', detail: error?.message, code: error?.code });
  }
}

export async function cancelarAula(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { cancelado_por } = req.body; // 'personal' ou 'aluno'
    
    // Buscar dados da aula
    const aulaResult = await pool.query(
      `SELECT a.*, al.usuario_id, u.nome as aluno_nome
       FROM aulas a
       INNER JOIN alunos al ON a.aluno_id = al.id
       INNER JOIN usuarios u ON al.usuario_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (aulaResult.rows.length === 0) {
      throw new AppError('Aula não encontrada', 404);
    }

    const aula = aulaResult.rows[0];

    // Verificar se deve cobrar (apenas se aluno cancelar)
    let deveCobrar = false;
    if (cancelado_por === 'aluno') {
      // Horário atual em Brasília (UTC-3)
      const agoraBrasilia = getBrasiliaDate();
      
      // Horário da aula
      const dataAula = new Date(aula.data);
      const [horas, minutos] = aula.horario.split(':');
      dataAula.setHours(parseInt(horas), parseInt(minutos), 0, 0);
      
      // Calcular diferença em horas
      const diferencaHoras = (dataAula.getTime() - agoraBrasilia.getTime()) / (1000 * 60 * 60);
      
      // Cobra se faltam menos de 3 horas
      deveCobrar = diferencaHoras < 3 && diferencaHoras >= 0;
      
      console.log('📊 ALUNO CANCELANDO AULA:', {
        aula_id: id,
        data_aula: aula.data,
        horario_aula: aula.horario,
        agora_brasilia: agoraBrasilia.toISOString(),
        diferenca_horas: diferencaHoras.toFixed(2),
        vai_cobrar: deveCobrar
      });
    }

    // Atualizar status para cancelado + salvar cancelado_por e cobrar_falta
    const result = await pool.query(
      `UPDATE aulas 
       SET status = 'cancelado',
           cancelado_por = $2,
           cobrar_falta = $3,
           data_hora_cancelamento = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, cancelado_por || 'personal', deveCobrar]
    );

    // Se deve cobrar, criar cobrança no financeiro
    if (deveCobrar) {
      const valorAula = 50.00;
      
      // Verificar se já existe cobrança para esta aula (evitar duplicatas)
      const cobrancaExistente = await pool.query(
        `SELECT id FROM pagamentos WHERE referencia_aula_id = $1`,
        [id]
      );

      if (cobrancaExistente.rows.length === 0) {
        try {
          await pool.query(
            `INSERT INTO pagamentos (aluno_id, descricao, valor, data_vencimento, data_pagamento, status, referencia_aula_id)
             VALUES ($1, $2, $3, CURRENT_DATE, NULL, 'pendente', $4)`,
            [
              aula.aluno_id, 
              `Cobrança por cancelamento tardio - ${aula.aluno_nome} - ${aula.data} ${aula.horario}`,
              valorAula,
              id
            ]
          );
          console.log('✅ Cobrança por cancelamento criada para aula:', id);
        } catch (insertError: any) {
          console.warn('⚠️ Erro ao criar cobrança:', insertError.message);
          await pool.query(
            `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, data_pagamento, status)
             VALUES ($1, $2, CURRENT_DATE, NULL, 'pendente')`,
            [aula.aluno_id, valorAula]
          );
        }
      }
    }

    res.json({ ...result.rows[0], cobrou: deveCobrar });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao cancelar aula:', error);
    res.status(500).json({ error: 'Erro ao cancelar aula' });
  }
}

// pg-mem não implementa JSON_AGG/JSON_BUILD_OBJECT com a assinatura variádica
// usada aqui. Em vez disso, buscamos as linhas cruas e agrupamos em JS,
// produzindo o mesmo formato de resposta que a query original.
export async function getHistoricoPorDia(req: AuthRequest, res: Response) {
  try {
    const { data_inicio, data_fim } = req.query;

    let rawQuery = `
      SELECT a.id, a.data, a.horario, a.status, a.tipo, a.observacoes, a.duracao,
             u.nome as aluno_nome
      FROM aulas a
      INNER JOIN alunos al ON a.aluno_id = al.id
      INNER JOIN usuarios u ON al.usuario_id = u.id
      WHERE a.tipo IN ('personal', 'avaliacao')
        AND a.status IN ('realizado', 'faltou', 'cancelado')
    `;
    const rawParams: any[] = [];
    let i = 1;
    if (data_inicio) { rawQuery += ` AND a.data >= $${i}`; rawParams.push(data_inicio); i++; }
    if (data_fim) { rawQuery += ` AND a.data <= $${i}`; rawParams.push(data_fim); i++; }
    rawQuery += ` ORDER BY a.data DESC, a.horario ASC`;

    const raw = await pool.query(rawQuery, rawParams);

    const porDia = new Map<string, any>();
    for (const row of raw.rows) {
      const dia = String(row.data).substring(0, 10);
      if (!porDia.has(dia)) {
        porDia.set(dia, { dia, realizados: 0, faltas: 0, cancelados: 0, total: 0, atendimentos: [] });
      }
      const bucket = porDia.get(dia);
      if (row.status === 'realizado') bucket.realizados++;
      else if (row.status === 'faltou') bucket.faltas++;
      else if (row.status === 'cancelado') bucket.cancelados++;
      bucket.total++;
      bucket.atendimentos.push({
        id: row.id,
        aluno_nome: row.aluno_nome,
        horario: row.horario,
        status: row.status,
        tipo: row.tipo,
        observacoes: row.observacoes,
        duracao_minutos: row.duracao,
      });
    }

    const dias = Array.from(porDia.values()).sort((a, b) => (a.dia < b.dia ? 1 : -1));
    res.json(dias);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
}
