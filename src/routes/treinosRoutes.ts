import { Router } from 'express';
import {
  getTreinos,
  getTreino,
  createTreino,
  updateTreino,
  deleteTreino,
} from '../controllers/treinosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/treinos:
 *   get:
 *     tags: [Treinos]
 *     summary: Lista treinos, opcionalmente filtrando por aluno
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
 *         description: Lista de treinos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Treino'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getTreinos);

/**
 * @openapi
 * /api/treinos/{id}:
 *   get:
 *     tags: [Treinos]
 *     summary: Busca um treino pelo ID
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
 *         description: Treino encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Treino'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Treino não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getTreino);

/**
 * @openapi
 * /api/treinos:
 *   post:
 *     tags: [Treinos]
 *     summary: Cria um treino para um aluno
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aluno_id, nome, categoria]
 *             properties:
 *               aluno_id:
 *                 type: string
 *                 format: uuid
 *               nome:
 *                 type: string
 *               categoria:
 *                 type: string
 *                 enum: [hipertrofia, emagrecimento]
 *               exercicios:
 *                 type: array
 *                 items:
 *                   type: object
 *                 default: []
 *     responses:
 *       201:
 *         description: Treino criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Treino'
 *       400:
 *         description: aluno_id, nome ou categoria ausentes
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
router.post('/', createTreino);

/**
 * @openapi
 * /api/treinos/{id}:
 *   put:
 *     tags: [Treinos]
 *     summary: Atualiza um treino (todos os campos são opcionais)
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
 *               nome:
 *                 type: string
 *               categoria:
 *                 type: string
 *                 enum: [hipertrofia, emagrecimento]
 *               exercicios:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Treino atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Treino'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Treino não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', updateTreino);

/**
 * @openapi
 * /api/treinos/{id}:
 *   delete:
 *     tags: [Treinos]
 *     summary: Remove um treino
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
 *         description: Treino deletado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Treino deletado com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Treino não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteTreino);

export default router;
