import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getObservacoes,
  getObservacao,
  createObservacao,
  updateObservacao,
  deleteObservacao,
} from '../controllers/observacoesController';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/observacoes:
 *   get:
 *     tags: [Observações]
 *     summary: Lista observações sobre alunos, opcionalmente filtrando por aluno
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
 *         description: Lista de observações
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ObservacaoAluno'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getObservacoes);

/**
 * @openapi
 * /api/observacoes/{id}:
 *   get:
 *     tags: [Observações]
 *     summary: Busca uma observação pelo ID
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
 *         description: Observação encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ObservacaoAluno'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Observação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getObservacao);

/**
 * @openapi
 * /api/observacoes:
 *   post:
 *     tags: [Observações]
 *     summary: Cria uma observação sobre um aluno (autor é o personal autenticado)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aluno_id, titulo, conteudo]
 *             properties:
 *               aluno_id:
 *                 type: string
 *                 format: uuid
 *               titulo:
 *                 type: string
 *                 maxLength: 100
 *               conteudo:
 *                 type: string
 *               tipo:
 *                 type: string
 *                 enum: [medica, nutricional, fisica, geral, objetivo]
 *                 default: geral
 *     responses:
 *       201:
 *         description: Observação criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ObservacaoAluno'
 *       400:
 *         description: aluno_id, titulo ou conteudo ausentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Usuário não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', createObservacao);

/**
 * @openapi
 * /api/observacoes/{id}:
 *   put:
 *     tags: [Observações]
 *     summary: Atualiza uma observação (todos os campos são opcionais)
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
 *               titulo:
 *                 type: string
 *                 maxLength: 100
 *               conteudo:
 *                 type: string
 *               tipo:
 *                 type: string
 *                 enum: [medica, nutricional, fisica, geral, objetivo]
 *     responses:
 *       200:
 *         description: Observação atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ObservacaoAluno'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Observação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', updateObservacao);

/**
 * @openapi
 * /api/observacoes/{id}:
 *   delete:
 *     tags: [Observações]
 *     summary: Remove uma observação
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
 *         description: Observação deletada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Observação deletada com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Observação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteObservacao);

export default router;
