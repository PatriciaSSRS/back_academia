import { Router } from 'express';
import {
  getAvaliacoes,
  getAvaliacao,
  createAvaliacao,
  deleteAvaliacao,
} from '../controllers/avaliacoesController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getAvaliacoes);
router.get('/:id', getAvaliacao);
router.post('/', createAvaliacao);
router.delete('/:id', deleteAvaliacao);

export default router;
