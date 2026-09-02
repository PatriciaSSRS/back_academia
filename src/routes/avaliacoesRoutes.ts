import { Router } from 'express';
import {
  getAvaliacoes,
  getAvaliacao,
  createAvaliacao,
  deleteAvaliacao,
} from '../controllers/avaliacoesController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/avaliacoes:
 *   get:
 *     tags: [Avaliações]
 *     summary: Lista avaliações físicas, opcionalmente filtrando por aluno
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: aluno_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de avaliações
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Avaliacao'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getAvaliacoes);

/**
 * @openapi
 * /api/avaliacoes/{id}:
 *   get:
 *     tags: [Avaliações]
 *     summary: Busca uma avaliação física pelo ID
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
 *         description: Avaliação encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Avaliacao'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Avaliação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getAvaliacao);

/**
 * @openapi
 * /api/avaliacoes:
 *   post:
 *     tags: [Avaliações]
 *     summary: Registra uma avaliação física para um aluno
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aluno_id]
 *             properties:
 *               aluno_id:
 *                 type: string
 *                 format: uuid
 *               data:
 *                 type: string
 *                 format: date
 *                 description: Padrão é a data atual
 *               peso:
 *                 type: number
 *                 format: float
 *                 description: kg — entre 20 e 300
 *               altura:
 *                 type: number
 *                 format: float
 *                 description: metros — entre 0.5 e 2.5
 *               idade:
 *                 type: integer
 *               sexo:
 *                 type: string
 *               imc:
 *                 type: number
 *                 format: float
 *               gordura_corporal:
 *                 type: number
 *                 format: float
 *               massa_muscular:
 *                 type: number
 *                 format: float
 *               protocolo:
 *                 type: string
 *               circunferencias:
 *                 type: object
 *                 default: {}
 *               dobras:
 *                 type: object
 *                 default: {}
 *               observacoes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Avaliação criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Avaliacao'
 *       400:
 *         description: aluno_id ausente, ou peso/altura fora da faixa válida
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
router.post('/', createAvaliacao);

/**
 * @openapi
 * /api/avaliacoes/{id}:
 *   delete:
 *     tags: [Avaliações]
 *     summary: Remove uma avaliação física
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
 *         description: Avaliação deletada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Avaliação deletada com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Avaliação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteAvaliacao);

export default router;
