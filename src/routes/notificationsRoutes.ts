import { Router } from 'express';
import { getNotifications } from '../controllers/notificationsController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// GET /notifications - Retorna contagem de notificações
router.get('/', authenticateToken, getNotifications);

export default router;
