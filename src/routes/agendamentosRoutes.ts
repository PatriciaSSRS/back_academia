import { Router } from 'express';
import {
  getAgendamentos,
  getAgendamento,
  createAgendamento,
  updateAgendamento,
  deleteAgendamento,
  cancelarAgendamento,
  confirmarAgendamento,
  marcarFaltou,
  marcarRealizado,
} from '../controllers/agendamentosController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getAgendamentos);
router.get('/:id', getAgendamento);
router.post('/', createAgendamento);
router.put('/:id', updateAgendamento);
router.patch('/:id', updateAgendamento);  // Aceitar PATCH também (não apenas PUT)
router.patch('/:id/cancelar', cancelarAgendamento);
router.patch('/:id/confirmar', confirmarAgendamento);
router.patch('/:id/faltou', marcarFaltou);
router.patch('/:id/realizado', marcarRealizado);
router.delete('/:id', deleteAgendamento);

export default router;
