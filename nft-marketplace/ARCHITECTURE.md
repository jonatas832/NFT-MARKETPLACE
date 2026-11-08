# Arquitetura

## Camadas
`pages/` (UI) → `api/hooks.ts` + `lib/query.ts` (TanStack Query) → `api/endpoints.ts` (Axios tipado) → rede.
`mocks/` vive só na camada de rede (MSW): componentes, hooks e Axios não têm dados fictícios.

## Contratos REST (`/api`)
Auth: `POST /auth/register|login|logout`, `GET /auth/session`. NFTs: `GET /nfts?q&category&sort&min&max&page`, `GET /nfts/:id`.
Favoritos: `GET /favorites`, `PUT|DELETE /favorites/:id`. Carrinho: `GET /cart`, `POST|PATCH /cart/items`, `DELETE /cart/items/:nft/:edition`, `POST /cart/merge`.
Cotação: `POST /quote {network, coupon}` → `Quote` (linhas, subtotal, desconto, taxa, total, `fingerprint`).
Pedidos: `POST /orders` (header `Idempotency-Key`; corpo inclui `expectedFingerprint`), `GET /orders/:id`.
Perfil: `GET|PATCH /profile`, `POST /profile/password`. Carteiras: `GET|POST /wallets`, `PATCH /wallets/:id`, `POST /wallets/:id/connect`.
Erros: `{code,message,fields?,quote?}` — `VALIDATION 422`, `UNAUTHENTICATED|SESSION_EXPIRED 401`, `NOT_FOUND 404`, `OUT_OF_STOCK|UNAVAILABLE|QUOTE_CHANGED|IDEMPOTENCY_CONFLICT|EMAIL_TAKEN 409`, `TRANSIENT 503`.
ETH é sempre string decimal; `lib/decimal.ts` calcula em BigInt (18 casas).

## Eventos Socket.IO
`nft.updated {eventId, resource:'nft', id, version, price, availability}` · `order.updated {eventId, resource:'order', id, version, userId, order}`.
Transporte simulado: WebSocket interceptado pelo MSW + `@mswjs/socket.io-binding` (apenas `websocket`, sem long-polling/rooms). O cliente real (`socket.io-client`) é usado.

## Sessão
Token opaco `tok.<userId>.<epoch>` em localStorage; senhas só como SHA-256 no mock. `GET /auth/session` recupera a sessão após refresh.
401 → handler global limpa token/cache/socket e redireciona a `/login?redirect=<rota>&expired=true`. Login/logout/troca fazem `queryClient.clear()` + `disconnectSocket()`.

## Carrinho
Visitante: servidor guarda por `X-Guest-Id`; após login `POST /cart/merge` junta (limitado ao estoque). Após pedido confirmado, só as quantidades compradas saem do carrinho.

## Cache (TanStack Query)
`staleTime 30 s`, `gcTime 5 min`, retry (máx. 2, backoff) só para rede/5xx; **mutations nunca fazem retry** (duplicidade evitada por Idempotency-Key). Chaves privadas: `['private', userId, …]`; busca/filtros fazem parte da chave (`['nfts', params]`); `signal` cancela respostas obsoletas; `keepPreviousData` evita flicker. Otimista: favoritos (rollback em erro).

## Reconciliação REST × Socket.IO
Eventos aplicam patch no cache só se `version` > versão em cache e `eventId` inédito; `cart-quote` é invalidado (cotação sempre vem da API). `order.updated` exige `userId` igual ao da sessão. Na reconexão, invalida `nfts/nft/cart/cart-quote/private`. O checkout compara `fingerprint` da cotação com o aceito na revisão; mudança bloqueia o envio até “Aceitar novos valores”; o servidor também valida (`QUOTE_CHANGED`).

## Decisões, limitações e desvios
- **Figma não acessível** no ambiente de desenvolvimento: layout/tokens (cores, fontes) são aproximações; ajuste fino pendente.
- Imagens: SVG gerado (data-URI) no lugar dos assets do Figma. Fontes: pilha do sistema (adicionar Work Sans/Space Mono localmente).
- Menu mobile simplificado (navegação quebra linha). Frames mobile de perfil/carteiras/confirmação seguem o mesmo padrão.
- Persistência dos mocks em localStorage (não compartilhada entre abas em tempo real).
