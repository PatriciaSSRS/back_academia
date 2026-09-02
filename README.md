# back_academia

API REST **100% mocada**, feita para portfólio: simula o backend de um app
de gestão de academia/personal trainer (alunos, treinos, agendamentos,
presenças, pagamentos, avaliações...). O front que consome essa API está em
[`front_academia`](https://github.com/PatriciaSSRS/front_academia).

Não existe nenhuma conexão com banco de dados real, nenhum segredo, nenhuma
integração externa de verdade. O "banco de dados" é um Postgres **em
memória** (via [pg-mem](https://github.com/oguimbal/pg-mem)), recriado e
populado com dados fake toda vez que o servidor sobe.

**Os dados resetam a cada reinício do servidor.**

## Como rodar

```bash
npm install
npm run dev
```

A API sobe em `http://localhost:3333` (ajustável via `PORT` no `.env`, veja
`.env.example`).

- `GET /health` — healthcheck
- `GET /api/...` — recursos da API (veja `src/routes/`)

## 📖 Documentação interativa (Swagger)

Com o servidor rodando (`npm run dev`), abra
[`http://localhost:3333/api-docs`](http://localhost:3333/api-docs) no
navegador para ver a documentação OpenAPI/Swagger completa da API: todos os
métodos, endpoints, parâmetros e o formato de retorno (schemas) de cada
rota — e testar cada uma direto pela UI, sem precisar do Postman/Insomnia.

Se preferir importar a spec em outra ferramenta, o JSON cru fica disponível
em [`http://localhost:3333/api-docs.json`](http://localhost:3333/api-docs.json).

**Autenticando pela própria UI:**

1. Abra `POST /api/auth/login`, clique em "Try it out" e envie, por exemplo,
   `{"identificador":"demo","senha":"demo123","perfil":"personal"}`.
2. Copie o valor do campo `token` da resposta.
3. Clique no botão **Authorize** (cadeado, no topo da página), cole o token
   (sem o prefixo `Bearer `, o Swagger já adiciona) e confirme.
4. A partir daí, toda rota marcada com o cadeado passa a enviar o header
   `Authorization: Bearer <token>` automaticamente nas chamadas de teste.

## Credenciais de demo

Todos os usuários usam a senha `demo123`.

**Personal trainer**
- usuário: `demo`
- senha: `demo123`

**Alunos** (usuário / senha):

| Usuário | Nome |
|---|---|
| `ana.costa` | Ana Beatriz Costa |
| `bruno.santos` | Bruno Almeida Santos |
| `carla.lima` | Carla Fernandes Lima |
| `diego.oliveira` | Diego Rodrigues Oliveira |
| `fernanda.pereira` | Fernanda Souza Pereira |
| `gustavo.martins` | Gustavo Henrique Martins |
| `juliana.alves` | Juliana Ribeiro Alves |
| `rafael.costa` | Rafael Nogueira Costa |

Todos com senha `demo123`.

Exemplo de login:

```bash
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identificador":"demo","senha":"demo123","perfil":"personal"}'
```

## Sobre os "envios" de email/WhatsApp

O fluxo de "esqueci minha senha" existe e funciona ponta a ponta, mas nunca
manda email ou WhatsApp de verdade — qualquer "envio" é só um log no console
do servidor com o conteúdo que seria enviado (veja
`src/services/emailService.ts` e `src/services/whatsappService.ts`). Não há
nenhuma chamada de rede para um provedor externo.

## Stack

Express + TypeScript + pg-mem (Postgres em memória) + JWT + bcrypt.

## Estrutura

```
src/
  config/database.ts   # monta o Postgres em memória e roda o seed
  database/             # schema (demoSchema.ts) e dados fake (seedDemo.ts)
  controllers/           # regras de negócio de cada recurso
  routes/                 # definição das rotas REST
  middlewares/            # autenticação (JWT) e tratamento de erros
  services/                # mocks de email/WhatsApp (só console.log)
  types/, utils/           # tipos compartilhados e helpers
```
