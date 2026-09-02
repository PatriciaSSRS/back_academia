import { Router } from 'express';
import {
  getModelos,
  getModelo,
  createModelo,
  updateModelo,
  deleteModelo,
} from '../controllers/modelosTreinoController';
import { authenticateToken, requirePersonal } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);
router.use(requirePersonal);

router.get('/', getModelos);
router.get('/:id', getModelo);
router.post('/', createModelo);
router.put('/:id', updateModelo);
router.delete('/:id', deleteModelo);

export default router;
