import type { Pool } from 'pg';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { newDb, DataType } from 'pg-mem';
import { DEMO_SCHEMA_SQL } from '../database/demoSchema';
import { seedDemoData } from '../database/seedDemo';

dotenv.config();

// Não há dependência de runtime do pacote `pg` real neste projeto — só o seu
// pacote de tipos (`@types/pg`), usado exclusivamente em anotações de tipo
// (Pool/PoolClient), que o TypeScript apaga na compilação. O "driver" de
// verdade usado em runtime é o adapter Pool do pg-mem, criado abaixo.

// ============================================================
// Este projeto é 100% uma API mocada de portfólio: não existe modo
// "produção" nem conexão com banco real. O "banco de dados" é sempre um
// Postgres em memória (pg-mem), recriado do zero a cada start do processo,
// populado com dados fake. Nada é persistido em disco.
// ============================================================

// Um valor Date "cai" numa coluna DATE (não timestamp) quando pg-mem o
// devolve exatamente à meia-noite UTC — DATE não guarda hora, então é assim
// que o pg-mem sempre representa esse tipo. timestamp/timestamptz "reais" à
// meia-noite exata são extremamente improváveis nesta demo (criado_em usa
// NOW(), hora_inicio/hora_fim usam horários de aula tipo 07:00–20:00).
function isDateOnlyValue(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

function normalizeRow(row: Record<string, any>): void {
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (val instanceof Date && isDateOnlyValue(val)) {
      row[key] = val.toISOString().substring(0, 10);
    }
  }
}

// Faz o pool (e qualquer client obtido via pool.connect()) normalizar DATEs
// em todo resultado, do jeito que o `pg` real + setTypeParser(1082, ...)
// faria com um Postgres de verdade.
function normalizeDemoDates(p: any): void {
  const wrapQuery = (queryFn: (...args: any[]) => Promise<any>) => {
    return async (...args: any[]) => {
      const result = await queryFn(...args);
      if (result && Array.isArray(result.rows)) {
        for (const row of result.rows) normalizeRow(row);
      }
      return result;
    };
  };

  const originalQuery = p.query.bind(p);
  p.query = wrapQuery(originalQuery);

  const originalConnect = p.connect.bind(p);
  p.connect = async (...args: any[]) => {
    const client = await originalConnect(...args);
    const originalClientQuery = client.query.bind(client);
    client.query = wrapQuery(originalClientQuery);
    return client;
  };
}

const memDb = newDb({ autoCreateForeignKeyIndices: true });

memDb.public.registerFunction({
  name: 'gen_random_uuid',
  returns: DataType.uuid,
  implementation: () => randomUUID(),
  impure: true, // sem isso, pg-mem "otimiza" e chama a função uma única vez,
                 // reusando o mesmo UUID em todo INSERT sem id explícito.
});

memDb.public.none(DEMO_SCHEMA_SQL);

const adapter = memDb.adapters.createPg();
const pool: Pool = new adapter.Pool();

// pg-mem devolve colunas DATE como objetos JS Date (meia-noite UTC), e não
// como string "YYYY-MM-DD" — diferente do `pg` real, que aqui é forçado a
// manter DATE como string (ver setTypeParser(1082, ...) acima). Sem isso,
// toda resposta JSON com uma coluna `date` (aulas.data, data_vencimento,
// plano_fim calculado, etc.) sairia como um ISO datetime completo, quebrando
// o formato que o resto do app espera. Normalizamos aqui, uma única vez,
// ao nível do pool — nenhum controller precisa saber disso.
normalizeDemoDates(pool);

// Resolvida quando o seed de dados fake termina de rodar. server.ts aguarda
// essa promise antes de aceitar requisições, pra garantir que a primeira
// requisição já encontre os dados fake prontos.
export const demoSeedReady: Promise<void> = seedDemoData(pool).catch((err: unknown) => {
  console.error('❌ Erro ao popular dados demo:', err);
  throw err;
});

export { pool };
export default pool;
