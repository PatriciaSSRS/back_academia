export interface Usuario {
  id: string;
  perfil: 'personal' | 'aluno';
  nome: string;
  telefone: string;
  email: string;
  usuario: string;
  senha: string;
  criado_em: Date;
}

export interface PasswordReset {
  id: string;
  usuario_id: string;
  token_hash: string;
  canal: 'email' | 'whatsapp';
  expira_em: Date;
  usado_em?: Date;
  criado_em: Date;
}

export interface Aluno {
  id: string;
  usuario_id: string;
  plano: 'mensal' | 'trimestral' | 'semestral' | 'aula_avulsa';
  status: 'ativo' | 'inativo';
  criado_em: Date;
}

export interface Treino {
  id: string;
  aluno_id: string;
  nome: string;
  categoria: 'hipertrofia' | 'emagrecimento';
  exercicios: any[];
  criado_em: Date;
}

export interface Avaliacao {
  id: string;
  aluno_id: string;
  data: Date;
  peso?: number;
  altura?: number;
  protocolo?: string;
  circunferencias?: Record<string, any>;
  dobras?: Record<string, any>;
  criado_em: Date;
}

export interface Pagamento {
  id: string;
  aluno_id: string;
  valor: number;
  data_vencimento: Date;
  data_pagamento?: Date;
  status: 'pendente' | 'pago' | 'vencido';
  criado_em: Date;
}

export interface Presenca {
  id: string;
  aluno_id: string;
  data: Date;
  horario: string;
  tipo: 'personal' | 'musculacao';
  status: 'confirmado' | 'cancelado';
  criado_em: Date;
}

export interface JWTPayload {
  userId: string;
  perfil: 'personal' | 'aluno';
}
