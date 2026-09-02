import { Router } from 'express';
import {
  getAgendamentos,
  getAgendamento,
  createAgendamento,
  updateAgendamento,
  deleteAgendamento,
  cancelarAgendamento,
  confirmarAgendamento,
  marcarFaltou,
  marcarRealizado,
} from '../controllers/agendamentosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/agendamentos:
 *   get:
 *     tags: [Aulas/Agendamentos]
 *     summary: Lista agendamentos, com filtros opcionais
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
 *         description: Lista de agendamentos
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
router.get('/', getAgendamentos);

/**
 * @openapi
 * /api/agendamentos/{id}:
 *   get:
 *     tags: [Aulas/Agendamentos]
 *     summary: Busca um agendamento pelo ID
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
 *         description: Agendamento encontrado
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
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getAgendamento);

/**
 * @openapi
 * /api/agendamentos:
 *   post:
 *     tags: [Aulas/Agendamentos]
 *     summary: Cria um agendamento
 *     description: >
 *       Verifica conflito de horário antes de criar (retorna 409 se o
 *       horário estiver ocupado por outra aula não cancelada no mesmo dia).
 *       Aulas normais (não reposição, não avulsa, não avaliação) consomem 1
 *       crédito do aluno se houver saldo; sem saldo a aula vira "avulsa
 *       extra" automaticamente.
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
 *                 default: aguardando
 *               duracao:
 *                 type: integer
 *                 default: 60
 *               observacoes:
 *                 type: string
 *               is_reposicao:
 *                 type: boolean
 *                 default: false
 *               is_avulsa_extra:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Agendamento criado
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
 *       409:
 *         description: Já existe uma aula nesse horário/dia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', createAgendamento);

/**
 * @openapi
 * /api/agendamentos/{id}:
 *   put:
 *     tags: [Aulas/Agendamentos]
 *     summary: Atualiza/remarca um agendamento (todos os campos são opcionais)
 *     description: Reverifica conflito de horário se data/horário/duração mudarem.
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
 *               duracao:
 *                 type: integer
 *               observacoes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agendamento atualizado
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
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Já existe uma aula nesse horário/dia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', updateAgendamento);

/**
 * @openapi
 * /api/agendamentos/{id}:
 *   patch:
 *     tags: [Aulas/Agendamentos]
 *     summary: Atualiza/remarca um agendamento (idêntico ao PUT — aceito também via PATCH)
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
 *               duracao:
 *                 type: integer
 *               observacoes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agendamento atualizado
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
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Já existe uma aula nesse horário/dia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', updateAgendamento);  // Aceitar PATCH também (não apenas PUT)

/**
 * @openapi
 * /api/agendamentos/{id}/cancelar:
 *   patch:
 *     tags: [Aulas/Agendamentos]
 *     summary: Cancela um agendamento
 *     description: >
 *       Se `cancelado_por` for "aluno" e faltar menos de 3h (ou o horário já
 *       passou), gera cobrança por cancelamento tardio para qualquer plano.
 *       Cancelamento pelo personal nunca cobra. Estorna o crédito consumido
 *       pela aula, se houver.
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
 *         description: Agendamento cancelado
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
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/cancelar', cancelarAgendamento);

/**
 * @openapi
 * /api/agendamentos/{id}/confirmar:
 *   patch:
 *     tags: [Aulas/Agendamentos]
 *     summary: Confirma um agendamento (status -> confirmado)
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
 *         description: Agendamento confirmado
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
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/confirmar', confirmarAgendamento);

/**
 * @openapi
 * /api/agendamentos/{id}/faltou:
 *   patch:
 *     tags: [Aulas/Agendamentos]
 *     summary: Marca falta em um agendamento (status -> faltou, sempre consome a aula do plano)
 *     description: >
 *       Gera cobrança automática apenas para plano "aula_avulsa" quando a
 *       aula não é reposição.
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
 *         description: Agendamento atualizado
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
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/faltou', marcarFaltou);

/**
 * @openapi
 * /api/agendamentos/{id}/realizado:
 *   patch:
 *     tags: [Aulas/Agendamentos]
 *     summary: Marca um agendamento como realizado (status -> realizado, grava hora_fim)
 *     description: Se for aula avulsa extra, gera cobrança automática (evita duplicar).
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
 *         description: Agendamento atualizado
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
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/realizado', marcarRealizado);

/**
 * @openapi
 * /api/agendamentos/{id}:
 *   delete:
 *     tags: [Aulas/Agendamentos]
 *     summary: Remove um agendamento
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
 *         description: Agendamento deletado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Agendamento deletado com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteAgendamento);

export default router;
