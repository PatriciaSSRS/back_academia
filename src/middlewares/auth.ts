import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

export function requirePersonal(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.perfil !== 'personal') {
    return res.status(403).json({ error: 'Acesso negado. Apenas personal trainers.' });
  }
  next();
}
