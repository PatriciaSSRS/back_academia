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

router.get('/', getAlunos);
router.get('/:id', getAluno);
router.post('/', createAluno);
router.put('/:id', updateAluno);
router.delete('/:id', deleteAluno);
router.get('/:id/presencas', getPresencasAluno);
router.get('/:id/progresso-aulas', getProgressoAulas);
router.post('/:id/creditos', recarregarCreditos);

export default router;
