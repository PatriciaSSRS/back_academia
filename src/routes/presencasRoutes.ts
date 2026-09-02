import { Router } from 'express';
import {
  getPresencas,
  getPresenca,
  createPresenca,
  updatePresenca,
  deletePresenca,
  getAgendaHoje,
  iniciarPresenca,
  finalizarPresenca,
  marcarFalta,
  cancelarAula,
  getHistoricoPorDia,
} from '../controllers/presencasController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Rotas de controle diário

/**
 * @openapi
 * /api/presencas/agenda/hoje:
 *   get:
 *     tags: [Presenças]
 *     summary: Lista a agenda do dia (aulas do tipo personal/avaliação na data de hoje, horário de Brasília)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aulas de hoje
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Aula'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/agenda/hoje', getAgendaHoje);

/**
 * @openapi
 * /api/presencas/historico/por-dia:
 *   get:
 *     tags: [Presenças]
 *     summary: Histórico de atendimentos (personal/avaliação) agrupado por dia
 *     description: Considera apenas aulas com status realizado, faltou ou cancelado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data_inicio
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: data_fim
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de dias com o resumo de atendimentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   dia:
 *                     type: string
 *                     format: date
 *                   realizados:
 *                     type: integer
 *                   faltas:
 *                     type: integer
 *                   cancelados:
 *                     type: integer
 *                   total:
 *                     type: integer
 *                   atendimentos:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         aluno_nome:
 *                           type: string
 *                         horario:
 *                           type: string
 *                         status:
 *                           type: string
 *                         tipo:
 *                           type: string
 *                         observacoes:
 *                           type: string
 *                           nullable: true
 *                         duracao_minutos:
 *                           type: integer
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/historico/por-dia', getHistoricoPorDia);

/**
 * @openapi
 * /api/presencas/{id}/iniciar:
 *   patch:
 *     tags: [Presenças]
 *     summary: Inicia o atendimento de uma aula (status -> em_andamento, grava hora_inicio)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Aula atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aula'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aula não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/iniciar', iniciarPresenca);

/**
 * @openapi
 * /api/presencas/{id}/finalizar:
 *   patch:
 *     tags: [Presenças]
 *     summary: Finaliza o atendimento de uma aula (status -> realizado, grava hora_fim e duração real)
 *     description: >
 *       Se a aula for "avulsa extra", gera automaticamente uma cobrança
 *       pendente (evita duplicar se já existir cobrança vinculada à aula).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               observacoes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Aula atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aula'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aula não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/finalizar', finalizarPresenca);

/**
 * @openapi
 * /api/presencas/{id}/falta:
 *   patch:
 *     tags: [Presenças]
 *     summary: Marca falta em uma aula (status -> faltou)
 *     description: >
 *       Gera cobrança automática apenas quando o plano do aluno é
 *       "aula_avulsa" e a aula não é reposição (evita duplicar cobrança).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Aula atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aula'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aula não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/falta', marcarFalta);

/**
 * @openapi
 * /api/presencas/{id}/cancelar:
 *   patch:
 *     tags: [Presenças]
 *     summary: Cancela uma aula (status -> cancelado)
 *     description: >
 *       Se `cancelado_por` for "aluno" e faltarem menos de 3 horas para o
 *       horário da aula, gera cobrança automática por cancelamento tardio.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelado_por:
 *                 type: string
 *                 enum: [personal, aluno]
 *                 default: personal
 *     responses:
 *       200:
 *         description: Aula cancelada
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Aula'
 *                 - type: object
 *                   properties:
 *                     cobrou:
 *                       type: boolean
 *                       description: true se uma cobrança por cancelamento tardio foi gerada
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aula não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/cancelar', cancelarAula);

// Rotas CRUD padrão

/**
 * @openapi
 * /api/presencas:
 *   get:
 *     tags: [Presenças]
 *     summary: Lista presenças/aulas com filtros
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: aluno_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: data_inicio
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: data_fim
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de presenças
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Aula'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getPresencas);

/**
 * @openapi
 * /api/presencas/{id}:
 *   get:
 *     tags: [Presenças]
 *     summary: Busca uma presença/aula pelo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Presença encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aula'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Presença não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getPresenca);

/**
 * @openapi
 * /api/presencas:
 *   post:
 *     tags: [Presenças]
 *     summary: Cria uma presença/aula (sem checagem de conflito de horário nem crédito)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aluno_id, data, horario, tipo]
 *             properties:
 *               aluno_id:
 *                 type: string
 *                 format: uuid
 *               data:
 *                 type: string
 *                 format: date
 *               horario:
 *                 type: string
 *                 example: '08:00'
 *               tipo:
 *                 type: string
 *                 enum: [personal, musculacao, avaliacao]
 *               status:
 *                 type: string
 *                 enum: [aguardando, confirmado, aprovado, cancelado, em_andamento, realizado, faltou]
 *                 default: aguardando
 *               observacoes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Presença criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aula'
 *       400:
 *         description: aluno_id, data, horario ou tipo ausentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', createPresenca);

/**
 * @openapi
 * /api/presencas/{id}:
 *   put:
 *     tags: [Presenças]
 *     summary: Atualiza uma presença/aula (todos os campos são opcionais)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: string
 *                 format: date
 *               horario:
 *                 type: string
 *               tipo:
 *                 type: string
 *                 enum: [personal, musculacao, avaliacao]
 *               status:
 *                 type: string
 *                 enum: [aguardando, confirmado, aprovado, cancelado, em_andamento, realizado, faltou]
 *     responses:
 *       200:
 *         description: Presença atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aula'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Presença não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', updatePresenca);

/**
 * @openapi
 * /api/presencas/{id}:
 *   delete:
 *     tags: [Presenças]
 *     summary: Remove uma presença/aula
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Presença deletada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Presença deletada com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Presença não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deletePresenca);

export default router;
