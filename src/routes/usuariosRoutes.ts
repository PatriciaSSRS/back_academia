import { Router } from 'express';
import { getUsuarios, getUsuario, getPixRecebedor, updatePix } from '../controllers/usuariosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Rotas específicas antes de /:id para não colidir

/**
 * @openapi
 * /api/usuarios/pix-recebedor:
 *   get:
 *     tags: [Usuários]
 *     summary: Retorna a chave PIX do personal (recebedor) para pagamento
 *     description: >
 *       App single-personal: retorna sempre o único usuário perfil=personal.
 *       Acessível tanto por personal quanto por aluno (o aluno precisa da
 *       chave para pagar).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados de recebimento PIX
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chave_pix:
 *                   type: string
 *                 nome_recebedor:
 *                   type: string
 *                 cidade_recebedor:
 *                   type: string
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/pix-recebedor', getPixRecebedor);

/**
 * @openapi
 * /api/usuarios/pix:
 *   put:
 *     tags: [Usuários]
 *     summary: Atualiza a chave PIX do personal autenticado
 *     description: Apenas usuários com perfil "personal" podem chamar esta rota.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chave_pix:
 *                 type: string
 *               nome_recebedor:
 *                 type: string
 *               cidade_recebedor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chave PIX atualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chave_pix:
 *                   type: string
 *                 nome_recebedor:
 *                   type: string
 *                 cidade_recebedor:
 *                   type: string
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Apenas o personal pode configurar a chave PIX
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/pix', updatePix);

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     tags: [Usuários]
 *     summary: Lista todos os usuários (sem a senha)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getUsuarios);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuários]
 *     summary: Busca um usuário pelo ID (sem a senha)
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
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getUsuario);

export default router;
