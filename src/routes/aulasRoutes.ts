import { Router } from 'express';
import {
  getAulas,
  getAula,
  createAula,
  updateAula,
  aprovarAula,
  cancelarAula,
  deleteAula,
} from '../controllers/aulasController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/aulas:
 *   get:
 *     tags: [Aulas/Agendamentos]
 *     summary: Lista aulas (via view_aulas, já com nome/telefone do aluno) com filtros
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
 *       - in: query
 *         name: tipo
 *         required: false
 *         schema:
 *           type: string
 *           enum: [personal, musculacao, avaliacao]
 *     responses:
 *       200:
 *         description: Lista de aulas
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
router.get('/', getAulas);

/**
 * @openapi
 * /api/aulas/{id}:
 *   get:
 *     tags: [Aulas/Agendamentos]
 *     summary: Busca uma aula pelo ID (via view_aulas)
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
 *         description: Aula encontrada
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
router.get('/:id', getAula);

/**
 * @openapi
 * /api/aulas:
 *   post:
 *     tags: [Aulas/Agendamentos]
 *     summary: Cria uma aula (sem checagem de conflito de horário nem crédito — sempre nasce "aguardando")
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
 *               duracao:
 *                 type: integer
 *                 default: 60
 *               observacoes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Aula criada
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
router.post('/', createAula);

/**
 * @openapi
 * /api/aulas/{id}:
 *   put:
 *     tags: [Aulas/Agendamentos]
 *     summary: Atualiza uma aula (todos os campos são opcionais)
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
router.put('/:id', updateAula);

/**
 * @openapi
 * /api/aulas/{id}/aprovar:
 *   patch:
 *     tags: [Aulas/Agendamentos]
 *     summary: Aprova uma aula (status -> aprovado)
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
 *         description: Aula aprovada
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
router.patch('/:id/aprovar', aprovarAula);

/**
 * @openapi
 * /api/aulas/{id}/cancelar:
 *   patch:
 *     tags: [Aulas/Agendamentos]
 *     summary: Cancela uma aula (status -> cancelado). Versão simples, sem regra de cobrança.
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
 *         description: Aula cancelada
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
router.patch('/:id/cancelar', cancelarAula);

/**
 * @openapi
 * /api/aulas/{id}:
 *   delete:
 *     tags: [Aulas/Agendamentos]
 *     summary: Remove uma aula
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
 *         description: Aula deletada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Aula deletada com sucesso
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
router.delete('/:id', deleteAula);

export default router;
