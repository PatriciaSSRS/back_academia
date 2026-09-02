import { Router } from 'express';
import authRoutes from './authRoutes';
import usuariosRoutes from './usuariosRoutes';
import alunosRoutes from './alunosRoutes';
import treinosRoutes from './treinosRoutes';
import modelosTreinoRoutes from './modelosTreinoRoutes';
import avaliacoesRoutes from './avaliacoesRoutes';
import pagamentosRoutes from './pagamentosRoutes';
import presencasRoutes from './presencasRoutes';
import agendamentosRoutes from './agendamentosRoutes';
import aulasRoutes from './aulasRoutes';
import mensagensRoutes from './mensagensRoutes';
import observacoesRoutes from './observacoesRoutes';
import notificationsRoutes from './notificationsRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/alunos', alunosRoutes);
router.use('/treinos', treinosRoutes);
router.use('/modelos-treino', modelosTreinoRoutes);
router.use('/avaliacoes', avaliacoesRoutes);
router.use('/pagamentos', pagamentosRoutes);
router.use('/presencas', presencasRoutes);
router.use('/agendamentos', agendamentosRoutes);
router.use('/aulas', aulasRoutes);
router.use('/mensagens', mensagensRoutes);
router.use('/observacoes', observacoesRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
