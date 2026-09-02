import { Router } from 'express';
import {
  login,
  register,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  validateResetToken,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Login flexível por usuário, email ou telefone
 *     description: >
 *       O campo `identificador` aceita nome de usuário, email ou telefone —
 *       o tipo é detectado automaticamente (contém "@" → email; parece
 *       telefone → telefone; senão → usuário).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identificador, senha, perfil]
 *             properties:
 *               identificador:
 *                 type: string
 *                 description: Usuário, email ou telefone
 *                 example: demo
 *               senha:
 *                 type: string
 *                 example: demo123
 *               perfil:
 *                 type: string
 *                 enum: [personal, aluno]
 *                 example: personal
 *     responses:
 *       200:
 *         description: Login efetuado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT (sem expiração — o usuário só sai ao clicar em "sair")
 *                 user:
 *                   $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Campos obrigatórios ausentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Senha incorreta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuário/email/telefone não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', login);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Autenticação]
 *     summary: Cria uma nova conta (usuário)
 *     description: >
 *       Não cria automaticamente um registro em `alunos` — o aluno só passa a
 *       existir no sistema quando o personal o adiciona manualmente.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, telefone, email, usuario, senha, perfil]
 *             properties:
 *               nome:
 *                 type: string
 *               telefone:
 *                 type: string
 *                 example: (11) 99999-8888
 *               email:
 *                 type: string
 *                 format: email
 *               usuario:
 *                 type: string
 *                 description: Nome de usuário desejado (único)
 *               senha:
 *                 type: string
 *                 minLength: 4
 *               perfil:
 *                 type: string
 *                 enum: [personal, aluno]
 *     responses:
 *       201:
 *         description: Conta criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Campo obrigatório ausente, email/telefone/senha inválidos ou perfil inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Nome de usuário, email ou telefone já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', register);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Autenticação]
 *     summary: Retorna os dados do usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário atual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token ausente/inválido, ou usuário não autenticado
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
router.get('/me', authenticateToken, getCurrentUser);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Autenticação]
 *     summary: Solicita recuperação de senha (por email ou telefone)
 *     description: >
 *       Gera um link de redefinição com validade de 1 hora. O "envio" é
 *       apenas um log no console do servidor (não há email/WhatsApp real).
 *       Limite de 5 tentativas por identificador a cada hora.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identificador]
 *             properties:
 *               identificador:
 *                 type: string
 *                 description: Email ou telefone cadastrado
 *     responses:
 *       200:
 *         description: Link de recuperação gerado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Identificador ausente ou não é email/telefone válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Email/telefone não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Muitas tentativas — aguarde antes de tentar novamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Autenticação]
 *     summary: Redefine a senha usando o token recebido em forgot-password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, novaSenha]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token bruto recebido no link de recuperação
 *               novaSenha:
 *                 type: string
 *                 minLength: 4
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Senha alterada com sucesso!
 *       400:
 *         description: Token/senha ausentes, senha muito curta, ou link inválido/expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', resetPassword);

/**
 * @openapi
 * /api/auth/reset-password/{token}/validate:
 *   get:
 *     tags: [Autenticação]
 *     summary: Valida se um token de redefinição de senha ainda é válido
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token bruto recebido no link de recuperação
 *     responses:
 *       200:
 *         description: Resultado da validação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 */
router.get('/reset-password/:token/validate', validateResetToken);

export default router;
