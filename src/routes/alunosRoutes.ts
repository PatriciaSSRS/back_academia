import { Router } from 'express';
import {
  getAlunos,
  getAluno,
  createAluno,
  updateAluno,
  deleteAluno,
  getPresencasAluno,
  getProgressoAulas,
  recarregarCreditos,
} from '../controllers/alunosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/alunos:
 *   get:
 *     tags: [Alunos]
 *     summary: Lista todos os alunos (com dados do usuário e vencimento do plano calculado)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alunos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Aluno'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getAlunos);

/**
 * @openapi
 * /api/alunos/{id}:
 *   get:
 *     tags: [Alunos]
 *     summary: Busca um aluno pelo ID (com dados do usuário)
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
 *         description: Aluno encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aluno'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aluno não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getAluno);

/**
 * @openapi
 * /api/alunos:
 *   post:
 *     tags: [Alunos]
 *     summary: Cadastra um aluno (vincula um usuário existente a um plano)
 *     description: >
 *       O cadastro não gera cobrança automática — o plano é só rótulo; os
 *       créditos entram por cobrança manual (POST /api/pagamentos) ou recarga
 *       (POST /api/alunos/{id}/creditos).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario_id, plano]
 *             properties:
 *               usuario_id:
 *                 type: string
 *                 format: uuid
 *               plano:
 *                 type: string
 *                 enum: [mensal, trimestral, semestral, anual, aula_avulsa]
 *               status:
 *                 type: string
 *                 enum: [ativo, inativo]
 *                 default: ativo
 *               frequencia_semanal:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *                 default: 2
 *               objetivo:
 *                 type: string
 *               valor_aula:
 *                 type: number
 *                 format: float
 *               valor_plano:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: Aluno criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aluno'
 *       400:
 *         description: usuario_id ou plano ausentes
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
router.post('/', createAluno);

/**
 * @openapi
 * /api/alunos/{id}:
 *   put:
 *     tags: [Alunos]
 *     summary: Atualiza dados de um aluno (todos os campos são opcionais)
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
 *               plano:
 *                 type: string
 *                 enum: [mensal, trimestral, semestral, anual, aula_avulsa]
 *               status:
 *                 type: string
 *                 enum: [ativo, inativo]
 *               frequencia_semanal:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *               objetivo:
 *                 type: string
 *               valor_aula:
 *                 type: number
 *                 format: float
 *               valor_plano:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Aluno atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aluno'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aluno não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', updateAluno);

/**
 * @openapi
 * /api/alunos/{id}:
 *   delete:
 *     tags: [Alunos]
 *     summary: Remove um aluno
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
 *         description: Aluno deletado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Aluno deletado com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aluno não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteAluno);

/**
 * @openapi
 * /api/alunos/{id}/presencas:
 *   get:
 *     tags: [Alunos]
 *     summary: Conta as presenças confirmadas do aluno (tabela legada "presencas")
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
 *         description: Total de presenças confirmadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 presencas:
 *                   type: integer
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/presencas', getPresencasAluno);

/**
 * @openapi
 * /api/alunos/{id}/progresso-aulas:
 *   get:
 *     tags: [Alunos]
 *     summary: Retorna o progresso semanal de aulas, reposições, créditos e vencimento do plano do aluno
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: data
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de referência (padrão é hoje) usada para localizar a "semana atual"
 *     responses:
 *       200:
 *         description: Progresso calculado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 aluno_id:
 *                   type: string
 *                   format: uuid
 *                 nome:
 *                   type: string
 *                 plano:
 *                   type: string
 *                 periodo:
 *                   type: object
 *                   properties:
 *                     inicio:
 *                       type: string
 *                       format: date
 *                     fim:
 *                       type: string
 *                       format: date
 *                 numero_semana:
 *                   type: integer
 *                 frequencia_semanal:
 *                   type: integer
 *                 total_esperado:
 *                   type: integer
 *                 aulas_feitas:
 *                   type: integer
 *                 aulas_agendadas:
 *                   type: integer
 *                 aulas_restantes:
 *                   type: integer
 *                 reposicoes_pendentes:
 *                   type: integer
 *                 reposicoes_agendadas:
 *                   type: integer
 *                 reposicoes_feitas_semana:
 *                   type: integer
 *                 percentual:
 *                   type: integer
 *                 plano_inicio:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                 plano_fim:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                 dias_restantes_plano:
 *                   type: integer
 *                   nullable: true
 *                 aviso_vencimento:
 *                   type: boolean
 *                 creditos_restantes:
 *                   type: integer
 *                 creditos_ciclo:
 *                   type: integer
 *                 creditos_extras:
 *                   type: integer
 *                 creditos_extras_validade:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                 vigencia_fim:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Aluno não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/progresso-aulas', getProgressoAulas);

/**
 * @openapi
 * /api/alunos/{id}/creditos:
 *   post:
 *     tags: [Alunos]
 *     summary: Recarga manual de créditos (o personal adiciona/ajusta o saldo do aluno)
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantidade]
 *             properties:
 *               quantidade:
 *                 type: integer
 *                 description: Quantidade a adicionar (pode ser negativa para ajuste); não pode ser 0
 *                 example: 4
 *               descricao:
 *                 type: string
 *                 default: Recarga manual
 *     responses:
 *       200:
 *         description: Saldo de créditos atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 aluno_id:
 *                   type: string
 *                   format: uuid
 *                 saldo_creditos:
 *                   type: integer
 *       400:
 *         description: Quantidade inválida (ausente, não numérica ou igual a zero)
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
router.post('/:id/creditos', recarregarCreditos);

export default router;
