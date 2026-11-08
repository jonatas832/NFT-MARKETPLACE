import { expect, type Page } from '@playwright/test'

export const ANA = { email: 'ana@nft.dev', password: 'Senha@123' }
export const BRUNO = { email: 'bruno@nft.dev', password: 'Senha@456' }

export async function login(page: Page, u = ANA) {
  await page.getByLabel('E-mail').fill(u.email)
  await page.getByLabel('Senha').fill(u.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}
export async function loginViaUi(page: Page, u = ANA) {
  await page.goto('/login'); await login(page, u)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
}
/** Chamadas de controle passam pelos handlers MSW (service worker), nunca direto na UI. */
export const mock = (page: Page, path: string, body: unknown = {}) =>
  page.evaluate(([p, b]) => fetch(`/api/__mock/${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.status), [path, body] as const)

export async function addToCart(page: Page, id = 'nft-2') {
  await page.goto(`/nft/${id}`)
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByTestId('live')).toContainText('adicionado')
}
export async function payUntilReview(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText('Carteira conectada.')).toBeVisible()
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
}
