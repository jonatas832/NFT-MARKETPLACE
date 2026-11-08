import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { resetDb } from './db'
import { getScenario, setScenario, SCENARIOS } from './scenarios'

export async function startMocks() {
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass', serviceWorker: { url: '/mockServiceWorker.js' } })
  // utilitário de console: __mock.scenario('slow'), __mock.reset()
  ;(window as unknown as Record<string, unknown>).__mock = {
    scenarios: SCENARIOS, current: getScenario,
    scenario: (s: keyof typeof SCENARIOS) => { setScenario(s); location.reload() },
    reset: async () => { await resetDb(getScenario() === 'empty'); location.reload() },
  }
}
