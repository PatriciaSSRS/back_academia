import { Router } from 'express';
import {
  getPresencas,
  getPresenca,
  createPresenca,
  updatePresenca,
  deletePresenca,
  getAgendaHoje,
  iniciarPresenca,
  finalizarPresenca,
  marcarFalta,
  cancelarAula,
  getHistoricoPorDia,
} from '../controllers/presencasController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Rotas de controle diário
router.get('/agenda/hoje', getAgendaHoje);
router.get('/historico/por-dia', getHistoricoPorDia);
router.patch('/:id/iniciar', iniciarPresenca);
router.patch('/:id/finalizar', finalizarPresenca);
router.patch('/:id/falta', marcarFalta);
router.patch('/:id/cancelar', cancelarAula);

// Rotas CRUD padrão
router.get('/', getPresencas);
router.get('/:id', getPresenca);
router.post('/', createPresenca);
router.put('/:id', updatePresenca);
router.delete('/:id', deletePresenca);

export default router;
