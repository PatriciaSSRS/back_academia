import { Router } from 'express';
import {
  getModelos,
  getModelo,
  createModelo,
  updateModelo,
  deleteModelo,
} from '../controllers/modelosTreinoController';
import { authenticateToken, requirePersonal } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);
router.use(requirePersonal);

/**
 * @openapi
 * /api/modelos-treino:
 *   get:
 *     tags: [Modelos de Treino]
 *     summary: Lista os modelos de treino do personal autenticado
 *     description: Apenas usuários com perfil "personal" podem acessar as rotas de modelos de treino.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de modelos de treino
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ModeloTreino'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado — apenas personal trainers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getModelos);

/**
 * @openapi
 * /api/modelos-treino/{id}:
 *   get:
 *     tags: [Modelos de Treino]
 *     summary: Busca um modelo de treino do personal autenticado pelo ID
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
 *         description: Modelo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModeloTreino'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado — apenas personal trainers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Modelo não encontrado (ou pertence a outro personal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getModelo);

/**
 * @openapi
 * /api/modelos-treino:
 *   post:
 *     tags: [Modelos de Treino]
 *     summary: Cria um modelo de treino reutilizável
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, categoria]
 *             properties:
 *               nome:
 *                 type: string
 *               categoria:
 *                 type: string
 *               exercicios:
 *                 type: array
 *                 items:
 *                   type: object
 *                 default: []
 *     responses:
 *       201:
 *         description: Modelo criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModeloTreino'
 *       400:
 *         description: nome ou categoria ausentes
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
 *       403:
 *         description: Acesso negado — apenas personal trainers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', createModelo);

/**
 * @openapi
 * /api/modelos-treino/{id}:
 *   put:
 *     tags: [Modelos de Treino]
 *     summary: Atualiza um modelo de treino do personal autenticado
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
 *               exercicios:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Modelo atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModeloTreino'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado — apenas personal trainers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Modelo não encontrado (ou pertence a outro personal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', updateModelo);

/**
 * @openapi
 * /api/modelos-treino/{id}:
 *   delete:
 *     tags: [Modelos de Treino]
 *     summary: Remove um modelo de treino do personal autenticado
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
 *         description: Modelo deletado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Modelo deletado com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado — apenas personal trainers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Modelo não encontrado (ou pertence a outro personal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteModelo);

export default router;
