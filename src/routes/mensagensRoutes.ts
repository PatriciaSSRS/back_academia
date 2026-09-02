import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getConversas,
  getMensagens,
  enviarMensagem,
  marcarComoLida,
  contarNaoLidas,
} from '../controllers/mensagensController';

const router = Router();

// GET /api/mensagens/conversas - Listar conversas
router.get('/conversas', authenticateToken, getConversas);

// GET /api/mensagens/nao-lidas/total - Contar mensagens não lidas
router.get('/nao-lidas/total', authenticateToken, contarNaoLidas);

// GET /api/mensagens/:contato_id - Listar mensagens com um contato
router.get('/:contato_id', authenticateToken, getMensagens);

// POST /api/mensagens - Enviar mensagem
router.post('/', authenticateToken, enviarMensagem);

// PUT /api/mensagens/marcar-lida - Marcar mensagens como lidas
router.put('/marcar-lida', authenticateToken, marcarComoLida);

export default router;
