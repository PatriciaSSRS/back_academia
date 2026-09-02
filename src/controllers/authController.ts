import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AppError } from '../middlewares/error';
import { Usuario } from '../types';
import { AuthRequest } from '../middlewares/auth';
import { isLikelyPhone, normalizePhoneBR } from '../utils/phone';
import { isEmailConfigured, sendPasswordResetEmail } from '../services/emailService';
import { isWhatsappConfigured, sendPasswordResetWhatsapp } from '../services/whatsappService';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta';
// Sem expiresIn: o usuário só sai da conta se clicar em "sair" manualmente.
const APP_URL = process.env.APP_URL || process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

type IdentificadorTipo = 'email' | 'telefone' | 'usuario';

function detectarTipoIdentificador(identificador: string): IdentificadorTipo {
  if (identificador.includes('@')) return 'email';
  if (isLikelyPhone(identificador)) return 'telefone';
  return 'usuario';
}

function normalizarPorTipo(identificador: string, tipo: IdentificadorTipo): string {
  if (tipo === 'email') return identificador.trim().toLowerCase();
  if (tipo === 'telefone') return normalizePhoneBR(identificador);
  return identificador.trim().toLowerCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limit simples em memória: máx. 5 pedidos de recuperação por identificador/hora.
const forgotPasswordAttempts = new Map<string, number[]>();
function podeTemtarRecuperacao(chave: string): boolean {
  const agora = Date.now();
  const tentativas = (forgotPasswordAttempts.get(chave) || []).filter((t) => agora - t < 60 * 60 * 1000);
  tentativas.push(agora);
  forgotPasswordAttempts.set(chave, tentativas);
  return tentativas.length <= 5;
}

function assinarToken(userId: string, perfil: string): string {
  return jwt.sign({ userId, perfil }, JWT_SECRET);
}

export async function login(req: Request, res: Response) {
  try {
    const { identificador, senha, perfil } = req.body;

    if (!identificador || !senha || !perfil) {
      throw new AppError('Usuário/email/telefone, senha e perfil são obrigatórios', 400);
    }

    const tipo = detectarTipoIdentificador(String(identificador));
    const valor = normalizarPorTipo(String(identificador), tipo);

    const result = await pool.query<Usuario>(
      `SELECT * FROM usuarios WHERE ${tipo} = $1 AND perfil = $2`,
      [valor, perfil]
    );

    if (result.rows.length === 0) {
      const rotulo = tipo === 'email' ? 'Email' : tipo === 'telefone' ? 'Telefone' : 'Usuário';
      throw new AppError(`${rotulo} não encontrado`, 404);
    }

    const user = result.rows[0];

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      throw new AppError('Senha incorreta', 401);
    }

    const token = assinarToken(user.id, user.perfil);
    const { senha: _, ...userSemSenha } = user;

    res.json({
      token,
      user: userSemSenha,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { nome, telefone, email, usuario, senha, perfil } = req.body;

    if (!nome || !telefone || !email || !usuario || !senha || !perfil) {
      throw new AppError('Nome, telefone, email, usuário e senha são obrigatórios', 400);
    }

    if (!EMAIL_REGEX.test(String(email).trim())) {
      throw new AppError('Email inválido', 400);
    }

    const telefoneNormalizado = normalizePhoneBR(String(telefone));
    if (telefoneNormalizado.length < 10 || telefoneNormalizado.length > 11) {
      throw new AppError('Telefone inválido. Use formato: (00) 00000-0000', 400);
    }

    if (senha.length < 4) {
      throw new AppError('A senha deve ter pelo menos 4 caracteres', 400);
    }

    if (!['personal', 'aluno'].includes(perfil)) {
      throw new AppError('Perfil inválido', 400);
    }

    const emailNormalizado = String(email).trim().toLowerCase();
    const usuarioNormalizado = String(usuario).trim().toLowerCase();

    const existingUsuario = await pool.query('SELECT usuario FROM usuarios WHERE usuario = $1', [usuarioNormalizado]);
    if (existingUsuario.rows.length > 0) {
      throw new AppError('Nome de usuário já existe', 409);
    }

    const existingEmail = await pool.query('SELECT email FROM usuarios WHERE email = $1', [emailNormalizado]);
    if (existingEmail.rows.length > 0) {
      throw new AppError('Email já cadastrado', 409);
    }

    const existingTelefone = await pool.query('SELECT telefone FROM usuarios WHERE telefone = $1', [telefoneNormalizado]);
    if (existingTelefone.rows.length > 0) {
      throw new AppError('Telefone já cadastrado', 409);
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.query<Usuario>(
      `INSERT INTO usuarios (perfil, nome, telefone, email, usuario, senha)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [perfil, nome, telefoneNormalizado, emailNormalizado, usuarioNormalizado, senhaHash]
    );

    const newUser = result.rows[0];

    // NÃO cria mais o registro em `alunos` automaticamente.
    // O aluno só passa a existir no sistema quando o PERSONAL o adiciona
    // manualmente (escolhendo o plano) — isso dispara a cobrança e, ao ser
    // paga e confirmada, gera os créditos. (fluxo estilo Hubiq)

    const token = assinarToken(newUser.id, newUser.perfil);
    const { senha: _, ...userSemSenha } = newUser;

    res.status(201).json({
      token,
      user: userSemSenha,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    const result = await pool.query<Usuario>(
      'SELECT * FROM usuarios WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404);
    }

    const user = result.rows[0];
    const { senha: _, ...userSemSenha } = user;

    res.json({
      user: userSemSenha,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { identificador } = req.body;

    if (!identificador) {
      throw new AppError('Informe seu email ou telefone', 400);
    }

    const tipo = detectarTipoIdentificador(String(identificador));
    if (tipo === 'usuario') {
      throw new AppError('Informe um email ou telefone válido', 400);
    }
    const valor = normalizarPorTipo(String(identificador), tipo);

    if (!podeTemtarRecuperacao(valor)) {
      throw new AppError('Muitas tentativas. Aguarde um pouco antes de tentar novamente.', 429);
    }

    const result = await pool.query<Usuario>(`SELECT * FROM usuarios WHERE ${tipo} = $1`, [valor]);

    if (result.rows.length === 0) {
      const rotulo = tipo === 'email' ? 'Email' : 'Telefone';
      throw new AppError(`${rotulo} não encontrado`, 404);
    }

    const user = result.rows[0];

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const canal: 'email' | 'whatsapp' = tipo === 'email' ? 'email' : 'whatsapp';

    // Calcula a expiração no próprio Postgres (NOW() + intervalo), em vez de
    // um Date do Node: o driver `pg` serializa objetos Date usando o fuso
    // horário LOCAL do processo, o que grava um horário errado em colunas
    // `timestamp without time zone` quando o processo não roda em UTC.
    await pool.query(
      `INSERT INTO password_resets (usuario_id, token_hash, canal, expira_em)
       VALUES ($1, $2, $3, NOW() + ($4 || ' milliseconds')::interval)`,
      [user.id, tokenHash, canal, RESET_TOKEN_TTL_MS]
    );

    const resetLink = `${APP_URL}/redefinir-senha?token=${rawToken}`;

    if (canal === 'email') {
      await sendPasswordResetEmail(user.email, user.nome, resetLink);
      res.json({
        message: isEmailConfigured()
          ? 'Enviamos um link de recuperação para o seu email.'
          : 'Link de recuperação gerado, mas o envio automático de email ainda não está configurado. Contate o suporte.',
      });
    } else {
      await sendPasswordResetWhatsapp(user.telefone, resetLink);
      res.json({
        message: isWhatsappConfigured()
          ? 'Enviamos um link de recuperação para o seu WhatsApp.'
          : 'Link de recuperação gerado, mas o envio automático de WhatsApp ainda não está configurado. Contate o suporte.',
      });
    }
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao solicitar recuperação de senha:', error);
    res.status(500).json({ error: 'Erro ao solicitar recuperação de senha' });
  }
}

export async function validateResetToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.json({ valid: false });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT id FROM password_resets
       WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > NOW()`,
      [tokenHash]
    );

    res.json({ valid: result.rows.length > 0 });
  } catch (error) {
    console.error('Erro ao validar token de recuperação:', error);
    res.status(500).json({ error: 'Erro ao validar link de recuperação' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      throw new AppError('Token e nova senha são obrigatórios', 400);
    }

    if (novaSenha.length < 4) {
      throw new AppError('A senha deve ter pelo menos 4 caracteres', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const result = await pool.query<{ id: string; usuario_id: string }>(
      `SELECT id, usuario_id FROM password_resets
       WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AppError('Link inválido ou expirado. Solicite uma nova recuperação de senha.', 400);
    }

    const { id: resetId, usuario_id: usuarioId } = result.rows[0];
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senhaHash, usuarioId]);
    await pool.query('UPDATE password_resets SET usado_em = NOW() WHERE id = $1', [resetId]);

    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
}
