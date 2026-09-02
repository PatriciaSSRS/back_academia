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

router.get('/', getObservacoes);
router.get('/:id', getObservacao);
router.post('/', createObservacao);
router.put('/:id', updateObservacao);
router.delete('/:id', deleteObservacao);

export default router;
