import { Router } from 'express';
import { getNotifications } from '../controllers/notificationsController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notificações]
 *     summary: Retorna contagens de notificações do usuário autenticado
 *     description: >
 *       O formato da resposta muda conforme o perfil: personal recebe
 *       `{ mensagens, observacoes, alunos }`; aluno recebe `{ mensagens, notas }`.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contagens de notificações
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Resposta quando o perfil autenticado é "personal"
 *                   properties:
 *                     mensagens:
 *                       type: integer
 *                     observacoes:
 *                       type: integer
 *                       description: Observações atualizadas nas últimas 24h
 *                     alunos:
 *                       type: integer
 *                       example: 0
 *                 - type: object
 *                   description: Resposta quando o perfil autenticado é "aluno"
 *                   properties:
 *                     mensagens:
 *                       type: integer
 *                     notas:
 *                       type: integer
 *                       description: Observações não lidas sobre o aluno
 *       400:
 *         description: Perfil inválido no token
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
// GET /notifications - Retorna contagem de notificações
router.get('/', authenticateToken, getNotifications);

export default router;
