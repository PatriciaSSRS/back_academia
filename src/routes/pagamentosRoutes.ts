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

router.get('/renovacoes', getRenovacoes);
router.get('/', getPagamentos);
router.get('/:id', getPagamento);
router.post('/', createPagamento);
router.patch('/:id/pagar', pagarPagamento);
router.delete('/:id', deletePagamento);

export default router;
