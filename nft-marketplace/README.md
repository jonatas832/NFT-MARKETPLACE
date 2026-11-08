# NFT Marketplace — Desafio Frontend

React + TypeScript + TanStack Router/Query + Axios + Socket.IO + Tailwind + shadcn/ui (Radix + CVA) + MSW + Playwright + Lighthouse.
Toda a API REST e o tempo real são **simulados com MSW** (inclusive Socket.IO via `@mswjs/socket.io-binding`).

## Setup
```bash
npm install            # o postinstall gera public/mockServiceWorker.js (msw init)
npm run dev:mocks      # desenvolvimento com mocks → http://localhost:5173
npm run build          # build de demonstração (mocks ativos)
npm run preview        # http://localhost:4173
npm run typecheck && npm run lint
npm run test:e2e       # Playwright (builda + sobe o preview sozinho); relatório em playwright-report/
npm run test:e2e:update  # gera/atualiza baselines visuais (versione tests/*-snapshots)
npm run lighthouse     # com o preview rodando; relatórios em lighthouse/reports
```
Variáveis (`.env.example`): `VITE_USE_MOCKS` (true = MSW), `VITE_API_URL`, `VITE_SOCKET_URL`.

## Credenciais fictícias
| Usuário | E-mail | Senha |
|---|---|---|
| Ana | ana@nft.dev | Senha@123 |
| Bruno | bruno@nft.dev | Senha@456 |

Cupons: `WELCOME10` (10%), `NFT25` (25%), `OLD20` (expirado). Carteira cujo nome contém "recusar" tem a conexão recusada.

## Cenários e reset
Selecione por URL (`/?scenario=slow`) ou no console (`__mock.scenario('flaky')`). Lista: `default`, `empty`, `slow`, `flaky`, `server-error`, `order-timeout`, `payment-declined`.
Reset total do banco simulado: `__mock.reset()` no console (ou `POST /api/__mock/reset`).
Outros controles (passam pelo MSW): `POST /api/__mock/expire-session`, `/__mock/nft` (altera preço/estoque e emite `nft.updated`), `/__mock/disconnect`.

## Reproduzir falhas
- **Sessão expirada**: logado, rode `fetch('/api/__mock/expire-session',{method:'POST'})` e faça qualquer ação.
- **Preço muda no checkout**: `fetch('/api/__mock/nft',{method:'POST',body:JSON.stringify({id:'nft-2',price:'9.9'})})`.
- **Timeout com recuperação**: `?scenario=order-timeout` → pagar → "Tentar novamente" recupera o mesmo pedido.
- **Recusa**: `?scenario=payment-declined`. **Lentidão/fora de ordem**: `?scenario=slow`.

## Deploy
Vercel (`vercel.json` com rewrite de SPA). O build já inclui MSW e o service worker.
