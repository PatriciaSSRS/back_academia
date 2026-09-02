import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { errorHandler } from './middlewares/error';
import pool, { demoSeedReady } from './config/database';
import { swaggerSpec } from './config/swagger';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

// Permite múltiplas origens separadas por vírgula
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = FRONTEND_URL.split(',').map(url => url.trim());

// ============================================
// MIDDLEWARES
// ============================================

// CORS - Permitir requisições de múltiplas origens
app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: apps mobile, mesma origem, service workers)
    if (!origin) {
      return callback(null, true);
    }

    // Permite localhost em desenvolvimento
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Verifica se origin está na lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Origem bloqueada pelo CORS: ${origin}`);
      // Em desenvolvimento, permitir mesmo assim
      callback(null, process.env.NODE_ENV === 'development');
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Parse JSON
app.use(express.json());

// Parse URL-encoded
app.use(express.urlencoded({ extended: true }));

// Log de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROTAS
// ============================================

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API mocada de demonstração está funcionando!',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// DOCUMENTAÇÃO (Swagger / OpenAPI)
// ============================================

// UI interativa em /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'back_academia API — Docs',
}));

// JSON cru da spec OpenAPI (útil pra importar no Postman/Insomnia)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Rotas da API
app.use('/api', routes);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ============================================
// MIDDLEWARE DE ERRO (deve ser o último)
// ============================================
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
  try {
    // Garante que o seed de dados fake terminou antes de aceitar requisições.
    await demoSeedReady;

    // Testar conexão com o banco em memória
    const client = await pool.connect();
    console.log('✅ Banco em memória (pg-mem) pronto');
    client.release();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Servidor rodando!');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`📚 API: http://localhost:${PORT}/api`);
      console.log(`📖 Docs: http://localhost:${PORT}/api-docs`);
      console.log('');
      console.log('🎭 API mocada — dados em memória, resetam a cada reinício.');
      console.log('   Veja README.md para as credenciais de login de demo.');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido. Fechando servidor...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido. Fechando servidor...');
  await pool.end();
  process.exit(0);
});

// Iniciar
startServer();
