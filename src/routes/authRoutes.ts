import { Router } from 'express';
import {
  login,
  register,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  validateResetToken,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateToken, getCurrentUser);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/reset-password/:token/validate', validateResetToken);

export default router;
