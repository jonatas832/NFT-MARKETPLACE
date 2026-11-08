export const SCENARIOS = {
  default: 'Tudo funciona, latência baixa',
  empty: 'Catálogo vazio',
  slow: 'Latência alta (1–3 s) e variável; respostas fora de ordem',
  flaky: 'Falhas 503/queda de conexão a cada 3ª requisição (determinístico)',
  'server-error': 'Listagens retornam 500',
  'order-timeout': 'Pedido é criado, mas a 1ª resposta se perde (recuperação por idempotência)',
  'payment-declined': 'Pagamento é recusado',
} as const
export type ScenarioName = keyof typeof SCENARIOS

const KEY = 'nft-mock-scenario'
export const getScenario = (): ScenarioName => {
  const fromUrl = new URLSearchParams(location.search).get('scenario')
  if (fromUrl && fromUrl in SCENARIOS) { localStorage.setItem(KEY, fromUrl); return fromUrl as ScenarioName }
  return (localStorage.getItem(KEY) as ScenarioName) || 'default'
}
export const setScenario = (s: ScenarioName) => localStorage.setItem(KEY, s)
