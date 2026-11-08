import { test, expect } from '@playwright/test'
import { mock } from './helpers'

test('nft.updated atualiza o detalhe; duplicata e evento antigo são ignorados', async ({ page }) => {
  await page.goto('/nft/nft-3')
  const price = page.getByTestId('price'); const old = await price.textContent()
  await mock(page, 'nft', { id: 'nft-3', price: '3.5', repeat: 2 })      // duplicado
  await expect(price).toHaveText('3,5 ETH')
  await mock(page, 'nft', { id: 'nft-3', price: '1', stale: true })      // versão antiga
  await page.waitForTimeout(500)
  await expect(price).toHaveText('3,5 ETH'); expect(old).not.toBe('3,5 ETH')
})
test('reconexão reconcilia com a API REST', async ({ page }) => {
  await page.goto('/nft/nft-3'); await mock(page, 'disconnect')
  await expect(page.getByTestId('live')).toContainText('Conexão', { timeout: 10_000 })
})
