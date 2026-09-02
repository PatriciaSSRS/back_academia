import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getConversas,
  getMensagens,
  enviarMensagem,
  marcarComoLida,
  contarNaoLidas,
} from '../controllers/mensagensController';

const router = Router();

/**
 * @openapi
 * /api/mensagens/conversas:
 *   get:
 *     tags: [Mensagens]
 *     summary: Lista as conversas do usuário autenticado (última mensagem + total de não lidas por contato)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de conversas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   usuario_id:
 *                     type: string
 *                     format: uuid
 *                   nome:
 *                     type: string
 *                   ultima_mensagem:
 *                     type: string
 *                   ultima_mensagem_data:
 *                     type: string
 *                     format: date-time
 *                   nao_lidas:
 *                     type: integer
 *       401:
 *         description: Usuário não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/mensagens/conversas - Listar conversas
router.get('/conversas', authenticateToken, getConversas);

/**
 * @openapi
 * /api/mensagens/nao-lidas/total:
 *   get:
 *     tags: [Mensagens]
 *     summary: Conta o total de mensagens não lidas do usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total de mensagens não lidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *       401:
 *         description: Usuário não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/mensagens/nao-lidas/total - Contar mensagens não lidas
router.get('/nao-lidas/total', authenticateToken, contarNaoLidas);

/**
 * @openapi
 * /api/mensagens/{contato_id}:
 *   get:
 *     tags: [Mensagens]
 *     summary: Lista as mensagens trocadas entre o usuário autenticado e um contato
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contato_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de mensagens (ordem cronológica)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mensagem'
 *       401:
 *         description: Usuário não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/mensagens/:contato_id - Listar mensagens com um contato
router.get('/:contato_id', authenticateToken, getMensagens);

/**
 * @openapi
 * /api/mensagens:
 *   post:
 *     tags: [Mensagens]
 *     summary: Envia uma mensagem para outro usuário
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [destinatario_id, texto]
 *             properties:
 *               destinatario_id:
 *                 type: string
 *                 format: uuid
 *               texto:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mensagem enviada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mensagem'
 *       400:
 *         description: destinatario_id ou texto ausentes/vazios
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
// POST /api/mensagens - Enviar mensagem
router.post('/', authenticateToken, enviarMensagem);

/**
 * @openapi
 * /api/mensagens/marcar-lida:
 *   put:
 *     tags: [Mensagens]
 *     summary: Marca como lidas todas as mensagens recebidas de um remetente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [remetente_id]
 *             properties:
 *               remetente_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Mensagens marcadas como lidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Mensagens marcadas como lidas
 *                 total:
 *                   type: integer
 *                   description: Quantidade de mensagens afetadas
 *       400:
 *         description: remetente_id ausente
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
// PUT /api/mensagens/marcar-lida - Marcar mensagens como lidas
router.put('/marcar-lida', authenticateToken, marcarComoLida);

export default router;
