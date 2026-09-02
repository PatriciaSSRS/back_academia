import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/error';
import { withTransaction } from '../database/transaction';
import { getSaldo, consumirCredito, estornarCredito } from '../utils/creditos';

// Converte 'HH:MM' / 'HH:MM:SS' em minutos desde a meia-noite
function horaParaMinutos(h: any): number {
  if (!h) return 0;
  const [hh, mm] = String(h).split(':');
  return (parseInt(hh, 10) || 0) * 60 + (parseInt(mm, 10) || 0);
}

// Verifica se o intervalo [inicio, inicio+duracao) conflita com alguma aula
// já marcada no mesmo dia (de qualquer aluno). Ignora canceladas e, opcional-
// mente, uma aula específica (ao editar). Lança 409 se houver conflito.
async function garantirHorarioLivre(data: string, horario: string, duracao: number, ignorarId?: string) {
  const novoIni = horaParaMinutos(horario);
  const novoFim = novoIni + (Number(duracao) || 60);

  const params: any[] = [data];
  let q = `SELECT horario, duracao FROM aulas WHERE data = $1 AND status != 'cancelado'`;
  if (ignorarId) {
    params.push(ignorarId);
    q += ` AND id != $2`;
  }
  const existentes = await pool.query(q, params);

  for (const ex of existentes.rows) {
    const ini = horaParaMinutos(ex.horario);
    const fim = ini + (Number(ex.duracao) || 60);
    // Sobreposição: começa antes do outro terminar e o outro começa antes deste terminar
    if (novoIni < fim && ini < novoFim) {
      const hh = String(Math.floor(ini / 60)).padStart(2, '0');
      const mm = String(ini % 60).padStart(2, '0');
      throw new AppError(`Horário indisponível — já existe uma aula às ${hh}:${mm} nesse dia.`, 409);
    }
  }
}

export async function getAgendamentos(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, data_inicio, data_fim, status } = req.query;

    let query = `
      SELECT 
        ag.*,
        a.usuario_id,
        u.nome as aluno_nome
      FROM aulas ag
      INNER JOIN alunos a ON ag.aluno_id = a.id
      INNER JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (aluno_id) {
      query += ` AND ag.aluno_id = $${paramIndex}`;
      params.push(aluno_id);
      paramIndex++;
    }

    if (data_inicio) {
      query += ` AND ag.data >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      query += ` AND ag.data <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    if (status) {
      query += ` AND ag.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY ag.data ASC, ag.horario ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
}

export async function getAgendamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM aulas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
}

export async function createAgendamento(req: AuthRequest, res: Response) {
  try {
    const { aluno_id, data, horario, tipo, status, duracao, observacoes, is_reposicao, is_avulsa_extra } = req.body;

    if (!aluno_id || !data || !horario || !tipo) {
      throw new AppError('aluno_id, data, horario e tipo são obrigatórios', 400);
    }

    // ─── CONFLITO DE HORÁRIO ───────────────────────────────────────────────
    // O horário fica indisponível pela duração da aula. Falha antes de mexer
    // em créditos.
    await garantirHorarioLivre(data, horario, duracao || 60);

    // ─── CRÉDITOS ──────────────────────────────────────────────────────────
    // Aula normal (não reposição, não avulsa explícita, não avaliação) consome
    // 1 crédito. Sem saldo → a aula é criada como AVULSA (não bloqueia o agenda-
    // mento; a cobrança segue o fluxo de avulsa existente). Reposição e avaliação
    // não consomem crédito.
    let willConsume = false;
    let autoAvulsa = false;
    if (!is_reposicao && !is_avulsa_extra && tipo !== 'avaliacao') {
      const saldo = await getSaldo(aluno_id);
      if (saldo > 0) willConsume = true;
      else autoAvulsa = true;
    }
    const avulsaFinal = !!is_avulsa_extra || autoAvulsa;
    // ───────────────────────────────────────────────────────────────────────

    const result = await pool.query(
      `INSERT INTO aulas (aluno_id, data, horario, tipo, status, duracao, observacoes, is_reposicao, is_avulsa_extra, usou_credito)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [aluno_id, data, horario, tipo, status || 'aguardando', duracao || 60, observacoes, is_reposicao || false, avulsaFinal, willConsume]
    );

    const aulaCriada = result.rows[0];

    // Consome o crédito já vinculado à aula (permite estorno no cancelamento)
    if (willConsume) {
      await consumirCredito(aluno_id, { aulaId: aulaCriada.id });
    }

    res.status(201).json(aulaCriada);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
}

export async function updateAgendamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { data, horario, tipo, status, duracao, observacoes } = req.body;

    // Conflito de horário ao remarcar: só checa se mexeu em data/horário/duração
    if (data || horario || duracao) {
      const atual = await pool.query('SELECT data, horario, duracao, status FROM aulas WHERE id = $1', [id]);
      if (atual.rows.length > 0 && atual.rows[0].status !== 'cancelado') {
        const cur = atual.rows[0];
        const dataEf = data || (cur.data instanceof Date ? cur.data.toISOString().split('T')[0] : String(cur.data).split('T')[0]);
        const horarioEf = horario || cur.horario;
        const duracaoEf = duracao || cur.duracao || 60;
        await garantirHorarioLivre(dataEf, horarioEf, duracaoEf, id);
      }
    }

    const result = await pool.query(
      `UPDATE aulas
       SET data = COALESCE($1, data),
           horario = COALESCE($2, horario),
           tipo = COALESCE($3, tipo),
           status = COALESCE($4, status),
           duracao = COALESCE($5, duracao),
           observacoes = COALESCE($6, observacoes)
       WHERE id = $7
       RETURNING *`,
      [data, horario, tipo, status, duracao, observacoes, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
}

export async function deleteAgendamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM aulas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
}

export async function cancelarAgendamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { cancelado_por } = req.body;

    // 1. Buscar agendamento + plano do aluno
    const aulaResult = await pool.query(
      `SELECT a.*, al.plano, al.valor_aula FROM aulas a
       LEFT JOIN alunos al ON a.aluno_id = al.id
       WHERE a.id = $1`,
      [id]
    );
    if (aulaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    const aula = aulaResult.rows[0];

    // 2. Calcular diferença de tempo
    const dataHoraAula = new Date(`${aula.data}T${aula.horario}`);
    const diffHoras = (dataHoraAula.getTime() - Date.now()) / 3600000;

    // Regra:
    // aluno cancela com < 3h de antecedência (ou já passou o horário) → cobra
    // aluno cancela com >= 3h de antecedência → só cancela, sem cobrança
    // personal cancela → nunca cobra
    const tarifar = cancelado_por === 'aluno' && diffHoras < 3;

    // 3. Atualizar status + marcar cobrar_falta e cancelado_por
    const result = await pool.query(
      `UPDATE aulas SET status = 'cancelado', cobrar_falta = $1,
       cancelado_por = $2, data_hora_cancelamento = NOW()
       WHERE id = $3 RETURNING *`,
      [tarifar, cancelado_por || 'personal', id]
    );

    // 3b. Estorna o crédito se a aula havia consumido um (e não estava cancelada)
    if (aula.usou_credito && aula.status !== 'cancelado') {
      await estornarCredito(aula.aluno_id, { aulaId: id });
    }

    // 4. Se for cancelamento tardio, gerar cobrança para todos os planos
    if (tarifar) {
      try {
        const jaTemCobranca = await pool.query(
          'SELECT id FROM pagamentos WHERE referencia_aula_id = $1', [id]
        );
        if (jaTemCobranca.rows.length === 0) {
          const valorAula = aula.valor_aula > 0 ? aula.valor_aula : 50.00;
          const dataAulaStr = new Date(aula.data).toLocaleDateString('pt-BR');
          await pool.query(
            `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, status, descricao, referencia_aula_id)
             VALUES ($1, $2, $3, 'pendente', $4, $5)`,
            [aula.aluno_id, valorAula, aula.data,
             `Cancelamento tardio - ${dataAulaStr} às ${aula.horario}`, id]
          );
          console.log(`💰 Cobrança criada por cancelamento tardio: R$ ${valorAula}`);
        }
      } catch (cobrancaErr) {
        console.error('⚠️ Erro ao criar cobrança:', cobrancaErr);
      }
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Erro ao cancelar agendamento:', error?.message);
    res.status(500).json({ error: 'Erro ao cancelar agendamento', detalhe: error?.message });
  }
}

export async function marcarFaltou(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // 1. Buscar agendamento + plano do aluno
    const aulaResult = await pool.query(
      `SELECT a.*, al.plano, al.valor_aula FROM aulas a
       LEFT JOIN alunos al ON a.aluno_id = al.id
       WHERE a.id = $1`,
      [id]
    );
    if (aulaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    const aula = aulaResult.rows[0];

    // 2. Marcar como faltou (sempre consome a aula do plano)
    const result = await pool.query(
      `UPDATE aulas SET status = 'faltou', cobrar_falta = true,
       data_hora_falta = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // 3. Gerar cobrança apenas para plano avulso E quando não for reposição
    // Reposição faltada: aluno perde a reposição mas não é cobrado
    if (aula.plano === 'aula_avulsa' && !aula.is_reposicao) {
      try {
        const jaTemCobranca = await pool.query(
          'SELECT id FROM pagamentos WHERE referencia_aula_id = $1', [id]
        );
        if (jaTemCobranca.rows.length === 0) {
          const valorAula = aula.valor_aula > 0 ? aula.valor_aula : 50.00;
          await pool.query(
            `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, status, descricao, referencia_aula_id)
             VALUES ($1, $2, $3, 'pendente', $4, $5)`,
            [aula.aluno_id, valorAula, aula.data,
             `Falta não justificada - ${aula.data} às ${aula.horario}`, id]
          );
          console.log(`💰 Cobrança por falta criada: R$ ${valorAula}`);
        }
      } catch (cobrancaErr) {
        console.error('⚠️ Erro ao criar cobrança por falta:', cobrancaErr);
      }
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Erro ao marcar falta:', error?.message);
    res.status(500).json({ error: 'Erro ao marcar falta', detalhe: error?.message });
  }
}

export async function marcarRealizado(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Buscar dados da aula antes de atualizar
    const aulaInfo = await pool.query(
      `SELECT a.*, al.valor_aula, al.plano FROM aulas a
       LEFT JOIN alunos al ON a.aluno_id = al.id
       WHERE a.id = $1`,
      [id]
    );

    if (aulaInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const aula = aulaInfo.rows[0];

    const result = await pool.query(
      `UPDATE aulas SET status = 'realizado', hora_fim = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Se for aula avulsa extra: cobrar imediatamente
    if (aula.is_avulsa_extra) {
      try {
        const jaTemCobranca = await pool.query(
          'SELECT id FROM pagamentos WHERE referencia_aula_id = $1', [id]
        );
        if (jaTemCobranca.rows.length === 0) {
          const valorAula = aula.valor_aula > 0 ? aula.valor_aula : 50.00;
          await pool.query(
            `INSERT INTO pagamentos (aluno_id, valor, data_vencimento, status, descricao, referencia_aula_id)
             VALUES ($1, $2, $3, 'pendente', $4, $5)`,
            [aula.aluno_id, valorAula, aula.data,
             `Aula avulsa extra - ${aula.data} às ${aula.horario}`, id]
          );
          console.log(`💰 Cobrança aula avulsa extra: R$ ${valorAula}`);
        }
      } catch (cobrancaErr) {
        console.error('⚠️ Erro ao cobrar aula avulsa extra:', cobrancaErr);
      }
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Erro ao marcar realizado:', error?.message);
    res.status(500).json({ error: 'Erro ao marcar como realizado', detalhe: error?.message });
  }
}

export async function confirmarAgendamento(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    console.log(`✅ [v4] Confirmando agendamento ${id}`);

    const result = await pool.query(
      `UPDATE aulas SET status = 'confirmado' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    console.log(`✅ Agendamento ${id} confirmado`);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Erro ao confirmar agendamento:', error?.message, error?.code, error?.detail);
    res.status(500).json({
      error: 'Erro ao confirmar agendamento',
      detalhe: error?.message,
      codigo: error?.code
    });
  }
}
