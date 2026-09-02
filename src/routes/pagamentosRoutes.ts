import { Router } from 'express';
import {
  getPagamentos,
  getPagamento,
  createPagamento,
  pagarPagamento,
  deletePagamento,
  getRenovacoes,
} from '../controllers/pagamentosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/pagamentos/renovacoes:
 *   get:
 *     tags: [Pagamentos]
 *     summary: Lista alunos com planos vencendo em até 7 dias ou já vencidos (tela de Renovações)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alunos com renovação próxima/pendente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   usuario_id:
 *                     type: string
 *                     format: uuid
 *                   plano:
 *                     type: string
 *                   status:
 *                     type: string
 *                   frequencia_semanal:
 *                     type: integer
 *                   valor_aula:
 *                     type: number
 *                   plano_renovado_em:
 *                     type: string
 *                     format: date
 *                     nullable: true
 *                   nome:
 *                     type: string
 *                   telefone:
 *                     type: string
 *                   plano_inicio_efetivo:
 *                     type: string
 *                     format: date
 *                   plano_fim:
 *                     type: string
 *                     format: date
 *                   dias_restantes:
 *                     type: integer
 *                   renovacao_pendente:
 *                     type: boolean
 *                     description: true se já existe um pagamento tipo "renovacao" pendente para o aluno
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/renovacoes', getRenovacoes);

/**
 * @openapi
 * /api/pagamentos:
 *   get:
 *     tags: [Pagamentos]
 *     summary: Lista pagamentos, com filtros opcionais por aluno e status
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
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pendente, pago, vencido]
 *     responses:
 *       200:
 *         description: Lista de pagamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pagamento'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getPagamentos);

/**
 * @openapi
 * /api/pagamentos/{id}:
 *   get:
 *     tags: [Pagamentos]
 *     summary: Busca um pagamento pelo ID
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
 *         description: Pagamento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pagamento'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pagamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getPagamento);

/**
 * @openapi
 * /api/pagamentos:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Cria uma cobrança para um aluno
 *     description: >
 *       Se `quantidade_aulas` for informado (> 0), os créditos já são
 *       concedidos ao aluno na criação da cobrança — "pago/pendente" é só
 *       controle financeiro, não bloqueia o uso das aulas.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aluno_id, valor]
 *             properties:
 *               aluno_id:
 *                 type: string
 *                 format: uuid
 *               valor:
 *                 type: number
 *                 format: float
 *               data_vencimento:
 *                 type: string
 *                 format: date
 *                 description: Padrão é a data atual
 *               status:
 *                 type: string
 *                 enum: [pendente, pago, vencido]
 *                 default: pendente
 *               descricao:
 *                 type: string
 *               tipo:
 *                 type: string
 *                 default: normal
 *               quantidade_aulas:
 *                 type: integer
 *                 description: Se > 0, concede esse número de créditos de aula ao aluno
 *     responses:
 *       201:
 *         description: Pagamento criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pagamento'
 *       400:
 *         description: aluno_id ou valor ausentes
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
router.post('/', createPagamento);

/**
 * @openapi
 * /api/pagamentos/{id}/pagar:
 *   patch:
 *     tags: [Pagamentos]
 *     summary: Marca um pagamento como pago
 *     description: >
 *       Apenas controle financeiro — os créditos já foram concedidos na
 *       criação da cobrança, então isso não gera renovação nem novo ciclo.
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
 *               data_pagamento:
 *                 type: string
 *                 format: date
 *                 description: Padrão é a data atual
 *     responses:
 *       200:
 *         description: Pagamento atualizado para "pago"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pagamento'
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pagamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/pagar', pagarPagamento);

/**
 * @openapi
 * /api/pagamentos/{id}:
 *   delete:
 *     tags: [Pagamentos]
 *     summary: Remove um pagamento
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
 *         description: Pagamento deletado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pagamento deletado com sucesso
 *       401:
 *         description: Token ausente/inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pagamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deletePagamento);

export default router;
