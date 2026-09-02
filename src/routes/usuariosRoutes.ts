import { Router } from 'express';
import { getUsuarios, getUsuario, getPixRecebedor, updatePix } from '../controllers/usuariosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Rotas específicas antes de /:id para não colidir
router.get('/pix-recebedor', getPixRecebedor);
router.put('/pix', updatePix);

router.get('/', getUsuarios);
router.get('/:id', getUsuario);

export default router;
