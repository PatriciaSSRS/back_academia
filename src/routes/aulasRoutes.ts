import { Router } from 'express';
import {
  getAulas,
  getAula,
  createAula,
  updateAula,
  aprovarAula,
  cancelarAula,
  deleteAula,
} from '../controllers/aulasController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getAulas);
router.get('/:id', getAula);
router.post('/', createAula);
router.put('/:id', updateAula);
router.patch('/:id/aprovar', aprovarAula);
router.patch('/:id/cancelar', cancelarAula);
router.delete('/:id', deleteAula);

export default router;
