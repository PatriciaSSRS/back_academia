import type { PoolClient } from 'pg';
import pool from '../config/database';

/**
 * Executa múltiplas operações dentro de uma transação
 * Se qualquer operação falhar, TODAS são revertidas (ROLLBACK)
 * Se todas tiverem sucesso, são confirmadas (COMMIT)
 * 
 * @param callback - Função que recebe o client e executa as operações
 * @returns Resultado da transação
 * 
 * @example
 * await withTransaction(async (client) => {
 *   await client.query('INSERT INTO aulas ...');
 *   await client.query('INSERT INTO pagamentos ...');
 *   return result;
 * });
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    // Inicia transação
    await client.query('BEGIN');
    console.log('🔄 Transação iniciada');
    
    // Executa operações
    const result = await callback(client);
    
    // Se tudo der certo, confirma (COMMIT)
    await client.query('COMMIT');
    console.log('✅ Transação confirmada (COMMIT)');
    
    return result;
  } catch (error) {
    // Se algo falhar, desfaz tudo (ROLLBACK)
    await client.query('ROLLBACK');
    console.error('❌ Transação revertida (ROLLBACK):', error);
    throw error;
  } finally {
    // Sempre libera a conexão de volta ao pool
    client.release();
  }
}

/**
 * Versão alternativa que permite controle manual da transação
 */
export class Transaction {
  private client: PoolClient | null = null;
  private active = false;

  async begin() {
    this.client = await pool.connect();
    await this.client.query('BEGIN');
    this.active = true;
    console.log('🔄 Transação manual iniciada');
  }

  async commit() {
    if (!this.client || !this.active) {
      throw new Error('Nenhuma transação ativa');
    }
    await this.client.query('COMMIT');
    this.active = false;
    console.log('✅ Transação manual confirmada (COMMIT)');
    this.client.release();
  }

  async rollback() {
    if (!this.client || !this.active) {
      throw new Error('Nenhuma transação ativa');
    }
    await this.client.query('ROLLBACK');
    this.active = false;
    console.error('❌ Transação manual revertida (ROLLBACK)');
    this.client.release();
  }

  query(text: string, params?: any[]) {
    if (!this.client || !this.active) {
      throw new Error('Nenhuma transação ativa');
    }
    return this.client.query(text, params);
  }
}
