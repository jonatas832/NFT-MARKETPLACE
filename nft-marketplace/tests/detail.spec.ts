import { test, expect } from '@playwright/test'

test('acesso direto ao detalhe e NFT inexistente', async ({ page }) => {
  await page.goto('/nft/nft-5')
  await expect(page.getByRole('heading', { name: 'Space Walker #005' })).toBeVisible()
  await page.goto('/nft/nao-existe')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})
test('limite de quantidade e edição esgotada', async ({ page }) => {
  await page.goto('/nft/nft-1')                       // rare esgotada (i % 4 === 0)
  await page.getByText('Rare · Esgotado').click()
  await expect(page.getByRole('button', { name: 'Indisponível' })).toBeDisabled()
  await page.getByText(/^Legendary/).click()          // 1 disponível
  await expect(page.getByRole('button', { name: 'Aumentar' })).toBeDisabled()
})
test('rota inexistente mostra 404', async ({ page }) => {
  await page.goto('/qualquer/coisa'); await expect(page.getByText('Página não encontrada')).toBeVisible()
})
