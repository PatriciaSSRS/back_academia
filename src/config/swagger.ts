import swaggerJSDoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 3333;

// ============================================================
// Config do swagger-jsdoc: monta a spec OpenAPI 3.0 lendo as anotações
// @openapi (YAML) espalhadas nos comentários JSDoc de src/routes/*.ts.
// Serve tanto a UI interativa (/api-docs) quanto o JSON cru (/api-docs.json).
// ============================================================

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
  openapi: '3.0.3',
  info: {
    title: 'back_academia API',
    description:
      'API mocada de portfólio (gestão de academia/personal trainer). ' +
      'Todos os dados são fake e vivem em memória (pg-mem) — resetam a cada ' +
      'reinício do servidor. Não há banco de dados real nem integrações externas.',
    version: '1.0.0',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Servidor local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token JWT obtido em POST /api/auth/login ou POST /api/auth/register. ' +
          'Envie como header "Authorization: Bearer <token>".',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Mensagem de erro em português',
            example: 'Recurso não encontrado',
          },
          stack: {
            type: 'string',
            description: 'Stack trace (só aparece com NODE_ENV=development)',
          },
        },
        required: ['error'],
      },
      Usuario: {
        type: 'object',
        description: 'Usuário do sistema (personal trainer ou aluno). O campo "senha" nunca é retornado pela API.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          perfil: { type: 'string', enum: ['personal', 'aluno'] },
          nome: { type: 'string' },
          telefone: { type: 'string', example: '11999998888' },
          email: { type: 'string', format: 'email', nullable: true },
          usuario: { type: 'string', description: 'Nome de usuário (login), único' },
          chave_pix: { type: 'string', nullable: true },
          nome_recebedor: { type: 'string', nullable: true },
          cidade_recebedor: { type: 'string', nullable: true },
          criado_em: { type: 'string', format: 'date-time' },
        },
      },
      Aluno: {
        type: 'object',
        description: 'Aluno vinculado a um usuário. Pode incluir campos do usuário (nome, telefone, usuario) quando retornado com JOIN.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          usuario_id: { type: 'string', format: 'uuid' },
          plano: {
            type: 'string',
            enum: ['mensal', 'trimestral', 'semestral', 'anual', 'aula_avulsa'],
            nullable: true,
          },
          status: { type: 'string', enum: ['ativo', 'inativo'] },
          frequencia_semanal: { type: 'integer', minimum: 1, maximum: 7, nullable: true },
          objetivo: { type: 'string', nullable: true },
          valor_aula: { type: 'number', format: 'float', nullable: true },
          valor_plano: { type: 'number', format: 'float', nullable: true },
          creditos: { type: 'integer', description: 'Créditos do ciclo atual' },
          creditos_extras: { type: 'integer' },
          creditos_extras_validade: { type: 'string', format: 'date', nullable: true },
          vigencia_fim: { type: 'string', format: 'date', nullable: true },
          plano_renovado_em: { type: 'string', format: 'date', nullable: true },
          criado_em: { type: 'string', format: 'date-time' },
          nome: { type: 'string', description: 'Nome do usuário (quando vem com JOIN)' },
          telefone: { type: 'string', description: 'Telefone do usuário (quando vem com JOIN)' },
          usuario: { type: 'string', description: 'Login do usuário (quando vem com JOIN)' },
          plano_fim: { type: 'string', format: 'date', nullable: true, description: 'Calculado: data em que o plano atual termina' },
          aviso_vencimento: { type: 'boolean', description: 'Calculado: true se o plano vence em até 7 dias' },
        },
      },
      Aula: {
        type: 'object',
        description:
          'Tabela única que serve tanto de agendamento futuro quanto de registro de presença/execução real ' +
          '(exposta pelas rotas /aulas, /agendamentos e /presencas, cada uma com um recorte/regra de negócio própria).',
        properties: {
          id: { type: 'string', format: 'uuid' },
          aluno_id: { type: 'string', format: 'uuid' },
          data: { type: 'string', format: 'date' },
          horario: { type: 'string', example: '08:00' },
          tipo: { type: 'string', enum: ['personal', 'musculacao', 'avaliacao'] },
          status: {
            type: 'string',
            enum: ['aguardando', 'confirmado', 'aprovado', 'cancelado', 'em_andamento', 'realizado', 'faltou'],
          },
          duracao: { type: 'integer', description: 'Duração em minutos', default: 60 },
          observacoes: { type: 'string', nullable: true },
          is_reposicao: { type: 'boolean' },
          is_avulsa_extra: { type: 'boolean' },
          usou_credito: { type: 'boolean' },
          cobrar_falta: { type: 'boolean', nullable: true },
          cancelado_por: { type: 'string', enum: ['personal', 'aluno'], nullable: true },
          data_hora_cancelamento: { type: 'string', format: 'date-time', nullable: true },
          data_hora_falta: { type: 'string', format: 'date-time', nullable: true },
          hora_inicio: { type: 'string', format: 'date-time', nullable: true },
          hora_fim: { type: 'string', format: 'date-time', nullable: true },
          criado_em: { type: 'string', format: 'date-time' },
          atualizado_em: { type: 'string', format: 'date-time' },
          aluno_nome: { type: 'string', description: 'Nome do aluno (quando vem com JOIN)' },
          aluno_telefone: { type: 'string', description: 'Telefone do aluno (quando vem com JOIN)' },
        },
      },
      Pagamento: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          aluno_id: { type: 'string', format: 'uuid' },
          valor: { type: 'number', format: 'float' },
          data_vencimento: { type: 'string', format: 'date' },
          data_pagamento: { type: 'string', format: 'date', nullable: true },
          status: { type: 'string', enum: ['pendente', 'pago', 'vencido'] },
          descricao: { type: 'string', nullable: true },
          tipo: { type: 'string', example: 'normal', nullable: true },
          referencia_aula_id: { type: 'string', format: 'uuid', nullable: true },
          criado_em: { type: 'string', format: 'date-time' },
          aluno_nome: { type: 'string', description: 'Nome do aluno (quando vem com JOIN)' },
        },
      },
      Treino: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          aluno_id: { type: 'string', format: 'uuid' },
          nome: { type: 'string' },
          categoria: { type: 'string', enum: ['hipertrofia', 'emagrecimento'], nullable: true },
          exercicios: {
            type: 'array',
            items: { type: 'object' },
            description: 'Lista livre de exercícios (JSON)',
          },
          criado_em: { type: 'string', format: 'date-time' },
          aluno_nome: { type: 'string', description: 'Nome do aluno (quando vem com JOIN)' },
        },
      },
      Avaliacao: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          aluno_id: { type: 'string', format: 'uuid' },
          data: { type: 'string', format: 'date' },
          peso: { type: 'number', format: 'float', nullable: true, description: 'kg — entre 20 e 300' },
          altura: { type: 'number', format: 'float', nullable: true, description: 'metros — entre 0.5 e 2.5' },
          idade: { type: 'integer', nullable: true },
          sexo: { type: 'string', nullable: true },
          imc: { type: 'number', format: 'float', nullable: true },
          gordura_corporal: { type: 'number', format: 'float', nullable: true },
          massa_muscular: { type: 'number', format: 'float', nullable: true },
          protocolo: { type: 'string', nullable: true },
          circunferencias: { type: 'object', nullable: true },
          dobras: { type: 'object', nullable: true },
          observacoes: { type: 'string', nullable: true },
          criado_em: { type: 'string', format: 'date-time' },
          aluno_nome: { type: 'string', description: 'Nome do aluno (quando vem com JOIN)' },
        },
      },
      Mensagem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          remetente_id: { type: 'string', format: 'uuid' },
          destinatario_id: { type: 'string', format: 'uuid' },
          texto: { type: 'string' },
          lida: { type: 'boolean' },
          criado_em: { type: 'string', format: 'date-time' },
          remetente_nome: { type: 'string' },
          destinatario_nome: { type: 'string' },
        },
      },
      ObservacaoAluno: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          aluno_id: { type: 'string', format: 'uuid' },
          personal_id: { type: 'string', format: 'uuid' },
          titulo: { type: 'string', maxLength: 100 },
          conteudo: { type: 'string' },
          tipo: { type: 'string', enum: ['medica', 'nutricional', 'fisica', 'geral', 'objetivo'] },
          lida: { type: 'boolean' },
          criado_em: { type: 'string', format: 'date-time' },
          atualizado_em: { type: 'string', format: 'date-time' },
          personal_nome: { type: 'string', description: 'Nome do personal (quando vem com JOIN)' },
        },
      },
      ModeloTreino: {
        type: 'object',
        description: 'Modelo de treino reutilizável, pertence ao personal autenticado.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          personal_id: { type: 'string', format: 'uuid' },
          nome: { type: 'string' },
          categoria: { type: 'string', nullable: true },
          exercicios: {
            type: 'array',
            items: { type: 'object' },
          },
          criado_em: { type: 'string', format: 'date-time' },
          atualizado_em: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
